import { describe, expect, it } from 'vitest';
import {
  applyDailyCap,
  applyStreakBonus,
  calculateConsistencyScore,
  calculateLevel,
  calculateMentalSessionXp,
  calculateRoutineXp,
  computeDailyXp,
  computeFullState,
  computeStreak,
  levelThreshold,
  streakBonusRate,
} from './scoring';

describe('calculateRoutineXp', () => {
  it('vergibt 10 XP für leichte Routinen', () => {
    expect(calculateRoutineXp('leicht')).toBe(10);
  });
  it('vergibt 15 XP für mittlere Routinen', () => {
    expect(calculateRoutineXp('mittel')).toBe(15);
  });
  it('vergibt 20 XP für harte Routinen', () => {
    expect(calculateRoutineXp('hart')).toBe(20);
  });
});

describe('calculateMentalSessionXp', () => {
  it('vergibt die Basis-XP bei 0 Minuten', () => {
    expect(calculateMentalSessionXp(0)).toBe(15);
  });
  it('addiert 1 XP je volle Minute', () => {
    expect(calculateMentalSessionXp(10)).toBe(25);
  });
  it('rundet Minuten ab', () => {
    expect(calculateMentalSessionXp(10.9)).toBe(25);
  });
  it('deckelt bei 40 XP', () => {
    expect(calculateMentalSessionXp(60)).toBe(40);
  });
  it('deckelt exakt an der Grenze', () => {
    expect(calculateMentalSessionXp(25)).toBe(40);
    expect(calculateMentalSessionXp(24)).toBe(39);
  });
});

describe('applyDailyCap', () => {
  it('lässt Werte unter dem Deckel unverändert', () => {
    expect(applyDailyCap(80)).toBe(80);
  });
  it('deckelt bei 150', () => {
    expect(applyDailyCap(500)).toBe(150);
  });
});

describe('streakBonusRate', () => {
  it('ist 0 ohne Streak', () => {
    expect(streakBonusRate(0)).toBe(0);
  });
  it('steigt um 5% je Streak-Tag', () => {
    expect(streakBonusRate(3)).toBeCloseTo(0.15);
  });
  it('deckelt bei 50%', () => {
    expect(streakBonusRate(20)).toBe(0.5);
    expect(streakBonusRate(100)).toBe(0.5);
  });
});

describe('applyStreakBonus', () => {
  it('addiert den Bonus und rundet', () => {
    // 100 * 1.15 = 115
    expect(applyStreakBonus(100, 3)).toBe(115);
  });
  it('ohne Streak keine Änderung', () => {
    expect(applyStreakBonus(100, 0)).toBe(100);
  });
});

describe('levelThreshold & calculateLevel', () => {
  it('berechnet die kumulative Schwelle 100 * n^1.5 aufgerundet', () => {
    expect(levelThreshold(1)).toBe(100);
    expect(levelThreshold(2)).toBe(283); // ceil(282.84...)
  });

  it('startet bei Level 1 mit 0 XP', () => {
    const info = calculateLevel(0);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpForNextLevel).toBe(100);
  });

  it('steigt bei Erreichen der Schwelle exakt auf', () => {
    const info = calculateLevel(100);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(0);
  });

  it('bleibt knapp unter der Schwelle auf dem alten Level', () => {
    const info = calculateLevel(99);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(99);
  });

  it('Level sinkt nie, auch bei aufeinanderfolgenden höheren Werten', () => {
    const levels = [0, 50, 100, 282, 283, 1000].map((xp) => calculateLevel(xp).level);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });
});

describe('computeStreak', () => {
  it('zählt aufeinanderfolgende Tage hoch', () => {
    const { streakByDate } = computeStreak([
      { dateKey: '2026-01-01', hasQualifyingAction: true },
      { dateKey: '2026-01-02', hasQualifyingAction: true },
      { dateKey: '2026-01-03', hasQualifyingAction: true },
    ]);
    expect(streakByDate['2026-01-03']).toBe(3);
  });

  it('bricht den Streak ohne verfügbaren Freeze', () => {
    const { streakByDate } = computeStreak(
      [
        { dateKey: '2026-01-01', hasQualifyingAction: true },
        { dateKey: '2026-01-02', hasQualifyingAction: false },
        { dateKey: '2026-01-03', hasQualifyingAction: true },
      ],
      0,
    );
    expect(streakByDate['2026-01-02']).toBe(0);
    expect(streakByDate['2026-01-03']).toBe(1);
  });

  it('neutralisiert einen Abbruch mit einem Freeze-Tag', () => {
    const { streakByDate, freezeLog } = computeStreak([
      { dateKey: '2026-01-01', hasQualifyingAction: true },
      { dateKey: '2026-01-02', hasQualifyingAction: false },
      { dateKey: '2026-01-03', hasQualifyingAction: true },
    ]);
    expect(streakByDate['2026-01-02']).toBe(1); // Streak erhalten
    expect(streakByDate['2026-01-03']).toBe(2);
    expect(freezeLog).toHaveLength(1);
    expect(freezeLog[0].dateKey).toBe('2026-01-02');
  });

  it('erlaubt genau 2 Freeze-Tage pro Kalendermonat, danach bricht der Streak', () => {
    const { streakByDate, freezeLog } = computeStreak([
      { dateKey: '2026-01-01', hasQualifyingAction: true },
      { dateKey: '2026-01-02', hasQualifyingAction: false }, // Freeze 1
      { dateKey: '2026-01-03', hasQualifyingAction: true },
      { dateKey: '2026-01-04', hasQualifyingAction: false }, // Freeze 2
      { dateKey: '2026-01-05', hasQualifyingAction: true },
      { dateKey: '2026-01-06', hasQualifyingAction: false }, // kein Freeze mehr -> Bruch
      { dateKey: '2026-01-07', hasQualifyingAction: true },
    ]);
    expect(freezeLog).toHaveLength(2);
    expect(streakByDate['2026-01-06']).toBe(0);
    expect(streakByDate['2026-01-07']).toBe(1);
  });

  it('setzt das Freeze-Budget im neuen Kalendermonat zurück', () => {
    const { freezeLog } = computeStreak([
      { dateKey: '2026-01-30', hasQualifyingAction: true },
      { dateKey: '2026-01-31', hasQualifyingAction: false }, // Freeze im Januar
      { dateKey: '2026-02-01', hasQualifyingAction: true },
      { dateKey: '2026-02-02', hasQualifyingAction: false }, // Freeze im Februar
      { dateKey: '2026-02-03', hasQualifyingAction: true },
    ]);
    expect(freezeLog).toHaveLength(2);
    expect(freezeLog[0].monthKey).toBe('2026-01');
    expect(freezeLog[1].monthKey).toBe('2026-02');
  });

  it('verbraucht keinen Freeze, wenn ohnehin kein aktiver Streak besteht', () => {
    const { streakByDate, freezeLog } = computeStreak([
      { dateKey: '2026-01-01', hasQualifyingAction: false },
      { dateKey: '2026-01-02', hasQualifyingAction: false },
    ]);
    expect(freezeLog).toHaveLength(0);
    expect(streakByDate['2026-01-02']).toBe(0);
  });

  it('sortiert die Eingabe unabhängig von der Reihenfolge chronologisch', () => {
    const { streakByDate } = computeStreak([
      { dateKey: '2026-01-03', hasQualifyingAction: true },
      { dateKey: '2026-01-01', hasQualifyingAction: true },
      { dateKey: '2026-01-02', hasQualifyingAction: true },
    ]);
    expect(streakByDate['2026-01-03']).toBe(3);
  });
});

