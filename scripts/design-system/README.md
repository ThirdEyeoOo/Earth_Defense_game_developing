# Catalogo design-system (Claude Design)

Genera un catalogo visivo del gioco — **token**, **asset** e **anteprime dei componenti** — come
card HTML autosufficienti (font, SVG e CSS inline) con marker `@dsCard`, da pushare su
**claude.ai/design** (progetto "Earth Defense — Animazioni"). Serve a far nascere coerenti le
nuove animazioni/componenti e a dare una vista d'insieme. Vedi il manuale d'uso in
`docs/Manuale-Claude-Design.pdf` e le regole in `docs/EARTH-DEFENSE-ASSET-RULES.md`.

## Come si genera

```
node scripts/design-system/generate.mjs
```

Output in `design-system/out/` (gitignored): `tokens/`, `assets/`, `components/`, più
`_cards.json` (indice delle card generate, usato dal push).

Tre tipi di card:
- **Token** — da `tokens.json`: tavolozza colori, tipografia (Michroma/Orbitron), spaziature/z-index.
- **Asset** — gli SVG di `Assets/` inlinati (i commenti XML vengono rimossi: il sanitizer di
  Claude Design rifiuta la sequenza `--` nei commenti).
- **Componente** — i componenti UI **reali** di `src/ui/` resi con stato finto realistico (via
  `src/sim/testUtils.ts`), così le card non divergono dal codice. Il rendering usa il dev server
  Vite (per risolvere TS e gli import `?raw`) + Chrome headless pilotato via DevTools Protocol
  (CDP): naviga `harness.html?component=<id>` e attende `window.__DS_READY`.

## File

- `tokens.json` — fonte unica delle card Token (documenta la palette di fatto; **non** modifica `src/ui/style.css`).
- `cards.json` — elenco dei componenti da rendere (id, nome, dimensioni card).
- `harness.html` + `harness.ts` — pagina servita solo in generazione: monta un componente reale.
- `generate.mjs` — orchestratore (token + asset in Node; componenti via Vite + Chrome/CDP).

## Requisiti

- **Google Chrome** installato. Percorso auto-rilevato; override con la variabile `DS_CHROME`.
- Niente dipendenze nuove: usa Vite (già nel progetto), Node ≥ 18 (fetch/WebSocket globali) e Chrome.

## Aggiungere una card componente

1. Aggiungi una voce in `cards.json` (`id`, `name`, `width`, `height`).
2. Aggiungi un mounter con lo stesso `id` in `harness.ts` (crea il contenitore con l'id reale
   atteso dal CSS, chiama la factory `create<Nome>` con callback no-op, rendi visibile + `update`).
3. Rilancia `generate.mjs`.

## Aggiornamento automatico

Il git hook `post-commit` (sezione `design-system-*`) rileva i commit che toccano `src/ui/` o
`Assets/` e scrive `design-system/.push_pending` con la lista dei file. La **rigenerazione** è
deterministica (`node generate.mjs`); il **push** su claude.ai/design usa lo strumento DesignSync
(lato Claude), perciò avviene quando Claude vede il flag — stesso schema di graphify
(`graphify-out/.semantic_pending`). A push completato, cancellare `design-system/.push_pending`.
