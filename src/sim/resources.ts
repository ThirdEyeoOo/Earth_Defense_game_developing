// I 10 macrogruppi di risorse del mondo post-collasso (vedi Economy-model/ECONOMIA.md).
// Modulo separato perché serve sia a config.ts (pesi) sia a state.ts (stato città):
// config non può importare state.

export const RESOURCE_TYPES = [
  'agroalimentare',
  'chimica',
  'combustibili_fossili',
  'energia',
  'finanza',
  'industria',
  'materiali_da_costruzione',
  'metalli_preziosi_e_minerali',
  'tecnologia',
  'tessuti',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface CityResource {
  type: ResourceType;
  amount: number; // indice di capacità produttiva 0–100, mutabile (i nemici potranno danneggiarlo)
}

// magazzino globale: una voce per ogni tipo, sempre nell'ordine di RESOURCE_TYPES
export function emptyStockpile(): Record<ResourceType, number> {
  const stock = {} as Record<ResourceType, number>;
  for (const type of RESOURCE_TYPES) stock[type] = 0;
  return stock;
}
