# Sessione 12 — 2026-06-18

Punto di partenza: commit #98 (218d249), v0.115.0.
Fine sessione: commit #100 (docs di chiusura), v0.116.0 rilasciata e taggata (al commit #99, fa0f628).

## Resoconto

1. **Torretta al plasma — asset + finestra di scontro.** Integrati da Claude Design (cartella
   `NuoviAssets`) la torretta `plasma-turret.svg` (DOM-route, ettagono + canna, animabili
   `#recoil/#charge-core/#coils/#muzzle-glow/#muzzle-flash/#plasma-bolt/#status-light`, classe `.on`)
   e il mockup `scontro-honolulu.html`. Create le **cartelle armamenti** `Assets/Umani/Armamenti/`
   (predisposta, `.gitkeep`) e `Assets/Alieni/Armamenti/` (qui l'asset + manifest). Nella finestra di
   scontro (`ui/combatWindow.ts`) due torrette agganciate agli hardpoint dell'UFO che mirano al caccia
   e sparano bolidi che attraversano l'arena (impatto + scossa); raggio traente spento (combatte).

2. **Moduli arma data-driven + torrette sul globo + rapporto di scala.** Seam leggero: `sim/weapons.ts`
   (`WeaponModuleId`, poi `WEAPON_STATS`) e registro render `render/weaponModules.ts`; il nemico
   dichiara l'arma (`CONFIG.ufoAbductor.weaponModule`). Costante di scala unica **`TURRET_TO_UFO_WIDTH = 0,22`**.
   Sul globo le torrette sono **annidate nell'SVG dell'UFO** agli hardpoint (scalano/occludono con la
   nave); avvolte in un `<g>` ruotabile: a riposo puntano a **235°/SW**, mentre l'UFO è ingaggiato
   **seguono il bersaglio**. Rimossa la "maniglia" `#mount`: aggancio/rotazione al **centro dell'ettagono**.

3. **Combattimento in TEMPO REALE a hitbox.** Tolto `resolveCombat` dal tick: nuovo motore
   `render/combatEngine.ts` con **orologio in minuti-gioco** (sorgente unica in `main.ts`, accelera/si
   congela col tempo di gioco), shot logici con cadenza/volo in minuti-gioco, danno applicato a impatto
   via comando **`cmdDamageSquadron`**; proiettili sul globo in `render/combatFx.ts` (origine = volata
   torretta, bersaglio = hitbox squadrone). La finestra di scontro disegna gli **stessi shot** del motore.
   Stat: torretta **15 danni / 2 minuti-gioco**; **F-22 150 HP, UFO 500 HP, armature 0**. Per ora
   infligge danno **solo la torretta dell'UFO** (fuoco caccia = prossimo step → UFO temporaneamente
   indistruttibile).

4. **Fix pattuglia (stesso difetto del tempo reale).** Il pattugliamento circolare dei caccia usava
   `performance.now()` (tempo reale) → girava anche in pausa e non scalava con la velocità. Ora l'angolo
   usa lo stesso **orologio in minuti-gioco** (`units.ts`, `PATROL_SPEED_PER_GAMEMIN`): si ferma in pausa
   e accelera con il time-scale (i trasferimenti erano già corretti).

