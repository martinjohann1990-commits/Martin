import { describe, expect, it } from 'vitest';
import { frequencyLabel, getRoutineProgress, isRoutineDueOnDate } from './routines';
import type { Routine, RoutineCompletion } from '../types';

function makeRoutine(frequency: Routine['frequency'], overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    title: 'Test',
    category: 'Test',
    frequency,
    timeWindow: 'morgen',
    difficulty: 'leicht',
    createdAt: new Date('2026-01-01T10:00:00Z').getTime(),
    ...overrides,
  };
}

function completion(dateKey: string, routineId = 'r1'): RoutineCompletion {
  return { id: `c-${dateKey}`, routineId, dateKey, completedAt: 0 };
}

describe('isRoutineDueOnDate', () => {
  it('taeglich ist immer fällig', () => {
    const routine = makeRoutine({ type: 'taeglich' });
    expect(isRoutineDueOnDate(routine, '2026-03-05', [])).toBe(true);
  });

  it('wochentage nur an den gewählten Tagen', () => {
    // 2026-03-02 ist ein Montag (Index 0)
    const routine = makeRoutine({ type: 'wochentage', days: [0, 2] });
    expect(isRoutineDueOnDate(routine, '2026-03-02', [])).toBe(true); // Montag
    expect(isRoutineDueOnDate(routine, '2026-03-03', [])).toBe(false); // Dienstag
    expect(isRoutineDueOnDate(routine, '2026-03-04', [])).toBe(true); // Mittwoch
  });

  describe('x_pro_woche', () => {
    it('ist fällig, solange das Wochensoll nicht erreicht ist', () => {
      const routine = makeRoutine({ type: 'x_pro_woche', count: 2 });
      const completions = [completion('2026-03-02')]; // Montag dieser Woche
      expect(isRoutineDueOnDate(routine, '2026-03-04', completions)).toBe(true);
    });

    it('ist nicht mehr fällig, wenn das Wochensoll erreicht ist', () => {
      const routine = makeRoutine({ type: 'x_pro_woche', count: 2 });
      const completions = [completion('2026-03-02'), completion('2026-03-03')];
      expect(isRoutineDueOnDate(routine, '2026-03-04', completions)).toBe(false);
    });

    it('Soll setzt sich in der neuen Kalenderwoche zurück', () => {
      const routine = makeRoutine({ type: 'x_pro_woche', count: 1 });
      const completions = [completion('2026-03-02')]; // erledigt am Montag
      expect(isRoutineDueOnDate(routine, '2026-03-09', completions)).toBe(true); // neue Woche
    });
  });

  describe('x_pro_monat', () => {
    it('ist fällig, solange das Monatssoll nicht erreicht ist', () => {
      const routine = makeRoutine({ type: 'x_pro_monat', count: 2 });
      const completions = [completion('2026-03-01')];
      expect(isRoutineDueOnDate(routine, '2026-03-15', completions)).toBe(true);
    });

    it('ist nicht mehr fällig, wenn das Monatssoll erreicht ist', () => {
      const routine = makeRoutine({ type: 'x_pro_monat', count: 1 });
      const completions = [completion('2026-03-01')];
      expect(isRoutineDueOnDate(routine, '2026-03-15', completions)).toBe(false);
    });

    it('Soll setzt sich im neuen Kalendermonat zurück', () => {
      const routine = makeRoutine({ type: 'x_pro_monat', count: 1 });
      const completions = [completion('2026-03-01')];
      expect(isRoutineDueOnDate(routine, '2026-04-01', completions)).toBe(true);
    });
  });

  describe('alle_n_tage', () => {
    it('ist sofort fällig, wenn noch nie erledigt', () => {
      const routine = makeRoutine({ type: 'alle_n_tage', intervalDays: 14 });
      expect(isRoutineDueOnDate(routine, '2026-03-05', [])).toBe(true);
    });

    it('ist vor Ablauf des Intervalls nicht fällig', () => {
      const routine = makeRoutine({ type: 'alle_n_tage', intervalDays: 14 });
      const completions = [completion('2026-03-01')];
      expect(isRoutineDueOnDate(routine, '2026-03-10', completions)).toBe(false);
    });

    it('ist nach Ablauf des Intervalls wieder fällig', () => {
      const routine = makeRoutine({ type: 'alle_n_tage', intervalDays: 14 });
      const completions = [completion('2026-03-01')];
      expect(isRoutineDueOnDate(routine, '2026-03-15', completions)).toBe(true);
    });

    it('rechnet ab der letzten Erledigung, nicht ab der ersten', () => {
      const routine = makeRoutine({ type: 'alle_n_tage', intervalDays: 14 });
      const completions = [completion('2026-03-01'), completion('2026-03-10')];
      expect(isRoutineDueOnDate(routine, '2026-03-15', completions)).toBe(false); // erst 5 Tage seit 03-10
      expect(isRoutineDueOnDate(routine, '2026-03-24', completions)).toBe(true); // 14 Tage seit 03-10
    });
  });
});

describe('getRoutineProgress', () => {
  it('zeigt den Wochenfortschritt für x_pro_woche', () => {
    const routine = makeRoutine({ type: 'x_pro_woche', count: 3 });
    const completions = [completion('2026-03-02'), completion('2026-03-03')];
    const progress = getRoutineProgress(routine, completions, '2026-03-04');
    expect(progress).toEqual({ current: 2, total: 3, unit: 'Woche' });
  });

  it('zeigt den Monatsfortschritt für x_pro_monat', () => {
    const routine = makeRoutine({ type: 'x_pro_monat', count: 4 });
    const completions = [completion('2026-03-01'), completion('2026-03-10')];
    const progress = getRoutineProgress(routine, completions, '2026-03-15');
    expect(progress).toEqual({ current: 2, total: 4, unit: 'Monat' });
  });

  it('liefert kein Fortschritts-Objekt für feste Rhythmen', () => {
    const daily = makeRoutine({ type: 'taeglich' });
    const interval = makeRoutine({ type: 'alle_n_tage', intervalDays: 14 });
    expect(getRoutineProgress(daily, [], '2026-03-05')).toBeUndefined();
    expect(getRoutineProgress(interval, [], '2026-03-05')).toBeUndefined();
  });
});

describe('frequencyLabel', () => {
  it('beschriftet alle Rhythmen verständlich', () => {
    expect(frequencyLabel(makeRoutine({ type: 'taeglich' }))).toBe('Täglich');
    expect(frequencyLabel(makeRoutine({ type: 'x_pro_woche', count: 3 }))).toBe('3× pro Woche');
    expect(frequencyLabel(makeRoutine({ type: 'x_pro_monat', count: 2 }))).toBe('2× pro Monat');
    expect(frequencyLabel(makeRoutine({ type: 'alle_n_tage', intervalDays: 14 }))).toBe(
      'Zweiwöchentlich',
    );
    expect(frequencyLabel(makeRoutine({ type: 'alle_n_tage', intervalDays: 30 }))).toBe('Monatlich');
    expect(frequencyLabel(makeRoutine({ type: 'alle_n_tage', intervalDays: 10 }))).toBe(
      'Alle 10 Tage',
    );
  });
});
