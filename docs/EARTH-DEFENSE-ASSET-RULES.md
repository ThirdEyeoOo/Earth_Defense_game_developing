# Earth Defense — Regole per disegnare asset SVG su Claude Design

> Questo file vive sia nella repo del gioco (`docs/EARTH-DEFENSE-ASSET-RULES.md`) sia caricato
> nel progetto `claude.ai/design`. È la **fonte di verità** che Claude (lavorando nel canvas di
> design) deve seguire per produrre SVG già pronti per essere integrati nel gioco.
> Se cambiano le regole, va rigenerato e ricaricato sul progetto design.

## A chi serve

Il gioco **Earth Defense** è un gestionale di difesa planetaria nel browser
(TypeScript + Vite + Three.js). Gli asset disegnati qui finiscono nel gioco in due modi diversi.
Disegnare seguendo queste regole evita rilavorazioni: l'SVG arriva "game-ready".

---

## Le due rotte d'integrazione

Ogni asset segue **una** di due rotte. La scelta determina cosa è permesso disegnare.

### Rotta `dom` — overlay DOM / CSS2D (la più comune per le animazioni)
Per: widget di interfaccia, barre, badge, effetti a schermo, l'UFO, qualsiasi cosa "ricca".

Permesso (anzi, incoraggiato):
- gradienti (`<linearGradient>`, `<radialGradient>`), filtri (`<filter>`: blur, turbolenza…);
- animazioni CSS via `<style>` interno con `@keyframes` e variabili CSS;
- sfaccettature, bagliori, particelle.

Obblighi:
- **id stabili** su ogni gruppo/elemento che il gioco deve animare, accendere/spegnere o scalare
  (es. `#beam`, `#hb-fill-group`, `#glow`).
- **classe di stato** per le transizioni guidate dal gioco: l'asset a riposo è statico, e una
  classe (per convenzione `.on`) accende lo stato attivo. Esempio: ante chiuse + raggio spento a
  riposo; `.on` apre le ante e accende il raggio.
- **sfondo trasparente**.
- **nessun `@import` di font esterni** (il font del gioco, Michroma, è già incluso; se serve testo
  decorativo dichiara il font nello `<style>` interno, ma vedi i18n sotto).
- **nessun testo visibile all'utente** hardcoded (nomi città, etichette, numeri): quelli li mette
  il gioco tramite il suo sistema di traduzioni. Vedi "i18n".

### Rotta `mesh` — modello 3D Three.js (unità sul globo)
Per: velivoli e oggetti 3D che volano sul mappamondo (es. il caccia F-22).
Il gioco converte i `<path>` in geometria 3D con un loader che **scarta tutto ciò che non è
geometria a tinta piatta**.

Obblighi (rigidi):
- **solo fill solidi**: niente gradienti, filtri, `defs`/`use`, testo, animazioni SMIL o CSS
  (verrebbero ignorati o romperebbero la conversione).
- **`viewBox` definito**, forma centrata.
- **muso del velivolo verso l'ALTO** nel disegno (il gioco fa il flip verticale).
- ogni **parte animabile su un `<path>` separato con `id`** (il gioco la indicizza per nome e la
  anima nel suo loop di render: opacità, scala…). Convenzioni di nome usate: `luce_*` (luci),
  `boost_*` (fiamme dei motori), più parti statiche come `fusoliera`, `deriva_*`, `abitacolo`.

> In dubbio? Disegna la versione **ricca** (rotta `dom`). In fase d'integrazione, se serve una
> mesh, viene ridotta a fill solidi. Ma se l'asset È un'unità 3D, segui da subito la rotta `mesh`.

---

## Contratto 1 — intestazione di metadati (obbligatoria, in ogni SVG)

La **prima riga** dentro l'SVG è un commento che classifica l'asset, così l'integrazione nel
gioco è meccanica e senza ambiguità:

```xml
<!-- ed-asset route="dom" name="nuovo-effetto" animatable="#beam,#glow" state-class="on" i18n-text="none" -->
```

