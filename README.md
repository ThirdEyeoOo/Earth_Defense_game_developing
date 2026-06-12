# Earth Defense

🇬🇧 [English](#english) · 🇮🇹 [Italiano](#italiano)

---

## English

> 🚧 **Work in progress** — Earth Defense is in continuous, day-by-day development: the project receives updates daily, so features, balance and content change fast and often.

**Earth Defense** is a browser-based planetary defense management game. The world has already collapsed: almost every city on Earth has vanished, the dollar is worthless paper, and what remains of humanity trades in a single currency — the **HumT** (Humanity Treasure). Your job is to rebuild a defense network from nothing and hold the line against the alien abduction waves that keep coming.

### Gameplay

- **Found your HQ** on one of the 50 surviving real-world cities on a fully interactive 3D globe. Time stays frozen until you do — choose wisely.
- **Expand the network** by building embassies: only connected cities produce resources and pay taxes, and the cost grows with the distance from your nearest connected city.
- **Manage a 10-resource economy** (industry, fuels, agri-food and more): each city contributes 2–5 resources to a global stockpile that feeds everything you build.
- **Field F-22 squadrons** to intercept the UFOs: each abductor descends from deep space, orbits, lands and starts stealing people — engage it before it escapes with its captives.
- **Learn with the Third Eye**, the studio-logo eye turned tutorial companion, guiding your first steps from the HUD.
- Fully bilingual (English / Italian), with hot language switching, versioned save games and adjustable game speed up to 10×.

### Tech

TypeScript + Vite + Three.js + Vitest, with a strict three-layer architecture:

- `src/sim/` — deterministic tick-based simulation (20 ticks/day, seeded RNG, zero external imports);
- `src/render/` — Three.js rendering, read-only over the simulation state;
- `src/ui/` — DOM UI; commands (`src/sim/commands.ts`) are the only mutation channel from UI to simulation.

### Install & run

Requires **Node.js 18+**.

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build (tsc + vite build)
npm test         # Vitest test suite
```

Open the URL printed by the dev server (typically `http://localhost:5173`) in your browser.

### License

Released under the [MIT License](LICENSE).

---

## Italiano

> 🚧 **Lavori in corso** — Earth Defense è in continuo sviluppo giorno per giorno: il progetto riceve aggiornamenti quotidiani, quindi funzionalità, bilanciamento e contenuti cambiano in fretta e di frequente.

**Earth Defense** è un gestionale di difesa planetaria nel browser. Il mondo è già collassato: quasi tutte le città della Terra sono sparite, il dollaro è carta straccia e ciò che resta dell'umanità commercia con un'unica valuta — l'**HumT** (Humanity Treasure). Il tuo compito è ricostruire dal nulla una rete di difesa e resistere alle ondate di rapimenti alieni che continuano ad arrivare.

### Gameplay

- **Fonda il tuo QG** su una delle 50 città reali sopravvissute, su un globo 3D completamente interattivo. Il tempo resta congelato finché non lo fai — scegli con cura.
- **Espandi la rete** costruendo ambasciate: solo le città collegate producono risorse e pagano le tasse, e il costo cresce con la distanza dalla città collegata più vicina.
- **Gestisci un'economia a 10 risorse** (industria, combustibili, agroalimentare e altre): ogni città contribuisce con 2–5 risorse a un magazzino globale che alimenta tutto ciò che costruisci.
- **Schiera squadroni di F-22** per intercettare gli UFO: ogni rapitore scende dallo spazio profondo, orbita, atterra e inizia a rapire persone — ingaggialo prima che fugga con i prigionieri.
- **Impara col Terzo Occhio**, l'occhio del logo dello studio diventato compagno di tutorial, che ti guida nei primi passi direttamente dall'HUD.
- Completamente bilingue (italiano / inglese), con cambio lingua a caldo, salvataggi versionati e velocità di gioco regolabile fino a 10×.

### Tecnologia

TypeScript + Vite + Three.js + Vitest, con un'architettura rigorosa a tre strati:

- `src/sim/` — simulazione deterministica a tick (20 tick/giorno, RNG con seed, zero import esterni);
- `src/render/` — render Three.js, in sola lettura sullo stato della simulazione;
- `src/ui/` — UI DOM; i comandi (`src/sim/commands.ts`) sono l'unico canale di mutazione UI→sim.

### Installazione e avvio

Richiede **Node.js 18+**.

```bash
npm install
npm run dev      # dev server Vite
npm run build    # build di produzione (tsc + vite build)
npm test         # suite di test Vitest
```

Apri nel browser l'URL stampato dal dev server (di solito `http://localhost:5173`).

### Licenza

Rilasciato sotto [licenza MIT](LICENSE).
