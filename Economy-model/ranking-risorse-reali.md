# Ranking risorse 50×10 — ancoraggio alla geografia economica reale

> Report di ricerca (giugno 2026). Obiettivo: un **ranking relativo plausibile** 0–100
> delle 10 macro-risorse di `cities.json`, ancorato alle specializzazioni economiche
> reali delle città/regioni, **non** a quantità di produzione cittadina (dato che non
> esiste in forma pulita). Metodo: poche ricerche web **per risorsa** (hub mondiali) +
> verifiche sulle città ambigue; sintesi manuale.
>
> **Scala** (coerente e comparabile tra TUTTE le città):
> `100` = hub mondiale di primo livello · `~50` = capacità media e diffusa · `0–20` =
> trascurabile/assente. Profili **specializzati**: pochi picchi alti, la maggior parte
> delle caselle è bassa. Nessuna città è forte in tutto.
>
> I valori sono il punteggio **"base" reale (pre-collasso)**. La sezione
> [Effetto apocalisse](#effetto-apocalisse) spiega come modificarli senza stravolgere i
> ranking. Le caselle ottenute **senza fonte solida** (stime) sono elencate in fondo.

## Tabella 50 × 10 (pronta da incollare in ECONOMIA.md)

Ordine colonne = `RESOURCE_TYPES`: Agro=agroalimentare, Chim=chimica,
Comb=combustibili_fossili, Ener=energia, Fin=finanza, Ind=industria,
Mat=materiali_da_costruzione, Min=metalli_preziosi_e_minerali, Tec=tecnologia,
Tess=tessuti.

| Città (id) | Agro | Chim | Comb | Ener | Fin | Ind | Mat | Min | Tec | Tess |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Tokyo (tokyo) | 25 | 60 | 10 | 90 | 85 | 72 | 60 | 20 | 92 | 30 |
| Delhi (delhi) | 65 | 45 | 25 | 72 | 55 | 52 | 65 | 25 | 60 | 75 |
| Shanghai (shanghai) | 30 | 70 | 35 | 90 | 88 | 88 | 90 | 45 | 85 | 60 |
| Dhaka (dhaka) | 40 | 15 | 20 | 40 | 28 | 35 | 35 | 10 | 20 | 98 |
| Mumbai (mumbai) | 25 | 72 | 45 | 68 | 70 | 55 | 55 | 25 | 62 | 58 |
| Pechino (beijing) | 35 | 55 | 45 | 85 | 75 | 72 | 80 | 45 | 85 | 45 |
| Osaka (osaka) | 25 | 58 | 15 | 75 | 60 | 78 | 62 | 20 | 72 | 35 |
| Karachi (karachi) | 35 | 30 | 35 | 40 | 35 | 45 | 45 | 20 | 25 | 70 |
| Manila (manila) | 45 | 25 | 20 | 45 | 50 | 45 | 35 | 50 | 58 | 35 |
| Seul (seoul) | 20 | 55 | 15 | 82 | 80 | 82 | 65 | 20 | 95 | 35 |
| Giacarta (jakarta) | 70 | 40 | 55 | 58 | 52 | 50 | 50 | 62 | 40 | 55 |
| Bangkok (bangkok) | 70 | 35 | 30 | 58 | 55 | 68 | 50 | 25 | 55 | 48 |
| Singapore (singapore) | 5 | 68 | 65 | 60 | 95 | 55 | 30 | 15 | 78 | 15 |
| Ho Chi Minh (hochiminh) | 60 | 25 | 30 | 50 | 38 | 52 | 40 | 20 | 55 | 82 |
| Istanbul (istanbul) | 40 | 40 | 25 | 62 | 52 | 65 | 58 | 30 | 45 | 72 |
| Teheran (tehran) | 45 | 62 | 82 | 60 | 28 | 52 | 50 | 35 | 35 | 45 |
| Baghdad (baghdad) | 30 | 25 | 82 | 40 | 15 | 25 | 30 | 15 | 12 | 20 |
| Riyad (riyadh) | 20 | 80 | 95 | 72 | 58 | 45 | 55 | 35 | 35 | 15 |
| Mosca (moscow) | 50 | 50 | 90 | 82 | 50 | 55 | 58 | 65 | 50 | 30 |
| Londra (london) | 25 | 45 | 30 | 70 | 98 | 45 | 40 | 25 | 65 | 40 |
| Parigi (paris) | 55 | 52 | 15 | 80 | 75 | 62 | 50 | 20 | 58 | 62 |
| Berlino (berlin) | 35 | 58 | 20 | 60 | 58 | 68 | 55 | 25 | 62 | 40 |
| Madrid (madrid) | 45 | 42 | 15 | 58 | 62 | 52 | 50 | 30 | 48 | 45 |
| Roma (rome) | 48 | 40 | 15 | 50 | 52 | 48 | 45 | 20 | 42 | 50 |
| Reykjavik (reykjavik) | 55 | 20 | 10 | 68 | 22 | 30 | 25 | 55 | 30 | 15 |
| Il Cairo (cairo) | 50 | 40 | 45 | 58 | 42 | 45 | 52 | 30 | 35 | 58 |
| Lagos (lagos) | 35 | 35 | 72 | 32 | 48 | 35 | 35 | 25 | 35 | 25 |
| Kinshasa (kinshasa) | 35 | 15 | 20 | 25 | 12 | 20 | 28 | 78 | 10 | 12 |
| Nairobi (nairobi) | 70 | 28 | 12 | 38 | 45 | 38 | 35 | 25 | 42 | 35 |
| Johannesburg (johannesburg) | 38 | 42 | 40 | 55 | 60 | 50 | 50 | 90 | 45 | 30 |
| Casablanca (casablanca) | 42 | 58 | 18 | 42 | 50 | 45 | 45 | 60 | 30 | 50 |
| Antananarivo (antananarivo) | 55 | 12 | 8 | 14 | 10 | 18 | 20 | 48 | 12 | 38 |
| New York (newyork) | 22 | 45 | 25 | 85 | 100 | 45 | 42 | 20 | 68 | 50 |
| Los Angeles (losangeles) | 50 | 45 | 45 | 80 | 84 | 60 | 45 | 25 | 72 | 55 |
| Città del Messico (mexicocity) | 45 | 45 | 50 | 65 | 58 | 68 | 58 | 58 | 52 | 45 |
| Chicago (chicago) | 85 | 48 | 30 | 75 | 85 | 60 | 50 | 25 | 58 | 35 |
| Toronto (toronto) | 38 | 42 | 30 | 65 | 80 | 52 | 48 | 55 | 58 | 30 |
| Vancouver (vancouver) | 38 | 30 | 35 | 60 | 62 | 40 | 62 | 58 | 50 | 20 |
| Anchorage (anchorage) | 55 | 15 | 60 | 25 | 28 | 22 | 28 | 45 | 18 | 8 |
| San Paolo (saopaulo) | 80 | 50 | 40 | 68 | 65 | 68 | 58 | 52 | 50 | 48 |
| Buenos Aires (buenosaires) | 90 | 40 | 42 | 55 | 48 | 50 | 45 | 35 | 45 | 40 |
| Lima (lima) | 58 | 25 | 30 | 45 | 40 | 40 | 40 | 72 | 30 | 42 |
| Bogotà (bogota) | 72 | 30 | 42 | 48 | 45 | 42 | 40 | 50 | 38 | 35 |
| Santiago (santiago) | 62 | 30 | 25 | 52 | 48 | 42 | 42 | 82 | 38 | 28 |
| Sydney (sydney) | 42 | 38 | 45 | 62 | 78 | 45 | 45 | 58 | 55 | 25 |
| Melbourne (melbourne) | 48 | 48 | 40 | 60 | 70 | 50 | 45 | 55 | 50 | 28 |
| Perth (perth) | 42 | 30 | 70 | 48 | 42 | 38 | 42 | 90 | 30 | 12 |
| Auckland (auckland) | 72 | 25 | 15 | 42 | 48 | 38 | 38 | 25 | 42 | 25 |
| Honolulu (honolulu) | 35 | 12 | 12 | 28 | 35 | 18 | 22 | 12 | 30 | 15 |
| Suva (suva) | 50 | 10 | 10 | 12 | 12 | 15 | 18 | 20 | 10 | 18 |

## Criterio e fonti per risorsa

Le fonti servono a fissare **chi sono gli hub** di ciascuna risorsa; l'assegnazione
cella-per-cella è poi una stima relativa coerente con la scala.

**Agroalimentare** — cibo (agricoltura, pesca, allevamento). Picchi sulle "breadbasket":
Pampa argentina (Buenos Aires 90), agribusiness brasiliano soia/zucchero/caffè/carne
(San Paolo 80), Corn Belt USA + hub futures (Chicago 85); poi caffè/fiori (Bogotà,
Nairobi), riso (Bangkok), palma/riso (Giacarta), latte/carne NZ (Auckland). USA e Brasile
sono i due maggiori esportatori agricoli mondiali.
Fonti: [Visual Capitalist — World's Largest Food Exporters](https://www.visualcapitalist.com/ranked-the-countries-that-feed-the-world/),
[Wikipedia — Largest producing countries of agricultural commodities](https://en.wikipedia.org/wiki/List_of_largest_producing_countries_of_agricultural_commodities),
[Statista — Top agricultural exporters 2024](https://www.statista.com/statistics/1332329/leading-countries-worldwide-by-value-of-agricultural-products-exported/).

**Chimica** — chimica/petrolchimica/farmaceutica. Riyad (SABIC + complesso Sadara, tra i
maggiori al mondo) 80; Mumbai (hub farmaceutico/generici dell'India) 72; Shanghai (Cina
~35% del mercato petrolchimico asiatico) 70; Singapore (Jurong Island) 68; Teheran
petrolchimica 62; Casablanca (fertilizzanti da fosfati OCP) 58; cluster tedesco/giapponese
rappresentati da Berlino/Osaka/Tokyo.
Fonti: [C&EN Global Top 50 chemical firms 2024](https://cen.acs.org/business/finance/CENs-Global-Top-50-2024/102/i22),
[NES Fircroft — Biggest chemical plants](https://www.nesfircroft.com/resources/blog/the-biggest-chemical-plants-in-the-world/),
[Grand View — Petrochemical market (APAC 46,9%)](https://www.grandviewresearch.com/industry-analysis/petrochemical-market).

**Combustibili_fossili** — petrolio, gas, carbone (estrazione + raffinazione). Riyad 95
(Arabia Saudita ~10,9 Mbbl/g), Mosca 90 (Russia ~10,75 Mbbl/g + gas), Teheran/Baghdad 82
(Iran ~4,6 Mbbl/g; Iraq), Perth 70 (Australia 2° esportatore LNG mondiale, ~81 Mt),
Lagos 72 (Nigeria), Singapore 65 (hub di raffinazione/trading, senza estrazione),
Anchorage 60 (North Slope).
Fonti: [EIA — top oil producers/consumers](https://www.eia.gov/tools/faqs/faq.php?id=709&t=6),
[Enerdata — crude oil production](https://yearbook.enerdata.net/crude-oil/world-production-statistics.html),
[EIA — US largest LNG exporter 2024 (Australia/Qatar dietro)](https://www.eia.gov/todayinenergy/detail.php?id=64844),
[Visual Capitalist — biggest natural gas producers 2024](https://www.visualcapitalist.com/ranked-worlds-biggest-natural-gas-producers-2024/).

**Energia** — capacità di generazione elettrica dell'area metropolitana. **Risorsa più
stimata**: non esistono dati puliti per area metro, quindi è derivata da (rete nazionale ×
peso del metro). Cina e USA dominano l'assoluto (Cina 10.087 TWh, USA 4.635 TWh nel 2024),
da cui Shanghai/Tokyo 90, Pechino 85, NY 85, Mosca/Parigi 82–80. Reykjavik 68: assoluto
piccolo ma abbondanza idro/geotermica fuori scala per la sua taglia (gancio narrativo).
Fonti: [Visual Capitalist — countries generating the most electricity](https://www.visualcapitalist.com/countries-generating-the-most-electricity-ranked/),
[Ember — Global Electricity Review 2025](https://ember-energy.org/latest-insights/global-electricity-review-2025/major-countries-and-regions/),
[Green by Iceland — metal/energy](https://www.greenbyiceland.com/metal-production).

**Finanza** — peso come centro finanziario (proxy della ricchezza pre-collasso).
Ancorata al **GFCI 38 (set. 2025)**: NY 1°, Londra 2°, Singapore 4°, Chicago 6°, LA 7°,
Shanghai 8°, Seul 10°, Tokyo ~top 20 → NY 100, Londra 98, Singapore 95, Shanghai 88,
Chicago/LA 85/84, Tokyo 85, Seul 80, Toronto/Sydney 80/78. Mosca scesa (sanzioni) → 50.
Fonti: [GFCI 38 — ranking](https://www.caproasia.com/2025/10/30/the-2025-global-financial-centres-index-38th-edition-full-ranking/),
[Visual Capitalist — top financial centers 2025](https://www.visualcapitalist.com/mapped-the-worlds-top-financial-centers-in-2025/),
[Wikipedia — GFCI](https://en.wikipedia.org/wiki/Global_Financial_Centres_Index).

**Industria** — manifattura pesante, automotive, macchinari. Ancorata alla produzione
auto/veicoli: Cina 31 Mln (Shanghai 88, Pechino 72), Giappone 9 Mln (Osaka 78, Tokyo 72),
Corea 4,2 Mln (Seul 82), poi Bangkok ("Detroit dell'Asia"), Città del Messico, San Paolo,
Istanbul, Germania (Berlino/Parigi). Acciaio Baowu e cluster cinesi rafforzano Shanghai.
Fonti: [Statista — car production by country 2024](https://www.statista.com/statistics/226032/light-vehicle-producing-countries/),
[Wikipedia — motor vehicle production](https://en.wikipedia.org/wiki/List_of_countries_by_motor_vehicle_production),
[Visual Capitalist — global vehicle production](https://www.visualcapitalist.com/mapped-global-vehicle-production-by-country/).

**Materiali_da_costruzione** — cemento, acciaio, legname, vetro. Cina domina (oltre metà
del cemento mondiale, ~50% dell'acciaio: 1.005 Mt nel 2024) → Shanghai 90, Pechino 80;
India 2ª (cemento 450 Mt, acciaio) → Delhi 65; Cemex/Messico (Città del Messico 58),
POSCO/Corea (Seul 65), Turchia (Istanbul 58), legname BC (Vancouver 62), cemento egiziano
(Il Cairo 52).
Fonti: [Statista — cement production by country](https://www.statista.com/statistics/267364/world-cement-production-by-country/),
[Wikipedia — steel production by country](https://en.wikipedia.org/wiki/List_of_countries_by_steel_production),
[Global Cement — Top 100](https://www.globalcement.com/magazine/articles/1390-global-cement-top-100-2026).

**Metalli_preziosi_e_minerali** — estrazione mineraria e metalli (oro, rame, ferro,
nichel, cobalto, fosfati, alluminio). Johannesburg 90 (oro/platino, Witwatersrand >40%
dell'oro storico), Perth 90 (ferro Pilbara: Rio ~331 Mt, BHP ~260 Mt; oro), Santiago 82
(Cile #1 rame, 5,3 Mt = 23% mondiale; Escondida), Kinshasa 78 (RDC #2 rame 3,2 Mt e #1
cobalto ~70%), Lima 72 (Perù #3 rame), Giacarta 62 (Indonesia #1 nichel), Casablanca 60
(Marocco OCP >70% riserve fosfati mondiali), Mosca 65 (Norilsk: nichel/palladio), Città
del Messico 58 (Messico #1 argento), Reykjavik 55 (alluminio primario ~730 kt, 11° al
mondo), Vancouver/Toronto 55–58 (mining + sede società).
Fonti: [MINING.COM — biggest copper mines](https://www.mining.com/featured-article/ranked-worlds-biggest-copper-mines/),
[Visual Capitalist — largest iron ore producers](https://elements.visualcapitalist.com/visualizing-the-worlds-largest-iron-ore-producers/),
[OCP Group (>70% riserve fosfati)](https://en.wikipedia.org/wiki/OCP_Group),
[Statista — DRC cobalt](https://www.statista.com/statistics/339834/mine-production-of-cobalt-in-dr-congo/),
[USGS — Mineral Industry of Iceland (alluminio)](https://pubs.usgs.gov/myb/vol3/2020-21/myb3-2020-21-iceland.pdf).

**Tecnologia** — semiconduttori, elettronica, software, hi-tech. Corea memorie (Seul 95,
Samsung/SK ~18% capacità mondiale), Giappone (Tokyo 92, Osaka 72), Cina (Pechino/Shanghai
85, ~21% capacità), Singapore 78 (fab + test), India IT (Mumbai/Delhi 60–62), assemblaggio
elettronico (Manila/Ho Chi Minh 55–58), LA 72 / NY 68 (tech+aerospazio/media).
Fonti: [Oxford Economics — Asia's semiconductor cities](https://www.oxfordeconomics.com/resource/what-key-cities-are-driving-asias-semiconductor-success/),
[Tom's Hardware — foundry capacity by country](https://www.tomshardware.com/tech-industry/semiconductors/china-could-be-the-worlds-top-semiconductor-foundry-hub-by-2030-despite-us-curbs-nation-to-hold-30-percent-of-global-installed-capacity-surpassing-taiwan),
[CEPA — Asia's semiconductor superpowers](https://cepa.org/article/part-three-asias-semiconductor-superpowers-soar/).

**Tessuti** — abbigliamento, tessile, pelletteria. Dhaka 98 (Bangladesh 2° esportatore,
~36 mld $, 80% dell'export nazionale), Ho Chi Minh 82 (Vietnam 3°, ~32 mld $), Delhi 75
(India ~36,6 mld $), Istanbul 72 (Turchia top-5), Karachi 70 (Pakistan 9°, ~16,6 mld $),
poi Cina diffusa (Shanghai 60), moda francese (Parigi 62, alto valore/basso volume),
Egitto cotone (Il Cairo 58).
Fonti: [Fibre2Fashion — top textile/apparel exporters](https://www.fibre2fashion.com/industry-article/8471/top-10-exporting-countries-of-textile-and-apparel-industry),
[Textile Today — top exporters](https://www.textiletoday.com.bd/top-10-largest-textile-apparel-exporting-countries-in-the-world),
[Statista — leading clothing exporters 2024](https://www.statista.com/statistics/1198302/apparel-leading-exporters-worldwide-by-value/).

## Effetto apocalisse

Razionale, **non** ricalcolo dei ranking. Dopo il collasso conta la **resilienza della
filiera**: ciò che è locale ed estrattivo regge, ciò che dipende da catene globali e
import crolla. Suggerimento di moltiplicatori da applicare al punteggio base in-game
(da tarare col playtest):

| Risorsa | Mod. post-apoc | Perché |
|---|---:|---|
| agroalimentare | ×1,2 | Filiera corta, terra+acqua locali. Il cibo è la valuta suprema → si rivaluta. |
| metalli_preziosi_e_minerali | ×1,1 | L'estrazione resta dov'è il giacimento; input grezzi sempre richiesti. |
| combustibili_fossili | ×1,0 | Estrazione regge, ma la **raffinazione** dipende da pezzi/chimici → cala dove è solo hub (Singapore). |
| materiali_da_costruzione | ×1,0 | Domanda altissima per ricostruzione/difese; cemento/acciaio sono producibili localmente. |
| energia | ×0,9 | Le reti soffrono; premiate idro/geotermico/nucleare locali (Reykjavik, Parigi) vs import di combustibile. |
| chimica | ×0,8 | Medicine/fertilizzanti preziosi ma la petrolchimica avanzata richiede filiere globali. |
| industria | ×0,75 | Manifattura complessa = componenti importati; sopravvive solo la più integrata. |
| tessuti | ×0,7 | Export-oriented su cotone/fibre importate e mercati esteri spariti; resta il fabbisogno base. |
| tecnologia | ×0,5 | La più fragile: semiconduttori = filiere ultra-globali, impossibili da mantenere isolati. |
| finanza | ×0,2 | Il denaro vale quasi nulla; resta solo come residuo di reti commerciali (peso 1 in HumT). |

Effetti sui ranking (coerenti con `gdp_post_apoc_humt` di ECONOMIA.md): i centri puramente
finanziari/hi-tech (Londra, NY, Sydney) perdono peso relativo; le potenze di
cibo/energia/combustibili/metalli (Buenos Aires, San Paolo, Chicago, Riyad, Mosca,
Johannesburg, Perth, Reykjavik) salgono.

## Caselle stimate senza fonte solida (trasparenza)

- **Tutta la colonna `energia`**: nessun dato pulito di GW per area metropolitana →
  derivata da rete nazionale × peso del metro. È la colonna meno solida.
- **Disaggregazione città↔nazione** per industria, materiali, chimica, tecnologia: le
  fonti sono nazionali/di settore; l'attribuzione alla singola città segue il cluster
  reale ma è una stima (es. acciaio cinese attribuito a Shanghai/Pechino come proxy).
- **Città piccole/insulari**: Suva (Figi), Antananarivo (Madagascar), Honolulu, Anchorage —
  pochi dati comparabili; punteggi prudenti basati su export dominante (zucchero/pesca,
  vaniglia/nichel, pesca/oil North Slope) e taglia ridotta.
- **Hinterland agricolo dei metro**: per agroalimentare conta la regione, non il comune
  (es. Chicago ↔ Corn Belt, LA ↔ Central Valley, Buenos Aires ↔ Pampa): attribuzione
  ragionata, non misurata sul perimetro urbano.

> Nota di metodo: rispetto all'assegnazione "per reputazione" di `cities.json`, gli
> scostamenti più rilevanti emersi sono — **Città del Messico** (argento #1 mondiale,
> oggi sottopesata su minerali), **Giacarta/Manila** (nichel indonesiano/filippino,
> minerali sottostimati), **Perth** (sia ferro Pilbara sia LNG: doppio picco
> minerali+combustibili), **Reykjavik** (alluminio primario, non solo energia),
> **Mosca** (Norilsk: metalli oltre agli idrocarburi), **Vancouver** (legname BC per
> materiali_da_costruzione), **Casablanca** (fosfati OCP a cavallo tra minerali e chimica).
