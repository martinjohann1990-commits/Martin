import type { Difficulty, FreezeLogEntry } from '../types';
import { compareDateKeys, getMonthKey } from './date';

/**
 * Reine Scoring-Logik ohne Abhängigkeit von React oder der Datenbank.
 * Jede Funktion ist deterministisch und einzeln testbar.
 */

export const DIFFICULTY_FACTORS: Record<Difficulty, number> = {
  leicht: 1.0,
  mittel: 1.5,
  hart: 2.0,
};

export const ROUTINE_XP_BASE = 10;
export const MENTAL_SESSION_XP_BASE = 15;
export const MENTAL_SESSION_XP_PER_MINUTE = 1;
export const MENTAL_SESSION_XP_CAP = 40;
export const MILESTONE_XP = 100;
export const WEEKLY_REVIEW_XP = 50;
export const DAILY_XP_CAP = 150;
export const STREAK_BONUS_PER_DAY = 0.05;
export const STREAK_BONUS_MAX = 0.5;
export const FREEZE_DAYS_PER_MONTH = 2;

export function calculateRoutineXp(difficulty: Difficulty): number {
  return Math.round(ROUTINE_XP_BASE * DIFFICULTY_FACTORS[difficulty]);
}

export function calculateMentalSessionXp(durationMinutes: number): number {
  const minutes = Math.max(0, Math.floor(durationMinutes));
  const raw = MENTAL_SESSION_XP_BASE + MENTAL_SESSION_XP_PER_MINUTE * minutes;
  return Math.min(raw, MENTAL_SESSION_XP_CAP);
}

export function applyDailyCap(rawDailyXp: number): number {
  return Math.min(rawDailyXp, DAILY_XP_CAP);
}

export function streakBonusRate(streakDays: number): number {
  return Math.min(Math.max(0, streakDays) * STREAK_BONUS_PER_DAY, STREAK_BONUS_MAX);
}

export function applyStreakBonus(cappedDailyXp: number, streakDays: number): number {
  return Math.round(cappedDailyXp * (1 + streakBonusRate(streakDays)));
}

/** Kumulativ benötigte Gesamt-XP, um von Level n auf Level n+1 zu steigen. */
export function levelThreshold(level: number): number {
  return Math.ceil(100 * Math.pow(level, 1.5));
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1
}

export function calculateLevel(totalXp: number): LevelInfo {
  let level = 1;
  while (totalXp >= levelThreshold(level)) {
    level += 1;
  }
  const prevThreshold = level === 1 ? 0 : levelThreshold(level - 1);
  const nextThreshold = levelThreshold(level);
  const xpIntoLevel = totalXp - prevThreshold;
  const xpForNextLevel = nextThreshold - prevThreshold;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel === 0 ? 1 : xpIntoLevel / xpForNextLevel,
  };
}

export interface DayQualification {
  dateKey: string;
  /** Mindestens eine für diesen Tag geplante Routine wurde erledigt. */
  hasQualifyingAction: boolean;
}

export interface StreakResult {
  /** Streak-Stand am Ende jedes Tages. */
  streakByDate: Record<string, number>;
  freezeLog: FreezeLogEntry[];
  freezesUsedByMonth: Record<string, number>;
}

/**
 * Berechnet den Streak-Verlauf über eine chronologische Tagesfolge.
 * Ein Tag ohne geplante Aktion bricht den Streak, außer ein Freeze-Tag
 * ist im jeweiligen Kalendermonat noch verfügbar (max. FREEZE_DAYS_PER_MONTH).
 * Freezes werden nur eingelöst, wenn dadurch tatsächlich ein aktiver Streak
 * geschützt wird — ein Freeze auf einen ohnehin schon bei 0 stehenden Streak
 * wäre wirkungslos und wird nicht verbraucht.
 */
