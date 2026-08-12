import type { Routine, RoutineCompletion } from '../types';
import { getWeekStart, weekdayIndexOf } from './date';

/**
 * Prüft, ob eine Routine an einem gegebenen App-Tag ansteht.
 * Bei "x-mal pro Woche" ist die Routine an jedem Tag der Woche fällig,
 * bis das Wochensoll erreicht ist (completionsThisWeek zählt dabei nur
 * Erledigungen vor diesem Tag innerhalb derselben Kalenderwoche).
 */
export function isRoutineDueOnDate(
  routine: Routine,
  dateKey: string,
  completionsEarlierThisWeek = 0,
): boolean {
  switch (routine.frequency.type) {
    case 'taeglich':
      return true;
    case 'wochentage':
      return routine.frequency.days.includes(weekdayIndexOf(dateKey) as never);
    case 'x_pro_woche':
      return completionsEarlierThisWeek < routine.frequency.count;
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
  }
}

export function timeWindowLabel(timeWindow: Routine['timeWindow']): string {
  return { morgen: 'Morgen', mittag: 'Mittag', abend: 'Abend' }[timeWindow];
}

export function difficultyLabel(difficulty: Routine['difficulty']): string {
  return { leicht: 'Leicht', mittel: 'Mittel', hart: 'Hart' }[difficulty];
}

export interface RoutineStatus {
  routine: Routine;
  completed: boolean;
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
    .filter((routine) => {
      const earlier = completions.filter(
        (c) =>
          c.routineId === routine.id &&
          c.dateKey >= getWeekStart(dateKey) &&
          c.dateKey < dateKey,
      ).length;
      return isRoutineDueOnDate(routine, dateKey, earlier);
    })
    .map((routine) => ({
      routine,
      completed: completions.some((c) => c.routineId === routine.id && c.dateKey === dateKey),
    }))
    .sort((a, b) => windowOrder[a.routine.timeWindow] - windowOrder[b.routine.timeWindow]);
}

export { getWeekStart };
