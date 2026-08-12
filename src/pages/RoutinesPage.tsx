import { useState } from 'react';
import type { Routine } from '../types';
import { addRoutine, archiveRoutine, updateRoutine, type NewRoutineInput } from '../lib/actions';
import { difficultyLabel, frequencyLabel, timeWindowLabel } from '../lib/routines';
import { RoutineForm } from '../components/RoutineForm';

interface RoutinesPageProps {
  routines: Routine[];
}

export function RoutinesPage({ routines }: RoutinesPageProps) {
  const [editing, setEditing] = useState<Routine | 'new' | null>(null);

  async function handleSubmit(input: NewRoutineInput) {
    if (editing === 'new') {
      await addRoutine(input);
    } else if (editing) {
      await updateRoutine(editing.id, input);
    }
    setEditing(null);
  }

  if (editing) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-lg font-semibold">
          {editing === 'new' ? 'Neue Routine' : 'Routine bearbeiten'}
        </h1>
        <RoutineForm
          initial={editing === 'new' ? undefined : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Routinen</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)]"
        >
          + Neu
        </button>
      </div>

      {routines.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Noch keine Routinen angelegt. Starte mit einer kleinen, leicht erreichbaren Routine.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {routines.map((routine) => (
          <div
            key={routine.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{routine.title}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {routine.category} · {frequencyLabel(routine)} · {timeWindowLabel(routine.timeWindow)} ·{' '}
                  {difficultyLabel(routine.difficulty)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(routine)}
                  className="text-xs text-[var(--color-accent)] underline"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => archiveRoutine(routine.id)}
                  className="text-xs text-[var(--color-text-muted)] underline"
                >
                  Archivieren
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
