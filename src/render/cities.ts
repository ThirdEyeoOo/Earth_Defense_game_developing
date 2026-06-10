import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { latLonToVec3 } from '../sim/geo';
import type { CityState, GameState } from '../sim/state';
import { GLOBE_RADIUS } from './globe';

const COLOR_OK = 0x4db8ff;
const COLOR_ATTACK = 0xff5566;
const COLOR_SELECTED = 0xffe066;
const COLOR_DEAD = 0x555566;

export function cityPosition(city: CityState, altitude = 1.005): THREE.Vector3 {
  const v = latLonToVec3(city.lat, city.lon, GLOBE_RADIUS * altitude);
  return new THREE.Vector3(v.x, v.y, v.z);
}

export class CityLayer {
  private meshes = new Map<string, THREE.Mesh>();
  private labels = new Map<string, { object: CSS2DObject; element: HTMLDivElement }>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene, cities: CityState[]) {
    for (const city of cities) {
      const size = 0.006 + 0.012 * Math.cbrt(city.population / 37_000_000);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 12),
        new THREE.MeshBasicMaterial({ color: COLOR_OK }),
      );
      mesh.position.copy(cityPosition(city));
      mesh.userData.cityId = city.id;
      this.meshes.set(city.id, mesh);
      this.group.add(mesh);

      const element = document.createElement('div');
      element.className = 'city-label';
      element.textContent = city.name;
      const label = new CSS2DObject(element);
      label.position.set(0, size + 0.012, 0);
      mesh.add(label);
      this.labels.set(city.id, { object: label, element });
    }
    scene.add(this.group);
  }

  update(state: GameState, selectedCityId: string | null, camera: THREE.Camera): void {
    // una città è oltre l'orizzonte se l'angolo con la camera supera
    // quello di tangenza: cos(α) = R / distanza camera
    const camDir = camera.position.clone().normalize();
    const horizonCos = GLOBE_RADIUS / camera.position.length();
    for (const city of state.cities) {
      const mesh = this.meshes.get(city.id);
      if (!mesh) continue;
      const underAttack = state.ufos.some(u => u.targetCityId === city.id);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      // le città distrutte restano visibili (grigie) e selezionabili:
      // serve per poter evacuare gli squadroni rimasti
      mat.color.set(
        city.id === selectedCityId
          ? COLOR_SELECTED
          : !city.alive
            ? COLOR_DEAD
            : underAttack
              ? COLOR_ATTACK
              : COLOR_OK,
      );
      const label = this.labels.get(city.id);
      if (label) {
        const facing = mesh.position.clone().normalize().dot(camDir);
        label.object.visible = facing > horizonCos;
        label.element.classList.toggle('city-label--dead', !city.alive);
      }
    }
  }

  cityIdAt(raycaster: THREE.Raycaster): string | null {
    const hits = raycaster.intersectObjects([...this.meshes.values()]);
    return hits.length > 0 ? (hits[0].object.userData.cityId as string) : null;
  }
}
