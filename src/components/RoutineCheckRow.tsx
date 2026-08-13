import type { Routine } from '../types';
import { difficultyLabel, frequencyLabel, progressLabel, type RoutineProgress } from '../lib/routines';

interface RoutineCheckRowProps {
  routine: Routine;
  completed: boolean;
  progress?: RoutineProgress;
  onToggle: () => void;
}

export function RoutineCheckRow({ routine, completed, progress, onToggle }: RoutineCheckRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
        completed
          ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
          completed
            ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-[var(--color-bg)]'
            : 'border-[var(--color-text-muted)]'
        }`}
      >
        {completed ? '✓' : ''}
      </span>
      <span className="flex-1">
        <span className={`block font-medium ${completed ? 'line-through opacity-70' : ''}`}>
          {routine.title}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {routine.category} · {frequencyLabel(routine)} · {difficultyLabel(routine.difficulty)}
          {progress && ` · ${progressLabel(progress)}`}
        </span>
      </span>
    </button>
  );
}
