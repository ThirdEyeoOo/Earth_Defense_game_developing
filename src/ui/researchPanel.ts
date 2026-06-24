import { t, type MessageKey } from '../i18n';
import {
  RESEARCH_BRANCH_ORDER,
  RESEARCH_NODE_H,
  RESEARCH_NODE_W,
  RESEARCH_TREE,
  researchById,
  type ResearchBranch,
  type ResearchNode,
} from '../sim/researchTree';
import { RESOURCE_TYPES, type ResourceType } from '../sim/resources';
import type { GameState } from '../sim/state';
import { fmtInt } from './format';
import { RESEARCH_ICONS } from './researchIcons';
import { resourceIcon } from './resourceIcons';

// Pannello Ricerca: ricreazione del prototipo di design (Albero della Ricerca.html) —
// overlay DOM/CSS data-driven da RESEARCH_TREE. Campo zoomabile/trascinabile con nodi
// assoluti, fili generati dai prerequisiti, tooltip su hover e popover requisiti su click
// con ✓/✗. La conferma chiama `onUnlock` (→ cmdUnlockResearch in main.ts), che paga il
// costo e segna il nodo sbloccato; il pannello si ridisegna mostrando lo stato `done`.

// classe CSS di categoria (la palette del prototipo: combat→r, economy→g, orbital→b)
const CAT_CLASS: Record<ResearchBranch, string> = {
  combat: 'r',
  economy: 'g',
  orbital: 'b',
  intel: 'r',
  network: 'g',
  xeno: 'b',
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const HALF_H = RESEARCH_NODE_H / 2;

// icona "becher" del titolo (dal prototipo)
const BEAKER = `<svg viewBox="0 0 40 40" fill="none"><path d="M15 5 H25 M16.5 5 V14 L9 28 C7.5 31 9 34 12 34 H28 C31 34 32.5 31 31 28 L23.5 14 V5" fill="none" stroke="#cdd6e2" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path><path d="M12.5 22 L27.5 22 L31 28 C32.5 31 31 34 28 34 H12 C9 34 7.5 31 9 28 Z" fill="#3fa9e0"></path><circle cx="17" cy="28.5" r="2" fill="#bfe6fb"></circle><circle cx="23" cy="30.5" r="1.4" fill="#bfe6fb"></circle><circle cx="20.5" cy="25.5" r="1.1" fill="#bfe6fb"></circle><line x1="14" y1="5" x2="26" y2="5" stroke="#cdd6e2" stroke-width="2.6" stroke-linecap="round"></line></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const CROSS = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path></svg>`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tk(key: string): string {
  return t(key as MessageKey);
}

// font-size per nodo: i titoli lunghi del prototipo venivano rimpiccioliti
function nodeFontSize(title: string): string {
  if (title.length > 34) return 'font-size:11px;line-height:1.2;';
  if (title.length > 22) return 'font-size:13px;line-height:1.2;';
  return '';
}

// costo composito → HTML con SOLE ICONCINE (niente nomi risorsa): "🪙 200  15<ind>  10<tec>",
// o "Gratis". Il nome resta nel title per il tooltip al passaggio del mouse.
function costHtml(node: ResearchNode): string {
  const parts: string[] = [];
  if (node.cost.humt > 0) parts.push(`<span class="rq-cost"><span class="rq-coin">🪙</span>${node.cost.humt}</span>`);
  for (const [type, amount] of Object.entries(node.cost.resources)) {
    const rt = type as ResourceType;
    parts.push(
      `<span class="rq-cost" title="${esc(tk(`res.${rt}`))}">${amount}${resourceIcon(rt)}</span>`,
    );
  }
  return parts.length ? parts.join('') : esc(tk('tech.free'));
}

// requisiti (nodi prerequisito) → SOLE ICONCINE dei nodi (nome nel title); "Nessuno" se vuoto
function prereqHtml(node: ResearchNode): string {
  if (!node.prereqs.length) return esc(tk('tech.req.none'));
  return node.prereqs
    .map(p => {
      const pr = researchById.get(p)!;
      const ico = pr.icon ? RESEARCH_ICONS[pr.icon] : '';
      const name = esc(tk(pr.titleKey));
      return ico
        ? `<span class="rq-prereq" title="${name}">${ico}</span>`
        : `<span class="rq-prereq">${name}</span>`;
    })
    .join('');
}

// filo di prerequisito: bordo destro del prereq → bordo sinistro del nodo, curva a S
function wirePath(from: ResearchNode, to: ResearchNode): string {
  const sx = from.pos.x + RESEARCH_NODE_W;
  const sy = from.pos.y + HALF_H;
  const ex = to.pos.x;
  const ey = to.pos.y + HALF_H;
  const mx = (sx + ex) / 2;
  return `<path d="M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}" fill="none" stroke="#56688a" stroke-width="2" marker-end="url(#research-ah)"></path>`;
}

export interface ResearchPanelOptions {
  getState: () => GameState | undefined;
  // avvia la ricerca del nodo: ritorna true se riuscito (costo pagato all'avvio), false
  // altrimenti (main.ts mostra l'errore). I nodi a 0 ore si sbloccano subito; gli altri
  // diventano la ricerca in corso e avanzano nel tempo. Il pannello aggiorna lo stato visivo.
  onStart: (nodeId: string) => boolean;
}

export function createResearchPanel(
  root: HTMLElement,
  opts: ResearchPanelOptions,
): {
  toggle(): void;
  close(): void;
  isOpen(): boolean;
  refresh(): void;
  updateAffordability(): void;
} {
  // stato della vista (zoom/pan): persiste tra i refresh, si azzera a ogni apertura
  let z = 1;
  let tx = 0;
  let ty = 0;

  // riferimenti vivi dopo render()
  let scaler: HTMLElement;
  let stage: HTMLElement;
  let field: HTMLElement;
  let inner: HTMLElement;
  let tip: HTMLElement;
  let reqbox: HTMLElement;
  let resBox: HTMLElement;
  let selectedNode: HTMLElement | null = null;
  let reqNodeId: string | null = null;
  let panning = false;
  let moved = false;

  function unlockedIds(): string[] {
    return opts.getState()?.research.unlocked ?? [];
  }

  function selectedId(): string | null {
    return opts.getState()?.research.selected ?? null;
  }
  // true se c'è un'altra ricerca in corso (una alla volta): blocca l'avvio di altri nodi
  function isBusy(node: ResearchNode): boolean {
    const sel = selectedId();
    return sel !== null && sel !== node.id;
  }

  function nodeState(
    node: ResearchNode,
  ): 'done' | 'locked' | 'available' | 'placeholder' | 'researching' {
    if (node.placeholder) return 'placeholder';
    if (selectedId() === node.id) return 'researching';
    const unlocked = unlockedIds();
    if (unlocked.includes(node.id)) return 'done';
    if (!node.prereqs.every(p => unlocked.includes(p))) return 'locked';
    return 'available';
  }

  // frazione 0..1 di avanzamento del nodo in corso (per le barre di progresso)
  function progressFrac(node: ResearchNode): number {
    const state = opts.getState();
    if (!state || node.researchHours <= 0) return 0;
    return Math.max(0, Math.min(1, state.research.progress / node.researchHours));
  }

  // true se le risorse/HumT attuali bastano a pagare il costo del nodo
  function canAfford(node: ResearchNode): boolean {
    const state = opts.getState();
    if (!state) return false;
    if (state.humt < node.cost.humt) return false;
    return Object.entries(node.cost.resources).every(
      ([type, amount]) => state.resources[type as ResourceType] >= (amount ?? 0),
    );
  }

  function nodeHtml(node: ResearchNode): string {
    const cls = ['node', CAT_CLASS[node.branch]];
    if (node.icon) cls.push('with-icon');
    if (node.isResult) cls.push('result');
    // livelli di "accensione": done (ricercato) → researching (in corso, barra) → ready
    // (avviabile ORA: risorse ok e nessun'altra ricerca in corso) → off (bloccato/non pagabile/
    // occupato/placeholder, grigio spento)
    const st = nodeState(node);
    if (st === 'done') cls.push('done');
    else if (st === 'researching') cls.push('researching');
    else if (st === 'available' && !isBusy(node) && canAfford(node)) cls.push('ready');
    else cls.push('off');
    const title = tk(node.titleKey);
    const icon = node.icon ? `<div class="ic">${RESEARCH_ICONS[node.icon] ?? ''}</div>` : '';
    const prog =
      st === 'researching'
        ? `<div class="node-prog"><i style="width:${(progressFrac(node) * 100).toFixed(1)}%"></i></div>`
        : '';
    return `<div class="${cls.join(' ')}" data-node="${node.id}"
      style="left:${node.pos.x}px;top:${node.pos.y}px;${nodeFontSize(title)}">${icon}<span>${esc(title)}</span>${prog}</div>`;
  }

  function bandsHtml(): string {
    // posizioni delle bande/divisori dal prototipo
    return (
      `<div class="band-label r" style="top:127px;">${esc(tk('tech.branch.combat'))}</div>` +
      `<div class="divider" style="top:381px;"></div>` +
      `<div class="band-label g" style="top:390px;">${esc(tk('tech.branch.economy'))}</div>` +
      `<div class="divider" style="top:559px;"></div>` +
      `<div class="band-label b" style="top:568px;">${esc(tk('tech.branch.orbital'))}</div>`
    );
  }

  function legendHtml(): string {
    return RESEARCH_BRANCH_ORDER.map(
      b => `<div class="item"><span class="dot ${CAT_CLASS[b]}"></span>${esc(tk(`tech.branch.${b}`))}</div>`,
    ).join('');
  }

  function wiresHtml(): string {
    return RESEARCH_TREE.flatMap(node =>
      node.prereqs.map(p => wirePath(researchById.get(p)!, node)),
    ).join('');
  }

  // widget delle scorte globali nella striscia a sinistra: SOLO iconcine + valore (niente
  // nomi), HumT in testa. I valori si aggiornano in tempo reale (vedi updateResources).
  function resourcesWidgetHtml(): string {
    const coin = `<div class="rr-item" title="HumT"><span class="rr-coin">🪙</span><span class="rr-val" data-res="humt">0</span></div>`;
    const rows = RESOURCE_TYPES.map(
      type =>
        `<div class="rr-item" title="${esc(tk(`res.${type}`))}">${resourceIcon(type)}<span class="rr-val" data-res="${type}">0</span></div>`,
    ).join('');
    return coin + rows;
  }

  // aggiorna i numeri delle scorte (HumT + 10 risorse) senza ridisegnare il widget
  function updateResources(): void {
    const state = opts.getState();
    if (!state || !resBox) return;
    const set = (key: string, v: number): void => {
      const el = resBox.querySelector<HTMLElement>(`.rr-val[data-res="${key}"]`);
      if (el) el.textContent = fmtInt(Math.floor(v));
    };
    set('humt', state.humt);
    for (const type of RESOURCE_TYPES) set(type, state.resources[type]);
  }

  function render(): void {
    root.innerHTML = `
      <div id="research-scaler">
        <div class="research-stage" id="research-stage">
          <div class="title">${BEAKER}<span>${esc(tk('tech.title'))}</span></div>
          <div class="subtitle">${esc(tk('tech.subtitle'))}</div>
          <div class="legend">${legendHtml()}</div>
          <button class="chiudi" id="research-close">${esc(tk('tech.close'))}</button>
          <div class="header-bg"></div>
          <div class="field" id="research-field"><div class="field-inner" id="research-field-inner">
            <svg class="wires" viewBox="0 0 913 688" preserveAspectRatio="none">
              <defs>
                <marker id="research-ah" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                  <path d="M0,0 L9,4.5 L0,9 Z" fill="#56688a"></path>
                </marker>
              </defs>
              ${wiresHtml()}
            </svg>
            ${bandsHtml()}
            ${RESEARCH_TREE.map(nodeHtml).join('')}
          </div></div>
          <div class="zoom-ctrl">
            <button id="research-zout" title="${esc(tk('tech.zoom.out'))}">&minus;</button>
            <button id="research-zreset" title="${esc(tk('tech.zoom.reset'))}">&#x21bb;</button>
            <button id="research-zin" title="${esc(tk('tech.zoom.in'))}">&plus;</button>
          </div>
          <div class="hint">${esc(tk('tech.hint'))}</div>
          <div class="tooltip" id="research-tip"></div>
          <div class="reqbox" id="research-reqbox"></div>
        </div>
        <div class="research-resources" id="research-resources">${resourcesWidgetHtml()}</div>
      </div>`;

    scaler = root.querySelector('#research-scaler')!;
    stage = root.querySelector('#research-stage')!;
    field = root.querySelector('#research-field')!;
    inner = root.querySelector('#research-field-inner')!;
    tip = root.querySelector('#research-tip')!;
    reqbox = root.querySelector('#research-reqbox')!;
    resBox = root.querySelector('#research-resources')!;
    selectedNode = null;
    reqNodeId = null;

    root.querySelector('#research-close')!.addEventListener('click', close);
    wireNodes();
    wireZoomPan();
    applyTransform();
    fit();
    updateResources();
  }

  // ---- nodi: hover (tooltip) + click (popover requisiti) ----
  function wireNodes(): void {
    for (const el of stage.querySelectorAll<HTMLElement>('.node')) {
      const id = el.dataset.node!;
      const node = researchById.get(id)!;
      el.addEventListener('mouseenter', () => {
        if (!reqNodeId) showTip(el, node);
      });
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (moved) return; // un drag che termina sul nodo non conta come click
        if (node.placeholder || nodeState(node) === 'done') return; // niente popover
        if (reqNodeId === id) closeReq();
        else openReq(el, node);
      });
    }
  }

  function showTip(el: HTMLElement, node: ResearchNode): void {
    tip.textContent = tk(node.descKey);
    const sr = stage.getBoundingClientRect();
    const kx = 913 / sr.width;
    const ky = 688 / sr.height;
    const nr = el.getBoundingClientRect();
    const cx = (nr.left + nr.width / 2 - sr.left) * kx;
    const topLocal = (nr.top - sr.top) * ky;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = cx - w / 2;
    left = Math.max(8, Math.min(913 - w - 8, left));
    tip.style.left = `${left}px`;
    tip.style.top = `${topLocal - h - 12}px`;
    tip.style.setProperty('--ax', `${cx - left}px`);
    requestAnimationFrame(() => tip.classList.add('show'));
  }
  function hideTip(): void {
    tip.classList.remove('show');
  }

  function openReq(el: HTMLElement, node: ResearchNode): void {
    hideTip();
    if (selectedNode) selectedNode.classList.remove('selected');
    el.classList.add('selected');
    stage.classList.add('has-selection');
    selectedNode = el;
    reqNodeId = node.id;

    const st = nodeState(node);
    if (st === 'researching') {
      // ricerca in corso: mostra l'avanzamento (aggiornato live da updateAffordability)
      reqbox.innerHTML = `
        <div class="reqhead">${esc(tk('tech.researching'))}</div>
        <div class="node-prog big"><i id="research-reqprog" style="width:${(progressFrac(node) * 100).toFixed(1)}%"></i></div>
        <div class="reqacts">
          <button class="rq no" id="research-no" title="${esc(tk('tech.cancel'))}">${CROSS}</button>
        </div>`;
    } else {
      const busy = isBusy(node);
      const canConfirm = st === 'available' && !busy && canAfford(node);
      reqbox.innerHTML = `
        <div class="reqhead">${esc(tk('tech.requirements'))}<span class="reqval">${prereqHtml(node)}</span></div>
        <div class="reqhead">${esc(tk('tech.cost'))}<span class="reqval">${costHtml(node)}</span></div>
        ${node.researchHours > 0 ? `<div class="reqhead">${esc(tk('tech.time'))}<span class="reqval">${esc(t('tech.hours', { n: node.researchHours }))}</span></div>` : ''}
        ${st === 'locked' ? `<div class="reqhead reqlocked">${esc(tk('tech.locked'))}</div>` : ''}
        ${busy ? `<div class="reqhead reqlocked">${esc(tk('tech.busy'))}</div>` : ''}
        <div class="reqacts">
          <button class="rq ok" id="research-ok" title="${esc(tk('tech.start'))}" ${canConfirm ? '' : 'disabled'}>${CHECK}</button>
          <button class="rq no" id="research-no" title="${esc(tk('tech.cancel'))}">${CROSS}</button>
        </div>`;
    }
    reqbox.querySelector('#research-ok')?.addEventListener('click', e => {
      e.stopPropagation();
      if (opts.onStart(node.id)) {
        closeReq();
        render(); // ridisegna: il nodo è ora `done` (0 ore) o `researching` (a tempo)
      }
    });
    reqbox.querySelector('#research-no')!.addEventListener('click', e => {
      e.stopPropagation();
      closeReq();
    });

    reqbox.classList.add('show');
    const sr = stage.getBoundingClientRect();
    const kx = 913 / sr.width;
    const ky = 688 / sr.height;
    const nr = el.getBoundingClientRect();
    const cx = (nr.left + nr.width / 2 - sr.left) * kx;
    const topLocal = (nr.top - sr.top) * ky;
    const bottomLocal = (nr.bottom - sr.top) * ky;
    const w = reqbox.offsetWidth;
    const h = reqbox.offsetHeight;
    let left = cx - w / 2;
    left = Math.max(8, Math.min(913 - w - 8, left));
    reqbox.style.left = `${left}px`;
    // sotto il nodo se c'è spazio, altrimenti sopra (i nodi bassi clipperebbero in fondo)
    if (bottomLocal + 12 + h <= 688) {
      reqbox.style.top = `${bottomLocal + 12}px`;
      reqbox.classList.remove('above');
    } else {
      reqbox.style.top = `${topLocal - h - 12}px`;
      reqbox.classList.add('above');
    }
    reqbox.style.setProperty('--ax', `${cx - left}px`);
  }
  function closeReq(): void {
    reqbox.classList.remove('show');
    if (selectedNode) selectedNode.classList.remove('selected');
    stage.classList.remove('has-selection');
    selectedNode = null;
    reqNodeId = null;
  }

  // ---- zoom & pan sul campo ----
  function applyTransform(): void {
    inner.style.transform = `translate(${tx}px,${ty}px) scale(${z})`;
  }
  function localPoint(clientX: number, clientY: number): { x: number; y: number } {
    const r = field.getBoundingClientRect();
    const k = 913 / r.width;
    return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
  }
  function zoomAt(cx: number, cy: number, ns: number): void {
    ns = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ns));
    tx = cx - (cx - tx) * (ns / z);
    ty = cy - (cy - ty) * (ns / z);
    z = ns;
    applyTransform();
  }
  function wireZoomPan(): void {
    field.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        const p = localPoint(e.clientX, e.clientY);
        zoomAt(p.x, p.y, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      },
      { passive: false },
    );
    const btnZoom = (f: number): void => {
      const r = field.getBoundingClientRect();
      const c = localPoint(r.left + r.width / 2, r.top + r.height / 2);
      zoomAt(c.x, c.y, z * f);
    };
    root.querySelector('#research-zin')!.addEventListener('click', () => btnZoom(1.2));
    root.querySelector('#research-zout')!.addEventListener('click', () => btnZoom(1 / 1.2));
    root.querySelector('#research-zreset')!.addEventListener('click', () => {
      z = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    });

    let sx = 0;
    let sy = 0;
    let stx = 0;
    let sty = 0;
    field.addEventListener('pointerdown', e => {
      // azzera SEMPRE moved a inizio interazione: altrimenti, dopo un pan (moved=true), il
      // pointerdown su un nodo uscirebbe prima di resettarlo e il suo click verrebbe scartato
      moved = false;
      if ((e.target as HTMLElement).closest('.node')) return; // i click sui nodi restano validi
      panning = true;
      sx = e.clientX;
      sy = e.clientY;
      stx = tx;
      sty = ty;
      field.classList.add('panning');
      field.setPointerCapture(e.pointerId);
    });
    field.addEventListener('pointermove', e => {
      if (!panning) return;
      const r = field.getBoundingClientRect();
      const k = 913 / r.width;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      tx = stx + dx * k;
      ty = sty + dy * k;
      applyTransform();
    });
    const endPan = (): void => {
      panning = false;
      field.classList.remove('panning');
    };
    field.addEventListener('pointerup', endPan);
    field.addEventListener('pointercancel', endPan);
  }

  // scala lo stage per stare nel viewport (come il prototipo)
  function fit(): void {
    if (!scaler) return;
    const s = Math.min(window.innerWidth / 953, window.innerHeight / 728, 1.3);
    scaler.style.transform = `scale(${s})`;
  }

  // ---- ciclo di vita ----
  function open(): void {
    z = 1;
    tx = 0;
    ty = 0;
    render();
    root.classList.remove('hidden');
  }
  function close(): void {
    root.classList.add('hidden');
  }
  function isOpen(): boolean {
    return !root.classList.contains('hidden');
  }
  function toggle(): void {
    if (isOpen()) close();
    else open();
  }

  // click sul fondale (fuori dallo stage) = chiusura
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });
  // click fuori dal popover (ma non su un nodo) = chiudi il popover
  root.addEventListener('click', event => {
    if (!reqbox || reqbox.classList.contains('show') === false) return;
    const target = event.target as HTMLElement;
    if (reqbox.contains(target) || target.closest('.node')) return;
    closeReq();
  });
  // Esc chiude solo questa finestra (capture: non raggiunge l'handler di main.ts)
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
  window.addEventListener('resize', () => {
    if (isOpen()) fit();
  });

  // riconcilia OGNI nodo col suo stato corrente SENZA ridisegnare (preserva hover/pan/popover):
  // ready/off in tempo reale, e soprattutto le transizioni guidate dal tick — un nodo in corso
  // diventa `done` da solo a fine ricerca, con la barra di avanzamento che cresce ogni frame.
  function updateAffordability(): void {
    if (!isOpen() || !stage) return;
    updateResources(); // scorte globali in tempo reale nel widget a sinistra
    for (const el of stage.querySelectorAll<HTMLElement>('.node')) {
      const node = researchById.get(el.dataset.node!);
      if (!node) continue;
      const st = nodeState(node);
      const ready = st === 'available' && !isBusy(node) && canAfford(node);
      el.classList.toggle('done', st === 'done');
      el.classList.toggle('researching', st === 'researching');
      el.classList.toggle('ready', ready);
      el.classList.toggle('off', !(st === 'done' || st === 'researching' || ready));
      // barra di avanzamento: presente solo mentre il nodo è in corso
      let bar = el.querySelector<HTMLElement>('.node-prog');
      if (st === 'researching') {
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'node-prog';
          bar.innerHTML = '<i></i>';
          el.appendChild(bar);
        }
        bar.querySelector('i')!.style.width = `${(progressFrac(node) * 100).toFixed(1)}%`;
      } else if (bar) {
        bar.remove();
      }
    }
    // popover aperto sul nodo in corso: aggiorna la sua barra
    const reqprog = reqbox?.querySelector<HTMLElement>('#research-reqprog');
    if (reqprog && reqNodeId) {
      const node = researchById.get(reqNodeId);
      if (node) reqprog.style.width = `${(progressFrac(node) * 100).toFixed(1)}%`;
    }
  }

  return {
    toggle,
    close,
    isOpen,
    refresh() {
      if (isOpen()) render();
    },
    updateAffordability,
  };
}
