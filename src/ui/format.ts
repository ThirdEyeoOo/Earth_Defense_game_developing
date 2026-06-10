import { dateOfTick } from '../sim/calendar';

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('it-IT');
}

export function fmtDate(tick: number): string {
  return dateOfTick(tick).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
