import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import fighterSvgRaw from '../../Assets/Umani/Velivoli/f22_raptor_animabile.svg?raw';
import { positionAt } from '../sim/orbit';
import type { GameState, UfoState } from '../sim/state';
import { cityPosition } from './cities';
import { ATMOSPHERE_ALTITUDE } from './globe';
import { isOccludedByGlobe } from './horizon';
import type { ScreenRect } from './selection';

const CRUISE_ALTITUDE = ATMOSPHERE_ALTITUDE - 0.005; // crociera: dentro l'atmosfera, vicino al limite
const GROUND_SCALE = 0.5; // dimensioni a terra (pattugliamento) rispetto alla crociera
const CLIMB_FRACTION = 0.12; // frazione di rotta usata per decollo e atterraggio

// --- caccia F-22 da SVG (Assets/Umani/Velivoli/f22_raptor_animabile.svg) ---
const FIGHTER_LENGTH = 0.035; // lunghezza del singolo caccia in unità mondo
const SVG_WIDTH = 200;
const SVG_HEIGHT = 300;
const BOOST_ATTACH_Y = 275; // y (in coordinate SVG) dell'attacco fiamme agli ugelli (vedi asset F-22)
const PATROL_ALTITUDE = 1.008; // rasoterra, con margine anti-compenetrazione col globo
const PATROL_RADIUS = 0.05; // raggio del pattugliamento attorno al nome della città
// velocità di pattuglia ANCORATA al tempo-gioco (non al tempo reale): così si ferma in
// pausa e accelera col time-scale. 0,0005 rad/ms × 1000 ms/min-gioco = 0,5 rad/min-gioco.
const PATROL_SPEED_PER_GAMEMIN = 0.5;

// rampa di decollo/atterraggio: 0 a terra, 1 in crociera (smoothstep agli estremi della rotta)
function liftProfile(frac: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (frac < CLIMB_FRACTION) return smooth(frac / CLIMB_FRACTION);
  if (frac > 1 - CLIMB_FRACTION) return smooth((1 - frac) / CLIMB_FRACTION);
  return 1;
}

type SvgParts = Record<string, THREE.Mesh[]>;

const fighterPaths = new SVGLoader().parse(fighterSvgRaw).paths;

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

// dimensione del singolo caccia che rappresenta lo squadrone sul globo: un po'
// più grande del vecchio velivolo in formazione (che era FIGHTER_LENGTH)
const SQUADRON_FIGHTER_LENGTH = FIGHTER_LENGTH * 1.6;

// hardpoint d'ala in coordinate SVG (centro di ciascuna ala, vedi #hardpoint_ala_* nell'asset);
// simmetrici rispetto a x=100. Usati per montare i moduli arma (render/squadronWeapons.ts).
// HARDPOINT_FORWARD_DY = quanto spostarsi verso il muso (Y minore) per ricavare la direzione
// "in avanti" con cui orientare l'arma a riposo.
export const HARDPOINTS = {
  left: { x: 53, y: 190 },
  right: { x: 147, y: 190 },
} as const;
export const HARDPOINT_FORWARD_DY = 40;

// Lo squadrone è reso come UN solo F-22 (un po' più grande), non più come
// formazione a ^ di tre velivoli.
function buildSquadron(): THREE.Group {
  const squadron = new THREE.Group();
  const { model, parts } = buildSvgModel(
    fighterPaths,
    SVG_WIDTH,
    SVG_HEIGHT,
    SQUADRON_FIGHTER_LENGTH,
    FIGHTER_BOOST_PIVOTS,
  );
  squadron.add(model);
  squadron.userData.parts = [parts];
  squadron.userData.boostLevel = 0;
  return squadron;
}

