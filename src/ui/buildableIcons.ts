// Icone dei costruibili (veicoli + strutture), SVG inline con box -20..20. Segnaposto
// geometrici finché non arrivano gli asset reali rotta `dom` da Claude Design. Niente testo
// (vincolo i18n). Usate dal pannello Costruisci e dalla griglia strutture.

export function buildableIconSVG(id: string): string {
  const g: Record<string, string> = {
    f22: '<path d="M0 -17 L4 2 L15 11 L4 9 L2 17 L-2 17 L-4 9 L-15 11 L-4 2 Z" fill="#7fd0ff"/>',
    tower:
      '<circle cx="0" cy="3" r="9" fill="none" stroke="#ff6a4d" stroke-width="2"/><rect x="-3" y="-16" width="6" height="13" rx="2" fill="#ff6a4d"/><circle cx="0" cy="3" r="3" fill="#ff6a4d"/>',
    lab: '<path d="M-6 -16 H6 M-3 -16 V-4 L-12 14 H12 L3 -4 V-16" fill="none" stroke="#6ee7a0" stroke-width="2" stroke-linejoin="round"/>',
  };
  return g[id] ?? '';
}
