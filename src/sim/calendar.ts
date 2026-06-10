import { CONFIG } from './config';

export function dayOfTick(tick: number): number {
  return Math.floor(tick / CONFIG.ticksPerDay);
}

export function dateOfTick(tick: number): Date {
  const d = new Date(CONFIG.startDateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayOfTick(tick));
  return d;
}
