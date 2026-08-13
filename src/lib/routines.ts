import type { Routine, RoutineCompletion, WeekdayIndex } from '../types';
import { compareDateKeys, daysBetween, getMonthRange, getWeekStart, weekdayIndexOf } from './date';

/**
 * Prüft, ob eine Routine an einem gegebenen App-Tag ansteht.
 * - "x-mal pro Woche"/"x-mal pro Monat": an jedem Tag des Zeitraums fällig,
 *   bis das jeweilige Soll erreicht ist.
 * - "Alle N Tage": fällig, sobald seit der letzten Erledigung (oder, falls
 *   noch nie erledigt, seit dem Anlegen) mindestens N Tage vergangen sind.
 */
export function isRoutineDueOnDate(
  routine: Routine,
  dateKey: string,
  completions: RoutineCompletion[],
): boolean {
  const routineCompletions = completions.filter((c) => c.routineId === routine.id);

  switch (routine.frequency.type) {
    case 'taeglich':
      return true;
    case 'wochentage':
      return routine.frequency.days.includes(weekdayIndexOf(dateKey) as WeekdayIndex);
    case 'x_pro_woche': {
      const weekStart = getWeekStart(dateKey);
      const earlier = routineCompletions.filter(
        (c) => c.dateKey >= weekStart && c.dateKey < dateKey,
      ).length;
      return earlier < routine.frequency.count;
    }
    case 'x_pro_monat': {
      const { start: monthStart } = getMonthRange(dateKey);
      const earlier = routineCompletions.filter(
        (c) => c.dateKey >= monthStart && c.dateKey < dateKey,
      ).length;
      return earlier < routine.frequency.count;
    }
    case 'alle_n_tage': {
      const last = routineCompletions
        .filter((c) => c.dateKey < dateKey)
        .sort((a, b) => compareDateKeys(b.dateKey, a.dateKey))[0];
      if (!last) return true; // noch nie erledigt -> sofort fällig
      return daysBetween(last.dateKey, dateKey) >= routine.frequency.intervalDays;
    }
  }
}

export function frequencyLabel(routine: Routine): string {
  switch (routine.frequency.type) {
    case 'taeglich':
      return 'Täglich';
    case 'wochentage': {
      const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
      return routine.frequency.days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => names[d])
        .join(', ');
    }
    case 'x_pro_woche':
      return `${routine.frequency.count}× pro Woche`;
    case 'x_pro_monat':
      return `${routine.frequency.count}× pro Monat`;
    case 'alle_n_tage': {
      const n = routine.frequency.intervalDays;
      if (n === 14) return 'Zweiwöchentlich';
      if (n === 30) return 'Monatlich';
      return `Alle ${n} Tage`;
    }
  }
}

export function timeWindowLabel(timeWindow: Routine['timeWindow']): string {
  return { morgen: 'Morgen', mittag: 'Mittag', abend: 'Abend' }[timeWindow];
}

export function difficultyLabel(difficulty: Routine['difficulty']): string {
  return { leicht: 'Leicht', mittel: 'Mittel', hart: 'Hart' }[difficulty];
}

export interface RoutineProgress {
  current: number;
  total: number;
  unit: 'Woche' | 'Monat';
}

/**
 * Fortschritt für flexible Frequenzen (x-mal pro Woche/Monat): wie oft wurde
 * die Routine im laufenden Zeitraum (inkl. heute) bereits erledigt.
 * Für feste Rhythmen (täglich, Wochentage, alle N Tage) gibt es keinen
 * sinnvollen Bruchteil-Fortschritt, daher undefined.
 */
export function getRoutineProgress(
  routine: Routine,
  completions: RoutineCompletion[],
  dateKey: string,
): RoutineProgress | undefined {
  const routineCompletions = completions.filter((c) => c.routineId === routine.id);

  if (routine.frequency.type === 'x_pro_woche') {
    const start = getWeekStart(dateKey);
    const current = routineCompletions.filter((c) => c.dateKey >= start && c.dateKey <= dateKey).length;
    return { current, total: routine.frequency.count, unit: 'Woche' };
  }
  if (routine.frequency.type === 'x_pro_monat') {
    const { start } = getMonthRange(dateKey);
    const current = routineCompletions.filter((c) => c.dateKey >= start && c.dateKey <= dateKey).length;
    return { current, total: routine.frequency.count, unit: 'Monat' };
  }
  return undefined;
}

export function progressLabel(progress: RoutineProgress): string {
  const period = progress.unit === 'Woche' ? 'diese Woche' : 'diesen Monat';
  return `${progress.current}/${progress.total} ${period}`;
}

export interface RoutineStatus {
  routine: Routine;
  completed: boolean;
  progress?: RoutineProgress;
}

/** Fällige Routinen für einen Tag samt Erledigt-Status, sortiert nach Tageszeitfenster. */
export function getDueRoutineStatuses(
  routines: Routine[],
  completions: RoutineCompletion[],
  dateKey: string,
): RoutineStatus[] {
  const windowOrder: Record<Routine['timeWindow'], number> = { morgen: 0, mittag: 1, abend: 2 };
  return routines
    .filter((routine) => !routine.archivedAt)
    .filter((routine) => isRoutineDueOnDate(routine, dateKey, completions))
    .map((routine) => ({
      routine,
      completed: completions.some((c) => c.routineId === routine.id && c.dateKey === dateKey),
      progress: getRoutineProgress(routine, completions, dateKey),
    }))
    .sort((a, b) => windowOrder[a.routine.timeWindow] - windowOrder[b.routine.timeWindow]);
}

export { getWeekStart };
