import f22Raw from '../../Assets/Umani/Velivoli/f22_raptor_animabile.svg?raw';
import ufoArtRaw from '../../Assets/Alieni/UFO/alien_abductor.svg?raw';
import type { Shot } from '../render/combatEngine';
import { TURRET_TO_UFO_WIDTH, WEAPON_MODULES } from '../render/weaponModules';
import { cityName, t } from '../i18n';
import { activeBattles, type Battle } from '../sim/combat';
import { CONFIG } from '../sim/config';
import type { GameState, UfoPhase, UfoState } from '../sim/state';

// F-22: arte inline (niente <style> interno), via gli id (collisioni DOM) e i <title>.
function sanitize(svg: string): string {
  return svg.replace(/ id="[^"]*"/g, '').replace(/<title>[\s\S]*?<\/title>\s*/g, '');
}
const F22_ART = sanitize(f22Raw);
// L'UFO (alien_abductor) ha <style>/id/animazioni interni: NON si può inlineare
// id-stripped → ogni nave va in uno SHADOW ROOT (vedi rebuild). Il raggio (#beam)
// si accende con la classe `.on` solo in rapimento.
const UFO_ART_HEIGHT_PX = 92;
const UFO_ART_WIDTH_PX = (UFO_ART_HEIGHT_PX * 600) / 860; // viewBox UFO 600×860

// Torretta al plasma come MODULO ARMA (src/render/weaponModules.ts): asset DOM ricco con
// gradienti/filtri e id propri → una torretta per shadow root (isola gli id come l'UFO).
// Taglia derivata dal rapporto unico modulo↔UFO, così è coerente con il globo; l'altezza
// segue l'aspetto dell'asset (viewW/viewH). Lo stato a riposo è baked negli attributi; a
// ogni colpo del motore si accende `.on` per un lampo (keyframe `fireStyleOneShot`).
const TURRET_MODULE = WEAPON_MODULES[CONFIG.ufoAbductor.weaponModule];
const TURRET_W = Math.round(UFO_ART_WIDTH_PX * TURRET_TO_UFO_WIDTH);
const TURRET_H = Math.round((TURRET_W * TURRET_MODULE.viewH) / TURRET_MODULE.viewW);
const ON_DURATION_MS = 620; // durata della classe `.on` (un lampo di sparo)

// fase "rappresentativa" dello scontro: la più avanzata verso il rapimento
const PHASE_PRIORITY: UfoPhase[] = ['abducting', 'descending', 'escaping'];
function dominantPhase(attackers: UfoState[]): UfoPhase {
  for (const phase of PHASE_PRIORITY) {
    if (attackers.some(u => u.phase === phase)) return phase;
  }
  return attackers[0]?.phase ?? 'descending';
}
function phaseLabel(phase: UfoPhase): string {
  if (phase === 'abducting') return t('combat.phase.abducting');
  if (phase === 'escaping') return t('combat.phase.escaping');
  return t('combat.phase.descending');
}

function hpColor(faction: 'human' | 'alien', ratio: number): string {
  if (faction === 'human') return `hsl(${(120 * ratio).toFixed(0)}, 85%, 50%)`; // verde→rosso
  const hue = 75 + (277 - 75) * (1 - ratio); // verde acido → viola
  return `hsl(${hue.toFixed(0)}, 85%, 55%)`;
}

interface Turret {
  ufoId: number;
  side: 'left' | 'right';
  hardpoint: SVGGElement; // hardpoint dell'UFO (nello shadow dell'UFO) a cui è agganciata
  el: HTMLDivElement; // overlay nell'arena
  svg: SVGSVGElement; // root della torretta (nel suo shadow) su cui togglare `.on`
}

