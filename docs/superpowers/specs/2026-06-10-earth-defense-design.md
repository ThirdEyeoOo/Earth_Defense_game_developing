# Earth Defense — Design Doc (MVP)

Data: 2026-06-10
Stato: approvato a sezioni durante il brainstorming, in attesa di revisione finale.

## 1. Visione e ciclo di gioco

**Earth Defense** è un gestionale di difesa planetaria in tempo reale, single player, che gira interamente nel browser. La Terra è un globo 3D (Three.js) che fa da "teatro" dei combattimenti; tutta la gestione passa da schermate di interfaccia (radar, bilancio, ricerca, strutture — aggiunte iterativamente dopo l'MVP).

### Il mondo
- Sul globo ci sono **50 città reali**: posizioni geografiche vere, scelte per coprire uniformemente la superficie terrestre (metropoli principali + città che coprono Oceania, Africa, Sud America e zone remote).
- Ogni città ha la propria **popolazione reale** (~2026, arrotondata), contata in **persone intere** (es. Tokyo ≈ 37.000.000).
- La popolazione mondiale totale è la "vita" del pianeta.

### Il tempo
- La partita inizia il **1 gennaio 2026**.
- A velocità 1x, **1 minuto reale = 1 giorno di gioco**. Controlli: pausa / 1x / 2x / 4x.
- 1 giorno di gioco = **20 tick** di simulazione. La velocità cambia solo quanti tick al secondo vengono eseguiti, mai la logica: il risultato è identico a ogni velocità.

### La minaccia
- Ondate di nemici (minaccia mista; la narrativa verrà definita dopo l'MVP) arrivano dallo spazio e puntano alle città.
- Una città la cui popolazione raggiunge 0 è **distrutta e rimossa dal gioco**.

### Il ciclo del giocatore
1. **Osserva** — il radar prevede le prossime ondate (quando, dove, quanto forti).
2. **Prepara** — col reddito delle tasse costruisce difese nelle città; dopo l'MVP, ricerca tecnologie (nuove armi, ripristino/crescita della popolazione).
3. **Combatte** — le difese ingaggiano automaticamente, ma il giocatore gestisce attivamente durante l'ondata (rischieramento squadroni) guardando il globo.
4. **Conseguenze** — popolazione persa = reddito futuro ridotto: una spirale da gestire.

### Vittoria e sconfitta (MVP)
- **Sconfitta**: popolazione mondiale a 0.
- **Vittoria** (placeholder in attesa della campagna): sopravvivere a 10 ondate.
- Schermata di fine con statistiche: giorni sopravvissuti, popolazione salvata, UFO abbattuti.

### Oltre l'MVP (direzione, non scope)
- Campagna con **meta-progressione**: albero tecnologico con upgrade permanenti, nuove difese, ripristino/crescita della popolazione.
- Nuove schermate gestionali (ricerca, bilancio dettagliato, radar avanzato).
- Possibile backend (account, salvataggi cloud, classifiche): l'architettura lo permette senza stravolgimenti.

## 2. Architettura tecnica

**Stack**: TypeScript + Vite, Three.js per il globo, HTML/CSS puro per le schermate. Nessun altro framework. Test con Vitest. Salvataggi in localStorage.

### Tre strati con confine netto

```
┌─────────────────────────────────────────────┐
│  PRESENTAZIONE                              │
│  ┌──────────────┐   ┌────────────────────┐  │
│  │ Globo 3D     │   │ Schermate UI (DOM) │  │
│  │ (Three.js)   │   │ radar, pannelli,   │  │
│  │              │   │ HUD, ...           │  │
│  └──────┬───────┘   └─────────┬──────────┘  │
│         │ legge lo stato      │ invia comandi
└─────────┼─────────────────────┼─────────────┘
          ▼                     ▼
┌─────────────────────────────────────────────┐
│  SIMULAZIONE (TypeScript puro, zero import) │
│  stato di gioco + regole + tick             │
└─────────────────────────────────────────────┘
```

1. **Simulazione** — un unico oggetto-stato serializzabile (calendario, crediti, città, squadroni, UFO, ondate, seed RNG) e una funzione `tick()` che lo fa avanzare di un passo fisso. Deterministica: stesso stato + stesso seed + stessi comandi ⇒ stesso risultato. Non importa nulla da Three.js o dal DOM. È la porta verso un eventuale backend (girerebbe identica su server).
2. **Globo 3D** — solo visualizzazione: ad ogni frame legge lo stato e disegna. Le animazioni cosmetiche (interpolazioni fra tick, particelle) vivono qui e non toccano la logica.
3. **Schermate UI** — pannelli DOM. Non modificano mai lo stato direttamente: inviano **comandi** alla simulazione (es. `buildSquadron(cityId)`, `relocateSquadron(squadronId, cityId)`, `setSpeed(2)`). Il canale unico dei comandi è il punto di aggancio futuro per backend e replay.

### Struttura del progetto

```
src/
  sim/        # simulazione pura: stato, tick, città, ondate, economia, combattimento, config
  render/     # Three.js: scena, globo, marker città, UFO, squadroni, effetti
  ui/         # schermate DOM: HUD, pannello città, radar, fine partita
  data/       # cities.json (50 città: nome, paese, lat/lon, popolazione)
  main.ts     # avvio: crea simulazione, loop, collega render e ui
```

### Loop principale
In `main.ts`: `requestAnimationFrame` → calcola quanti tick servono in base a velocità e tempo reale trascorso → esegue i tick → il render disegna lo stato corrente. Pausa = zero tick, il globo resta navigabile.

## 3. Modello di simulazione

Tutti i numeri sono valori di partenza da bilanciare giocando; vivono in `sim/config.ts`, non sparsi nel codice.

### Economia
- Ogni giorno di gioco, reddito = Σ sulle città vive di `popolazione × aliquota` (ordine di grandezza: crediti per milione di abitanti al giorno).
- Valuta unica: **crediti**.
- Spesa MVP: costruire squadroni. Costo crescente per squadrone aggiuntivo, per spingere a distribuire le difese.

### Direttore delle ondate e radar
- Genera la prossima ondata con: **data d'arrivo** (ogni 10–15 giorni, intervallo che si accorcia col progredire della partita), **forza** (numero di UFO, crescente), **regione di provenienza/bersaglio**.
- Gli UFO spawniano nello spazio sopra la regione; ognuno punta a una città (preferendo le più popolose, con casualità deterministica dal seed).
- Radar MVP: countdown alla prossima ondata, forza stimata (n° UFO), regione.

### Il nemico MVP: l'UFO rapitore
Ciclo di vita:
1. **Arrivo** — spawn nello spazio, discesa verso la città bersaglio.
2. **Atterraggio e rapimenti** — rapisce **10 persone in 1 giorno di gioco** (0,5 a tick), accumulate in un contatore di bordo.
3. **Fuga** — completati i 10 rapimenti, decolla; uscito dall'atmosfera, sparisce.

**Regola della popolazione rapita**: la popolazione della città colpita (e quindi quella mondiale, che ne è la somma) viene scalata del valore del contatore di bordo — arrotondato per difetto, dato che il contatore accumula 0,5 a tick — nel momento in cui l'UFO esce di scena — sia che fugga (−10), sia che venga abbattuto (− i rapiti fino a quel momento: i rapiti a bordo muoiono nell'abbattimento). Abbatterlo presto non recupera i già rapiti ma ferma il conteggio; abbatterlo prima che atterri = zero perdite.

*Nota di bilanciamento*: con città da milioni di abitanti, 10 rapimenti sono simbolici — è la minaccia "da prime settimane di invasione". Il danno significativo arriverà dall'escalation (più UFO, nemici futuri peggiori).

### La difesa MVP: lo squadrone di caccia
Unità **mobile**, non torretta fissa:
- Di stanza in una città; ingaggia automaticamente gli UFO che puntano od occupano **solo quella città** (l'intercettazione in rotta è un possibile upgrade futuro dell'albero tech).
- Rischierabile in un'altra città in ogni momento: tempo di trasferimento = distanza ortodromica sul globo ÷ velocità dello squadrone. In volo di trasferimento **non combatte**.
- La "gestione attiva" durante le ondate è questa: leggere il radar, anticipare i bersagli, spostare gli squadroni in tempo. È possibile anche costruire nuovi squadroni a ondata in corso, se ci sono crediti.

### Sistema di statistiche
Condiviso da difese e nemici, estendibile:

| Statistica | Effetto |
|---|---|
| Potenza d'attacco | Danno inflitto per colpo |
| Cadenza | Colpi per tick |
| HP | Punti vita |
| Corazza | Riduce il danno subito per colpo (danno effettivo = attacco − corazza, minimo 1) |
| Velocità | Spostamento sul globo (trasferimenti squadrone, discesa/fuga UFO) |

Ogni tipo di unità è una **scheda di statistiche** in `sim/config.ts`: aggiungere un nemico o una difesa nuova = aggiungere una scheda, non scrivere codice nuovo.

### Risoluzione del combattimento
A tick: quando squadrone e UFO sono ingaggiati nella stessa città, si scambiano colpi secondo cadenza, attacco e corazza, finché uno dei due cade o l'UFO fugge. Più squadroni nella stessa città concentrano il fuoco.

### Determinismo
Un unico generatore casuale con seed nello stato (spawn, scelta bersagli, variazioni). Stessa partita + stessi comandi ⇒ stesso esito: bug riproducibili, test affidabili, replay possibili in futuro.

## 4. Globo 3D e interfaccia

### Globo (Three.js)
Stile MVP pulito e neutro (non vincola la direzione artistica futura): sfera con texture semplice della Terra, leggero alone atmosferico, campo stellato.
- **Città**: marker sulla superficie (lat/lon → coordinate sferiche), dimensione proporzionale alla popolazione, colore di stato (sana / sotto attacco; le distrutte vengono rimosse). Etichetta visibile all'hover o sotto soglia di zoom.
- **UFO**: visibili in discesa, atterrati (indicatore di rapimento in corso) e in fuga.
- **Squadroni**: icona nella città di stanza; in trasferimento, icona lungo l'arco di rotta con stima d'arrivo.
- **Combattimento**: traccianti, lampi, esplosione all'abbattimento. Tutto cosmetico, interpolato fra i tick.
- **Camera**: orbitale (trascina per ruotare, rotella per zoom). Click su città = selezione + pannello.

### Schermate UI (MVP)
1. **HUD permanente**: data, crediti, popolazione mondiale, controlli velocità, countdown prossima ondata.
2. **Pannello città** (al click): nome, popolazione, squadroni presenti, "costruisci squadrone", "trasferisci qui lo squadrone selezionato".
3. **Radar minimale** (a comparsa): prossima ondata — giorni mancanti, n° UFO stimato, regione.
4. **Fine partita**: vittoria/sconfitta + statistiche.

Le schermate future si aggiungono come nuovi pannelli sullo stesso canale dei comandi, senza toccare simulazione né globo.

## 5. Salvataggi e gestione errori

- **Autosave** a ogni fine giornata di gioco + slot manuale, in localStorage.
- Il salvataggio è lo stato di simulazione in JSON con campo `version`; migrazioni per versione manterranno validi i salvataggi vecchi quando lo schema evolve.
- Avvio: "Continua" se esiste un salvataggio, altrimenti "Nuova partita".
- **Comandi invalidi** (crediti insufficienti, città distrutta, squadrone già in volo): la simulazione li rifiuta restituendo l'esito; la UI mostra il motivo. Mai stato incoerente.
- **Salvataggio corrotto o di versione futura**: segnalato, si offre nuova partita, nessun crash.
- **Errore nel render**: il loop isola l'eccezione e la logga; la simulazione non si ferma.

## 6. Testing

La simulazione è TypeScript puro → test unitari con Vitest, senza browser:
- Combattimento: danno − corazza (minimo 1), abbattimenti, contatore rapiti nei tre esiti (fuga / abbattuto a terra / abbattuto prima di atterrare).
- Economia: reddito giornaliero, costi crescenti degli squadroni.
- Trasferimenti: tempo = distanza ortodromica ÷ velocità; niente combattimento in volo.
- Determinismo: stesso seed + stessi comandi ⇒ stato finale identico.
- Serializzazione: salva → ricarica ⇒ la partita prosegue identica.

Render e UI si verificano giocando (test manuali), come è normale per la parte visiva di un gioco.

## Scope MVP — riepilogo

Dentro: globo 3D con 50 città reali, tempo a velocità variabile dal 1/1/2026, economia a tasse, direttore ondate + radar minimale, UFO rapitore (unico nemico), squadrone di caccia mobile (unica difesa), sistema di statistiche, gestione attiva via rischieramenti, salvataggi, vittoria a 10 ondate / sconfitta a popolazione 0.

Fuori (iterazioni successive): albero tecnologico e meta-progressione, nuovi nemici e difese, schermate ricerca/bilancio/radar avanzato, intercettazione in rotta, narrativa, backend.
