// Dizionario italiano: è la fonte di verità delle chiavi i18n.
// Ogni stringa visibile all'utente DEVE passare da qui (e da en.ts), mai hardcoded.
// I placeholder {x} vengono interpolati da t() in index.ts.
export const it = {
  'app.title': 'Earth Defense',

  // HUD
  'hud.radar': 'Radar',
  'hud.save': 'Salva',
  'hud.humt': 'Ħ {n}',
  'hud.pop': 'Pop. {n}',
  'hud.abductions': 'Abductions: {n}',
  'hud.dead': 'Morti: {n}',
  'hud.attackInProgress': '⚠ ATTACCO IN CORSO',
  'hud.nextWave': 'Prossima ondata: {days}g',
  'hud.skipToNextAttack': 'Salta al prossimo attacco',

  // pannello città
  'panel.population': 'Popolazione:',
  'panel.cityDestroyed': 'CITTÀ DISTRUTTA',
  'panel.ufosInArea': '⚠ UFO in zona: {n}',
  'panel.squadrons': 'Squadroni ({n})',
  'panel.inbound': '{n} in arrivo',
  'panel.build': 'Costruisci squadrone (Ħ {humt} + {ind} industria + {fuel} combustibili)',
  'panel.squadronItem': 'Squadrone #{id} — HP {hp}',
  'panel.transfer': 'Trasferisci',
  'panel.networkHq': '★ Quartier Generale',
  'panel.networkConnected': '● Collegata alla rete',
  'panel.networkNeutral': '○ Neutrale (fuori rete)',
  'panel.resources': 'Risorse',
  'panel.productionPerDay': '+{n}/g',
  'panel.foundHq': 'Fonda qui il Quartier Generale (gratis)',
  'panel.starterKit': 'Kit di partenza: Ħ {humt} + {ind} industria + {fuel} combustibili + {agro} agroalimentare',
  'panel.openEmbassy': 'Apri ambasciata (Ħ {humt} + {agro} agroalimentare)',

  // radar
  'radar.title': 'Radar',
  'radar.nextWave': 'Prossima ondata:',
  'radar.waveN': 'ondata {n}',
  'radar.eta': 'Arrivo previsto tra:',
  'radar.etaDays': '{n} giorni',
  'radar.strength': 'Forza stimata:',
  'radar.strengthUfos': '{n} UFO',
  'radar.region': 'Regione:',
  'radar.ufosNow': 'UFO attualmente in zona:',

  // schermata di fine partita
  'end.victory': 'LA TERRA È SALVA',
  'end.defeat': 'LA TERRA È CADUTA',
  'end.daysSurvived': 'Giorni sopravvissuti:',
  'end.popSaved': 'Popolazione salvata:',
  'end.popLost': 'Popolazione perduta:',
  'end.ufosShot': 'UFO abbattuti:',
  'end.newGame': 'Nuova partita',

  // intro (logo + video, ui/intro.ts)
  'intro.skipHint': 'Clicca o premi Esc per saltare',

  // tutorial (compagno Terzo Occhio, ui/tutorial.ts)
  'tutorial.step1':
    'Ciao, sono Terzo Occhio, il tuo assistente personale. Siamo a inizio partita, quindi ti guiderò attraverso i concetti iniziali del gioco!',
  'tutorial.step2':
    "Con la sparizione improvvisa di quasi tutte le città terrestri, l'economia e la società sono di colpo collassate. Il sistema economico si è azzerato e il dollaro non ha più senso di esistere dopo il collasso. Solo l'istituzione di una nuova società può tentare di riavviare tutto. E tu sarai il fondatore di questa nuova società.",
  'tutorial.step3': 'Scegli una città iniziale dove fondare il Quartier Generale.',
  'tutorial.founded': 'Ben fatto! Quartier Generale fondato a {city}!',
  'tutorial.next': '>',
  'tutorial.nextLabel': 'Avanti',
  'tutorial.toggleHint': 'Terzo Occhio — clicca per nascondere o mostrare il tutorial',

  // schermata iniziale e banner
  'start.continue': 'Continua',
  'start.newGame': 'Nuova partita',
  'start.invalidSave': 'Salvataggio non valido o incompatibile',
  'banner.gameSaved': 'Partita salvata',
  'banner.selectDestination': 'Seleziona la città di destinazione (Esc per annullare)',
  'banner.comingSoon': 'Funzione in arrivo',
  'banner.chooseHq': 'Il mondo è collassato. Scegli una città dove fondare il Quartier Generale della nuova umanità',
  'banner.hqFounded': 'Quartier Generale fondato a {city}',

  // pannello bilancio
  'balance.title': 'Bilancio',
  'balance.stock': 'Scorta',
  'balance.productionPerDay': 'Prod./g',
  'balance.incomePerDay': 'Gettito giornaliero:',
  'balance.connectedCities': 'Città collegate:',

  // finestra di scontro (badge sul globo + ui/combatWindow.ts)
  'combat.title': 'Scontro su {city}',
  'combat.close': 'Chiudi',
  'combat.defenders': 'Difensori',
  'combat.attackers': 'Invasori',
  'combat.squadron': 'Squadrone #{id}',
  'combat.ufo': 'UFO #{id}',
  'combat.abductions': 'Rapiti: {n}',
  'combat.phase': 'Fase: {phase}',
  'combat.phase.descending': 'Discesa',
  'combat.phase.abducting': 'Rapimento',
  'combat.phase.escaping': 'Fuga',
  'combat.ended': 'Scontro terminato',
  'combat.badgeAlt': 'Apri lo scontro su {city}',

  // barra menu inferiore
  'bar.bilancio': 'Bilancio',
  'bar.costruisci': 'Costruisci',
  'bar.ricerca': 'Ricerca',
  'bar.citta': 'Città',

  // albero della ricerca (ui/researchPanel.ts + sim/researchTree.ts)
  // NB: anteprima della sola struttura — le funzionalità di gioco arriveranno dopo
  'tech.title': 'Albero della Ricerca',
  'tech.subtitle': 'Anteprima della struttura — le funzionalità arriveranno presto',
  'tech.close': 'Chiudi',
  'tech.branch.combat': 'Combattimento',
  'tech.branch.economy': 'Economia',
  'tech.branch.orbital': 'Contromisure orbitali',
  'tech.combat-ap.title': 'Munizioni perforanti',
  'tech.combat-ap.desc': 'Aumenta l’attacco degli squadroni.',
  'tech.combat-armor.title': 'Blindatura rinforzata',
  'tech.combat-armor.desc': 'Aumenta l’armatura degli squadroni.',
  'tech.combat-nextgen.title': 'Caccia di nuova generazione',
  'tech.combat-nextgen.desc': 'Velivoli più robusti: più punti vita per gli squadroni.',
  'tech.economy-extraction.title': 'Ottimizzazione estrattiva',
  'tech.economy-extraction.desc': 'Aumenta la produzione di risorse delle città collegate.',
  'tech.economy-tax.title': 'Riforma fiscale',
  'tech.economy-tax.desc': 'Aumenta il gettito delle tasse.',
  'tech.economy-diplomacy.title': 'Diplomazia efficiente',
  'tech.economy-diplomacy.desc': 'Riduce il costo delle ambasciate.',
  'tech.orbital-radar.title': 'Radar a lungo raggio',
  'tech.orbital-radar.desc': 'Preavviso più lungo sugli attacchi in arrivo.',
  'tech.orbital-interceptors.title': 'Intercettori suborbitali',
  'tech.orbital-interceptors.desc': 'Permette di ingaggiare gli UFO a quote più alte.',

  // errori dei comandi (codici da sim/commands.ts: la sim non conosce i testi)
  'cmd.cityUnavailable': 'Città non disponibile',
  'cmd.insufficientHumt': 'HumT insufficienti (servono Ħ {cost})',
  'cmd.insufficientResources': 'Risorse insufficienti: servono {amount} di {resource}',
  'cmd.squadronNotFound': 'Squadrone inesistente',
  'cmd.squadronInTransfer': 'Squadrone già in trasferimento',
  'cmd.destinationUnavailable': 'Destinazione non disponibile',
  'cmd.sameCity': 'Lo squadrone è già qui',
  'cmd.hqAlreadyFounded': 'Il Quartier Generale è già stato fondato',
  'cmd.hqNotFounded': 'Prima fonda il Quartier Generale',
  'cmd.alreadyConnected': 'Città già collegata alla rete',

  // risorse (chiave = ResourceType in sim/resources.ts)
  'res.agroalimentare': 'Agroalimentare',
  'res.chimica': 'Chimica',
  'res.combustibili_fossili': 'Combustibili fossili',
  'res.energia': 'Energia',
  'res.finanza': 'Finanza',
  'res.industria': 'Industria',
  'res.materiali_da_costruzione': 'Materiali da costruzione',
  'res.metalli_preziosi_e_minerali': 'Metalli preziosi e minerali',
  'res.tecnologia': 'Tecnologia',
  'res.tessuti': 'Tessuti',

  // fasce di popolazione (chiave = PopulationTierKey in sim/population.ts)
  'panel.tier': 'Fascia:',
  'tier.cittadina': 'Cittadina',
  'tier.citta': 'Città',
  'tier.metropoli': 'Metropoli',
  'tier.megacitta': 'Megacittà',
  'tier.metacitta': 'Metacittà',
  'tier.megalopoli': 'Megalopoli',

  // scritte fluttuanti (render/floatingText.ts)
  'float.squadronTransferStarted': 'squadrone in viaggio',
  'float.ufoOrbiting': 'in orbita',
  'float.ufoDescending': 'atterraggio',
  'float.ufoAbducting': 'rapimenti in corso',
  'float.abductions': 'Abductions = {n}',

  // tracciamento dimensionale (click su UFO/squadrone → quota/velocità/ETA reali)
  'track.ufo': 'UFO #{id}',
  'track.squadron': 'Squadrone #{id}',
  'track.altitude': 'Quota: {km} km',
  'track.speed': 'Velocità: {kmh} km/h',
  'track.eta': 'ETA {eta} → {city}',
  'track.etaNone': 'ETA —',
  'track.unit.d': 'g',
  'track.unit.h': 'h',
  'track.unit.m': 'm',

  // enciclopedia (pulsante "?" nell'HUD + ui/encyclopedia.ts)
  'enc.open': 'Enciclopedia',
  'enc.title': 'Enciclopedia',
  'enc.close': 'Chiudi',
  'enc.humt.title': 'HumT e gettito giornaliero',
  'enc.humt.body':
    '<p><strong>HumT</strong> (Humanity Treasure) è la valuta della nuova umanità. Dopo il collasso quasi tutte le città sono sparite: il dollaro non vale più nulla e ogni scambio passa dagli HumT.</p>' +
    '<p>Il <strong>gettito giornaliero</strong> è la somma delle tasse versate ogni giorno dalle città collegate alla rete (Quartier Generale e ambasciate). Una città contribuisce solo se è viva, collegata e non sotto rapimento.</p>' +
    '<p>Per ogni città il gettito è:</p>' +
    '<p class="enc-formula">PIL × fattore popolazione × aliquota</p>' +
    '<ul>' +
    '<li><strong>PIL</strong>: somma di (peso della risorsa × capacità) su tutte le risorse della città. La capacità (0–100) può essere danneggiata dai nemici, riducendo il PIL.</li>' +
    '<li><strong>Fattore popolazione</strong>: popolazione attuale ÷ popolazione iniziale (scende se la città perde abitanti).</li>' +
    '<li><strong>Aliquota</strong>: 9% al giorno.</li>' +
    '</ul>' +
    '<p>Pesi delle risorse (valore in HumT per punto di capacità): agroalimentare 10, energia 9, chimica 8, combustibili fossili 8, materiali da costruzione 7, industria 6, metalli preziosi e minerali 5, tecnologia 4, tessuti 3, finanza 1.</p>' +
    '<p>Il totale, arrotondato, viene aggiunto agli HumT a ogni cambio di giorno. Un rapimento in corso sospende gettito e produzione della città colpita.</p>',

  // menu impostazioni
  'settings.title': 'Impostazioni',
  'settings.language': 'Lingua',
  'settings.close': 'Chiudi',
  'settings.open': 'Impostazioni',

  // regioni delle ondate
  'region.asia': 'Asia',
  'region.middle-east': 'Medio Oriente',
  'region.europe': 'Europa',
  'region.africa': 'Africa',
  'region.north-america': 'Nord America',
  'region.south-america': 'Sud America',
  'region.oceania': 'Oceania',

  // città (chiave = id in data/cities.json; il valore IT coincide col campo name,
  // un test garantisce che non divergano)
  'city.tokyo': 'Tokyo',
  'city.delhi': 'Delhi',
  'city.shanghai': 'Shanghai',
  'city.dhaka': 'Dhaka',
  'city.mumbai': 'Mumbai',
  'city.beijing': 'Pechino',
  'city.osaka': 'Osaka',
  'city.karachi': 'Karachi',
  'city.manila': 'Manila',
  'city.seoul': 'Seul',
  'city.jakarta': 'Giacarta',
  'city.bangkok': 'Bangkok',
  'city.singapore': 'Singapore',
  'city.hochiminh': 'Ho Chi Minh',
  'city.istanbul': 'Istanbul',
  'city.tehran': 'Teheran',
  'city.baghdad': 'Baghdad',
  'city.riyadh': 'Riyad',
  'city.moscow': 'Mosca',
  'city.london': 'Londra',
  'city.paris': 'Parigi',
  'city.berlin': 'Berlino',
  'city.madrid': 'Madrid',
  'city.rome': 'Roma',
  'city.reykjavik': 'Reykjavik',
  'city.cairo': 'Il Cairo',
  'city.lagos': 'Lagos',
  'city.kinshasa': 'Kinshasa',
  'city.nairobi': 'Nairobi',
  'city.johannesburg': 'Johannesburg',
  'city.casablanca': 'Casablanca',
  'city.antananarivo': 'Antananarivo',
  'city.newyork': 'New York',
  'city.losangeles': 'Los Angeles',
  'city.mexicocity': 'Città del Messico',
  'city.chicago': 'Chicago',
  'city.toronto': 'Toronto',
  'city.vancouver': 'Vancouver',
  'city.anchorage': 'Anchorage',
  'city.saopaulo': 'San Paolo',
  'city.buenosaires': 'Buenos Aires',
  'city.lima': 'Lima',
  'city.bogota': 'Bogotà',
  'city.santiago': 'Santiago',
  'city.sydney': 'Sydney',
  'city.melbourne': 'Melbourne',
  'city.perth': 'Perth',
  'city.auckland': 'Auckland',
  'city.honolulu': 'Honolulu',
  'city.suva': 'Suva',

  // paesi (chiave = stringa italiana usata in data/cities.json)
  'country.Giappone': 'Giappone',
  'country.India': 'India',
  'country.Cina': 'Cina',
  'country.Bangladesh': 'Bangladesh',
  'country.Pakistan': 'Pakistan',
  'country.Filippine': 'Filippine',
  'country.Corea del Sud': 'Corea del Sud',
  'country.Indonesia': 'Indonesia',
  'country.Thailandia': 'Thailandia',
  'country.Singapore': 'Singapore',
  'country.Vietnam': 'Vietnam',
  'country.Turchia': 'Turchia',
  'country.Iran': 'Iran',
  'country.Iraq': 'Iraq',
  'country.Arabia Saudita': 'Arabia Saudita',
  'country.Russia': 'Russia',
  'country.Regno Unito': 'Regno Unito',
  'country.Francia': 'Francia',
  'country.Germania': 'Germania',
  'country.Spagna': 'Spagna',
  'country.Italia': 'Italia',
  'country.Islanda': 'Islanda',
  'country.Egitto': 'Egitto',
  'country.Nigeria': 'Nigeria',
  'country.RD Congo': 'RD Congo',
  'country.Kenya': 'Kenya',
  'country.Sudafrica': 'Sudafrica',
  'country.Marocco': 'Marocco',
  'country.Madagascar': 'Madagascar',
  'country.USA': 'USA',
  'country.Messico': 'Messico',
  'country.Canada': 'Canada',
  'country.Brasile': 'Brasile',
  'country.Argentina': 'Argentina',
  'country.Perù': 'Perù',
  'country.Colombia': 'Colombia',
  'country.Cile': 'Cile',
  'country.Australia': 'Australia',
  'country.Nuova Zelanda': 'Nuova Zelanda',
  'country.Figi': 'Figi',
} as const;

export type MessageKey = keyof typeof it;
