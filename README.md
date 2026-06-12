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

### Install & run — step by step

No programming experience needed: follow the steps in order and copy-paste the commands.

#### Step 1 — Install Node.js

The game runs on [Node.js](https://nodejs.org) (version **18 or newer**).

1. Go to **https://nodejs.org** and download the **LTS** version for your system.
2. Run the installer and accept the default options (keep "Add to PATH" checked).
3. **Close and reopen** any terminal window that was already open.

To check it worked, open a terminal (see Step 2) and type:

```bash
node --version
```

You should see something like `v22.x.x`. If you get *"node is not recognized"*, close the terminal, reopen it and try again.

#### Step 2 — Open a terminal

- **Windows**: press the Start key, type `cmd` and open **Command Prompt** (or **PowerShell**).
- **macOS**: open **Terminal** (Applications → Utilities, or search it with Spotlight).
- **Linux**: open your distribution's terminal.

#### Step 3 — Download the game

**Option A — with Git** (if you have [Git](https://git-scm.com) installed):

```bash
git clone https://github.com/ThirdEyeoOo/Earth_Defense_game_developing.git
cd Earth_Defense_game_developing
```

**Option B — without Git**: on the repository page click the green **Code** button → **Download ZIP**, extract the archive wherever you like, then move the terminal into that folder, e.g. on Windows:

```bash
cd C:\Users\YourName\Downloads\Earth_Defense_game_developing-main
```

(Tip: type `cd ` with a trailing space, then drag the folder onto the terminal window — the path fills itself in.)

#### Step 4 — Install the dependencies

Run this once, inside the game folder (it takes a minute or two):

```bash
npm install
```

#### Step 5 — Start the game

```bash
npm run dev
```

The terminal will print a local address, typically:

```
  ➜  Local:   http://localhost:5173/
```

Open that address in your browser — the game starts there. To stop it, go back to the terminal and press **Ctrl+C**. Next time you only need Steps 2, 3 (just `cd` into the folder) and 5.

#### Common problems

| Symptom | Fix |
|---|---|
| `node` / `npm` is not recognized | Node.js is not installed or the terminal was open during install — redo Step 1 and reopen the terminal. |
| `npm install` fails with network errors | Check your connection/proxy and run it again — it resumes where it stopped. |
| Port 5173 already in use | Vite picks the next free port automatically — read the address actually printed in the terminal. |

#### For developers

```bash
npm run build    # production build (tsc + vite build)
npm test         # Vitest test suite
```

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

### Installazione e avvio — passo passo

Non serve alcuna esperienza di programmazione: segui i passaggi in ordine e copia-incolla i comandi.

#### Passo 1 — Installa Node.js

Il gioco gira su [Node.js](https://nodejs.org) (versione **18 o più recente**).

1. Vai su **https://nodejs.org** e scarica la versione **LTS** per il tuo sistema.
2. Avvia l'installer e accetta le opzioni predefinite (lascia spuntato "Add to PATH").
3. **Chiudi e riapri** eventuali terminali già aperti.

Per verificare che tutto funzioni, apri un terminale (vedi Passo 2) e digita:

```bash
node --version
```

Dovresti vedere qualcosa come `v22.x.x`. Se compare *"node non è riconosciuto"*, chiudi il terminale, riaprilo e riprova.

#### Passo 2 — Apri un terminale

- **Windows**: premi il tasto Start, digita `cmd` e apri il **Prompt dei comandi** (oppure **PowerShell**).
- **macOS**: apri il **Terminale** (Applicazioni → Utility, o cercalo con Spotlight).
- **Linux**: apri il terminale della tua distribuzione.

#### Passo 3 — Scarica il gioco

**Opzione A — con Git** (se hai [Git](https://git-scm.com) installato):

```bash
git clone https://github.com/ThirdEyeoOo/Earth_Defense_game_developing.git
cd Earth_Defense_game_developing
```

**Opzione B — senza Git**: nella pagina del repository clicca il pulsante verde **Code** → **Download ZIP**, estrai l'archivio dove preferisci, poi sposta il terminale dentro quella cartella, ad esempio su Windows:

```bash
cd C:\Users\TuoNome\Downloads\Earth_Defense_game_developing-main
```

(Trucco: digita `cd ` con uno spazio finale, poi trascina la cartella sulla finestra del terminale — il percorso si compila da solo.)

#### Passo 4 — Installa le dipendenze

Esegui questo comando una sola volta, dentro la cartella del gioco (ci mette un minuto o due):

```bash
npm install
```

#### Passo 5 — Avvia il gioco

```bash
npm run dev
```

Il terminale stamperà un indirizzo locale, di solito:

```
  ➜  Local:   http://localhost:5173/
```

Apri quell'indirizzo nel browser — il gioco parte lì. Per fermarlo, torna nel terminale e premi **Ctrl+C**. Le volte successive ti servono solo i Passi 2, 3 (basta il `cd` nella cartella) e 5.

#### Problemi comuni

| Sintomo | Soluzione |
|---|---|
| `node` / `npm` non è riconosciuto | Node.js non è installato o il terminale era aperto durante l'installazione — rifai il Passo 1 e riapri il terminale. |
| `npm install` fallisce con errori di rete | Controlla connessione/proxy e rilancialo — riprende da dove si era fermato. |
| Porta 5173 già occupata | Vite sceglie da solo la porta libera successiva — leggi l'indirizzo effettivamente stampato nel terminale. |

#### Per sviluppatori

```bash
npm run build    # build di produzione (tsc + vite build)
npm test         # suite di test Vitest
```

### Licenza

Rilasciato sotto [licenza MIT](LICENSE).
