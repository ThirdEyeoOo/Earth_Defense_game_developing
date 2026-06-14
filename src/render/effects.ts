import * as THREE from 'three';
import { activeBattles } from '../sim/combat';
import type { GameState } from '../sim/state';
import { cityPosition } from './cities';
import type { UnitLayer } from './units';

interface Explosion {
  mesh: THREE.Mesh;
  ttl: number;
}

export class EffectsLayer {
  readonly group = new THREE.Group();
  private tracer: THREE.LineSegments;
  private explosions: Explosion[] = [];
  private prevUfoIds = new Set<number>();
  private prevUfoPositions = new Map<number, THREE.Vector3>();

  constructor(scene: THREE.Scene) {
    this.tracer = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }),
    );
    this.group.add(this.tracer);
    scene.add(this.group);
  }

  update(state: GameState, units: UnitLayer): void {
    // traccianti: da ogni città difesa verso gli UFO ingaggiati
    const points: number[] = [];
    if (Math.floor(performance.now() / 120) % 2 === 0) {
      for (const battle of activeBattles(state)) {
        const city = state.cities.find(c => c.id === battle.cityId)!;
        const from = cityPosition(city, 1.03);
        for (const ufo of battle.attackers) {
          const to = units.ufoPosition(ufo.id);
          if (!to) continue;
          points.push(from.x, from.y, from.z, to.x, to.y, to.z);
        }
      }
    }
    this.tracer.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points, 3),
    );

    // esplosioni: UFO spariti rispetto al frame precedente
    const currentIds = new Set(state.ufos.map(u => u.id));
    for (const id of this.prevUfoIds) {
      if (!currentIds.has(id)) {
        const pos = this.prevUfoPositions.get(id);
        if (pos) this.spawnExplosion(pos);
      }
    }
    this.prevUfoIds = currentIds;
    for (const ufo of state.ufos) {
      const p = units.ufoPosition(ufo.id);
      if (p) this.prevUfoPositions.set(ufo.id, p);
    }

    for (const e of [...this.explosions]) {
      e.ttl--;
      e.mesh.scale.multiplyScalar(1.08);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.9;
      if (e.ttl <= 0) {
        this.group.remove(e.mesh);
        e.mesh.geometry.dispose();
        (e.mesh.material as THREE.Material).dispose();
        this.explosions = this.explosions.filter(x => x !== e);
      }
    }
  }

  private spawnExplosion(position: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.9 }),
    );
    mesh.position.copy(position);
    this.explosions.push({ mesh, ttl: 30 });
    this.group.add(mesh);
  }
}
