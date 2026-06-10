import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import ufoSvgRaw from '../../Assets/Alieni/UFO/ufo_disco_volante.svg?raw';
import fighterSvgRaw from '../../Assets/Umani/Velivoli/f22_raptor_animabile.svg?raw';
import { CONFIG } from '../sim/config';
import type { GameState, UfoState } from '../sim/state';
import { approachTicks, descentTicks, orbitTicks } from '../sim/ufos';
import { cityPosition } from './cities';
import { ATMOSPHERE_ALTITUDE } from './globe';

const DEEP_ALTITUDE = 8; // spawn nello spazio profondo, in raggi
const ORBIT_ALTITUDE = 1.6; // quota dell'orbita
const SURFACE_ALTITUDE = 1.02; // quota di atterraggio
const CRUISE_ALTITUDE = ATMOSPHERE_ALTITUDE - 0.005; // crociera: dentro l'atmosfera, vicino al limite
const GROUND_SCALE = 0.5; // dimensioni a terra (pattugliamento) rispetto alla crociera
const CLIMB_FRACTION = 0.12; // frazione di rotta usata per decollo e atterraggio

// --- caccia F-22 da SVG (Assets/Umani/Velivoli/f22_raptor_animabile.svg) ---
const FIGHTER_LENGTH = 0.035; // lunghezza del singolo caccia in unità mondo
const SVG_WIDTH = 200;
const SVG_HEIGHT = 300;
const BOOST_ATTACH_Y = 264; // y (in coordinate SVG) dell'attacco fiamme agli ugelli
const PATROL_ALTITUDE = 1.008; // rasoterra, con margine anti-compenetrazione col globo
const PATROL_RADIUS = 0.05; // raggio del pattugliamento attorno al nome della città
const PATROL_SPEED = 0.0005; // rad/ms

// rampa di decollo/atterraggio: 0 a terra, 1 in crociera (smoothstep agli estremi della rotta)
function liftProfile(frac: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (frac < CLIMB_FRACTION) return smooth(frac / CLIMB_FRACTION);
  if (frac > 1 - CLIMB_FRACTION) return smooth((1 - frac) / CLIMB_FRACTION);
  return 1;
}

// --- UFO da SVG (Assets/Alieni/UFO/ufo_disco_volante.svg, vista di profilo) ---
const UFO_WIDTH = 0.05; // larghezza del disco in unità mondo
const UFO_SVG_WIDTH = 240;
const UFO_SVG_HEIGHT = 200;
const BEAM_ATTACH_Y = 108; // y (in coordinate SVG) dell'attacco del raggio al mozzo
const RIM_LIGHTS = ['luce_1', 'luce_2', 'luce_3', 'luce_4', 'luce_5', 'luce_6', 'luce_7'];

type SvgParts = Record<string, THREE.Mesh[]>;

const fighterPaths = new SVGLoader().parse(fighterSvgRaw).paths;
const ufoPaths = new SVGLoader().parse(ufoSvgRaw).paths;

