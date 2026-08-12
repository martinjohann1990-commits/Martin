import { useState, type FormEvent } from 'react';
import type { Difficulty, Routine, RoutineFrequency, TimeWindow, WeekdayIndex } from '../types';

interface RoutineFormProps {
  initial?: Routine;
  onSubmit: (input: {
    title: string;
    category: string;
    frequency: RoutineFrequency;
    timeWindow: TimeWindow;
    difficulty: Difficulty;
  }) => void;
  onCancel: () => void;
}

const WEEKDAYS: { index: WeekdayIndex; label: string }[] = [
  { index: 0, label: 'Mo' },
  { index: 1, label: 'Di' },
  { index: 2, label: 'Mi' },
  { index: 3, label: 'Do' },
  { index: 4, label: 'Fr' },
  { index: 5, label: 'Sa' },
  { index: 6, label: 'So' },
];

export function RoutineForm({ initial, onSubmit, onCancel }: RoutineFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(initial?.timeWindow ?? 'morgen');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'leicht');
  const [frequencyType, setFrequencyType] = useState<RoutineFrequency['type']>(
    initial?.frequency.type ?? 'taeglich',
  );
  const [weekdays, setWeekdays] = useState<WeekdayIndex[]>(
    initial?.frequency.type === 'wochentage' ? initial.frequency.days : [],
  );
  const [weeklyCount, setWeeklyCount] = useState(
    initial?.frequency.type === 'x_pro_woche' ? initial.frequency.count : 3,
  );

  function toggleWeekday(day: WeekdayIndex) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let frequency: RoutineFrequency;
    if (frequencyType === 'taeglich') {
      frequency = { type: 'taeglich' };
    } else if (frequencyType === 'wochentage') {
      if (weekdays.length === 0) return;
      frequency = { type: 'wochentage', days: weekdays };
    } else {
      frequency = { type: 'x_pro_woche', count: Math.max(1, weeklyCount) };
    }

    onSubmit({ title: title.trim(), category: category.trim() || 'Allgemein', frequency, timeWindow, difficulty });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">Titel</span>
        <input
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Meditation"
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">Kategorie</span>
        <input
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="z.B. Gesundheit"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Frequenz</span>
        <div className="flex gap-2">
          {(
            [
              { id: 'taeglich', label: 'Täglich' },
              { id: 'wochentage', label: 'Wochentage' },
              { id: 'x_pro_woche', label: 'X × Woche' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFrequencyType(opt.id)}
              className={`flex-1 rounded-lg border p-2 text-sm ${
                frequencyType === opt.id
                  ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {frequencyType === 'wochentage' && (
          <div className="flex gap-1">
            {WEEKDAYS.map((wd) => (
              <button
                key={wd.index}
                type="button"
                onClick={() => toggleWeekday(wd.index)}
                className={`flex-1 rounded-lg border p-2 text-xs ${
                  weekdays.includes(wd.index)
                    ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {wd.label}
              </button>
            ))}
          </div>
        )}

        {frequencyType === 'x_pro_woche' && (
          <label className="flex items-center gap-2 text-sm">
            <span>Anzahl pro Woche</span>
            <input
              type="number"
              min={1}
              max={7}
              value={weeklyCount}
              onChange={(e) => setWeeklyCount(Number(e.target.value))}
              className="w-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2"
            />
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Tageszeitfenster</span>
        <div className="flex gap-2">
          {(['morgen', 'mittag', 'abend'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setTimeWindow(w)}
              className={`flex-1 rounded-lg border p-2 text-sm capitalize ${
                timeWindow === w
                  ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Schwierigkeit</span>
        <div className="flex gap-2">
          {(['leicht', 'mittel', 'hart'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded-lg border p-2 text-sm capitalize ${
                difficulty === d
                  ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[var(--color-border)] p-3 text-sm"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-[var(--color-accent)] p-3 text-sm font-medium text-[var(--color-bg)]"
        >
          Speichern
        </button>
      </div>
    </form>
  );
}
