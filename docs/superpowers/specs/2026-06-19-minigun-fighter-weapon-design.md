# Minigun F-22 + combattimento a due sensi — design

Data: 2026-06-19. Branch: `feat/minigun-fighter-weapon`.
Origine: asset disegnati su Claude Design (progetto "Earth Defense — Animazioni",
`examples/minigun_rotante.svg` + `.integration.json`, nuovo `f22_raptor_animabile.svg`
con hardpoint taggati, e `AnimazioniPerClaudeCode/scontro-honolulu.html` come riferimento
del risultato finale). Realizza il "prossimo passo #9" del contesto: arma del caccia →
fuoco a due sensi.

## Obiettivo
L'F-22 monta due moduli **minigun** sugli hardpoint delle ali, gira il rotore e spara
traccianti gialli verso l'UFO; l'UFO risponde con le torrette al plasma (verdi). Il fuoco
del caccia ora **fa davvero danno**: l'UFO (500 HP) è distruttibile. Tutto sia nella
**finestra di scontro** sia sul **globo**, mantenendo il minigun come **modulo arma
interscambiabile** (stesso seam dati-driven del plasma-turret).

## Decisioni prese (brainstorming)
- Render: **finestra + globo insieme**. Sul globo il minigun si comporta "come per l'UFO"
  (modulo che segue l'unità, si orienta sul bersaglio, spara quando ingaggiato).
- Danno: **reale a due sensi** — l'UFO può essere abbattuto.
- Minigun = **modulo arma** interscambiabile, non hardcoded.
- UFO abbattuto durante un rapimento: **i rapiti a bordo restano persi** (comportamento
  attuale di `removeUfo(…, 'shotDown')`, nessuna modifica su questo punto).

## Componenti e modifiche

### 1. Asset
- `Assets/Umani/Armamenti/minigun-rotante.svg` (+ `.integration.json`): import dal Design.
  Correggere il JSON malformato (manca la chiave `mounts` attorno ai due `anchor`/`host`).
  Nel repo l'header/route va a `dom`: nel gioco i moduli arma sono asset DOM ricchi (CSS
  spin/flash), unico modo per tenerli nello **stesso registro** del plasma-turret. L'SVG
  resta a fill solidi (resta mesh-capable in futuro). id rilevanti: `#canne_rotanti`
  (rotore, spin), `#vampa` (lampo), `#bocca_1..5` (volata, `r=0`).
- `Assets/Umani/Velivoli/f22_raptor_animabile.svg`: aggiungere `#hardpoint_ala_sx` (53,190)
  e `#hardpoint_ala_dx` (147,190) come `circle r="0" fill="none"` (scartati dal loader mesh).

### 2. Sim (puro, zero import esterni)
- `src/sim/weapons.ts`: `WeaponModuleId = 'plasma-turret' | 'minigun'`; `WEAPON_STATS.minigun`
  (raffica veloce/leggera: cadenza ~0,25 min-gioco, danno ~8 — valori iniziali da playtest).
- `src/sim/config.ts`: `CONFIG.squadron.weaponModule = 'minigun'` (simmetrico a `ufoAbductor`).
- `src/sim/commands.ts`: nuovo `cmdDamageUfo(state, ufoId, amount)`: `ufo.hp -= amount`;
  a `≤0` → `removeUfo(state, id, 'shotDown')` (riusa stats/perdita esistenti). Riusa
  l'eventuale evento float di abbattimento già presente; se assente, niente nuovo evento.

### 3. Motore di combattimento — `src/render/combatEngine.ts`
- Generalizzare `Shot`: sorgente e bersaglio tipizzati `{kind:'ufo'|'squadron', id, side}`,
  più lo `WeaponModuleId` per stat/FX. L'`update` itera le battaglie in **entrambe le
  direzioni**: torrette UFO→difensore (esistente) e minigun difensore→UFO (nuovo).
- Applicazione danno: UFO→squadrone via `cmdDamageSquadron`; squadrone→UFO via `cmdDamageUfo`.
  Stessa meccanica già collaudata di cadenza (minuti-gioco), volo, linger, anti-raffica,
  risoluzione in blocco oltre `HIGH_SPEED`.

### 4. Render globo
- Nuovo `src/render/squadronWeapons.ts`: overlay DOM in coordinate-schermo (pattern di
  `selection.ts`/`combatFx.ts`) che, per ogni difensore ingaggiato, proietta i due hardpoint
  del jet, vi monta il modulo minigun, lo orienta verso l'UFO e lo accende
  (`.weapon-module.on`) — speculare a `ufoLayer` che monta la torretta sull'UFO. Espone
  `minigunMuzzleRect(squadronId, side)`. `UnitLayer` fornisce la posa schermo del jet
  (centro + dimensione + heading) necessaria al posizionamento.
- `src/render/combatFx.ts`: disegna anche gli shot squadrone→UFO come **traccianti gialli**
  (origine = volata minigun, impatto = `ufoBodyRect`).
- `src/render/weaponModules.ts`: voce `minigun` nel registro `WEAPON_MODULES` con keyframe
  di fuoco propri (spin continuo `#canne_rotanti` + lampo `#vampa`), `fireStyleLoop`
  (globo, ingaggiato) e `fireStyleOneShot` (un colpo, finestra).
- `src/ui/style.css`: classi gialle `.combat-tracer`/`.combat-spark` per i traccianti del jet.

### 5. Finestra di scontro — `src/ui/combatWindow.ts`
- Montare i minigun sugli hardpoint del jet (speculare alle torrette sull'UFO) e disegnare
  i traccianti gialli dagli **stessi shot** del motore (finestra sincrona col globo).
- L'UFO mostra le barre HP calanti e l'esito "abbattuto".

### 6. i18n
- Eventuali nuove stringhe d'esito in `it.ts` + `en.ts` (solo se non già presenti).

## Confini e invarianti rispettati
- Sim resta pura (codici, niente i18n/THREE); il combattimento real-time resta nel render
  loop in minuti-gioco (pausa/velocità coerenti).
- `activeBattles` resta l'unica fonte di "chi combatte".
- Nessuna migrazione salvataggi (forme `UfoState`/`SquadronState` invariate; `hp` già esistono).

## Test
- Sim: `cmdDamageUfo` (decremento, abbattimento a 0 → `ufosShotDown++`, perdita rapiti a
  bordo invariata). Riuso `newGameWithHq`/`grantRiches` da `testUtils`.
- Engine: generalizzazione `Shot` bidirezionale (uno shot per direzione, danno applicato
  una sola volta) — test a velocità normale e in blocco (>HIGH_SPEED).

## Bilanciamento (iniziale, da playtest)
- 2 minigun/caccia, raffica leggera: l'UFO 500 HP è abbattibile in un ingaggio prolungato.
  Valori in `WEAPON_STATS.minigun` e `CONFIG`, facili da tarare.