describe('computeDailyXp', () => {
  it('kombiniert Deckel und Streak-Bonus korrekt', () => {
    const result = computeDailyXp(
      { '2026-01-01': 200 },
      { '2026-01-01': 3 },
    );
    // Deckel: min(200,150)=150, Bonus 15% -> round(150*1.15)=173
    expect(result[0].cappedXp).toBe(150);
    expect(result[0].finalXp).toBe(173);
  });

  it('ohne Streak keine Erhöhung über den Deckel hinaus', () => {
    const result = computeDailyXp({ '2026-01-01': 200 }, {});
    expect(result[0].finalXp).toBe(150);
  });
});

describe('calculateConsistencyScore', () => {
  it('berechnet erledigte / geplante gewichtete Aktionen', () => {
    expect(
      calculateConsistencyScore([
        { plannedWeight: 2, completedWeight: 1 },
        { plannedWeight: 1, completedWeight: 1 },
      ]),
    ).toBe(67); // 2/3 * 100 gerundet
  });

  it('liefert 100 wenn nichts geplant war', () => {
    expect(calculateConsistencyScore([{ plannedWeight: 0, completedWeight: 0 }])).toBe(100);
  });

  it('deckelt bei 100, auch wenn mehr erledigt als geplant war', () => {
    expect(calculateConsistencyScore([{ plannedWeight: 1, completedWeight: 5 }])).toBe(100);
  });
});

describe('computeFullState (Integration)', () => {
  it('verknüpft Streak, Tagesdeckel, Bonus und Level zu einem Gesamtzustand', () => {
    const state = computeFullState({
      xpEventsByDate: {
        '2026-01-01': 10,
        '2026-01-02': 10,
        '2026-01-03': 10,
      },
      qualifyingDays: [
        { dateKey: '2026-01-01', hasQualifyingAction: true },
        { dateKey: '2026-01-02', hasQualifyingAction: true },
        { dateKey: '2026-01-03', hasQualifyingAction: true },
      ],
    });

    // Tag1: streak 1 -> +5% -> round(10*1.05)=11 (Deckel bei 0 Vortagen irrelevant)
    // Tag2: streak 2 -> +10% -> round(10*1.10)=11
    // Tag3: streak 3 -> +15% -> round(10*1.15)=12
    expect(state.dailyXp.map((d) => d.finalXp)).toEqual([11, 11, 12]);
    expect(state.totalXp).toBe(34);
    expect(state.currentStreak).toBe(3);
    expect(state.level.level).toBe(1);
  });

  it('ein gerissener Streak setzt totalXp und Level nie zurück', () => {
    const before = computeFullState({
      xpEventsByDate: { '2026-01-01': 500 },
      qualifyingDays: [{ dateKey: '2026-01-01', hasQualifyingAction: true }],
    });
    const after = computeFullState({
      xpEventsByDate: { '2026-01-01': 500, '2026-01-05': 10 },
      qualifyingDays: [
        { dateKey: '2026-01-01', hasQualifyingAction: true },
        { dateKey: '2026-01-02', hasQualifyingAction: false },
        { dateKey: '2026-01-03', hasQualifyingAction: false },
        { dateKey: '2026-01-04', hasQualifyingAction: false },
        { dateKey: '2026-01-05', hasQualifyingAction: true },
      ],
    });
    expect(after.totalXp).toBeGreaterThanOrEqual(before.totalXp);
    expect(after.level.level).toBeGreaterThanOrEqual(before.level.level);
    expect(after.currentStreak).toBe(1); // Streak neu gestartet, aber XP blieb erhalten
  });
});
