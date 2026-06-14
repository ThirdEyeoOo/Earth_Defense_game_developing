import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import badgeRaw from '../../Assets/Widgets/badge-scontro.svg?raw';
import { cityName, t } from '../i18n';
import { activeBattles } from '../sim/combat';
import type { CityState, GameState } from '../sim/state';
import { cityPosition } from './cities';
import { isOccludedByGlobe } from './horizon';

const DRAG_TOLERANCE_PX = 5;

interface Badge {
  object: CSS2DObject;
  element: HTMLDivElement;
  name: string;
}

// Badge cliccabile sopra le città in combattimento (activeBattles): apre la
// finestra di scontro. Stesso ciclo di vita di CityLayer (ricreato a nuova
// partita), pattern CSS2D + guardia anti-drag delle targhette città.
export class BattleBadgeLayer {
  private badges = new Map<string, Badge>(); // chiave: cityId
  readonly group = new THREE.Group();
  private pointerDownAt = { x: 0, y: 0 };
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  };

  constructor(
    scene: THREE.Scene,
    private readonly cities: CityState[],
    private readonly onBattleClick: (cityId: string) => void,
  ) {
    window.addEventListener('pointerdown', this.onPointerDown);
    scene.add(this.group);
  }

  update(state: GameState, camera: THREE.Camera): void {
    const active = new Set(activeBattles(state).map(b => b.cityId));
    for (const cityId of [...this.badges.keys()]) {
      if (!active.has(cityId)) this.removeBadge(cityId);
    }
    for (const cityId of active) {
      const city = this.cities.find(c => c.id === cityId);
      if (!city) continue;
      const badge = this.badges.get(cityId) ?? this.createBadge(city);
      const visible = !isOccludedByGlobe(badge.object.position, camera);
      badge.object.visible = visible;
      // oltre l'orizzonte il badge non deve restare cliccabile (è dietro al globo)
      badge.element.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  // i titoli (aria/tooltip) dipendono dalla lingua: vanno riscritti al cambio
  refreshLabels(): void {
    for (const [cityId, badge] of this.badges) {
      badge.element.title = t('combat.badgeAlt', { city: cityName(cityId, badge.name) });
    }
  }

  private createBadge(city: CityState): Badge {
    const element = document.createElement('div');
    element.className = 'battle-badge';
    element.innerHTML = badgeRaw;
    element.title = t('combat.badgeAlt', { city: cityName(city.id, city.name) });
    element.addEventListener('click', event => {
      const moved = Math.hypot(
        event.clientX - this.pointerDownAt.x,
        event.clientY - this.pointerDownAt.y,
      );
      if (moved > DRAG_TOLERANCE_PX) return; // click a fine rotazione del globo
      this.onBattleClick(city.id);
    });
    const object = new CSS2DObject(element);
    object.position.copy(cityPosition(city, 1.035)); // appena sopra la targhetta
    const badge: Badge = { object, element, name: city.name };
    this.badges.set(city.id, badge);
    this.group.add(object);
    return badge;
  }

  private removeBadge(cityId: string): void {
    const badge = this.badges.get(cityId);
    if (!badge) return;
    this.group.remove(badge.object);
    badge.element.remove(); // CSS2DRenderer non rimuove i nodi DOM da solo
    this.badges.delete(cityId);
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onPointerDown);
    for (const cityId of [...this.badges.keys()]) this.removeBadge(cityId);
  }
}
