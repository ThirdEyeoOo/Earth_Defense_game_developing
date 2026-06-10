# Earth Defense — Contesto operativo

Aggiornato: 2026-06-10 (chiusura sessione 01, commit #39, main pulito, v0.102.0 rilasciata)

## Cos'è
Gestionale di difesa planetaria nel browser (TypeScript + Vite + Three.js + Vitest).
Architettura a tre strati con confine netto: **simulazione** deterministica a tick
(`src/sim/`, zero import esterni, RNG con seed nello stato, 20 tick/giorno),
**render** Three.js (`src/render/`, sola lettura dello stato), **UI** DOM (`src/ui/`).
I comandi (`src/sim/commands.ts`) sono l'unico canale di mutazione UI→sim.

## Stato release
- **v0.1.0** — MVP completo (50 città reali, economia a tasse, ondate UFO, squadroni, salvataggi).
- **v0.101.0** — etichette città, orologio HUD, 10x, moto fluido (tickFraction), UFO orbitali, salvataggi v2.
- **v0.102.0** — restyle SVG (targhette città cliccabili, F-22 animati, dischi volanti, profilo di volo).
- Release: a ogni merge chiedere il nome semver all'utente (proponendone uno) e aggiornare
  `lista aggiornamenti/releases.txt` (recap + delta byte). `commits.txt` si aggiorna da solo (hook git).

## Vincoli asset SVG (Three.js SVGLoader)
- Solo **fill solidi**: niente gradienti, filtri, `defs`/`use`, testo, animazioni SMIL/CSS
  (SVGLoader converte solo la geometria dei path in mesh; le animazioni si fanno nel loop di render).
- `viewBox` definito, forma centrata; elementi supportati: path, circle, ellipse, rect, ecc.
- Velivoli: **muso verso l'alto** (+Y del canvas SVG). L'asse Y dell'SVG punta in basso:
  il flip Y è gestito al caricamento (`buildSvgModel` in `src/render/units.ts`).
- **Parti animabili su path separati con `id`**: il builder le indicizza per nome.

## Asset esistenti e id animabili
### `Assets/Umani/Velivoli/f22_raptor_animabile.svg` (viewBox 200×300)
- Statici: `fusoliera`, `deriva_sx/dx`, `presa_sx/dx`, `ugello_sx/dx`, `abitacolo`.
- `boost_sx_esterno`, `boost_sx_interno`, `boost_dx_esterno`, `boost_dx_interno`
  — fiamme motori, pivot sull'attacco ugelli (y SVG = 264).
- `luce_nav_sx` (rossa), `luce_nav_dx` (verde), `luce_strobo_coda` (bianca).

### `Assets/Alieni/UFO/ufo_disco_volante.svg` (viewBox 240×200, vista di profilo, centro disco 120,95)
- Statici: `disco_corpo`, `mozzo_inferiore`.
- `cupola`, `luce_cupola`, `luce_1` … `luce_7` (bordo inferiore),
  `raggio_traente` (pivot attacco al mozzo, y SVG = 108; nascosto di default).

## Animazioni implementate (`src/render/units.ts`, loop di render)
### Caccia (squadrone = formazione a ^ di 3 F-22)
- Luci nav: pulsazione lenta opacità, sx/dx in controfase, sfasate fra i 3 velivoli.
- Strobo coda: flash ~90 ms ogni 1,5 s.
- Boost: solo in trasferimento — crescono dagli ugelli (livello eased), flicker casuale
  per frame (nucleo interno ±20%, esterno ±10%); si ritirano allo spegnimento.
- Pattugliamento: di stanza volano in cerchio attorno al nome della città, rasoterra
  (quota 1.008) a **scala 0.5**; in trasferimento decollo/atterraggio smoothstep
  (primi/ultimi 12% della rotta) fino a crociera 1.045 (sotto l'atmosfera a 1.05) a scala 1.
### UFO
- Billboard allineato allo schermo (`quaternion.copy(camera.quaternion)`): sempre orizzontale.
- Luci 1–7: sequenza ciclica rotante (testa piena, adiacenti scalate, altre al 20%);
  velocità ~2,5× quando in movimento, lenta durante il rapimento.
- Luce cupola: pulsazione lenta in volo; lampeggio 150 ms on/off nel rapimento.
- Cupola: pulse di opacità sincronizzato con la luce interna solo nel rapimento.
- Raggio traente: si estende dal mozzo verso il suolo durante il rapimento
  (scale.y eased + tremolio opacità), si ritira alla fine.
- Effetto distanza: scala 1 in orbita/spazio → 0.5 al suolo (smoothstep sulla quota).

## Gameplay/sim — punti chiave
- UFO: spawn spazio profondo (direzione casuale dal seed, serializzata in `spawnDir`) →
  avvicinamento ~1 giorno → **3 orbite** da ⅓ giorno → discesa → rapimento (10 persone/giorno)
  → fuga. Ingaggiabile **solo da discesa in poi** (`ENGAGEABLE_PHASES` in combat.ts).
- Perdita popolazione = rapiti a bordo al momento dell'uscita di scena (fuga o abbattimento).
- Config velocità per fase di viaggio in `CONFIG.ufoAbductor.travel` — predisposta per
  future stat per-fase (spazio profondo/orbita/atmosfera) di ogni nemico e difesa.
- Salvataggi versionati (v2) con migrazioni; il salvataggio conserva anche la velocità
  (salvare in pausa ⇒ si riparte in pausa: comportamento noto, non è un bug).

## Prossimi passi concordati
1. Stat di velocità per-fase di viaggio per ogni nemico/difesa (config già strutturata).
2. Meta-progressione / albero tecnologico (ripristino popolazione) — post-MVP, da spec.
3. Eventuale: rendere esplicita la scelta "pausa al caricamento" con indicatore visibile.
