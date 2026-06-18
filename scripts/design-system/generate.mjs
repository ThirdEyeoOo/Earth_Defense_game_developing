// Genera il catalogo design-system del gioco (card HTML con marker @dsCard) in
// design-system/out/. NON usa LLM: è deterministico.
//   - Token  : da tokens.json (colori, font, spaziature, layer)
//   - Asset  : inlina gli SVG di Assets/ (commenti XML rimossi: il sanitizer di
//              Claude Design rifiuta la sequenza "--" nei commenti)
//   - Componente: rende i componenti UI REALI (harness.ts) con stato finto via
//              dev server Vite + Chrome headless (--dump-dom), così non divergono.
// Uso: node scripts/design-system/generate.mjs
import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = join(ROOT, 'design-system', 'out');

const tokens = JSON.parse(readFileSync(join(HERE, 'tokens.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(HERE, 'cards.json'), 'utf8'));
const GAME_CSS = readFileSync(join(ROOT, 'src', 'ui', 'style.css'), 'utf8');

// ---------- font (base64) per card autosufficienti su Claude Design ----------
function fontFace(family, weight, file) {
  const path = join(ROOT, 'node_modules', '@fontsource', family.toLowerCase(), 'files', file);
  if (!existsSync(path)) return '';
  const b64 = readFileSync(path).toString('base64');
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}
const FONTS_CSS = [
  fontFace('Michroma', 400, 'michroma-latin-400-normal.woff2'),
  fontFace('Orbitron', 400, 'orbitron-latin-400-normal.woff2'),
  fontFace('Orbitron', 700, 'orbitron-latin-700-normal.woff2'),
].join('\n');

// neutralizza il posizionamento fixed dei pannelli così stanno dentro la card
const OVERRIDE_CSS = `
  body{margin:0;background:#05080f;color:#cfe3ff;font-family:'Michroma',system-ui,sans-serif;padding:18px;overflow:auto;}
  .ds-stage{position:relative;}
  .ds-stage #hud,.ds-stage #bottom-bar,.ds-stage #radar-panel,.ds-stage #balance-panel,.ds-stage #city-panel{
    position:static!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;max-height:none!important;margin:0 auto;}
  .ds-stage #end-screen,.ds-stage #settings-modal,.ds-stage #encyclopedia-modal{
    position:relative!important;inset:auto!important;min-height:320px;border-radius:8px;}
`;

function stripSvgComments(svg) {
  return svg.replace(/<!--[\s\S]*?-->/g, '');
}

function card({ group, name, width = 600, height = 400, body, extraCss = '' }) {
  return `<!-- @dsCard group="${group}" name="${name}" width="${width}" height="${height}" -->
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>${name}</title>
<style>
${FONTS_CSS}
${GAME_CSS}
${OVERRIDE_CSS}
${extraCss}
</style>
</head>
<body>
<div class="ds-stage">
${body}
</div>
</body>
</html>
`;
}

const written = [];
function emit(relPath, group, name, html) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html, 'utf8');
  written.push({ path: relPath.replace(/\\/g, '/'), group, name });
}

// ----------------------------- card TOKEN -----------------------------
function colorCard() {
  const groups = Object.entries(tokens.colors)
    .map(([label, list]) => {
      const swatches = list
        .map(
          c => `
        <div class="ds-swatch">
          <div class="ds-chip" style="background:${c.value}"></div>
          <div class="ds-meta"><strong>${c.name}</strong><code>${c.value}</code><span>${c.use}</span></div>
        </div>`,
        )
        .join('');
      return `<h3>${label}</h3><div class="ds-swatch-grid">${swatches}</div>`;
    })
    .join('');
  const css = `
    h2{margin:0 0 14px;font-size:18px;color:#ffd76a;}
    h3{font-size:13px;color:#8aa3c4;margin:18px 0 8px;}
    .ds-swatch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
    .ds-swatch{display:flex;gap:10px;align-items:center;background:#0b1424;border:1px solid #1d3450;border-radius:6px;padding:8px;}
    .ds-chip{width:42px;height:42px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);flex:0 0 auto;}
    .ds-meta{display:flex;flex-direction:column;font-size:11px;line-height:1.45;}
    .ds-meta code{color:#9fc3e8;}
    .ds-meta span{color:#7f93b3;}
  `;
  emit('tokens/colori.html', 'Token', 'Colori', card({
    group: 'Token', name: 'Colori', width: 900, height: 760,
    body: `<h2>Tavolozza Earth Defense</h2>${groups}`, extraCss: css,
  }));
}

function typographyCard() {
  const rows = tokens.fonts
    .map(
      f => `
      <div class="ds-type">
        <div class="ds-type-head"><strong>${f.name}</strong><span>${f.use}</span></div>
        <div class="ds-type-sample" style="font-family:${f.stack}">EARTH DEFENSE 0123456789</div>
        <div class="ds-type-sample ds-small" style="font-family:${f.stack}">Difesa planetaria · Humanity Treasure · QG</div>
        <code>${f.stack}</code>
      </div>`,
    )
    .join('');
  const css = `
    h2{margin:0 0 14px;font-size:18px;color:#ffd76a;}
    .ds-type{background:#0b1424;border:1px solid #1d3450;border-radius:6px;padding:14px 16px;margin-bottom:12px;}
    .ds-type-head{display:flex;justify-content:space-between;font-size:12px;color:#8aa3c4;margin-bottom:8px;}
    .ds-type-sample{font-size:26px;margin:6px 0;}
    .ds-type-sample.ds-small{font-size:14px;color:#9fc3e8;}
    code{color:#9fc3e8;font-size:11px;}
  `;
  emit('tokens/tipografia.html', 'Token', 'Tipografia', card({
    group: 'Token', name: 'Tipografia', width: 760, height: 420,
    body: `<h2>Font</h2>${rows}`, extraCss: css,
  }));
}

function layoutCard() {
  const spacing = tokens.spacing
    .map(s => `<div class="ds-sp"><div class="ds-sp-bar" style="width:${s.px}px"></div><code>${s.name} · ${s.px}px</code></div>`)
    .join('');
  const radii = tokens.radii
    .map(r => `<div class="ds-rad"><div class="ds-rad-box" style="border-radius:${r.px}px"></div><code>${r.name} · ${r.px}px</code></div>`)
    .join('');
  const layers = tokens.layers
    .map(l => `<tr><td><code>z ${l.z}</code></td><td>${l.name}</td></tr>`)
    .join('');
  const css = `
    h2{margin:0 0 14px;font-size:18px;color:#ffd76a;}
    h3{font-size:13px;color:#8aa3c4;margin:18px 0 8px;}
    .ds-sp{display:flex;align-items:center;gap:10px;margin:4px 0;}
    .ds-sp-bar{height:14px;background:#2c4a73;border-radius:3px;}
    .ds-rad{display:inline-flex;flex-direction:column;align-items:center;gap:6px;margin:0 14px 8px 0;}
    .ds-rad-box{width:46px;height:46px;background:#15263f;border:1px solid #2c4a73;}
    code{color:#9fc3e8;font-size:11px;}
    table{border-collapse:collapse;font-size:12px;}
    td{padding:3px 12px 3px 0;}
  `;
  emit('tokens/layout.html', 'Token', 'Spaziature & layer', card({
    group: 'Token', name: 'Spaziature & layer', width: 640, height: 520,
    body: `<h2>Spaziature</h2><div>${spacing}</div><h3>Raggi</h3><div>${radii}</div><h3>Livelli (z-index)</h3><table>${layers}</table>`,
    extraCss: css,
  }));
}

// ----------------------------- card ASSET -----------------------------
function svgTile(label, svg, tileCss = '') {
  return `<figure class="ds-tile" style="${tileCss}"><div class="ds-tile-art">${stripSvgComments(svg)}</div><figcaption>${label}</figcaption></figure>`;
}
function readSvg(rel) {
  const p = join(ROOT, 'Assets', rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}
function svgsInDir(rel) {
  const dir = join(ROOT, 'Assets', rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.svg'))
    .map(f => ({ label: f.replace(/\.svg$/i, ''), svg: readFileSync(join(dir, f), 'utf8') }));
}

const ASSET_CSS = `
  h2{margin:0 0 14px;font-size:18px;color:#ffd76a;}
  .ds-grid{display:flex;flex-wrap:wrap;gap:14px;}
  .ds-tile{margin:0;background:#0b1424;border:1px solid #1d3450;border-radius:6px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;}
  .ds-tile-art{display:flex;align-items:center;justify-content:center;}
  .ds-tile-art svg{display:block;}
  figcaption{font-size:11px;color:#8aa3c4;text-align:center;max-width:160px;word-break:break-word;}
`;

function assetGridCard(file, group, name, dirRel, { width, height, svgCss }) {
  const items = svgsInDir(dirRel);
  if (!items.length) return;
  const body = `<h2>${name}</h2><div class="ds-grid">${items.map(i => svgTile(i.label, i.svg)).join('')}</div>`;
  emit(`assets/${file}`, group, name, card({
    group, name, width, height,
    body, extraCss: `${ASSET_CSS}\n.ds-tile-art svg{${svgCss}}`,
  }));
}

function assetSingleCard(file, group, name, rel, { width, height, svgCss }) {
  const svg = readSvg(rel);
  if (!svg) return;
  const body = `<h2>${name}</h2><div class="ds-grid">${svgTile(name, svg)}</div>`;
  emit(`assets/${file}`, group, name, card({
    group, name, width, height,
    body, extraCss: `${ASSET_CSS}\n.ds-tile-art svg{${svgCss}}`,
  }));
}

function assetCards() {
  assetGridCard('icone-risorsa.html', 'Asset', 'Icone risorsa', 'Widgets/Risorse', { width: 720, height: 320, svgCss: 'width:48px;height:48px;' });
  assetGridCard('pulsanti-inferiore.html', 'Asset', 'Pulsanti barra inferiore', 'Widgets/Barra_Menu_Inferiore/Pulsanti', { width: 720, height: 240, svgCss: 'width:190px;height:auto;' });
  assetGridCard('pulsanti-superiore.html', 'Asset', 'Pulsanti barra superiore', 'Widgets/Barra_Menu_Superiore', { width: 360, height: 220, svgCss: 'width:48px;height:48px;' });
  assetGridCard('barre-hp.html', 'Asset', 'Barre HP', 'Widgets/Barre', { width: 640, height: 260, svgCss: 'width:240px;height:auto;' });
  assetSingleCard('badge-scontro.html', 'Asset', 'Badge scontro', 'Widgets/badge-scontro.svg', { width: 240, height: 220, svgCss: 'width:64px;height:64px;' });
  assetSingleCard('f22-raptor.html', 'Asset', 'Caccia F-22', 'Umani/Velivoli/f22_raptor_animabile.svg', { width: 360, height: 420, svgCss: 'height:320px;width:auto;' });
  assetSingleCard('ufo-abductor.html', 'Asset', 'UFO abductor', 'Alieni/UFO/alien_abductor.svg', { width: 420, height: 480, svgCss: 'width:300px;height:auto;' });
  assetSingleCard('logo-intro.html', 'Asset', 'Logo intro', 'Intro/Logo_intro.svg', { width: 700, height: 460, svgCss: 'width:600px;height:auto;' });
}

// --------------------------- card COMPONENTE ---------------------------
function findChrome() {
  if (process.env.DS_CHROME && existsSync(process.env.DS_CHROME)) return process.env.DS_CHROME;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find(c => existsSync(c)) ?? 'chrome';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP_PORT = Number(process.env.DS_CDP_PORT ?? 9412);

// Driver CDP minimale (niente dipendenze): naviga l'harness servito da Vite e
// fa polling del segnale window.__DS_READY con timeout proprio. Più affidabile
// di --dump-dom, che attende l'evento "load" (su pagine-modulo non scatta).
async function componentCards() {
  const chrome = findChrome();
  const profileDir = join(tmpdir(), `ed-ds-chrome-${process.pid}`);
  mkdirSync(profileDir, { recursive: true });
  const server = await createServer({
    root: ROOT,
    logLevel: 'warn',
    server: { host: '127.0.0.1', hmr: false },
  });
  await server.listen();
  const base = server.resolvedUrls.local[0]; // termina con /
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${CDP_PORT}`, 'about:blank',
  ], { stdio: 'ignore' });

  let ok = 0;
  let ws;
  try {
    // attendi l'endpoint CDP e il target "page"
    let page;
    for (let i = 0; i < 50 && !page; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        page = (await r.json()).find(t => t.type === 'page');
      } catch {
        /* Chrome non ancora pronto */
      }
      if (!page) await sleep(200);
    }
    if (!page) throw new Error('Chrome CDP non raggiungibile');

    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    let mid = 0;
    const pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise(res => {
        const id = ++mid;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = expression =>
      send('Runtime.evaluate', { expression, returnByValue: true }).then(
        r => r.result?.result?.value,
      );

    await send('Page.enable');
    await send('Runtime.enable');

    for (const c of cards.components) {
      process.stdout.write(`  · ${c.id} … `);
      await send('Page.navigate', {
        url: `${base}scripts/design-system/harness.html?component=${c.id}`,
      });
      let ready = false;
      for (let i = 0; i < 80 && !ready; i++) {
        ready = (await evaluate('window.__DS_READY === true')) === true;
        if (!ready) await sleep(150);
      }
      const inner = (
        (await evaluate("(document.querySelector('.ds-stage')||{}).innerHTML || ''")) || ''
      ).trim();
      if (!ready || inner.length < 20) {
        console.log('vuoto (saltato)');
        continue;
      }
      emit(`components/${c.id}.html`, 'Componente', c.name, card({
        group: 'Componente', name: c.name, width: c.width, height: c.height, body: inner,
      }));
      console.log(`ok (${inner.length} byte)`);
      ok++;
    }
  } finally {
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    proc.kill();
    await server.close();
    // Chrome può non aver ancora rilasciato il profilo: la pulizia non è critica
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* profilo temporaneo: verrà rimosso dal sistema */
    }
  }
  return ok;
}

// ------------------------- brand font (per Claude Design) -------------------------
// I file woff2 reali + un fonts.css con @font-face su percorsi-file: così il
// design system di Claude Design ha i "brand font" e non usa sostituti.
function brandFonts() {
  const fontsDir = join(OUT, 'fonts');
  mkdirSync(fontsDir, { recursive: true });
  const copies = [
    ['@fontsource/michroma/files/michroma-latin-400-normal.woff2', 'Michroma-400.woff2'],
    ['@fontsource/orbitron/files/orbitron-latin-400-normal.woff2', 'Orbitron-400.woff2'],
    ['@fontsource/orbitron/files/orbitron-latin-700-normal.woff2', 'Orbitron-700.woff2'],
  ];
  for (const [src, dst] of copies) {
    const from = join(ROOT, 'node_modules', src);
    if (existsSync(from)) copyFileSync(from, join(fontsDir, dst));
  }
  const css = `/* Brand fonts Earth Defense — Michroma (UI), Orbitron (nomi città). */
@font-face{font-family:'Michroma';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/Michroma-400.woff2') format('woff2');}
@font-face{font-family:'Orbitron';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/Orbitron-400.woff2') format('woff2');}
@font-face{font-family:'Orbitron';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/Orbitron-700.woff2') format('woff2');}
:root{--font-ui:'Michroma',system-ui,sans-serif;--font-display:'Orbitron','Michroma',sans-serif;}
`;
  writeFileSync(join(OUT, 'fonts.css'), css, 'utf8');
}

// ------------------------------- main -------------------------------
async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  console.log('[design-system] token…');
  colorCard();
  typographyCard();
  layoutCard();

  console.log('[design-system] asset…');
  assetCards();

  console.log('[design-system] brand font…');
  brandFonts();

  console.log('[design-system] componenti (Vite + Chrome headless)…');
  const okComp = await componentCards();

  writeFileSync(join(OUT, '_cards.json'), JSON.stringify(written, null, 2), 'utf8');
  const byGroup = written.reduce((m, c) => ((m[c.group] = (m[c.group] || 0) + 1), m), {});
  console.log(`[design-system] generate: ${written.length} card →`, byGroup, `(${okComp}/${cards.components.length} componenti)`);
}

main().catch(err => {
  console.error('[design-system] errore:', err);
  process.exit(1);
});