// Costruisce un gruppo piatto da path SVG: una mesh per shape (+ stroke),
// indicizzate per id. pivotOverrides sposta il pivot di certi id (es. il
// raggio traente, che deve estendersi scalando dal mozzo verso il basso).
function buildSvgModel(
  paths: ReturnType<SVGLoader['parse']>['paths'],
  svgWidth: number,
  svgHeight: number,
  worldHeight: number,
  pivotOverrides: Record<string, number> = {},
): { model: THREE.Group; parts: SvgParts } {
  const model = new THREE.Group();
  const parts: SvgParts = {};
  let zIndex = 0;
  for (const path of paths) {
    const id = (path.userData?.node as SVGElement | undefined)?.id ?? '';
    const style = path.userData?.style as { fill?: string; stroke?: string };
    const pivotY = pivotOverrides[id] ?? svgHeight / 2;
    const animated = id.startsWith('luce') || id.startsWith('boost') || id in pivotOverrides;
    const meshes: THREE.Mesh[] = [];

    const addMesh = (geometry: THREE.BufferGeometry, colorStyle: string) => {
      geometry.translate(-svgWidth / 2, -pivotY, 0);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setStyle(colorStyle),
        side: THREE.DoubleSide,
        transparent: animated || id === 'cupola',
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = pivotY - svgHeight / 2;
      mesh.position.z = zIndex++ * 0.4; // evita z-fighting fra i layer (coordinate SVG)
      model.add(mesh);
      meshes.push(mesh);
    };

    if (style?.fill && style.fill !== 'none') {
      for (const shape of SVGLoader.createShapes(path)) {
        addMesh(new THREE.ShapeGeometry(shape), style.fill);
      }
    }
    if (style?.stroke && style.stroke !== 'none') {
      for (const subPath of path.subPaths) {
        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData!.style);
        if (geometry) addMesh(geometry, style.stroke);
      }
    }
    if (id) parts[id] = meshes;
  }
  // SVG è y-in-basso: il flip Y raddrizza il modello
  const s = worldHeight / svgHeight;
  model.scale.set(s, -s, s);
  return { model, parts };
}

// progresso continuo di una fase: tick svolti + frazione del tick corrente
function phaseProgress(ticksRemaining: number, totalTicks: number, tickFraction: number): number {
  const done = totalTicks - ticksRemaining;
  return Math.min(1, Math.max(0, (done + tickFraction) / totalTicks));
}

// angolo (0..2π) per andare da `a` a `b` ruotando attorno ad `axis`
function angleAround(a: THREE.Vector3, b: THREE.Vector3, axis: THREE.Vector3): number {
  const angle = a.angleTo(b);
  const cross = new THREE.Vector3().crossVectors(a, b);
  return cross.dot(axis) >= 0 ? angle : Math.PI * 2 - angle;
}

