import gearRaw from '../../Assets/Widgets/Barra_Menu_Superiore/tasto-impostazioni.svg?raw';
import bilancioRaw from '../../Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-bilancio.svg?raw';
import cittaRaw from '../../Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-citta.svg?raw';
import costruisciRaw from '../../Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-costruisci.svg?raw';
import ricercaRaw from '../../Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-ricerca.svg?raw';

// Gli asset vengono inlineati nel DOM: via gli id (il DOM li vuole unici)
// e gli eventuali <title> hardcoded (il tooltip lo mette il bottone con t()).
function stripForInline(svg: string): string {
  return svg.replace(/ id="[^"]*"/g, '').replace(/<title>.*?<\/title>\s*/, '');
}

export const gearIcon = stripForInline(gearRaw);

// Pulsanti della barra inferiore: il <text> dentro l'SVG è un segnaposto
// vuoto che bottomBar.ts riempie con t('bar.*') al boot e al cambio lingua.
export const barButtonIcons = {
  bilancio: stripForInline(bilancioRaw),
  costruisci: stripForInline(costruisciRaw),
  ricerca: stripForInline(ricercaRaw),
  citta: stripForInline(cittaRaw),
} as const;
