import * as THREE from 'three';
import type { GameState } from '../sim/state';
import { travelTicks } from '../sim/ufos';
import { cityPosition } from './cities';

const UFO_COLOR = 0xff5566;
const SQUADRON_COLOR = 0xffb347;
const TRAVEL_ALTITUDE = 1.8; // quota di spawn/fuga UFO, in raggi
const TRANSFER_ALTITUDE = 1.15; // quota di crociera squadroni

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

  update(state: GameState): void {
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
      const city = state.cities.find(c => c.id === ufo.targetCityId)!;
      const surface = cityPosition(city, 1.02);
      const sky = surface.clone().normalize().multiplyScalar(TRAVEL_ALTITUDE);
      let target: THREE.Vector3;
      if (ufo.phase === 'descending') {
        const frac = ufo.ticksRemaining / travelTicks(); // 1 → lontano, 0 → atterrato
        target = surface.clone().lerp(sky, frac);
      } else if (ufo.phase === 'abducting') {
        target = surface;
      } else {
        const total = travelTicks();
        const frac = 1 - ufo.ticksRemaining / total; // 0 → a terra, 1 → fuggito
        target = surface.clone().lerp(sky, frac);
      }
      this.ufoMeshes.get(ufo.id)!.position.lerp(target, 0.15);
    }

    for (const sq of state.squadrons) {
      const mesh = this.squadronMeshes.get(sq.id)!;
      let target: THREE.Vector3;
      if (sq.transfer) {
        const from = state.cities.find(c => c.id === sq.transfer!.fromCityId)!;
        const to = state.cities.find(c => c.id === sq.transfer!.toCityId)!;
        const frac = 1 - sq.transfer.ticksRemaining / sq.transfer.totalTicks;
        const a = cityPosition(from, 1).normalize();
        const b = cityPosition(to, 1).normalize();
        const angle = a.angleTo(b);
        const axis = new THREE.Vector3().crossVectors(a, b).normalize();
        target = a
          .clone()
          .applyAxisAngle(axis, angle * frac)
          .multiplyScalar(TRANSFER_ALTITUDE);
      } else {
        const city = state.cities.find(c => c.id === sq.cityId)!;
        target = cityPosition(city, 1.04);
      }
      mesh.position.lerp(target, 0.15);
    }
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
