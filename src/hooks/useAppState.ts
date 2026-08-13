import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { addDaysToDateKey, getAppDateKey } from '../lib/date';
import { isRoutineDueOnDate } from '../lib/routines';
import {
  DIFFICULTY_FACTORS,
  calculateConsistencyScore,
  computeFullState,
  type ConsistencyDayInput,
} from '../lib/scoring';

function isRoutinePlannableOnDate(
  routine: { createdAt: number; archivedAt?: number },
  dateKey: string,
): boolean {
  const createdDateKey = getAppDateKey(new Date(routine.createdAt));
  if (createdDateKey > dateKey) return false;
  if (routine.archivedAt) {
    const archivedDateKey = getAppDateKey(new Date(routine.archivedAt));
    if (archivedDateKey <= dateKey) return false;
  }
  return true;
}

function consistencyScoreForWindow(
  routines: import('../types').Routine[],
  completions: import('../types').RoutineCompletion[],
  windowDateKeys: string[],
): number {
  const days: ConsistencyDayInput[] = windowDateKeys.map((dateKey) => {
    let plannedWeight = 0;
    let completedWeight = 0;
    for (const routine of routines) {
      if (!isRoutinePlannableOnDate(routine, dateKey)) continue;
      if (!isRoutineDueOnDate(routine, dateKey, completions)) continue;
      const weight = DIFFICULTY_FACTORS[routine.difficulty];
      plannedWeight += weight;
      const done = completions.some((c) => c.routineId === routine.id && c.dateKey === dateKey);
      if (done) completedWeight += weight;
    }
    return { plannedWeight, completedWeight };
  });
  return calculateConsistencyScore(days);
}

/**
 * Zentraler Hook: liest die Dexie-Tabellen live und leitet daraus den
 * gesamten Spielstand (XP, Level, Streak, Konsistenz-Score) ab. Die
 * Ableitung läuft vollständig über die reinen Funktionen aus lib/scoring.ts.
 */
export function useAppState() {
  const todayKey = getAppDateKey();

  const routines = useLiveQuery(() => db.routines.toArray(), []) ?? [];
  const completions = useLiveQuery(() => db.routineCompletions.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];

  const activeRoutines = routines.filter((r) => !r.archivedAt);

  const xpEventsByDate: Record<string, number> = {};
  for (const event of xpEvents) {
    xpEventsByDate[event.dateKey] = (xpEventsByDate[event.dateKey] ?? 0) + event.amount;
  }

  const completionDateKeys = new Set(completions.map((c) => c.dateKey));
  const allDateKeys = new Set(completionDateKeys);
  allDateKeys.add(todayKey);
  const qualifyingDays = Array.from(allDateKeys).map((dateKey) => ({
    dateKey,
    hasQualifyingAction: completionDateKeys.has(dateKey),
  }));

  const fullState = computeFullState({ xpEventsByDate, qualifyingDays });

  const last7 = Array.from({ length: 7 }, (_, i) => addDaysToDateKey(todayKey, -i)).reverse();
  const previous7 = Array.from({ length: 7 }, (_, i) => addDaysToDateKey(todayKey, -7 - i)).reverse();

  const consistencyScore = consistencyScoreForWindow(routines, completions, last7);
  const previousConsistencyScore = consistencyScoreForWindow(routines, completions, previous7);

  return {
    todayKey,
    routines: activeRoutines,
    allRoutines: routines,
    completions,
    fullState,
    consistencyScore,
    previousConsistencyScore,
    isLoading: routines === undefined,
  };
}