export function computeStreak(
  days: DayQualification[],
  freezeBudgetPerMonth = FREEZE_DAYS_PER_MONTH,
): StreakResult {
  const sorted = [...days].sort((a, b) => compareDateKeys(a.dateKey, b.dateKey));
  const streakByDate: Record<string, number> = {};
  const freezesUsedByMonth: Record<string, number> = {};
  const freezeLog: FreezeLogEntry[] = [];
  let streak = 0;

  for (const day of sorted) {
    const monthKey = getMonthKey(day.dateKey);
    if (day.hasQualifyingAction) {
      streak += 1;
    } else if (streak > 0) {
      const used = freezesUsedByMonth[monthKey] ?? 0;
      if (used < freezeBudgetPerMonth) {
        freezesUsedByMonth[monthKey] = used + 1;
        freezeLog.push({
          id: `freeze-${day.dateKey}`,
          dateKey: day.dateKey,
          monthKey,
          reason: 'streak_erhalten',
        });
        // Streak bleibt durch den Freeze-Tag erhalten.
      } else {
        streak = 0;
      }
    }
    streakByDate[day.dateKey] = streak;
  }

  return { streakByDate, freezeLog, freezesUsedByMonth };
}

export interface DailyXpResult {
  dateKey: string;
  rawXp: number;
  cappedXp: number;
  streakBonusRate: number;
  finalXp: number;
}

/**
 * Wendet pro Tag zuerst den Tagesdeckel (150 XP) auf die rohe Summe an
 * und danach den Streak-Bonus als Belohnung obendrauf. Dadurch kann der
 * Bonus die Tages-XP über 150 heben, ohne dass mehr einzelne Aktionen an
 * einem Tag zu mehr "Grinding-Ertrag" führen als der Deckel erlaubt.
 */
export function computeDailyXp(
  rawXpByDate: Record<string, number>,
  streakByDate: Record<string, number>,
): DailyXpResult[] {
  return Object.entries(rawXpByDate).map(([dateKey, rawXp]) => {
    const cappedXp = applyDailyCap(rawXp);
    const streak = streakByDate[dateKey] ?? 0;
    const rate = streakBonusRate(streak);
    const finalXp = applyStreakBonus(cappedXp, streak);
    return { dateKey, rawXp, cappedXp, streakBonusRate: rate, finalXp };
  });
}

export interface ConsistencyDayInput {
  plannedWeight: number;
  completedWeight: number;
}

/**
 * Konsistenz-Score 0–100 über einen Zeitraum (üblicherweise 7 Tage):
 * erledigte gewichtete Aktionen / geplante gewichtete Aktionen × 100.
 * Als Gewicht dient der Schwierigkeitsfaktor der jeweiligen Routine.
 * Ohne geplante Aktionen gibt es nichts, wogegen man inkonsistent sein
 * könnte — der Score ist dann 100.
 */
export function calculateConsistencyScore(days: ConsistencyDayInput[]): number {
  const totalPlanned = days.reduce((sum, d) => sum + d.plannedWeight, 0);
  if (totalPlanned <= 0) return 100;
  const totalCompleted = days.reduce((sum, d) => sum + d.completedWeight, 0);
  const score = (totalCompleted / totalPlanned) * 100;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export interface ComputeStateInput {
  /** Summe der rohen XpEvent-Beträge je App-Tag. */
  xpEventsByDate: Record<string, number>;
  /** Alle Tage mit Info, ob mind. 1 geplante Routine erledigt wurde. */
  qualifyingDays: DayQualification[];
}

export interface ComputedState {
  totalXp: number;
  level: LevelInfo;
  currentStreak: number;
  dailyXp: DailyXpResult[];
  freezeLog: FreezeLogEntry[];
}

/** Verknüpft Streak-, XP- und Level-Berechnung zu einem Gesamtzustand. */
export function computeFullState(input: ComputeStateInput): ComputedState {
  const { streakByDate, freezeLog } = computeStreak(input.qualifyingDays);
  const dailyXp = computeDailyXp(input.xpEventsByDate, streakByDate);
  const totalXp = dailyXp.reduce((sum, d) => sum + d.finalXp, 0);
  const level = calculateLevel(totalXp);

  const sortedDays = [...input.qualifyingDays].sort((a, b) =>
    compareDateKeys(a.dateKey, b.dateKey),
  );
  const lastDateKey = sortedDays.at(-1)?.dateKey;
  const currentStreak = lastDateKey ? (streakByDate[lastDateKey] ?? 0) : 0;

  return { totalXp, level, currentStreak, dailyXp, freezeLog };
}
