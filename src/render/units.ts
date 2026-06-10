import * as THREE from 'three';
import { CONFIG } from '../sim/config';
import type { GameState, UfoState } from '../sim/state';
import { approachTicks, descentTicks, orbitTicks } from '../sim/ufos';
import { cityPosition } from './cities';

const UFO_COLOR = 0xff5566;
const SQUADRON_COLOR = 0xffb347;
const DEEP_ALTITUDE = 8; // spawn nello spazio profondo, in raggi
const ORBIT_ALTITUDE = 1.6; // quota dell'orbita
const SURFACE_ALTITUDE = 1.02; // quota di atterraggio
const TRANSFER_ALTITUDE = 1.15; // quota di crociera squadroni

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

export class UnitLayer {
  private ufoMeshes = new Map<number, THREE.Mesh>();
  private squadronMeshes = new Map<number, THREE.Mesh>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  ufoPosition(ufoId: number): THREE.Vector3 | null {
    return this.ufoMeshes.get(ufoId)?.position.clone() ?? null;
  }

  update(state: GameState, tickFraction: number): void {
    this.sync(
      this.ufoMeshes,
      state.ufos.map(u => u.id),
      () =>
        new THREE.Mesh(
          new THREE.ConeGeometry(0.02, 0.045, 8),
          new THREE.MeshBasicMaterial({ color: UFO_COLOR }),
        ),
    );
    this.sync(
      this.squadronMeshes,
      state.squadrons.map(s => s.id),
      () =>
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.018),
          new THREE.MeshBasicMaterial({ color: SQUADRON_COLOR }),
        ),
    );

    for (const ufo of state.ufos) {
      // posizione assegnata direttamente: il moto fluido viene dal
      // progresso continuo (tick + frazione), non dall'inseguimento
      this.ufoMeshes.get(ufo.id)!.position.copy(this.ufoTarget(state, ufo, tickFraction));
    }

    for (const sq of state.squadrons) {
      const mesh = this.squadronMeshes.get(sq.id)!;
      if (sq.transfer) {
        const from = state.cities.find(c => c.id === sq.transfer!.fromCityId)!;
        const to = state.cities.find(c => c.id === sq.transfer!.toCityId)!;
        const frac = phaseProgress(sq.transfer.ticksRemaining, sq.transfer.totalTicks, tickFraction);
        const a = cityPosition(from, 1).normalize();
        const b = cityPosition(to, 1).normalize();
        const angle = a.angleTo(b);
        const axis = new THREE.Vector3().crossVectors(a, b).normalize();
        const target = a
          .clone()
          .applyAxisAngle(axis, angle * frac)
          .multiplyScalar(TRANSFER_ALTITUDE);
        mesh.position.copy(target);
      } else {
        // di stanza: piccolo smoothing per ammorbidire l'arrivo dal trasferimento
        const city = state.cities.find(c => c.id === sq.cityId)!;
        mesh.position.lerp(cityPosition(city, 1.04), 0.15);
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
    meshes: Map<number, THREE.Mesh>,
    ids: number[],
    create: () => THREE.Mesh,
  ): void {
    const wanted = new Set(ids);
    for (const [id, mesh] of meshes) {
      if (!wanted.has(id)) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshes.delete(id);
      }
    }
    for (const id of ids) {
      if (!meshes.has(id)) {
        const mesh = create();
        meshes.set(id, mesh);
        this.group.add(mesh);
      }
    }
  }
}
