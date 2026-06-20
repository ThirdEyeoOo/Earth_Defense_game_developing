import { cmdAbduct } from '../sim/commands';
import { CONFIG } from '../sim/config';
import type { GameState } from '../sim/state';

// Motore di rapimento in TEMPO REALE (come il combattimento, non più a tick). Ogni UFO in
// fase 'abducting' preleva UNA persona alla volta alla cadenza giusta, in MINUTI-GIOCO, così
// il contatore sale di uno alla volta invece che a blocchi (un tick = 15). Accelera con la
// velocità di gioco e si congela in pausa. Il prelievo passa dal comando cmdAbduct (unico
// canale di mutazione), che a capienza piena / città esaurita fa partire la fuga.

const GAME_MINUTES_PER_DAY = 1440; // 24 h × 60 min = un giorno-gioco
// minuti-gioco tra un rapito e l'altro, derivati dal ritmo di progetto:
// abductionPerDay persone/giorno ⇒ 1 ogni 1440/abductionPerDay minuti-gioco (= 4,8 con 300/g).
const ABDUCT_INTERVAL = GAME_MINUTES_PER_DAY / CONFIG.ufoAbductor.abductionPerDay;
const MAX_PER_FRAME = 4096; // fermo anti-runaway (pausa lunga, 1000×, tab in background)

export class AbductionEngine {
  private nextAbductAt = new Map<number, number>(); // ufoId → prossimo rapito (min-gioco)

  reset(): void {
    this.nextAbductAt.clear();
  }

  // `tickFraction` (frazione del tick in corso) viene inoltrato a cmdAbduct: se un prelievo
  // fa scattare la fuga, l'UFO ricorda da che frazione parte (render senza "teletrasporto").
  update(state: GameState, gameMinutes: number, speed: number, tickFraction = 0): void {
    if (speed <= 0) return; // in pausa nessun rapimento
    const live = new Set<number>();
    for (const ufo of state.ufos) {
      if (ufo.phase !== 'abducting') continue;
      live.add(ufo.id);
      let at = this.nextAbductAt.get(ufo.id) ?? gameMinutes; // primo rapito appena entra in fase
      let taken = 0;
      while (gameMinutes >= at && taken < MAX_PER_FRAME) {
        cmdAbduct(state, ufo.id, tickFraction);
        if (ufo.phase !== 'abducting') break; // pieno / città esaurita → cmdAbduct ha fatto fuggire
        at += ABDUCT_INTERVAL;
        taken += 1;
      }
      // backlog enorme (pausa lunga / alta velocità): non accumulare, riparti da adesso
      if (taken >= MAX_PER_FRAME && gameMinutes > at) at = gameMinutes;
      this.nextAbductAt.set(ufo.id, at);
    }
    // dimentica gli UFO che non rapiscono più (cambio fase / rimossi): niente chiavi stantie
    for (const id of [...this.nextAbductAt.keys()]) {
      if (!live.has(id)) this.nextAbductAt.delete(id);
    }
  }
}