// orienta un oggetto piatto: piano tangente al globo (normale = radiale) e "muso" (+Y locale) lungo forward
function orientTangent(obj: THREE.Object3D, radial: THREE.Vector3, forward: THREE.Vector3): void {
  const z = radial.clone().normalize();
  const y = forward.clone().projectOnPlane(z);
  if (y.lengthSq() < 1e-10) y.set(0, 1, 0).projectOnPlane(z);
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// base tangente stabile attorno a un punto del globo (per il cerchio di pattugliamento)
function tangentBasis(radial: THREE.Vector3): { e1: THREE.Vector3; e2: THREE.Vector3 } {
  const helper = Math.abs(radial.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const e1 = new THREE.Vector3().crossVectors(helper, radial).normalize();
  const e2 = new THREE.Vector3().crossVectors(radial, e1).normalize();
  return { e1, e2 };
}

const FIGHTER_BOOST_PIVOTS = {
  boost_sx_esterno: BOOST_ATTACH_Y,
  boost_sx_interno: BOOST_ATTACH_Y,
  boost_dx_esterno: BOOST_ATTACH_Y,
  boost_dx_interno: BOOST_ATTACH_Y,
};

// Formazione a ^: leader davanti, due gregari dietro ai lati
function buildSquadron(): THREE.Group {
  const squadron = new THREE.Group();
  const offsets = [
    new THREE.Vector3(0, FIGHTER_LENGTH * 0.55, 0),
    new THREE.Vector3(-FIGHTER_LENGTH * 0.55, -FIGHTER_LENGTH * 0.4, 0),
    new THREE.Vector3(FIGHTER_LENGTH * 0.55, -FIGHTER_LENGTH * 0.4, 0),
  ];
  const partsAll: SvgParts[] = [];
  for (const offset of offsets) {
    const { model, parts } = buildSvgModel(
      fighterPaths,
      SVG_WIDTH,
      SVG_HEIGHT,
      FIGHTER_LENGTH,
      FIGHTER_BOOST_PIVOTS,
    );
    model.position.copy(offset);
    squadron.add(model);
    partsAll.push(parts);
  }
  squadron.userData.parts = partsAll;
  squadron.userData.boostLevel = 0;
  return squadron;
}

// Disco volante: vista di profilo, renderizzato come billboard verticale
function buildUfo(): THREE.Group {
  const ufo = new THREE.Group();
  const { model, parts } = buildSvgModel(
    ufoPaths,
    UFO_SVG_WIDTH,
    UFO_SVG_HEIGHT,
    (UFO_WIDTH * UFO_SVG_HEIGHT) / UFO_SVG_WIDTH,
    { raggio_traente: BEAM_ATTACH_Y },
  );
  ufo.add(model);
  ufo.userData.parts = parts;
  ufo.userData.beamLevel = 0;
  // il raggio traente parte nascosto
  for (const mesh of parts.raggio_traente ?? []) mesh.visible = false;
  return ufo;
}

function setOpacity(meshes: THREE.Mesh[] | undefined, opacity: number): void {
  if (!meshes) return;
  for (const mesh of meshes) (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
}

export class UnitLayer {
  private ufoMeshes = new Map<number, THREE.Object3D>();
  private squadronMeshes = new Map<number, THREE.Object3D>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  ufoPosition(ufoId: number): THREE.Vector3 | null {
    return this.ufoMeshes.get(ufoId)?.position.clone() ?? null;
  }

  update(state: GameState, tickFraction: number, camera: THREE.Camera): void {
    const now = performance.now();
    this.sync(this.ufoMeshes, state.ufos.map(u => u.id), buildUfo);
    this.sync(
      this.squadronMeshes,
      state.squadrons.map(s => s.id),
      buildSquadron,
    );

    for (const ufo of state.ufos) {
      const group = this.ufoMeshes.get(ufo.id)!;
      // posizione assegnata direttamente: il moto fluido viene dal
      // progresso continuo (tick + frazione), non dall'inseguimento
      group.position.copy(this.ufoTarget(state, ufo, tickFraction));
      // billboard verticale: asse del disco = radiale, faccia verso la camera
      const up = group.position.clone().normalize();
      const toCam = camera.position.clone().sub(group.position).projectOnPlane(up);
      if (toCam.lengthSq() > 1e-10) {
        const z = toCam.normalize();
        const x = new THREE.Vector3().crossVectors(up, z);
        group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z));
      }
      this.animateUfo(group, ufo, now);
    }

    for (const sq of state.squadrons) {
      const group = this.squadronMeshes.get(sq.id)!;
      let boostTarget = 0;
      if (sq.transfer) {
        // in rotta lungo l'arco di cerchio massimo, boost accesi
        boostTarget = 1;
        const from = state.cities.find(c => c.id === sq.transfer!.fromCityId)!;
        const to = state.cities.find(c => c.id === sq.transfer!.toCityId)!;
        const frac = phaseProgress(sq.transfer.ticksRemaining, sq.transfer.totalTicks, tickFraction);
        const a = cityPosition(from, 1).normalize();
        const b = cityPosition(to, 1).normalize();
        const angle = a.angleTo(b);
        const axis = new THREE.Vector3().crossVectors(a, b).normalize();
        // decollo dal suolo, crociera sotto il limite atmosferico, atterraggio
        const lift = liftProfile(frac);
        const altitude = PATROL_ALTITUDE + (CRUISE_ALTITUDE - PATROL_ALTITUDE) * lift;
        const at = (f: number) =>
          a.clone().applyAxisAngle(axis, angle * f).multiplyScalar(altitude);
        const pos = at(frac);
        const ahead = at(Math.min(1, frac + 0.002));
        group.position.copy(pos);
        group.scale.setScalar(GROUND_SCALE + (1 - GROUND_SCALE) * lift);
        const forward = ahead.sub(pos);
        orientTangent(group, pos, forward.lengthSq() > 1e-12 ? forward : new THREE.Vector3(0, 1, 0));
      } else {
        // di stanza: pattugliamento circolare attorno al nome della città
        const city = state.cities.find(c => c.id === sq.cityId)!;
        const center = cityPosition(city, PATROL_ALTITUDE);
        const radial = center.clone().normalize();
        const { e1, e2 } = tangentBasis(radial);
        const radius = PATROL_RADIUS * (1 + (sq.id % 3) * 0.3);
        const theta = now * PATROL_SPEED + sq.id * 2.4;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        group.position
          .copy(center)
          .addScaledVector(e1, radius * cos)
          .addScaledVector(e2, radius * sin);
        group.scale.setScalar(GROUND_SCALE); // a terra la formazione è dimezzata
        // muso tangente al cerchio di pattuglia (derivata della posizione)
        const forward = e1.clone().multiplyScalar(-sin).addScaledVector(e2, cos);
        orientTangent(group, group.position, forward);
      }
      this.animateFighters(group, now, boostTarget);
    }
  }

  // Animazioni UFO da specifica: luci del bordo in sequenza rotante (più
  // veloci in movimento), luce cupola che pulsa (lampeggia nel rapimento),
  // cupola in sincrono, raggio traente che si estende/ritira dal mozzo.
  private animateUfo(group: THREE.Object3D, ufo: UfoState, now: number): void {
    const parts = group.userData.parts as SvgParts;
    const abducting = ufo.phase === 'abducting';
    const moving = !abducting;

    // luci del bordo: testa della sequenza che scorre 1→7, le altre attenuate
    const speed = moving ? 0.01 : 0.004; // luci/ms: accelerano in movimento
    const head = (now * speed) % RIM_LIGHTS.length;
    for (let i = 0; i < RIM_LIGHTS.length; i++) {
      const dist = Math.min(
        Math.abs(i - head),
        RIM_LIGHTS.length - Math.abs(i - head),
      );
      setOpacity(parts[RIM_LIGHTS[i]], dist < 1.5 ? 1 - 0.5 * (dist / 1.5) : 0.2);
    }

    // luce cupola: pulsazione lenta in volo, lampeggio veloce nel rapimento
    const domeLight = abducting
      ? ((now % 300) < 150 ? 1 : 0.15)
      : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.002));
    setOpacity(parts.luce_cupola, domeLight);
    // cupola: leggero pulse sincronizzato con la luce interna durante il rapimento
    setOpacity(parts.cupola, abducting ? 0.55 + 0.35 * domeLight : 0.92);

    // raggio traente: si estende dal mozzo durante il rapimento, poi si ritira
    const level = THREE.MathUtils.lerp(
      group.userData.beamLevel as number,
      abducting ? 1 : 0,
      0.1,
    );
    group.userData.beamLevel = level;
    for (const mesh of parts.raggio_traente ?? []) {
      mesh.visible = level > 0.02;
      mesh.scale.y = level;
      (mesh.material as THREE.MeshBasicMaterial).opacity = level * (0.55 + 0.15 * Math.random());
    }
  }

  // Animazioni da specifica: luci nav pulsanti sfasate, strobo secco ~1.5s,
  // boost che crescono dagli ugelli con flicker (nucleo più nervoso) solo in trasferimento.
  private animateFighters(squadron: THREE.Object3D, now: number, boostTarget: number): void {
    const level = THREE.MathUtils.lerp(
      squadron.userData.boostLevel as number,
      boostTarget,
      0.12,
    );
    squadron.userData.boostLevel = level;
    const partsAll = squadron.userData.parts as SvgParts[];
    for (let i = 0; i < partsAll.length; i++) {
      const parts = partsAll[i];
      const phase = i * 0.7;
      // luci di posizione: pulsazione lenta, sinistra e destra in controfase
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0025 + phase));
      setOpacity(parts.luce_nav_sx, pulse);
      setOpacity(parts.luce_nav_dx, 1.35 - pulse);
      // strobo di coda: flash breve ogni ~1.5s
      setOpacity(parts.luce_strobo_coda, (now + i * 180) % 1500 < 90 ? 1 : 0);
      // boost: estensione = livello (cresce/si ritira), flicker casuale per frame
      const boostVisible = level > 0.02;
      for (const id of ['boost_sx_esterno', 'boost_dx_esterno']) {
        for (const mesh of parts[id] ?? []) {
          mesh.visible = boostVisible;
          mesh.scale.y = level * (0.9 + 0.2 * Math.random());
        }
      }
      for (const id of ['boost_sx_interno', 'boost_dx_interno']) {
        for (const mesh of parts[id] ?? []) {
          mesh.visible = boostVisible;
          mesh.scale.y = level * (0.8 + 0.4 * Math.random()); // il nucleo tremola di più
        }
      }
    }
  }

  private ufoTarget(state: GameState, ufo: UfoState, tickFraction: number): THREE.Vector3 {
    const city = state.cities.find(c => c.id === ufo.targetCityId)!;
    const cityDir = cityPosition(city, 1).normalize();
    const spawnDir = new THREE.Vector3(ufo.spawnDir.x, ufo.spawnDir.y, ufo.spawnDir.z).normalize();
    const surface = cityPosition(city, SURFACE_ALTITUDE);

    if (ufo.phase === 'approaching') {
      const p = phaseProgress(ufo.ticksRemaining, approachTicks(), tickFraction);
      // decelerazione: ease-out quadratico dallo spazio profondo alla quota orbitale
      const r = ORBIT_ALTITUDE + (DEEP_ALTITUDE - ORBIT_ALTITUDE) * (1 - p) * (1 - p);
      return spawnDir.clone().multiplyScalar(r);
    }

    if (ufo.phase === 'orbiting') {
      const p = phaseProgress(ufo.ticksRemaining, orbitTicks(), tickFraction);
      let axis = new THREE.Vector3().crossVectors(spawnDir, cityDir);
      if (axis.lengthSq() < 1e-6) {
        // spawn quasi allineato (o antipodale) alla città: asse ortogonale qualsiasi
        const helper =
          Math.abs(spawnDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        axis = new THREE.Vector3().crossVectors(spawnDir, helper);
      }
      axis.normalize();
      // l'orbita parte dal punto di inserimento e termina esattamente sulla
      // verticale della città dopo N giri completi più l'arco residuo
      const delta = angleAround(spawnDir, cityDir, axis);
      const totalAngle = CONFIG.ufoAbductor.travel.orbits * Math.PI * 2 + delta;
      return spawnDir.clone().applyAxisAngle(axis, totalAngle * p).multiplyScalar(ORBIT_ALTITUDE);
    }

    const aboveCity = cityDir.clone().multiplyScalar(ORBIT_ALTITUDE);
    if (ufo.phase === 'descending') {
      const p = phaseProgress(ufo.ticksRemaining, descentTicks(), tickFraction);
      return aboveCity.lerp(surface, p);
    }
    if (ufo.phase === 'abducting') {
      return surface;
    }
    // escaping: risalita radiale, poi despawn
    const p = phaseProgress(ufo.ticksRemaining, descentTicks(), tickFraction);
    return surface.clone().lerp(aboveCity, p);
  }

  private sync(
    objects: Map<number, THREE.Object3D>,
    ids: number[],
    create: () => THREE.Object3D,
  ): void {
    const wanted = new Set(ids);
    for (const [id, obj] of objects) {
      if (!wanted.has(id)) {
        this.group.remove(obj);
        obj.traverse(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
          }
        });
        objects.delete(id);
      }
    }
    for (const id of ids) {
      if (!objects.has(id)) {
        const obj = create();
        objects.set(id, obj);
        this.group.add(obj);
      }
    }
  }
}
