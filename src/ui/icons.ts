import gearRaw from '../../Assets/Widgets/Barra_Menu_Superiore/tasto-impostazioni.svg?raw';

// L'asset viene inlineato in più punti del DOM: via l'id (sarebbe duplicato)
// e il <title> hardcoded in italiano (il tooltip lo mette il bottone con t()).
export const gearIcon = gearRaw
  .replace(' id="btn-impostazioni"', '')
  .replace(/<title>.*?<\/title>\s*/, '');