function setOpacity(meshes: THREE.Mesh[] | undefined, opacity: number): void {
  if (!meshes) return;
  for (const mesh of meshes) (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
}

export class UnitLayer {
  private ufoPositions = new Map<number, THREE.Vector3>();
  private squadronMeshes = new Map<number, THREE.Object3D>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  ufoPosition(ufoId: number): THREE.Vector3 | null {
    return this.ufoPositions.get(ufoId)?.clone() ?? null;
  }

  squadronPosition(squadronId: number): THREE.Vector3 | null {
    return this.squadronMeshes.get(squadronId)?.position.clone() ?? null;
  }

  // Rettangolo (px schermo) del velivolo, per il reticolo di selezione: proietta
  // la dimensione-mondo del caccia (scalata col gruppo) alla sua distanza dalla
  // camera. null se non trovato o occluso dal globo.
  squadronRect(id: number, camera: THREE.PerspectiveCamera): ScreenRect | null {
    const obj = this.squadronMeshes.get(id);
    if (!obj || isOccludedByGlobe(obj.position, camera)) return null;
    const ndc = obj.position.clone().project(camera);
    if (ndc.z > 1) return null; // dietro la camera
    const cx = (ndc.x * 0.5 + 0.5) * window.innerWidth;
    const cy = (1 - ndc.y) * 0.5 * window.innerHeight;
    const worldH = SQUADRON_FIGHTER_LENGTH * obj.scale.x; // scala uniforme del gruppo
    const worldW = worldH * (SVG_WIDTH / SVG_HEIGHT);
    const d = obj.position.distanceTo(camera.position);
    const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);
    const pxPerWorld = window.innerHeight / (2 * Math.max(0.001, d) * halfFovTan);
    return { cx, cy, w: worldW * pxPerWorld, h: worldH * pxPerWorld };
  }

  // Posizione-schermo (px) di un punto del caccia espresso in coordinate SVG dell'asset:
  // lo mappa nello spazio locale del modello (stesso flip/scala di buildSvgModel) e lo
  // proietta via la matrice-mondo reale della mesh (posizione, orientamento di volo, scala).
  // Usato per montare i moduli arma sugli hardpoint (render/squadronWeapons.ts) e per
  // orientarli lungo il muso. null se il caccia non c'è o è occluso dal globo.
  projectSquadronPoint(
    id: number,
    svgX: number,
    svgY: number,
    camera: THREE.PerspectiveCamera,
  ): { x: number; y: number } | null {
    const obj = this.squadronMeshes.get(id);
    if (!obj) return null;
    const sModel = SQUADRON_FIGHTER_LENGTH / SVG_HEIGHT;
    // (X-100, Y-150) centrato; flip Y come model.scale (s,-s,s)
    const local = new THREE.Vector3(
      (svgX - SVG_WIDTH / 2) * sModel,
      -(svgY - SVG_HEIGHT / 2) * sModel,
      0,
    );
    obj.updateWorldMatrix(true, false);
    const world = obj.localToWorld(local);
    if (isOccludedByGlobe(world, camera)) return null;
    const ndc = world.project(camera);
    if (ndc.z > 1) return null;
    return { x: (ndc.x * 0.5 + 0.5) * window.innerWidth, y: (1 - ndc.y) * 0.5 * window.innerHeight };
  }

  update(state: GameState, tickFraction: number, gameMinutes: number): void {
    const now = performance.now();
    this.sync(
      this.squadronMeshes,
      state.squadrons.map(s => s.id),
      buildSquadron,
    );

    // Gli UFO sono renderizzati come overlay DOM (UfoLayer): qui UnitLayer resta
    // l'autorità delle loro POSIZIONI 3D, lette da hpBars/effects/floatingText.
    this.ufoPositions.clear();
    for (const ufo of state.ufos) {
      this.ufoPositions.set(ufo.id, this.ufoTarget(ufo, tickFraction));
    }

    for (const sq of state.squadrons) {
      const group = this.squadronMeshes.get(sq.id)!;
      group.userData.squadronId = sq.id; // per il picking (raycaster in main.ts)
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
        // tempo-gioco: in pausa i caccia si fermano, accelerando il tempo accelerano
        const theta = gameMinutes * PATROL_SPEED_PER_GAMEMIN + sq.id * 2.4;
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

  // La traiettoria è calcolata dal modulo fisico condiviso (src/sim/orbit.ts):
  // qui si traduce solo il progresso continuo (tick + frazione) in posizione 3D.
  private ufoTarget(ufo: UfoState, tickFraction: number): THREE.Vector3 {
    const progress = phaseProgress(ufo.ticksRemaining, ufo.phaseTotalTicks, tickFraction);
    const p = positionAt(ufo.phase, progress, ufo.orbit);
    return new THREE.Vector3(p.x, p.y, p.z);
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
