import { useState } from 'react';
import type { Routine, RoutineCompletion } from '../types';
import { addDaysToDateKey } from '../lib/date';
import { getDueRoutineStatuses, timeWindowLabel } from '../lib/routines';
import { completeRoutine, uncompleteRoutine } from '../lib/actions';
import { RoutineCheckRow } from '../components/RoutineCheckRow';
import { StatusHeader } from '../components/StatusHeader';

interface DailyPageProps {
  todayKey: string;
  routines: Routine[];
  completions: RoutineCompletion[];
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
  streak: number;
  consistencyScore: number;
  previousConsistencyScore: number;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: 'Europe/Berlin',
});

export function DailyPage({
  todayKey,
  routines,
  completions,
  level,
  xpIntoLevel,
  xpForNextLevel,
  progress,
  streak,
  consistencyScore,
  previousConsistencyScore,
}: DailyPageProps) {
  const [showYesterday, setShowYesterday] = useState(false);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const today = getDueRoutineStatuses(routines, completions, todayKey);
  const yesterday = getDueRoutineStatuses(routines, completions, yesterdayKey).filter(
    (s) => !s.completed,
  );

  async function toggle(routineId: string, dateKey: string, completed: boolean) {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    if (completed) {
      await uncompleteRoutine(routineId, dateKey);
    } else {
      await completeRoutine(routine, dateKey);
    }
  }

  const grouped = groupByWindow(today);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold capitalize">
          {WEEKDAY_FORMATTER.format(new Date(`${todayKey}T12:00:00`))}
        </h1>
      </div>

      <StatusHeader
        level={level}
        xpIntoLevel={xpIntoLevel}
        xpForNextLevel={xpForNextLevel}
        progress={progress}
        streak={streak}
        consistencyScore={consistencyScore}
        previousConsistencyScore={previousConsistencyScore}
      />

      {today.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Für heute stehen keine Routinen an. Lege welche unter „Routinen" an.
        </p>
      )}

      {(['morgen', 'mittag', 'abend'] as const).map((window) =>
        grouped[window].length > 0 ? (
          <div key={window} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
              {timeWindowLabel(window)}
            </h2>
            {grouped[window].map(({ routine, completed }) => (
              <RoutineCheckRow
                key={routine.id}
                routine={routine}
                completed={completed}
                onToggle={() => toggle(routine.id, todayKey, completed)}
              />
            ))}
          </div>
        ) : null,
      )}

      {yesterday.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowYesterday((v) => !v)}
            className="text-sm text-[var(--color-text-muted)] underline"
          >
            {showYesterday ? 'Nachtragen ausblenden' : `Von gestern nachtragen (${yesterday.length})`}
          </button>
          {showYesterday && (
            <div className="mt-2 flex flex-col gap-2">
              {yesterday.map(({ routine, completed }) => (
                <RoutineCheckRow
                  key={routine.id}
                  routine={routine}
                  completed={completed}
                  onToggle={() => toggle(routine.id, yesterdayKey, completed)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function groupByWindow(statuses: ReturnType<typeof getDueRoutineStatuses>) {
  return {
    morgen: statuses.filter((s) => s.routine.timeWindow === 'morgen'),
    mittag: statuses.filter((s) => s.routine.timeWindow === 'mittag'),
    abend: statuses.filter((s) => s.routine.timeWindow === 'abend'),
  };
}
