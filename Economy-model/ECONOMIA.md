# Modello economico — gestionale + tower defense post-apocalittico

Questo documento descrive il modello economico dietro `cities.json` e i ragionamenti
che lo hanno prodotto. È pensato come contesto per Claude Code durante lo sviluppo.

## Il file dati: `cities.json`

Array JSON di 50 città. Campi per città:

| Campo | Tipo | Significato |
|---|---|---|
| `id` | string | identificatore univoco (es. `tokyo`) |
| `name` | string | nome in italiano |
| `country` | string | paese |
| `region` | string | macro-regione: `asia`, `middle-east`, `europe`, `africa`, `north-america`, `south-america`, `oceania` |
| `lat`, `lon` | number | coordinate geografiche reali |
| `population` | int | popolazione dell'**area metropolitana** (criterio uniforme, stime ~2024) |
| `gdp_billion_usd` | int | PIL nominale **annuale pre-apocalisse**, in miliardi di USD (stime 2023-24). Lore/riferimento storico |
| `gdp_post_apoc_humt` | int | valore economico **post-apocalittico** in **HumT** (Humanity Treasure), derivato dalle risorse (vedi formula sotto) |
| `resources` | array | risorse prodotte: `{ "type": string, "amount": int }` |

> **Valuta HumT (Humanity Treasure)**: la valuta del mondo post-apocalittico,
> nata dopo il collasso del dollaro e del sistema finanziario (vedi peso della
> finanza = 1: il vecchio denaro vale quasi nulla). Tutti i valori economici
> in-game sono espressi in HumT; i dollari sopravvivono solo in `gdp_billion_usd`
> come misura storica della ricchezza perduta.

## Le risorse

10 tipi di risorsa (macrogruppi). `amount` è un **indice di capacità produttiva
relativa su scala 0–100**: NON è una quantità fisica annuale. Il tasso di conversione
in unità concrete per tick/ciclo è una scelta di bilanciamento del gioco
(es. 1 punto = 10 unità per ciclo di 60 s).

Tipi: `agroalimentare`, `chimica`, `combustibili_fossili`, `energia`, `finanza`,
`industria`, `materiali_da_costruzione`, `metalli_preziosi_e_minerali`,
`tecnologia`, `tessuti`.

Regole strutturali:
- **`energia` e `finanza` sono universali**: tutte e 50 le città le producono.
  Le altre 8 risorse sono prodotte solo da sottoinsiemi di città (da 6 a 27).
- Ogni città ha da 2 a 4 voci in `resources`.
- Il valore massimo nel dataset è 100 (unico: finanza di New York); il minimo è ~4.
- Le risorse derivano dalle specializzazioni economiche reali delle città
  (es. Seul → tecnologia per semiconduttori/elettronica, Riyad → combustibili fossili,
  Johannesburg → metalli preziosi, Dhaka → tessuti).

### Scarsità (totali mondiali indicativi)

energia ~2.700 (50 città), finanza ~2.450 (50), agroalimentare ~1.400 (27),
tecnologia ~1.050 (16), industria ~780 (13), tessuti ~730 (13),
combustibili_fossili ~580 (8), metalli_preziosi_e_minerali ~480 (8),
chimica ~310 (6), materiali_da_costruzione ~300 (6).

Chimica e materiali da costruzione sono le risorse più rare e concentrate:
candidate naturali a valere di più sul mercato e a essere obiettivi strategici
nel tower defense. I combustibili fossili hanno la media per città più alta (~72):
pochi produttori, ma enormi.

## Come sono stati costruiti i valori

1. **Risorse specifiche reali** → a ogni città sono state assegnate 3 risorse
   ispirate ai suoi settori dominanti reali (es. Bogotà: caffè, fiori, smeraldi).
2. **Raggruppamento in 10 macrogruppi** (es. tappeti → tessuti, smeraldi →
   metalli_preziosi_e_minerali).
3. **Fusione con rendimenti decrescenti**: quando più risorse specifiche ricadono
   nello stesso gruppo, si fondono con la formula soft-cap (sotto), così nessun
   valore supera 100 ma la gerarchia resta leggibile.
4. **Energia universale**: aggiunta a tutte le città con stime basate sulla capacità
   elettrica reale delle aree metropolitane (Tokyo/Shanghai 90 … Antananarivo/Suva 10).
5. **Finanza come "ricchezza generale"**: ogni città riceve una quota base
   `round(100 * sqrt(gdp_billion_humt / 2200))` (2200 = GDP max in miliardi di USD, New York),
   fusa via soft-cap con l'eventuale specializzazione finanziaria.
