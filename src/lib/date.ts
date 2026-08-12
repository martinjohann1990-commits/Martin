const APP_TIMEZONE = 'Europe/Berlin';
const DAY_BOUNDARY_HOUR = 4; // Tageswechsel um 04:00 Uhr morgens

/**
 * Liefert den "App-Tag" (YYYY-MM-DD) für einen Zeitpunkt in Europe/Berlin.
 * Uhrzeiten vor 04:00 Uhr zählen noch zum Vortag.
 */
export function getAppDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);

  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  if (hour < DAY_BOUNDARY_HOUR) {
    utcMidnight.setUTCDate(utcMidnight.getUTCDate() - 1);
  }
  return utcMidnight.toISOString().slice(0, 10);
}

export function getMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Wochentags-Index von dateKey, 0 = Montag ... 6 = Sonntag. */
export function weekdayIndexOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sonntag
  return (jsDay + 6) % 7;
}

/** Liste aller dateKeys von start (inklusive) bis end (inklusive), aufsteigend. */
export function dateKeyRange(start: string, end: string): string[] {
  const result: string[] = [];
  let current = start;
  while (compareDateKeys(current, end) <= 0) {
    result.push(current);
    current = addDaysToDateKey(current, 1);
  }
  return result;
}

/** Montag der Kalenderwoche, in der dateKey liegt. */
export function getWeekStart(dateKey: string): string {
  return addDaysToDateKey(dateKey, -weekdayIndexOf(dateKey));
}

/** Alle 7 dateKeys der Kalenderwoche (Montag bis Sonntag), in der dateKey liegt. */
export function getWeekDates(dateKey: string): string[] {
  const start = getWeekStart(dateKey);
  return dateKeyRange(start, addDaysToDateKey(start, 6));
}