Campi:
- `route` — `dom` oppure `mesh`.
- `name` — nome breve in kebab-case, uguale al nome file (`nuovo-effetto.svg`).
- `animatable` — lista di id (o classi) che il gioco anima/scala/accende, separati da virgola.
- `state-class` — la classe di stato attivata dal gioco (di solito `on`); `none` se non serve.
- `i18n-text` — `none` se l'asset non contiene testo utente (atteso); altrimenti elenca gli slot.

---

## Contratto 2 — manifest d'integrazione (un file gemello per ogni SVG)

Accanto a `nuovo-effetto.svg` va sempre `nuovo-effetto.integration.json`: spiega al gioco **come
cablare** l'animazione. L'intestazione serve a classificare al volo; il manifest è la guida
completa. Schema:

```json
{
  "name": "nuovo-effetto",
  "route": "dom",
  "viewBox": "0 0 600 860",
  "animatable": [
    { "id": "#beam", "does": "raggio traente", "drivenBy": "game", "via": "class:on" },
    { "id": "#glow", "does": "alone idle", "drivenBy": "asset", "via": "css-loop" }
  ],
  "states": [
    { "class": "on", "when": "fase di gioco abducting", "affects": ["#beam", "#door-*"] }
  ],
  "gameInputs": [
    { "kind": "scale", "how": "shrink prospettico per distanza camera" },
    { "kind": "color", "how": "CSS var --hb-fill-a/b" },
    { "kind": "fill",  "how": "scaleX(0..1) su #fill-group" }
  ],
  "anchors": ["#hardpoint-left", "#hardpoint-right"],
  "i18nText": [],
  "suggestedPlacement": "layer CSS2D sul globo (tipo ufoLayer) | pannello UI | unità mesh",
  "notes": "animazioni idle in loop continuo; il gioco tocca solo lo stato 'on'"
}
```

Significato dei campi chiave:
- `drivenBy` — `asset` = l'animazione gira da sola via CSS (idle, loop); `game` = la pilota il
  gioco (deve sapere quale id/classe toccare e quando).
- `via` — il meccanismo: `class:on` (toggle di una classe), `css-loop` (animazione interna),
  `scaleX`/`scaleY` (trasformazione), `css-var:--nome` (colore/parametro via variabile CSS).
- `gameInputs` — le "manopole" che il gioco deve poter regolare (scala, colore, riempimento…).
- `anchors` — punti d'attacco per moduli futuri (es. hardpoint armi).
- `suggestedPlacement` — quale parte del gioco riusare per ospitare l'asset.
- Per la rotta **`mesh`**: in `animatable` elenca i `<path>` ided e l'animazione attesa nel loop
  di render (es. opacità pulsante su `luce_*`, `scale.y` sui `boost_*`).

---

## i18n — niente testo nell'arte

Il gioco è bilingue (italiano/inglese) e tutto il testo visibile passa dal suo sistema di
traduzioni. Quindi **non scrivere nomi, etichette o numeri** dentro l'SVG. Se un asset ha bisogno
di uno slot testuale (raro), dichiaralo in `i18n-text` (header) e in `i18nText` (manifest) con un
id; sarà il gioco a riempirlo.

---

## Checklist rapida prima di consegnare un asset

- [ ] Intestazione `<!-- ed-asset ... -->` presente e corretta.
- [ ] File gemello `<nome>.integration.json` presente e coerente con l'header.
- [ ] Rotta giusta: `dom` (ricco, animato) o `mesh` (solo fill solidi, muso in alto).
- [ ] id stabili su tutto ciò che il gioco deve toccare.
- [ ] Stato a riposo statico + classe `.on` per l'attivazione (rotta `dom`).
- [ ] Sfondo trasparente, nessun `@import` di font, nessun testo utente hardcoded.
- [ ] `viewBox` definito; per `mesh`, ogni parte animabile su `<path>` con `id`.

---

## Esempi vivi nel progetto

Nel progetto design trovi gli asset attuali del gioco come riferimento da remixare:
- `alien_abductor.svg` + barre HP → esempi della rotta **`dom`** (gradienti, filtri, `.on`, beam).
- `f22_raptor_animabile.svg` → esempio della rotta **`mesh`** (fill solidi, `luce_*`, `boost_*`).
