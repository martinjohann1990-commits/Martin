interface StatusHeaderProps {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
  streak: number;
  consistencyScore: number;
  previousConsistencyScore: number;
}

export function StatusHeader({
  level,
  xpIntoLevel,
  xpForNextLevel,
  progress,
  streak,
  consistencyScore,
  previousConsistencyScore,
}: StatusHeaderProps) {
  const trend = consistencyScore - previousConsistencyScore;
  const trendLabel = trend > 0 ? `▲ +${trend}` : trend < 0 ? `▼ ${trend}` : '– 0';

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Level
          </div>
          <div className="text-2xl font-semibold">{level}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Streak
          </div>
          <div className="text-2xl font-semibold">{streak} 🔥</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{xpIntoLevel} XP</span>
          <span>{xpForNextLevel} XP bis Level {level + 1}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Konsistenz-Score (7 Tage)
          </div>
          <div className="text-xl font-semibold">{consistencyScore}</div>
        </div>
        <div
          className={
            trend > 0
              ? 'text-[var(--color-accent)]'
              : trend < 0
                ? 'text-[var(--color-text-muted)]'
                : 'text-[var(--color-text-muted)]'
          }
        >
          {trendLabel}
        </div>
      </div>
    </div>
  );
}
