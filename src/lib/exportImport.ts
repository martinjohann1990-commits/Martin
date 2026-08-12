import { db } from './db';
import type { Routine, RoutineCompletion, XpEvent } from '../types';

export interface DataExport {
  exportedAt: string;
  version: 1;
  routines: Routine[];
  routineCompletions: RoutineCompletion[];
  xpEvents: XpEvent[];
}

export async function exportAllData(): Promise<DataExport> {
  const [routines, routineCompletions, xpEvents] = await Promise.all([
    db.routines.toArray(),
    db.routineCompletions.toArray(),
    db.xpEvents.toArray(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    routines,
    routineCompletions,
    xpEvents,
  };
}

export function downloadDataExport(data: DataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `martin-export-${data.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function isDataExport(value: unknown): value is DataExport {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.routines) && Array.isArray(v.routineCompletions) && Array.isArray(v.xpEvents)
  );
}

/** Ersetzt den gesamten lokalen Datenbestand durch den Inhalt der JSON-Datei. */
export async function importAllData(file: File): Promise<void> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!isDataExport(parsed)) {
    throw new Error('Ungültige Export-Datei: erwartete Felder fehlen.');
  }
  await db.transaction('rw', db.routines, db.routineCompletions, db.xpEvents, async () => {
    await Promise.all([
      db.routines.clear(),
      db.routineCompletions.clear(),
      db.xpEvents.clear(),
    ]);
    await Promise.all([
      db.routines.bulkAdd(parsed.routines),
      db.routineCompletions.bulkAdd(parsed.routineCompletions),
      db.xpEvents.bulkAdd(parsed.xpEvents),
    ]);
  });
}
