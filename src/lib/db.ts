import Dexie, { type Table } from 'dexie';
import type { Routine, RoutineCompletion, XpEvent } from '../types';

export class MartinDb extends Dexie {
  routines!: Table<Routine, string>;
  routineCompletions!: Table<RoutineCompletion, string>;
  xpEvents!: Table<XpEvent, string>;

  constructor() {
    super('martin-app');
    this.version(1).stores({
      routines: 'id, category, archivedAt',
      routineCompletions: 'id, routineId, dateKey, &[routineId+dateKey]',
      xpEvents: 'id, dateKey, source',
    });
  }
}

export const db = new MartinDb();

export function createId(): string {
  return crypto.randomUUID();
}
