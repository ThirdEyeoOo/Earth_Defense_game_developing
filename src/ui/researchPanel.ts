import { t, type MessageKey } from '../i18n';
import {
  RESEARCH_BRANCH_ORDER,
  RESEARCH_CANVAS,
  RESEARCH_TREE,
  type ResearchBranch,
  type ResearchNode,
} from '../sim/researchTree';

// Pannello Ricerca: ANTEPRIMA DI SOLA STRUTTURA dell'albero (rami, nodi,
// prerequisiti) renderizzata come DAG in SVG. Nessuna funzionalità di gioco:
// è di sola lettura, si proverà così e poi si aggancerà la meccanica vera
// (avvio ricerca, avanzamento, effetti). Overlay/Esc come ui/encyclopedia.ts.

const NODE_W = 150;
const NODE_H = 42;
const HALF_W = NODE_W / 2;

// colori per ramo (presentazione UI). Definiti tutti e sei: i rami non ancora
// presenti in RESEARCH_BRANCH_ORDER semplicemente non vengono disegnati.
const BRANCH_COLOR: Record<ResearchBranch, { stroke: string; fill: string }> = {
  combat: { stroke: '#e0563f', fill: '#2a1c1c' },
  economy: { stroke: '#4fae6b', fill: '#16271a' },
  orbital: { stroke: '#4f8fd1', fill: '#13202e' },
  intel: { stroke: '#c9a14f', fill: '#272016' },
  network: { stroke: '#9b6fd1', fill: '#1f1a2b' },
  xeno: { stroke: '#d14f9b', fill: '#2a1622' },
};

const byId = new Map(RESEARCH_TREE.map(n => [n.id, n] as const));

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// spezza un titolo lungo in (al massimo) due righe, bilanciando sulle parole
function wrapTitle(text: string): string[] {
  if (text.length <= 18) return [text];
  const words = text.split(' ');
  if (words.length === 1) return [text];
  let first = '';
  let i = 0;
  while (i < words.length - 1 && (first + ' ' + words[i]).trim().length <= 18) {
    first = (first + ' ' + words[i]).trim();
    i++;
  }
  if (!first) {
    first = words[0];
    i = 1;
  }
  return [first, words.slice(i).join(' ')];
}

function edgeSvg(from: ResearchNode, to: ResearchNode): string {
  const x1 = from.pos.x + HALF_W;
  const x2 = to.pos.x - HALF_W;
  return `<line x1="${x1}" y1="${from.pos.y}" x2="${x2}" y2="${to.pos.y}" />`;
}

function nodeSvg(node: ResearchNode): string {
  const c = BRANCH_COLOR[node.branch];
  const x = node.pos.x - HALF_W;
  const y = node.pos.y - NODE_H / 2;
  const lines = wrapTitle(t(node.titleKey as MessageKey));
  const text =
    lines.length === 1
      ? `<text x="${node.pos.x}" y="${node.pos.y + 4}">${esc(lines[0])}</text>`
      : `<text x="${node.pos.x}" y="${node.pos.y - 3}">${esc(lines[0])}</text>` +
        `<text x="${node.pos.x}" y="${node.pos.y + 12}">${esc(lines[1])}</text>`;
  return `
    <g class="research-node">
      <title>${esc(t(node.descKey as MessageKey))}</title>
      <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="7"
            fill="${c.fill}" stroke="${c.stroke}" stroke-width="2" />
      ${text}
    </g>`;
}

function treeSvg(): string {
  const edges = RESEARCH_TREE.flatMap(node =>
    node.prereqs.map(pre => edgeSvg(byId.get(pre)!, node)),
  ).join('');
  const nodes = RESEARCH_TREE.map(nodeSvg).join('');
  return `
    <svg class="research-svg" viewBox="0 0 ${RESEARCH_CANVAS.width} ${RESEARCH_CANVAS.height}"
         preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(t('tech.title'))}">
      <defs>
        <marker id="research-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#5a6b8c" />
        </marker>
      </defs>
      <g class="research-edges" stroke="#5a6b8c" stroke-width="2" fill="none"
         marker-end="url(#research-arrow)">${edges}</g>
      ${nodes}
    </svg>`;
}

function legendSvg(): string {
  return RESEARCH_BRANCH_ORDER.map(branch => {
    const c = BRANCH_COLOR[branch];
    return `<span class="research-chip"><span class="research-swatch" style="background:${c.stroke}"></span>${t(
      `tech.branch.${branch}` as MessageKey,
    )}</span>`;
  }).join('');
}

export function createResearchPanel(root: HTMLElement): {
  toggle(): void;
  close(): void;
  isOpen(): boolean;
  refresh(): void;
} {
  function render(): void {
    root.innerHTML = `
      <div class="research-box">
        <div class="research-header">
          <div>
            <h1>${t('tech.title')}</h1>
            <p class="research-subtitle">${t('tech.subtitle')}</p>
          </div>
          <button id="research-close">${t('tech.close')}</button>
        </div>
        <div class="research-legend">${legendSvg()}</div>
        <div class="research-canvas">${treeSvg()}</div>
      </div>`;
    root.querySelector('#research-close')!.addEventListener('click', close);
  }

  function open(): void {
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

  // click sul fondale (fuori dal box) = chiusura
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });

  // capture-phase: Esc chiude solo questa finestra senza raggiungere l'handler
  // bubble di main.ts (che azzera selezione/trasferimenti)
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
    toggle,
    close,
    isOpen,
    refresh() {
      if (isOpen()) render();
    },
  };
}
