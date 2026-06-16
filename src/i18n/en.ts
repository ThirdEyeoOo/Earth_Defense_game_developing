import type { MessageKey } from './it';

// Dizionario inglese: Record<MessageKey, string> obbliga TypeScript a coprire
// ogni chiave di it.ts (chiave mancante o in più = errore di compilazione).
export const en: Record<MessageKey, string> = {
  'app.title': 'Earth Defense',

  // HUD
  'hud.radar': 'Radar',
  'hud.save': 'Save',
  'hud.humt': 'Ħ {n}',
  'hud.pop': 'Pop. {n}',
  'hud.abductions': 'Abductions: {n}',
  'hud.dead': 'Deaths: {n}',
  'hud.attackInProgress': '⚠ UNDER ATTACK',
  'hud.nextWave': 'Next wave: {days}d',
  'hud.skipToNextAttack': 'Skip to next attack',

  // city panel
  'panel.population': 'Population:',
  'panel.cityDestroyed': 'CITY DESTROYED',
  'panel.ufosInArea': '⚠ UFOs in the area: {n}',
  'panel.squadrons': 'Squadrons ({n})',
  'panel.inbound': '{n} inbound',
  'panel.build': 'Build squadron (Ħ {humt} + {ind} industry + {fuel} fuel)',
  'panel.squadronItem': 'Squadron #{id} — HP {hp}',
  'panel.transfer': 'Transfer',
  'panel.networkHq': '★ Headquarters',
  'panel.networkConnected': '● Connected to the network',
  'panel.networkNeutral': '○ Neutral (off the network)',
  'panel.resources': 'Resources',
  'panel.productionPerDay': '+{n}/d',
  'panel.foundHq': 'Found the Headquarters here (free)',
  'panel.starterKit': 'Starter kit: Ħ {humt} + {ind} industry + {fuel} fuel + {agro} agri-food',
  'panel.openEmbassy': 'Open embassy (Ħ {humt} + {agro} agri-food)',

  // radar
  'radar.title': 'Radar',
  'radar.nextWave': 'Next wave:',
  'radar.waveN': 'wave {n}',
  'radar.eta': 'Expected arrival in:',
  'radar.etaDays': '{n} days',
  'radar.strength': 'Estimated strength:',
  'radar.strengthUfos': '{n} UFOs',
  'radar.region': 'Region:',
  'radar.ufosNow': 'UFOs currently in the area:',

  // end screen
  'end.victory': 'THE EARTH IS SAFE',
  'end.defeat': 'THE EARTH HAS FALLEN',
  'end.daysSurvived': 'Days survived:',
  'end.popSaved': 'Population saved:',
  'end.popLost': 'Population lost:',
  'end.ufosShot': 'UFOs shot down:',
  'end.newGame': 'New game',

  // intro (logo + video, ui/intro.ts)
  'intro.skipHint': 'Click or press Esc to skip',

  // tutorial (Third Eye companion, ui/tutorial.ts)
  'tutorial.step1':
    "Hi, I'm Third Eye, your personal assistant. We're at the start of a new game, so I'll guide you through the basics!",
  'tutorial.step2':
    'With the sudden disappearance of almost every city on Earth, the economy and society collapsed overnight. The economic system was wiped out, and the dollar no longer has any reason to exist after the collapse. Only the founding of a new society can attempt to restart everything. And you will be the founder of this new society.',
  'tutorial.step3': 'Choose a starting city where you will found the Headquarters.',
  'tutorial.founded': 'Well done! Headquarters founded in {city}!',
  'tutorial.next': '>',
  'tutorial.nextLabel': 'Next',
  'tutorial.toggleHint': 'Third Eye — click to hide or show the tutorial',

  // start screen and banners
  'start.continue': 'Continue',
  'start.newGame': 'New game',
  'start.invalidSave': 'Invalid or incompatible save',
  'banner.gameSaved': 'Game saved',
  'banner.selectDestination': 'Select the destination city (Esc to cancel)',
  'banner.comingSoon': 'Coming soon',
  'banner.chooseHq': 'The world has collapsed. Choose a city to found the Headquarters of the new humanity',
  'banner.hqFounded': 'Headquarters founded in {city}',

  // balance panel
  'balance.title': 'Budget',
  'balance.stock': 'Stock',
  'balance.productionPerDay': 'Prod./d',
  'balance.incomePerDay': 'Daily income:',
  'balance.connectedCities': 'Connected cities:',

  // combat window (globe badge + ui/combatWindow.ts)
  'combat.title': 'Battle over {city}',
  'combat.close': 'Close',
  'combat.defenders': 'Defenders',
  'combat.attackers': 'Invaders',
  'combat.squadron': 'Squadron #{id}',
  'combat.ufo': 'UFO #{id}',
  'combat.abductions': 'Abducted: {n}',
  'combat.phase': 'Phase: {phase}',
  'combat.phase.descending': 'Descent',
  'combat.phase.abducting': 'Abduction',
  'combat.phase.escaping': 'Escape',
  'combat.ended': 'Battle over',
  'combat.badgeAlt': 'Open the battle over {city}',

  // bottom menu bar
  'bar.bilancio': 'Budget',
  'bar.costruisci': 'Build',
  'bar.ricerca': 'Research',
  'bar.citta': 'Cities',

  // research tree (ui/researchPanel.ts + sim/researchTree.ts)
  // NB: structure preview only — gameplay functionality comes later
  'tech.title': 'Research Tree',
  'tech.subtitle': 'Structure preview — functionality coming soon',
  'tech.close': 'Close',
  'tech.branch.combat': 'Combat',
  'tech.branch.economy': 'Economy',
  'tech.branch.orbital': 'Orbital countermeasures',
  'tech.combat-ap.title': 'Armor-piercing rounds',
  'tech.combat-ap.desc': 'Increases squadron attack.',
  'tech.combat-armor.title': 'Reinforced plating',
  'tech.combat-armor.desc': 'Increases squadron armor.',
  'tech.combat-nextgen.title': 'Next-generation fighter',
  'tech.combat-nextgen.desc': 'Tougher aircraft: more hit points for squadrons.',
  'tech.economy-extraction.title': 'Extraction optimization',
  'tech.economy-extraction.desc': 'Increases resource production of connected cities.',
  'tech.economy-tax.title': 'Fiscal reform',
  'tech.economy-tax.desc': 'Increases tax income.',
  'tech.economy-diplomacy.title': 'Efficient diplomacy',
  'tech.economy-diplomacy.desc': 'Reduces the cost of embassies.',
  'tech.orbital-radar.title': 'Long-range radar',
  'tech.orbital-radar.desc': 'Longer warning of incoming attacks.',
  'tech.orbital-interceptors.title': 'Suborbital interceptors',
  'tech.orbital-interceptors.desc': 'Lets you engage UFOs at higher altitudes.',

  // command errors
  'cmd.cityUnavailable': 'City unavailable',
  'cmd.insufficientHumt': 'Insufficient HumT (Ħ {cost} needed)',
  'cmd.insufficientResources': 'Insufficient resources: {amount} {resource} needed',
  'cmd.squadronNotFound': 'Squadron not found',
  'cmd.squadronInTransfer': 'Squadron already in transfer',
  'cmd.destinationUnavailable': 'Destination unavailable',
  'cmd.sameCity': 'The squadron is already here',
  'cmd.hqAlreadyFounded': 'The Headquarters has already been founded',
  'cmd.hqNotFounded': 'Found the Headquarters first',
  'cmd.alreadyConnected': 'City already connected to the network',

  // resources (key = ResourceType in sim/resources.ts)
  'res.agroalimentare': 'Agri-food',
  'res.chimica': 'Chemicals',
  'res.combustibili_fossili': 'Fossil fuels',
  'res.energia': 'Energy',
  'res.finanza': 'Finance',
  'res.industria': 'Industry',
  'res.materiali_da_costruzione': 'Construction materials',
  'res.metalli_preziosi_e_minerali': 'Precious metals & minerals',
  'res.tecnologia': 'Technology',
  'res.tessuti': 'Textiles',

  // floating texts
  'float.squadronTransferStarted': 'squadron en route',
  'float.ufoOrbiting': 'in orbit',
  'float.ufoDescending': 'landing',
  'float.ufoAbducting': 'abductions in progress',
  'float.abductions': 'Abductions = {n}',

  // dimensional tracking (click a UFO/squadron → real altitude/speed/ETA)
  'track.ufo': 'UFO #{id}',
  'track.squadron': 'Squadron #{id}',
  'track.altitude': 'Altitude: {km} ft',
  'track.speed': 'Speed: {kmh} mph',
  'track.eta': 'ETA {eta} → {city}',
  'track.etaNone': 'ETA —',
  'track.unit.d': 'd',
  'track.unit.h': 'h',
  'track.unit.m': 'm',

  // encyclopedia ("?" button in the HUD + ui/encyclopedia.ts)
  'enc.open': 'Encyclopedia',
  'enc.title': 'Encyclopedia',
  'enc.close': 'Close',
  'enc.humt.title': 'HumT and daily income',
  'enc.humt.body':
    '<p><strong>HumT</strong> (Humanity Treasure) is the currency of the new humanity. After the collapse almost every city vanished: the dollar is worthless and every exchange goes through HumT.</p>' +
    '<p><strong>Daily income</strong> is the sum of the taxes paid each day by the cities connected to the network (Headquarters and embassies). A city contributes only if it is alive, connected and not under abduction.</p>' +
    '<p>For each city the income is:</p>' +
    '<p class="enc-formula">GDP × population factor × tax rate</p>' +
    '<ul>' +
    '<li><strong>GDP</strong>: sum of (resource weight × capacity) over all the city resources. Capacity (0–100) can be damaged by enemies, lowering the GDP.</li>' +
    '<li><strong>Population factor</strong>: current population ÷ initial population (drops if the city loses inhabitants).</li>' +
    '<li><strong>Tax rate</strong>: 9% per day.</li>' +
    '</ul>' +
    '<p>Resource weights (HumT value per capacity point): agrifood 10, energy 9, chemicals 8, fossil fuels 8, construction materials 7, industry 6, precious metals & minerals 5, technology 4, textiles 3, finance 1.</p>' +
    '<p>The total, rounded, is added to your HumT at every day change. An ongoing abduction suspends the income and production of the affected city.</p>',

  // settings menu
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.close': 'Close',
  'settings.open': 'Settings',

  // wave regions
  'region.asia': 'Asia',
  'region.middle-east': 'Middle East',
  'region.europe': 'Europe',
  'region.africa': 'Africa',
  'region.north-america': 'North America',
  'region.south-america': 'South America',
  'region.oceania': 'Oceania',

  // cities
  'city.tokyo': 'Tokyo',
  'city.delhi': 'Delhi',
  'city.shanghai': 'Shanghai',
  'city.dhaka': 'Dhaka',
  'city.mumbai': 'Mumbai',
  'city.beijing': 'Beijing',
  'city.osaka': 'Osaka',
  'city.karachi': 'Karachi',
  'city.manila': 'Manila',
  'city.seoul': 'Seoul',
  'city.jakarta': 'Jakarta',
  'city.bangkok': 'Bangkok',
  'city.singapore': 'Singapore',
  'city.hochiminh': 'Ho Chi Minh City',
  'city.istanbul': 'Istanbul',
  'city.tehran': 'Tehran',
  'city.baghdad': 'Baghdad',
  'city.riyadh': 'Riyadh',
  'city.moscow': 'Moscow',
  'city.london': 'London',
  'city.paris': 'Paris',
  'city.berlin': 'Berlin',
  'city.madrid': 'Madrid',
  'city.rome': 'Rome',
  'city.reykjavik': 'Reykjavik',
  'city.cairo': 'Cairo',
  'city.lagos': 'Lagos',
  'city.kinshasa': 'Kinshasa',
  'city.nairobi': 'Nairobi',
  'city.johannesburg': 'Johannesburg',
  'city.casablanca': 'Casablanca',
  'city.antananarivo': 'Antananarivo',
  'city.newyork': 'New York',
  'city.losangeles': 'Los Angeles',
  'city.mexicocity': 'Mexico City',
  'city.chicago': 'Chicago',
  'city.toronto': 'Toronto',
  'city.vancouver': 'Vancouver',
  'city.anchorage': 'Anchorage',
  'city.saopaulo': 'São Paulo',
  'city.buenosaires': 'Buenos Aires',
  'city.lima': 'Lima',
  'city.bogota': 'Bogotá',
  'city.santiago': 'Santiago',
  'city.sydney': 'Sydney',
  'city.melbourne': 'Melbourne',
  'city.perth': 'Perth',
  'city.auckland': 'Auckland',
  'city.honolulu': 'Honolulu',
  'city.suva': 'Suva',

  // countries (keyed by the Italian name used in data/cities.json)
  'country.Giappone': 'Japan',
  'country.India': 'India',
  'country.Cina': 'China',
  'country.Bangladesh': 'Bangladesh',
  'country.Pakistan': 'Pakistan',
  'country.Filippine': 'Philippines',
  'country.Corea del Sud': 'South Korea',
  'country.Indonesia': 'Indonesia',
  'country.Thailandia': 'Thailand',
  'country.Singapore': 'Singapore',
  'country.Vietnam': 'Vietnam',
  'country.Turchia': 'Turkey',
  'country.Iran': 'Iran',
  'country.Iraq': 'Iraq',
  'country.Arabia Saudita': 'Saudi Arabia',
  'country.Russia': 'Russia',
  'country.Regno Unito': 'United Kingdom',
  'country.Francia': 'France',
  'country.Germania': 'Germany',
  'country.Spagna': 'Spain',
  'country.Italia': 'Italy',
  'country.Islanda': 'Iceland',
  'country.Egitto': 'Egypt',
  'country.Nigeria': 'Nigeria',
  'country.RD Congo': 'DR Congo',
  'country.Kenya': 'Kenya',
  'country.Sudafrica': 'South Africa',
  'country.Marocco': 'Morocco',
  'country.Madagascar': 'Madagascar',
  'country.USA': 'USA',
  'country.Messico': 'Mexico',
  'country.Canada': 'Canada',
  'country.Brasile': 'Brazil',
  'country.Argentina': 'Argentina',
  'country.Perù': 'Peru',
  'country.Colombia': 'Colombia',
  'country.Cile': 'Chile',
  'country.Australia': 'Australia',
  'country.Nuova Zelanda': 'New Zealand',
  'country.Figi': 'Fiji',
};
