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
    // Modello a CURVA UNICA: output(città) = (popolazione_attuale × potenziale)^outputExponent
    // (potenziale = Σ amount, max 1000). Gettito e produzione di beni sono due scalature
    // della stessa curva (stessa forma, due costanti) — NON c'è più aliquota/accoppiamento.
    // Solo popolazione ATTUALE: il gettito cresce se la città cresce e cala se viene spopolata.
    // Esponente e costanti calibrati su tutte le 50 città (vedi memoria/diario sessione):
    //   ancoraggi gettito max 25 (Shanghai) / min 1 (Suva); beni tarati su Tokyo ~18/g.
    outputExponent: 0.5469, // = ln25 / ln(top/bottom) sul prodotto pop·potenziale (rendimenti decrescenti)
    incomeCoeff: 5.6864e-5, // HumT/g = incomeCoeff × output → Suva 1, Shanghai 25
    productionCoeff: 4.2e-5, // beni/g totali = productionCoeff × output (≈0,739 × gettito) → Tokyo ~18
    embassy: { baseHumt: 150, baseAgro: 20, distanceDivisorKm: 5000 },
    // riserve recuperate dalle macerie alla fondazione del QG: bastano per il
    // primo squadrone subito, o squadrone + ambasciata vicina in 1-2 giorni
    starterKit: {
      humt: 450,
      resources: { industria: 30, combustibili_fossili: 20, agroalimentare: 25 },
    },
  },
  squadron: {
    attack: 6,
    shotsPerTick: 1,
    hp: 150,
    armor: 2, // riduzione danno per colpo, ATTIVA solo col nodo Ricerca `blindatura` sbloccato
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
    surfaceRadius: 1.004, // quota di hover in rapimento ≈ 25 km: l'UFO scende vicino alla città
    // (prima 1.02 ≈ 127 km) così il caccia (15 km) lo raggiunge con la gittata di 50 km
    visualStartDistance: 160, // quota di comparsa per il RENDER (il timing viene dalla distanza
    // fisica): grande di proposito così l'UFO si vede arrivare VELOCE dallo spazio profondo
    // (spawn ≥10.000 km/h nel readout) — è un puntino lontano (MIN_SCALE) al primo avvistamento
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
  saveVersion: 6,
} as const;