6. **Niente turismo**: nello scenario post-apocalittico il turismo non esiste.
   È stato rimosso del tutto dal calcolo (Roma, Honolulu, Suva, Sydney ecc.
   hanno perso la componente turistica della loro finanza).

### Formula soft-cap (fusione con rendimenti decrescenti)

```
totale = 0
per ogni valore v, in ordine decrescente:
    totale += (100 - totale) * v / 100
risultato = round(totale)
```

Il valore più alto conta per intero; ogni valore successivo riempie una frazione
dello spazio residuo fino a 100. Usarla anche in-game per eventuali fusioni/upgrade.

## GDP post-apocalittico

Nel mondo post-collasso l'economia è ribaltata: il cibo è la valuta suprema,
il denaro è quasi carta straccia. `gdp_post_apoc_humt` emerge dalle risorse:

```
gdp_post_apoc_humt = Σ ( peso[type] * amount )  su tutte le risorse della città
```

### Pesi delle risorse (valore per punto)

| Risorsa | Peso | Razionale |
|---|---|---|
| agroalimentare | 10 | il cibo è la valuta suprema |
| energia | 9 | alimenta tutto |
| chimica | 8 | medicine |
| combustibili_fossili | 8 | carburante |
| materiali_da_costruzione | 7 | ricostruzione e difese |
| industria | 6 | armi e macchinari |
| metalli_preziosi_e_minerali | 5 | input grezzi (l'oro vale poco, i metalli sì) |
| tecnologia | 4 | preziosa ma difficile da mantenere senza infrastrutture |
| tessuti | 3 | vestiario |
| finanza | 1 | residuo di reti commerciali; il denaro vale quasi nulla |

Questi pesi sono l'unica "tabella di configurazione" del modello: se cambiano,
ricalcolare `gdp_post_apoc_humt` per tutte le città. Tenerli in un modulo di config
del gioco, non hardcoded sparsi.

### Effetti (e lore implicito)

- Totale mondiale: ~63.700 HumT.
- Nuove potenze: Shanghai (1ª), Riyad (2ª, era 26ª), Osaka, Mosca, Teheran (+24 posizioni).
- Crolli: New York 1ª → 36ª, Londra → 39ª, Sydney → 49ª (le era rimasta quasi solo
  finanza dopo la rimozione del turismo), Toronto -29, Madrid -25, Los Angeles -24.
- Sorpresa: Reykjavik +33 posizioni (14ª) — pesca, geotermia e alluminio la rendono
  un'utopia autosufficiente e isolata. Ottimo gancio narrativo.
- La forbice è compressa: `gdp_post_apoc_humt` va da ~574 a ~2.256 (rapporto ~4x), contro
  il 550x del GDP pre-apocalisse. È voluto: nessuna città è irrilevante, tutte
  valgono la pena di essere contese. Se serve più disuguaglianza, moltiplicare
  per un fattore di scala (popolazione o un'efficienza per città).

## Relazioni statistiche utili al bilanciamento

- Correlazione finanza ↔ `gdp_billion_usd` (50 città): Pearson ~0,68, Spearman ~0,77.
  La finanza è una proxy della ricchezza pre-apocalisse, non un suo duplicato.
- Il GDP pre-apocalisse NON è ricostruibile fedelmente come somma pesata lineare
  delle risorse (R² ~0,5): le risorse sono indici limitati 0–100, il GDP reale
  spazia su 550x. Tentativi documentati: lineare R²=0,50; scala radice
  (gdp ≈ (Σ w·amount)²) R²=0,67. Per questo `gdp_post_apoc_humt` è stato definito
  da zero invece di interpolare quello storico.

## Idee di design emerse (non implementate)

- Tasso di conversione risorse → unità concrete per ciclo, definito nel game config.
- Catene domanda/offerta tra città (molte condividono gli stessi gruppi di risorse).
- `gdp_billion_usd / gdp_post_apoc_humt` come indicatore di "caduta" o "rinascita"
  della città col collasso → fazioni, lore, difficoltà di conquista.
- Energia come risorsa di mantenimento (alimenta torri e produzione); le città
  a bassa energia (Africa, isole) sono punti deboli da difendere o potenziare.
- Quantità delle risorse come "valore strategico" dei bersagli nel tower defense.
- Fattore di efficienza per città se si vuole riagganciare esattamente reddito
  e GDP: reddito = (Σ w·amount)² × efficienza.
