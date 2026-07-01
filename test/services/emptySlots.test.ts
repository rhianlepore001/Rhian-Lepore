import { describe, it, expect } from 'vitest';
import { analyzeEmptySlots, type EmptySlot } from '../../services/emptySlots';
import type { BusinessHours } from '../../services/occupancy';

describe('emptySlots service', () => {
  const standardHours: BusinessHours = {
    mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    tue: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    wed: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    thu: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    fri: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
    sun: { isOpen: false, blocks: [] },
  };

  const refDate = new Date('2025-01-06T00:00:00');

  describe('analyzeEmptySlots', () => {
    it('retorna vazio quando não há horário de funcionamento', () => {
      const result = analyzeEmptySlots(null, 1, [], refDate, 7);
      expect(result.criticalSlots).toEqual([]);
      expect(result.totalEmptyMinutes).toBe(0);
      expect(result.daysAnalyzed).toBe(7);
    });

    it('identifica dia crítico quando 100% ocioso', () => {
      const result = analyzeEmptySlots(standardHours, 1, [], refDate, 1);
      expect(result.criticalSlots.length).toBe(1);
      expect(result.criticalSlots[0].severity).toBe('critical');
      expect(result.criticalSlots[0].weekday).toBe('Segunda');
    });

    it('marca como warning quando empty entre 50-75%', () => {
      const result = analyzeEmptySlots(
        standardHours,
        1,
        [{ appointment_time: '2025-01-06T09:00:00', duration_minutes: 200, status: 'Completed' }],
        refDate,
        1,
      );
      expect(result.criticalSlots.length).toBe(1);
      expect(result.criticalSlots[0].severity).toBe('warning');
    });

    it('não lista dia com boa ocupação', () => {
      const result = analyzeEmptySlots(
        standardHours,
        1,
        [{ appointment_time: '2025-01-06T09:00:00', duration_minutes: 480, status: 'Completed' }],
        refDate,
        1,
      );
      expect(result.criticalSlots.length).toBe(0);
    });

    it('conta total de minutos ociosos', () => {
      const result = analyzeEmptySlots(standardHours, 1, [], refDate, 2);
      expect(result.totalEmptyMinutes).toBeGreaterThan(0);
    });

    it('encontra melhor e pior dia para preencher', () => {
      const result = analyzeEmptySlots(standardHours, 1, [], refDate, 3);
      expect(result.bestDayToFill).toBeTruthy();
      expect(result.worstDay).toBeTruthy();
    });

    it('ordena slots críticos por data', () => {
      const result = analyzeEmptySlots(standardHours, 1, [], refDate, 5);
      const dates = result.criticalSlots.map((s: EmptySlot) => s.date);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });

    it('respeita dias fechados (sem blocks)', () => {
      const customHours: BusinessHours = {
        ...standardHours,
        sun: { isOpen: false, blocks: [] },
      };
      const result = analyzeEmptySlots(customHours, 1, [], new Date('2025-01-05'), 2);
      const sundaySlot = result.criticalSlots.find((s: EmptySlot) => s.weekday === 'Domingo');
      expect(sundaySlot).toBeUndefined();
    });

    it('multiplica minutos disponíveis por número de profissionais', () => {
      const result1 = analyzeEmptySlots(standardHours, 1, [], refDate, 1);
      const result5 = analyzeEmptySlots(standardHours, 5, [], refDate, 1);
      expect(result5.totalEmptyMinutes).toBe(result1.totalEmptyMinutes * 5);
    });

    it('inclui horário do slot crítico', () => {
      const result = analyzeEmptySlots(standardHours, 1, [], refDate, 1);
      expect(result.criticalSlots[0].startTime).toBe('09:00');
      expect(result.criticalSlots[0].endTime).toBe('18:00');
    });
  });
});
