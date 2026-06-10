import { CONFIG } from './config';

export function dayOfTick(tick: number): number {
  return Math.floor(tick / CONFIG.ticksPerDay);
}

export function dateOfTick(tick: number): Date {
  const d = new Date(CONFIG.startDateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayOfTick(tick));
  return d;
}

// Orario nel giorno di gioco; accetta tick frazionari così l'orologio
// scorre fluido tra un tick e l'altro (solo display, la sim non lo usa).
export function clockOfTick(tickFloat: number): { hour: number; minute: number } {
  const dayFraction = (tickFloat % CONFIG.ticksPerDay) / CONFIG.ticksPerDay;
  const totalMinutes = Math.floor(dayFraction * 24 * 60);
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
}