// Finestra di scontro stile FTL: visualizzazione cinematica (sola lettura) dello
// scontro che la sim sta già risolvendo su una città. Si apre dal badge sul globo
// e segue lo stato in tempo reale. I proiettili sono gli stessi "shot" del motore di
// combattimento (render/combatEngine.ts), interpolati per `gameMinutes`: il fuoco è
// quindi sincrono col danno reale e coerente coi timing (pausa/accelerazione).
export function createCombatWindow(
  root: HTMLElement,
  opts: { onClose?: () => void } = {},
): {
  open(cityId: string, state: GameState): void;
  close(): void;
  isOpen(): boolean;
  update(state: GameState, shots: Shot[], gameMinutes: number): void;
  refreshLabels(): void;
} {
  let cityId: string | null = null;
  let lastKey = ''; // ricostruisce il DOM solo quando cambia l'insieme di unità
  const prevHp = new Map<string, number>(); // 's:id' | 'u:id' → hp del frame precedente
  const ufoArt = new Map<number, SVGSVGElement>(); // id UFO → <svg> nello shadow (per toggle `.on`)
  const turretList: Turret[] = []; // torrette agganciate agli hardpoint degli UFO
  const projEls = new Map<number, HTMLDivElement>(); // shot.id → proiettile nell'arena
  const seenShots = new Set<number>(); // shot già lampeggiati (flash torretta una volta)
  const landedShots = new Set<number>(); // shot già esplosi (impatto una volta)

  function battleFor(state: GameState): Battle | null {
    if (cityId === null) return null;
    return activeBattles(state).find(b => b.cityId === cityId) ?? null;
  }

  function unitKey(battle: Battle): string {
    const d = battle.defenders.map(s => s.id).join(',');
    const a = battle.attackers.map(u => u.id).join(',');
    return `${battle.cityId}|${d}|${a}`;
  }

  function unitHtml(kind: 's' | 'u', id: number, art: string, label: string): string {
    return `
      <div class="combat-unit" data-key="${kind}:${id}">
        <div class="combat-unit-art combat-unit-art--${kind === 's' ? 'jet' : 'ufo'}">${art}</div>
        <div class="combat-hp"><span class="combat-hp-fill"></span></div>
        <div class="combat-unit-label">${label}</div>
      </div>`;
  }

  function rebuild(state: GameState, battle: Battle): void {
    const city = state.cities.find(c => c.id === battle.cityId)!;
    const defenders = battle.defenders
      .map(s => unitHtml('s', s.id, F22_ART, t('combat.squadron', { id: s.id })))
      .join('');
    const attackers = battle.attackers
      .map(u => unitHtml('u', u.id, '', t('combat.ufo', { id: u.id })))
      .join('');
    root.innerHTML = `
      <div class="combat-box">
        <div class="combat-header">
          <h2>${t('combat.title', { city: cityName(city.id, city.name) })}</h2>
          <button class="combat-close" title="${t('combat.close')}">×</button>
        </div>
        <div class="combat-arena">
          <div class="combat-side">
            <h3>${t('combat.defenders')}</h3>
            <div class="combat-units">${defenders}</div>
          </div>
          <div class="combat-mid">
            <span class="combat-beam combat-beam--out"></span>
          </div>
          <div class="combat-side">
            <h3>${t('combat.attackers')}</h3>
            <div class="combat-units">${attackers}</div>
          </div>
          <div class="combat-fx"></div>
        </div>
        <div class="combat-status">
          <span class="combat-abductions"></span>
          <span class="combat-phase"></span>
        </div>
        <div class="combat-ended hidden"></div>
      </div>
    `;
    root.querySelector('.combat-close')!.addEventListener('click', close);
    // il DOM è nuovo: gli elementi proiettile/flash precedenti sono spariti con esso
    projEls.clear();
    seenShots.clear();
    landedShots.clear();
    // ogni UFO in uno shadow root con l'asset animato (isola id/<style>, niente
    // collisioni fra istanze); il raggio si accende via `.on` in update().
    ufoArt.clear();
    turretList.length = 0;
    const arena = root.querySelector<HTMLElement>('.combat-arena')!;
    for (const u of battle.attackers) {
      const artEl = root.querySelector(`.combat-unit[data-key="u:${u.id}"] .combat-unit-art--ufo`);
      if (!artEl) continue;
      const shadow = artEl.attachShadow({ mode: 'open' });
      shadow.innerHTML = ufoArtRaw;
      const svg = shadow.querySelector('svg') as SVGSVGElement;
      svg.setAttribute('height', String(UFO_ART_HEIGHT_PX));
      svg.setAttribute('width', ((UFO_ART_HEIGHT_PX * 600) / 860).toFixed(0));
      ufoArt.set(u.id, svg);
      // due torrette al plasma agganciate agli hardpoint dell'UFO: overlay a livello
      // arena (così il bolide può attraversarla), ciascuna nel suo shadow root.
      for (const side of ['left', 'right'] as const) {
        const hardpoint = svg.querySelector(`#hardpoint-${side}`) as SVGGElement | null;
        if (!hardpoint) continue;
        const el = document.createElement('div');
        el.className = 'combat-turret';
        // il box host definisce il transform-origin (50% 37.5% = centro ettagono): tienilo
        // uguale alla taglia dell'SVG perché pivot e posizionamento restino coerenti.
        el.style.width = `${TURRET_W}px`;
        el.style.height = `${TURRET_H}px`;
        const tShadow = el.attachShadow({ mode: 'open' });
        tShadow.innerHTML = `<style>${TURRET_MODULE.fireStyleOneShot}</style>${TURRET_MODULE.raw}`;
        const tSvg = tShadow.querySelector('svg') as SVGSVGElement;
        tSvg.classList.add('weapon-module'); // scope dei selettori di fuoco `.weapon-module.on`
        // il CSS del documento NON entra nello shadow root: dimensiona l'SVG qui
        // (come per l'UFO), altrimenti resta alla taglia nativa 240×400.
        tSvg.setAttribute('width', String(TURRET_W));
        tSvg.setAttribute('height', String(TURRET_H));
        arena.appendChild(el);
        turretList.push({ ufoId: u.id, side, hardpoint, el, svg: tSvg });
      }
    }
    placeTurrets();
    void document.fonts.ready.then(() => placeTurrets()); // riposiziona a font caricati
  }

  // centro di un elemento (anche dentro uno shadow root) in coordinate relative all'arena
  function centerIn(el: Element, arenaRect: DOMRect): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - arenaRect.left, y: r.top + r.height / 2 - arenaRect.top };
  }

  // aggancia ogni torretta al suo hardpoint (pivot = centro ettagono = transform-origin
  // 50% 37.5%) e la ruota perché la canna punti al primo caccia difensore. Niente correzione
  // di scala: la finestra di scontro, a differenza del mockup, non è trasformata in scala.
  function placeTurrets(): void {
    const arena = root.querySelector<HTMLElement>('.combat-arena');
    const jetArt = root.querySelector<HTMLElement>('.combat-unit-art--jet');
    if (!arena || !jetArt) return;
    const arenaRect = arena.getBoundingClientRect();
    const target = centerIn(jetArt, arenaRect);
    for (const tr of turretList) {
      if (!tr.el.isConnected) continue;
      const c = centerIn(tr.hardpoint, arenaRect);
      tr.el.style.left = `${c.x - TURRET_W / 2}px`;
      tr.el.style.top = `${c.y - TURRET_H * 0.375}px`;
      const ang = Math.atan2(-(target.x - c.x), target.y - c.y) * (180 / Math.PI);
      tr.el.style.transform = `rotate(${ang}deg)`;
    }
  }

  // Disegna gli shot del motore appartenenti a questo scontro: ogni bolide vola dalla
  // volata della torretta che spara al caccia bersaglio, interpolato per `gameMinutes`
  // (coerente con pausa/accelerazione). Il danno NON è qui: lo applica il motore a `t1`.
  function renderShots(battle: Battle, shots: Shot[], gameMinutes: number): void {
    const arena = root.querySelector<HTMLElement>('.combat-arena');
    const fx = root.querySelector<HTMLElement>('.combat-fx');
    if (!arena || !fx) return;
    const arenaRect = arena.getBoundingClientRect();
    const attackerIds = new Set(battle.attackers.map(u => u.id));
    const alive = new Set<number>();
    for (const shot of shots) {
      if (!attackerIds.has(shot.ufoId)) continue; // shot di un altro scontro
      alive.add(shot.id);
      const tr = turretList.find(x => x.ufoId === shot.ufoId && x.side === shot.side);
      // lampo della torretta al primo avvistamento dello shot
      if (tr && !seenShots.has(shot.id)) {
        seenShots.add(shot.id);
        tr.svg.classList.add('on');
        window.setTimeout(() => tr.svg.classList.remove('on'), ON_DURATION_MS);
      }
      const jetUnit = root.querySelector<HTMLElement>(
        `.combat-unit[data-key="s:${shot.targetSquadronId}"]`,
      );
      const jetArt = jetUnit?.querySelector<HTMLElement>('.combat-unit-art--jet');
      const muzzle = tr?.svg.querySelector('#muzzle') ?? tr?.el;
      if (!tr || !jetArt || !muzzle) {
        removeProj(shot.id);
        continue;
      }
      const from = centerIn(muzzle, arenaRect);
      const to = centerIn(jetArt, arenaRect);
      const k = Math.min(1, Math.max(0, (gameMinutes - shot.t0) / Math.max(1e-6, shot.t1 - shot.t0)));
      if (k < 1) {
        const proj = ensureProj(shot.id, fx);
        const x = from.x + (to.x - from.x) * k;
        const y = from.y + (to.y - from.y) * k;
        const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        proj.style.left = `${x.toFixed(1)}px`;
        proj.style.top = `${y.toFixed(1)}px`;
        proj.style.transform = `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg)`;
      } else {
        removeProj(shot.id);
        if (!landedShots.has(shot.id)) {
          landedShots.add(shot.id);
          impactAt(to, jetUnit!, fx);
        }
      }
    }
    // pulizia di shot non più presenti
    for (const id of [...projEls.keys()]) if (!alive.has(id)) removeProj(id);
    for (const id of [...seenShots]) if (!alive.has(id)) seenShots.delete(id);
    for (const id of [...landedShots]) if (!alive.has(id)) landedShots.delete(id);
  }

  function ensureProj(id: number, fx: HTMLElement): HTMLDivElement {
    let el = projEls.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'combat-proj';
      fx.appendChild(el);
      projEls.set(id, el);
    }
    return el;
  }

  function removeProj(id: number): void {
    const el = projEls.get(id);
    if (el) {
      el.remove();
      projEls.delete(id);
    }
  }

  function clearProjs(): void {
    projEls.forEach(el => el.remove());
    projEls.clear();
    seenShots.clear();
    landedShots.clear();
  }

  function impactAt(
    pt: { x: number; y: number },
    jetUnit: HTMLElement | null,
    fx: HTMLElement,
  ): void {
    const burst = document.createElement('div');
    burst.className = 'combat-impact';
    burst.style.left = `${pt.x}px`;
    burst.style.top = `${pt.y}px`;
    fx.appendChild(burst);
    window.setTimeout(() => burst.remove(), 420);
    const art = jetUnit?.querySelector<HTMLElement>('.combat-unit-art--jet');
    if (art) {
      const flash = document.createElement('div');
      flash.className = 'combat-hitflash';
      art.appendChild(flash);
      window.setTimeout(() => flash.remove(), 360);
    }
    if (jetUnit) {
      jetUnit.classList.remove('combat-unit--struck');
      void jetUnit.offsetWidth; // forza il restart dell'animazione
      jetUnit.classList.add('combat-unit--struck');
    }
  }

  function patchUnits(
    units: { id: number; hp: number }[],
    kind: 's' | 'u',
    maxHp: number,
    faction: 'human' | 'alien',
  ): void {
    for (const unit of units) {
      const key = `${kind}:${unit.id}`;
      const el = root.querySelector<HTMLElement>(`.combat-unit[data-key="${key}"]`);
      if (!el) continue;
      const ratio = Math.max(0, Math.min(1, unit.hp / maxHp));
      const fill = el.querySelector<HTMLElement>('.combat-hp-fill')!;
      fill.style.width = `${(ratio * 100).toFixed(0)}%`;
      fill.style.background = hpColor(faction, ratio);
      const prev = prevHp.get(key);
      if (prev !== undefined && unit.hp < prev) {
        el.classList.remove('combat-unit--hit');
        void el.offsetWidth; // forza il restart dell'animazione
        el.classList.add('combat-unit--hit');
      }
      prevHp.set(key, unit.hp);
    }
  }

  function update(state: GameState, shots: Shot[], gameMinutes: number): void {
    if (root.classList.contains('hidden')) return;
    const battle = battleFor(state);
    if (!battle) {
      // scontro terminato: resta finché l'utente chiude
      clearProjs();
      const ended = root.querySelector<HTMLElement>('.combat-ended');
      if (ended) {
        ended.textContent = t('combat.ended');
        ended.classList.remove('hidden');
      }
      root.querySelector('.combat-box')?.classList.add('combat-box--ended');
      return;
    }
    const key = unitKey(battle);
    if (key !== lastKey) {
      lastKey = key;
      rebuild(state, battle);
    }
    placeTurrets(); // ri-aggancia/orienta ogni frame (segue layout/resize)
    patchUnits(battle.defenders, 's', CONFIG.squadron.hp, 'human');
    patchUnits(battle.attackers, 'u', CONFIG.ufoAbductor.hp, 'alien');
    renderShots(battle, shots, gameMinutes);
    const abducted = Math.floor(battle.attackers.reduce((n, u) => n + u.abducted, 0));
    root.querySelector('.combat-abductions')!.textContent = t('combat.abductions', { n: abducted });
    root.querySelector('.combat-phase')!.textContent = t('combat.phase', {
      phase: phaseLabel(dominantPhase(battle.attackers)),
    });
    // raggio traente attivo se qualcuno sta rapendo
    root
      .querySelector('.combat-box')!
      .classList.toggle('combat-box--abducting', battle.attackers.some(u => u.phase === 'abducting'));
    // raggio dell'asset (#beam) acceso per ogni UFO che sta rapendo
    for (const u of battle.attackers) {
      ufoArt.get(u.id)?.classList.toggle('on', u.phase === 'abducting');
    }
  }

  function open(id: string, state: GameState): void {
    cityId = id;
    lastKey = '';
    prevHp.clear();
    root.classList.remove('hidden');
    update(state, [], 0);
  }

  function close(): void {
    root.classList.add('hidden');
    cityId = null;
    clearProjs();
    opts.onClose?.();
  }

  function isOpen(): boolean {
    return !root.classList.contains('hidden');
  }

  // click sul fondale (fuori dal box) = chiusura
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });
  // capture-phase: Esc chiude solo la finestra e non raggiunge l'handler di
  // main.ts che azzera selezione/trasferimenti (come settings.ts)
  window.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape' && isOpen()) {
        close();
        event.stopPropagation();
      }
    },
    { capture: true },
  );

  return {
    open,
    close,
    isOpen,
    update,
    // al cambio lingua: header/etichette sono nel DOM ricostruito → forza la
    // ricostruzione al prossimo update (stato e fasi si riscrivono già ogni frame)
    refreshLabels() {
      if (isOpen()) lastKey = '';
    },
  };
}
