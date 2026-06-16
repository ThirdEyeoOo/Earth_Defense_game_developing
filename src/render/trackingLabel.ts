import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { cityName, getLanguage, getLocale, t } from '../i18n';
import {
  etaGameSeconds,
  kmToFeet,
  kmToMiles,
  squadronAltitudeKm,
  squadronEtaTicks,
  squadronSpeedKmH,
  ufoAltitudeKm,
  ufoEtaTicks,
  ufoSpeedKmH,
} from '../sim/measure';
import type { GameState } from '../sim/state';
import { isOccludedByGlobe } from './horizon';
import type { UnitLayer } from './units';

// Oggetto tracciato (selezionato col click). Posseduto da main.ts.
export type TrackedUnit = { kind: 'ufo' | 'squadron'; id: number } | null;

// formattazione locale (niente import da ui/: il livello render usa solo i18n)
const fmtKm = (n: number): string => Math.round(n).toLocaleString(getLocale());

// secondi-gioco → durata compatta ("2g 6h" / "9h 36m" / "45m") con suffissi i18n
function fmtEta(gameSeconds: number): string {
  const totalMin = Math.max(0, Math.round(gameSeconds / 60));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}${t('track.unit.d')} ${h}${t('track.unit.h')}`;
  if (h > 0) return `${h}${t('track.unit.h')} ${m}${t('track.unit.m')}`;
  return `${m}${t('track.unit.m')}`;
}

// Etichetta di tracciamento: UNA sola label CSS2D ancorata all'oggetto selezionato,
// che ne mostra quota/velocità/ETA in misure reali (sola lettura, ricostruita ogni
// frame). Pattern di hpBars.ts/floatingText.ts; le posizioni 3D vengono da UnitLayer.
export class TrackingLabel {
  private readonly el: HTMLDivElement;
  private readonly object: CSS2DObject;
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.el = document.createElement('div');
    this.el.className = 'tracking-label hidden';
    this.object = new CSS2DObject(this.el);
    this.group.add(this.object);
    scene.add(this.group);
  }

  update(
    state: GameState,
    selected: TrackedUnit,
    units: UnitLayer,
    camera: THREE.Camera,
    tickFraction: number,
  ): void {
    if (!selected) {
      this.el.classList.add('hidden');
      return;
    }

    let position: THREE.Vector3 | null = null;
    let html = '';
    if (selected.kind === 'ufo') {
      const ufo = state.ufos.find(u => u.id === selected.id);
      if (!ufo) {
        this.el.classList.add('hidden');
        return;
      }
      position = units.ufoPosition(ufo.id);
      html = this.box(
        t('track.ufo', { id: ufo.id }),
        ufoAltitudeKm(ufo, tickFraction),
        ufoSpeedKmH(ufo, tickFraction),
        ufoEtaTicks(ufo, tickFraction),
        ufo.targetCityId,
        state,
      );
    } else {
      const sq = state.squadrons.find(s => s.id === selected.id);
      if (!sq) {
        this.el.classList.add('hidden');
        return;
      }
      position = units.squadronPosition(sq.id);
      html = this.box(
        t('track.squadron', { id: sq.id }),
        squadronAltitudeKm(),
        squadronSpeedKmH(),
        squadronEtaTicks(sq, tickFraction),
        sq.transfer?.toCityId ?? null,
        state,
      );
    }

    const occluded = position === null || isOccludedByGlobe(position, camera);
    this.el.classList.toggle('hidden', occluded);
    if (occluded) return;
    this.object.position.copy(position!);
    this.el.innerHTML = html;
  }

  reset(): void {
    this.el.classList.add('hidden');
  }

  private box(
    title: string,
    altKm: number,
    speedKmh: number,
    etaTicks: number | null,
    targetCityId: string | null,
    state: GameState,
  ): string {
    let eta: string;
    if (etaTicks === null || targetCityId === null) {
      eta = t('track.etaNone');
    } else {
      const city = state.cities.find(c => c.id === targetCityId);
      eta = t('track.eta', {
        eta: fmtEta(etaGameSeconds(etaTicks)),
        city: city ? cityName(city.id, city.name) : targetCityId,
      });
    }
    // in inglese le unità sono americane: altitudine in piedi, velocità in mph; le
    // stringhe i18n portano il suffisso giusto
    const imperial = getLanguage() === 'en';
    const alt = imperial ? kmToFeet(altKm) : altKm;
    const speed = imperial ? kmToMiles(speedKmh) : speedKmh;
    return `
      <div class="track-box">
        <div class="track-title">${title}</div>
        <div>${t('track.altitude', { km: fmtKm(alt) })}</div>
        <div>${t('track.speed', { kmh: fmtKm(speed) })}</div>
        <div class="track-eta">${eta}</div>
      </div>`;
  }
}
