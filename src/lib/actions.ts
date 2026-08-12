import { db, createId } from './db';
import { calculateRoutineXp } from './scoring';
import { getWeekStart, getAppDateKey, addDaysToDateKey } from './date';
import type { Routine, RoutineFrequency, TimeWindow, Difficulty } from '../types';

export interface NewRoutineInput {
  title: string;
  category: string;
  frequency: RoutineFrequency;
  timeWindow: TimeWindow;
  difficulty: Difficulty;
  goalId?: string;
}

export async function addRoutine(input: NewRoutineInput): Promise<Routine> {
  const routine: Routine = {
    id: createId(),
    createdAt: Date.now(),
    ...input,
  };
  await db.routines.add(routine);
  return routine;
}

export async function updateRoutine(id: string, patch: Partial<NewRoutineInput>): Promise<void> {
  await db.routines.update(id, patch);
}

export async function archiveRoutine(id: string): Promise<void> {
  await db.routines.update(id, { archivedAt: Date.now() });
}

export async function getCompletionsEarlierThisWeek(
  routineId: string,
  dateKey: string,
): Promise<number> {
  const weekStart = getWeekStart(dateKey);
  const completions = await db.routineCompletions.where('routineId').equals(routineId).toArray();
  return completions.filter((c) => c.dateKey >= weekStart && c.dateKey < dateKey).length;
}

/** Nachtragen ist nur für heute und den Vortag erlaubt. */
export function isDateKeyEditable(dateKey: string, todayKey = getAppDateKey()): boolean {
  return dateKey === todayKey || dateKey === addDaysToDateKey(todayKey, -1);
}

export async function completeRoutine(routine: Routine, dateKey: string): Promise<void> {
  if (!isDateKeyEditable(dateKey)) return;
  const existing = await db.routineCompletions
    .where('[routineId+dateKey]')
    .equals([routine.id, dateKey])
    .first();
  if (existing) return; // ein Tap genügt, kein doppeltes Vergeben

  const completionId = createId();
  await db.routineCompletions.add({
    id: completionId,
    routineId: routine.id,
    dateKey,
    completedAt: Date.now(),
  });
  await db.xpEvents.add({
    id: createId(),
    source: 'routine',
    amount: calculateRoutineXp(routine.difficulty),
    dateKey,
    timestamp: Date.now(),
    refId: completionId,
  });
}

export async function uncompleteRoutine(routineId: string, dateKey: string): Promise<void> {
  if (!isDateKeyEditable(dateKey)) return;
  const completion = await db.routineCompletions
    .where('[routineId+dateKey]')
    .equals([routineId, dateKey])
    .first();
  if (!completion) return;
  await db.routineCompletions.delete(completion.id);
  const relatedEvents = await db.xpEvents.where('refId').equals(completion.id).toArray();
  await db.xpEvents.bulkDelete(relatedEvents.map((e) => e.id));
}
