export type Difficulty = 'leicht' | 'mittel' | 'hart';

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Montag

export type RoutineFrequency =
  | { type: 'taeglich' }
  | { type: 'wochentage'; days: WeekdayIndex[] }
  | { type: 'x_pro_woche'; count: number }
  | { type: 'x_pro_monat'; count: number }
  | { type: 'alle_n_tage'; intervalDays: number };

export type TimeWindow = 'morgen' | 'mittag' | 'abend';

export interface Routine {
  id: string;
  title: string;
  category: string;
  frequency: RoutineFrequency;
  timeWindow: TimeWindow;
  difficulty: Difficulty;
  createdAt: number;
  archivedAt?: number;
  goalId?: string;
}

export interface RoutineCompletion {
  id: string;
  routineId: string;
  dateKey: string; // App-Datum (YYYY-MM-DD), Tageswechsel um 04:00
  completedAt: number;
}

export type XpSource = 'routine' | 'mental_session' | 'milestone' | 'weekly_review';

export interface XpEvent {
  id: string;
  source: XpSource;
  amount: number;
  dateKey: string;
  timestamp: number;
  refId?: string;
}

export type FreezeReason = 'streak_erhalten';

export interface FreezeLogEntry {
  id: string;
  dateKey: string;
  monthKey: string; // YYYY-MM
  reason: FreezeReason;
}

export interface UserStateSnapshot {
  id: 'singleton';
  totalXp: number;
  level: number;
  currentStreak: number;
  lastComputedAt: number;
}
