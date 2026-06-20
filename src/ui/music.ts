// Musica di sottofondo: un'unica traccia in loop (il tema del gioco). La sorgente è
// importata come asset Vite (URL bundlato). Il volume (0..1, 0 = disattivata) è guidato
// dal cursore in Impostazioni e persistito nelle preferenze (src/ui/prefs.ts).
//
// Autoplay: i browser bloccano la riproduzione audio finché non c'è un gesto utente.
// `play()` viene chiamato a fine intro (già un gesto), ma se la riproduzione viene
// comunque rifiutata, si riprova al primo click/tasto successivo.
const MUSIC_URL = new URL('../../Assets/Audio/Themes/Signal From Vega.mp3', import.meta.url).href;

export interface MusicController {
  play(): void; // dichiara l'intento di riprodurre (parte se il volume > 0)
  setVolume(v: number): void; // 0..1; 0 mette in pausa, >0 riprende
  getVolume(): number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function createMusic(initialVolume: number): MusicController {
  const audio = new Audio(MUSIC_URL);
  audio.loop = true;
  let volume = clamp01(initialVolume);
  audio.volume = volume;
  let started = false; // play() chiamato almeno una volta (intento di riproduzione)
  let awaitingGesture = false; // in attesa di un gesto utente per sbloccare l'autoplay

  function tryPlay(): void {
    if (!started || volume <= 0) return;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (awaitingGesture) return; // un solo listener in attesa per volta
        awaitingGesture = true;
        const retry = (): void => {
          awaitingGesture = false;
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
          tryPlay();
        };
        window.addEventListener('pointerdown', retry);
        window.addEventListener('keydown', retry);
      });
    }
  }

  return {
    play(): void {
      started = true;
      tryPlay();
    },
    getVolume(): number {
      return volume;
    },
    setVolume(v: number): void {
      volume = clamp01(v);
      audio.volume = volume;
      if (volume <= 0) audio.pause();
      else tryPlay();
    },
  };
}
