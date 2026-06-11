import { getLocale } from '../i18n';
import { clockOfTick, dateOfTick } from '../sim/calendar';

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString(getLocale());
}

export function fmtDate(tick: number): string {
  return dateOfTick(tick).toLocaleDateString(getLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtClock(tickFloat: number): string {
  const { hour, minute } = clockOfTick(tickFloat);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
