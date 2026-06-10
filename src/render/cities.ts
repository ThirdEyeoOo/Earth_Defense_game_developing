import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { latLonToVec3 } from '../sim/geo';
import type { CityState, GameState } from '../sim/state';
import { GLOBE_RADIUS } from './globe';

export function cityPosition(city: CityState, altitude = 1.005): THREE.Vector3 {
  const v = latLonToVec3(city.lat, city.lon, GLOBE_RADIUS * altitude);
  return new THREE.Vector3(v.x, v.y, v.z);
}

const DRAG_TOLERANCE_PX = 5;

// Le città sono rappresentate solo dalle targhette col nome (CSS2D),
// che sono anche l'elemento cliccabile per selezione e trasferimenti.
export class CityLayer {
  private labels = new Map<string, { object: CSS2DObject; element: HTMLDivElement }>();
  readonly group = new THREE.Group();
  private pointerDownAt = { x: 0, y: 0 };
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  };

  constructor(scene: THREE.Scene, cities: CityState[], onCityClick: (cityId: string) => void) {
    // guardia anti-drag: il click a fine rotazione del globo non deve selezionare
    window.addEventListener('pointerdown', this.onPointerDown);
    for (const city of cities) {
      const element = document.createElement('div');
      element.className = 'city-label';
      element.textContent = city.name;
      // dimensione leggermente proporzionale alla popolazione (come i vecchi marker)
      const fontPx = 9 + 3 * Math.cbrt(city.population / 37_000_000);
      element.style.fontSize = `${fontPx.toFixed(1)}px`;
      element.addEventListener('click', event => {
        const moved = Math.hypot(
          event.clientX - this.pointerDownAt.x,
          event.clientY - this.pointerDownAt.y,
        );
        if (moved > DRAG_TOLERANCE_PX) return;
        onCityClick(city.id);
      });
      const label = new CSS2DObject(element);
      label.position.copy(cityPosition(city, 1.01));
      this.labels.set(city.id, { object: label, element });
      this.group.add(label);
    }
    scene.add(this.group);
  }

  update(state: GameState, selectedCityId: string | null, camera: THREE.Camera): void {
    // una città è oltre l'orizzonte se l'angolo con la camera supera
    // quello di tangenza: cos(α) = R / distanza camera
    const camDir = camera.position.clone().normalize();
    const horizonCos = GLOBE_RADIUS / camera.position.length();
    for (const city of state.cities) {
      const label = this.labels.get(city.id);
      if (!label) continue;
      const facing = label.object.position.clone().normalize().dot(camDir);
      label.object.visible = facing > horizonCos;
      const underAttack = state.ufos.some(u => u.targetCityId === city.id);
      // le città distrutte restano visibili (grigie) e selezionabili:
      // serve per poter evacuare gli squadroni rimasti
      label.element.classList.toggle('city-label--selected', city.id === selectedCityId);
      label.element.classList.toggle('city-label--attack', city.alive && underAttack);
      label.element.classList.toggle('city-label--dead', !city.alive);
    }
  }

  // da chiamare quando il layer viene sostituito (nuova partita): gli elementi
  // DOM delle etichette non vengono rimossi da Three.js da soli
  dispose(): void {
    window.removeEventListener('pointerdown', this.onPointerDown);
    for (const { element } of this.labels.values()) element.remove();
  }
}
