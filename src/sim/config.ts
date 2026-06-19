import type { ResourceType } from './resources';
import type { WeaponModuleId } from './weapons';

export const CONFIG = {
  ticksPerDay: 20,
  startDateIso: '2026-01-01',
  economy: {
    // valore in HumT di 1 punto di capacità produttiva (vedi Economy-model/ECONOMIA.md):
    // se cambiano, ricalcolare gdp_post_apoc_humt in cities.json
    resourceWeights: {
      agroalimentare: 10,
      energia: 9,
      chimica: 8,
      combustibili_fossili: 8,
      materiali_da_costruzione: 7,
      industria: 6,
      metalli_preziosi_e_minerali: 5,
      tecnologia: 4,
      tessuti: 3,
      finanza: 1,
    } satisfies Record<ResourceType, number>,
    conversionRate: 0.1, // unità prodotte al giorno per punto di capacità
    taxRatePerDay: 0.09, // gettito = Σ(peso×amount) × popFactor × aliquota (~52–203 Ħ/g per città)
    embassy: { baseHumt: 150, baseAgro: 20, distanceDivisorKm: 5000 },
    // riserve recuperate dalle macerie alla fondazione del QG: bastano per il
    // primo squadrone subito, o squadrone + ambasciata vicina in 1-2 giorni
    starterKit: {
      humt: 450,
      resources: { industria: 30, combustibili_fossili: 20, agroalimentare: 25 },
    },
    // Moltiplicatore economico per fascia di popolazione (vedi
    // docs/superpowers/specs/2026-06-18-bilancio-popolazione-design.md).
    // Dinamico: la fascia è calcolata dalla popolazione ATTUALE.
    // Schema B (àncora Megalopoli = 1×). minPopulation in ordine crescente;
    // la fascia è l'ultima con minPopulation <= popolazione.
    populationTiers: [
      { key: 'cittadina', minPopulation: 0, multiplier: 0.2 },
      { key: 'citta', minPopulation: 1_000_000, multiplier: 0.3 },
      { key: 'metropoli', minPopulation: 4_000_000, multiplier: 0.4 },
      { key: 'megacitta', minPopulation: 10_000_000, multiplier: 0.56 },
      { key: 'metacitta', minPopulation: 18_000_000, multiplier: 0.76 },
      { key: 'megalopoli', minPopulation: 26_000_001, multiplier: 1 },
    ],
  },
  squadron: {
    attack: 6,
    shotsPerTick: 1,
    hp: 150,
    armor: 0,
    weaponModule: 'minigun' satisfies WeaponModuleId, // arma montata sugli hardpoint delle ali
    speedKmPerDay: 54000, // crociera 2250 km/h (= 54000/24): velocità effettiva di trasferimento
    cruiseAltitudeKm: 15, // quota realistica riportata dal tracciamento (il rendering resta esagerato per visibilità)
    baseCost: 300, // in HumT; si aggiunge resourceCost
    resourceCost: { industria: 25, combustibili_fossili: 15 } satisfies Partial<
      Record<ResourceType, number>
    >,
    costGrowth: 0.5,
  },
  // Fisica orbitale (vedi src/sim/orbit.ts). Tutto in RAGGI terrestri (globo = 1)
  // e TICK. Costanti "reali scalate": μ deriva da g reale con τ = 4320 s-gioco/tick
  // (= 1 giorno-gioco / 20). Le durate delle fasi NON sono più costanti: la sim le
  // deriva da questi parametri e le salva come tick interi (deterministico).
  physics: {
    mu: 28.7, // G·M ≈ 28,7 raggi³/tick² (g reale, τ=4320 s/tick) → periodo LEO ~2,4 tick
    orbitRadius: 1.6, // quota dell'orbita di parcheggio
    surfaceRadius: 1.02, // quota di hover in superficie (rapimento)
    visualStartDistance: 8, // quota di comparsa per il RENDER (il timing viene dalla distanza fisica)
    auInRadii: 23482, // 1 UA in raggi terrestri: per il timing fisico della crociera flip-and-burn
    lunarDistance: 60, // raggi: soglia (fisica) di rientro a 1x del tasto ">>>"
    engageAltitude: 1.6, // quota sotto cui i caccia possono ingaggiare (default = quota d'orbita)
  },
  ufoAbductor: {
    attack: 4,
    shotsPerTick: 1,
    hp: 500,
    armor: 0,
    captureCapacity: 100, // persone max a bordo: l'UFO rapisce finché non è pieno
    abductionPerDay: 300, // 100 persone in 8 ore-gioco (= 1 ogni 4,8 min-gioco, 15/tick)
    mass: 1, // massa (cancella nella gravità: conta solo con la spinta)
    thrust: 30, // spinta → a_spinta = thrust/mass (≥ g_superficie per poter fare hover/atterrare)
    startDistanceAu: 1, // distanza di comparsa in UA (timing crociera; 2 UA ≈ 1,41× il tempo)
    orbits: 3, // giri completi prima della discesa
    weaponModule: 'plasma-turret' satisfies WeaponModuleId, // arma montata sugli hardpoint
  },
  waves: {
    firstWaveDayMin: 10,
    firstWaveDayMax: 15,
    intervalBaseDays: 14,
    intervalShrinkPerWave: 1,
    intervalMinDays: 5,
    ufosBase: 1,
    ufosPerWave: 1,
    victoryWaves: 10,
  },
  saveVersion: 5,
} as const;
