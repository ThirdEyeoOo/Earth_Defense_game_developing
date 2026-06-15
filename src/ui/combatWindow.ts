import f22Raw from '../../Assets/Umani/Velivoli/f22_raptor_animabile.svg?raw';
import ufoArtRaw from '../../Assets/Alieni/UFO/alien_abductor.svg?raw';
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

// Finestra di scontro stile FTL: visualizzazione cinematica (sola lettura) dello
// scontro che la sim sta già risolvendo su una città. Si apre dal badge sul globo
// e segue lo stato in tempo reale. Pattern dei pannelli (toggle/update) + chiusura
// Esc in capture-phase come settings.ts.
export function createCombatWindow(
  root: HTMLElement,
  opts: { onClose?: () => void } = {},
): {
  open(cityId: string, state: GameState): void;
  close(): void;
  isOpen(): boolean;
  update(state: GameState): void;
  refreshLabels(): void;
} {
  let cityId: string | null = null;
  let lastKey = ''; // ricostruisce il DOM solo quando cambia l'insieme di unità
  const prevHp = new Map<string, number>(); // 's:id' | 'u:id' → hp del frame precedente
  const ufoArt = new Map<number, SVGSVGElement>(); // id UFO → <svg> nello shadow (per toggle `.on`)

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
            <span class="combat-beam combat-beam--in"></span>
          </div>
          <div class="combat-side">
            <h3>${t('combat.attackers')}</h3>
            <div class="combat-units">${attackers}</div>
          </div>
        </div>
        <div class="combat-status">
          <span class="combat-abductions"></span>
          <span class="combat-phase"></span>
        </div>
        <div class="combat-ended hidden"></div>
      </div>
    `;
    root.querySelector('.combat-close')!.addEventListener('click', close);
    // ogni UFO in uno shadow root con l'asset animato (isola id/<style>, niente
    // collisioni fra istanze); il raggio si accende via `.on` in update().
    ufoArt.clear();
    for (const u of battle.attackers) {
      const artEl = root.querySelector(`.combat-unit[data-key="u:${u.id}"] .combat-unit-art--ufo`);
      if (!artEl) continue;
      const shadow = artEl.attachShadow({ mode: 'open' });
      shadow.innerHTML = ufoArtRaw;
      const svg = shadow.querySelector('svg') as SVGSVGElement;
      svg.setAttribute('height', String(UFO_ART_HEIGHT_PX));
      svg.setAttribute('width', ((UFO_ART_HEIGHT_PX * 600) / 860).toFixed(0));
      ufoArt.set(u.id, svg);
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

  function update(state: GameState): void {
    if (root.classList.contains('hidden')) return;
    const battle = battleFor(state);
    if (!battle) {
      // scontro terminato: resta finché l'utente chiude
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
    patchUnits(battle.defenders, 's', CONFIG.squadron.hp, 'human');
    patchUnits(battle.attackers, 'u', CONFIG.ufoAbductor.hp, 'alien');
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
    update(state);
  }

  function close(): void {
    root.classList.add('hidden');
    cityId = null;
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
