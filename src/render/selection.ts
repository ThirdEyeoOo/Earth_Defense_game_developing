import type { PerspectiveCamera } from 'three';
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
import { CONFIG } from '../sim/config';
import type { GameState } from '../sim/state';
import { createHpBar, type Faction, type HpBar } from './hpBar';
import type { UfoLayer } from './ufoLayer';
import type { UnitLayer } from './units';

// Oggetto selezionato col click. Posseduto da main.ts.
export type TrackedUnit = { kind: 'ufo' | 'squadron'; id: number } | null;

// Rettangolo (in px schermo) del CORPO visibile di un oggetto: lo forniscono i
// layer che lo disegnano (UfoLayer per la nave, UnitLayer per il velivolo). Il
// widget vi adatta il reticolo. {cx,cy} = centro; {w,h} = dimensioni.
export interface ScreenRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const PAD_PX = 6; // distanza fra il corpo e le parentesi d'angolo
const GAP_PX = 7; // distanza fra il reticolo e telemetria/HP
const ARM_MIN = 8;
const ARM_MAX = 20;
const HP_WIDTH_PX = 64;
const RETICLE_COLOR = '#ffe066';

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

// Widget di selezione: overlay in coordinate-schermo (NON CSS2D) ancorato al
// corpo dell'oggetto selezionato. Reticolo a parentesi d'angolo adattato alla
// dimensione del corpo, con telemetria SOPRA e barra HP SOTTO. Sola lettura.
export class SelectionWidget {
  private readonly overlay: HTMLDivElement;
  private readonly reticle: HTMLDivElement;
  private readonly corners: HTMLDivElement[];
  private readonly telemetry: HTMLDivElement;
  private readonly hpWrap: HTMLDivElement;
  private hp: HpBar | null = null;
  private hpFaction: Faction | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.overlay = document.createElement('div');
    this.overlay.id = 'selection-overlay';
    this.overlay.className = 'hidden';

    this.reticle = document.createElement('div');
    this.reticle.className = 'sel-reticle';
    this.corners = (['tl', 'tr', 'bl', 'br'] as const).map(pos => {
      const c = document.createElement('div');
      c.className = `sel-corner sel-corner--${pos}`;
      this.reticle.appendChild(c);
      return c;
    });

    this.telemetry = document.createElement('div');
    this.telemetry.className = 'sel-telemetry';

    this.hpWrap = document.createElement('div');
    this.hpWrap.className = 'sel-hp';

    this.overlay.append(this.telemetry, this.reticle, this.hpWrap);
    parent.appendChild(this.overlay);
  }

  reset(): void {
    this.overlay.classList.add('hidden');
  }

  update(
    state: GameState,
    selected: TrackedUnit,
    units: UnitLayer,
    ufos: UfoLayer,
    camera: PerspectiveCamera,
    tickFraction: number,
  ): void {
    if (!selected) return this.hide();

    let rect: ScreenRect | null;
    let faction: Faction;
    let ratio: number;
    let telemetryHtml: string;

    if (selected.kind === 'ufo') {
      const ufo = state.ufos.find(u => u.id === selected.id);
      if (!ufo) return this.hide();
      rect = ufos.ufoBodyRect(selected.id);
      faction = 'alien';
      ratio = ufo.hp / CONFIG.ufoAbductor.hp;
      telemetryHtml = this.box(
        t('track.ufo', { id: ufo.id }),
        ufoAltitudeKm(ufo, tickFraction),
        ufoSpeedKmH(ufo, tickFraction),
        ufoEtaTicks(ufo, tickFraction),
        ufo.targetCityId,
        state,
      );
    } else {
      const sq = state.squadrons.find(s => s.id === selected.id);
      if (!sq) return this.hide();
      rect = units.squadronRect(selected.id, camera);
      faction = 'human';
      ratio = sq.hp / CONFIG.squadron.hp;
      telemetryHtml = this.box(
        t('track.squadron', { id: sq.id }),
        squadronAltitudeKm(),
        squadronSpeedKmH(),
        squadronEtaTicks(sq, tickFraction),
        sq.transfer?.toCityId ?? null,
        state,
      );
    }

    if (!rect) return this.hide(); // fuori vista / occluso / (UFO) in rapimento
    this.overlay.classList.remove('hidden');
    this.layout(rect);
    this.telemetry.innerHTML = telemetryHtml;
    this.setHp(faction, ratio);
  }

  private hide(): void {
    this.overlay.classList.add('hidden');
  }

  // posiziona reticolo (parentesi appena fuori dal corpo), telemetria sopra, HP sotto
  private layout(rect: ScreenRect): void {
    const left = rect.cx - rect.w / 2 - PAD_PX;
    const top = rect.cy - rect.h / 2 - PAD_PX;
    const w = rect.w + 2 * PAD_PX;
    const h = rect.h + 2 * PAD_PX;
    const arm = Math.max(ARM_MIN, Math.min(ARM_MAX, Math.min(w, h) * 0.3));

    this.reticle.style.left = `${left.toFixed(1)}px`;
    this.reticle.style.top = `${top.toFixed(1)}px`;
    this.reticle.style.width = `${w.toFixed(1)}px`;
    this.reticle.style.height = `${h.toFixed(1)}px`;
    for (const c of this.corners) {
      c.style.width = `${arm.toFixed(1)}px`;
      c.style.height = `${arm.toFixed(1)}px`;
    }

    // telemetria centrata su cx, con il bordo basso appena sopra il reticolo
    this.telemetry.style.left = `${rect.cx.toFixed(1)}px`;
    this.telemetry.style.top = `${(top - GAP_PX).toFixed(1)}px`;
    // HP centrata su cx, appena sotto il reticolo
    this.hpWrap.style.left = `${rect.cx.toFixed(1)}px`;
    this.hpWrap.style.top = `${(top + h + GAP_PX).toFixed(1)}px`;
  }

  private setHp(faction: Faction, ratio: number): void {
    if (this.hpFaction !== faction) {
      this.hpWrap.replaceChildren();
      this.hp = createHpBar(faction, HP_WIDTH_PX);
      this.hpFaction = faction;
      this.hpWrap.appendChild(this.hp.host);
    }
    this.hp!.update(ratio);
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
    // in inglese le unità sono americane: altitudine in piedi, velocità in mph
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