5. **Rapimento a capienza.** L'UFO ha **capacità 100** e punta a riempirla: rapisce **100 persone in
   8 ore-gioco** (15/tick); la fase `abducting` finisce a capienza piena o città esaurita, non più a
   durata fissa (`config.captureCapacity`/`abductionPerDay`, rimosso `abductionDays`; `progressUfos` con
   clamp su persone prelevabili; perdita popolazione sempre all'uscita). Migrazione save v4→v5 adeguata.

6. **Traiettorie orbitali realistiche (velocità continua C1).** Rifatto `sim/orbit.ts`: l'avvicinamento
   non parte più da fermo (profilo radiale ease-out `p(2−p)`) e si inserisce **tangente** all'orbita alla
   stessa velocità angolare (virata di cattura ricalibrata su ω reale); l'orbita spazza **T−Δ** lasciando
   l'arco Δ alla discesa; la **discesa è una spirale che decelera** (deorbit) e atterra esatta sopra la
   città a velocità ~0; la fuga è speculare. Forma chiusa **Δ = T·Tf/(2·Porb+Tf)** per la continuità ai
   due bordi (approach→orbita→discesa→hover). Niente migrazione salvataggi (forma `OrbitalParams`
   invariata; `captureSweep` ricalcolato per le nuove partite).

7. **Merge + release v0.116.0 + chiusura.** Commit del lavoro (#99) su `main`, tag annotato v0.116.0,
   `releases.txt` aggiornato (delta +55.950 byte vs v0.115.0), push su `origin/main`. **Commit #100**
   (docs di chiusura). `graphify --update` per i contenuti non-code (asset + doc).

## Decisioni

- **Discussione esplorativa (nessuna modifica)**: "gioco senza browser" → fattibile come app desktop
  (Tauri/Electron) tenendo intatto sim/render/UI; la sim è già TS puro (headless). Rimandato.
- **Combattimento real-time vs tick**: le stat in minuti-gioco e la richiesta "la hitbox dà il colpo"
  implicano un combattimento nel loop di rendering (un duello dura meno di un tick = 72 min-gioco).
  Scelto il real-time (non più deterministico/legato al tick) col danno applicato via comando.
- **Un solo orologio in minuti-gioco** (in `main.ts`) guida cadenza di fuoco, volo dei proiettili E
  pattuglia → coerenza con pausa/accelerazione e fix del bug della pattuglia nello stesso colpo.
- **Moduli arma**: aspetto (asset) e combattimento (stat) appartengono all'arma montata, così cambiando
  arma cambia chi la equipaggia. Oggi solo `plasma-turret`; registro pronto a crescere coi nemici.
- **Orbita realistica ma crociera lunga mantenuta** (+ tasto ">>>"): la continuità di velocità (C1) si
  ottiene con una Δ in forma chiusa; discesa a spirale (deorbit) invece di caduta da fermo.
- **Solo la torretta UFO fa danno per ora** (fuoco caccia rimandato): scelta esplicita, UFO
  temporaneamente indistruttibile.

## File modificati

- Asset/cartelle: `Assets/Alieni/Armamenti/{plasma-turret.svg,plasma-turret.integration.json}` (nuovi),
  `Assets/Umani/Armamenti/.gitkeep` (nuovo).
- Sim: `sim/weapons.ts` (nuovo, +stat), `sim/config.ts` (HP/armature, weaponModule, captureCapacity/
  abductionPerDay, −abductionDays), `sim/combat.ts` (−resolveCombat/effectiveDamage/PHASE_RANK),
  `sim/tick.ts` (−combat), `sim/commands.ts` (+cmdDamageSquadron), `sim/ufos.ts` (rapimento a capienza),
  `sim/orbit.ts` (traiettorie C1 + spirale), `sim/save.ts` (migrazione adeguata).
- Render/UI: `render/weaponModules.ts`, `render/combatEngine.ts`, `render/combatFx.ts` (nuovi),
  `render/ufoLayer.ts` (torrette annidate + mira + muzzleRect), `render/units.ts` (pattuglia
  game-time), `render/hpBars.ts` (commento), `ui/combatWindow.ts` (torrette + shot del motore),
  `ui/style.css`, `main.ts` (orologio gameMinutes + wiring engine/fx).
- Test: `sim/weapons.test.ts` (nuovo), `sim/commands.test.ts` (+cmdDamageSquadron),
  `sim/combat.test.ts` (−test resolveCombat), `sim/ufos.test.ts` (capienza), `sim/orbit.test.ts`
  (+continuità velocità orbita→discesa, discesa→hover).
- Chiusura: `docs/sessioni/sessione-12.md` (nuovo), `docs/sessioni/INDICE.md`,
  `.claude/contesto-progetto.md`, `lista aggiornamenti/releases.txt` (locale, gitignored).

## Prossimi passi / note

- **Fuoco dei caccia** (modulo arma terrestre) → combattimento a due sensi (oggi solo UFO fa danno).
- Stat d'arma future: `range` (gating del fuoco sul globo per distanza), cadenza/danno per arma,
  accuratezza/miss veri sulla hitbox.
- Discesa: oggi dura ~`freefallTicks` (~1 tick): se la si vuole più lenta/spettacolare, introdurre una
  `descentDuration` dedicata.
- **Design-system da risincronizzare**: il commit #99 ha cambiato UI/asset (5 file) → flag
  `design-system/.push_pending`: rigenerare (`node scripts/design-system/generate.mjs`) e ripushare le
  card su Claude Design.
- Bilanciamento combattimento (HP/danno/cadenza) col playtest.

## Intervallo commit

commit #99 (fa0f628, feat) → commit #100 (docs di chiusura). Tag v0.116.0 al commit #99.
