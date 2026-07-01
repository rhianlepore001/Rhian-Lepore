import { describe, it, expect, vi } from 'vitest';
import {
  parseTimeToMinutes,
  calculateDayAvailableMinutes,
  calculateOccupancy,
  getDayKey,
  getPeriodDates,
} from '../../services/occupancy';

describe('occupancy service', () => {
  describe('parseTimeToMinutes', () => {
    it('converte horário para minutos', () => {
      expect(parseTimeToMinutes('09:00')).toBe(540);
      expect(parseTimeToMinutes('18:30')).toBe(1110);
      expect(parseTimeToMinutes('00:00')).toBe(0);
    });
  });

  describe('getDayKey', () => {
    it('retorna chave correta do dia', () => {
      expect(getDayKey(new Date('2025-01-06'))).toBe('mon');
      expect(getDayKey(new Date('2025-01-05'))).toBe('sun');
      expect(getDayKey(new Date('2025-01-11'))).toBe('sat');
    });
  });

  describe('calculateDayAvailableMinutes', () => {
    const businessHours = {
      mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
      tue: { isOpen: false, blocks: [] },
    };

    it('calcula minutos disponíveis considerando profissionais', () => {
      const monday = new Date('2025-01-06');
      expect(calculateDayAvailableMinutes(businessHours, 2, monday)).toBe(1080);
    });

    it('retorna 0 quando estabelecimento está fechado', () => {
      const tuesday = new Date('2025-01-07');
      expect(calculateDayAvailableMinutes(businessHours, 2, tuesday)).toBe(0);
    });
  });

  describe('calculateOccupancy', () => {
    const businessHours = {
      mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
      tue: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
    };

    it('calcula taxa de ocupação corretamente', () => {
      const start = new Date('2025-01-06');
      const end = new Date('2025-01-07');

      const result = calculateOccupancy(
        businessHours,
        1,
        [
          { appointment_time: '2025-01-06T10:00:00', duration_minutes: 60, status: 'Confirmed' },
          { appointment_time: '2025-01-06T14:00:00', duration_minutes: 30, status: 'Completed' },
        ],
        start,
        end,
      );

      expect(result.occupiedMinutes).toBe(90);
      expect(result.availableMinutes).toBe(1080);
      expect(result.occupancyRate).toBe(8);
      expect(result.totalAppointments).toBe(2);
    });

    it('retorna 0 quando não há horário de funcionamento', () => {
      const result = calculateOccupancy(
        null,
        1,
        [],
        new Date('2025-01-06'),
        new Date('2025-01-06'),
      );

      expect(result.occupancyRate).toBe(0);
      expect(result.availableMinutes).toBe(0);
    });

    it('limita taxa em 100%', () => {
      const result = calculateOccupancy(
        businessHours,
        1,
        [{ appointment_time: '2025-01-06T09:00:00', duration_minutes: 9999, status: 'Confirmed' }],
        new Date('2025-01-06'),
        new Date('2025-01-06'),
      );

      expect(result.occupancyRate).toBe(100);
    });
  });

  describe('getPeriodDates', () => {
    it('retorna apenas hoje', () => {
      const { start, end } = getPeriodDates('today', new Date('2025-06-15T12:00:00'));
      // Compara em data local (getPeriodDates usa meia-noite local); toISOString
      // forçaria UTC e quebraria o teste em fusos a leste de Greenwich.
      const localDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(localDate(start)).toBe('2025-06-15');
      expect(localDate(end)).toBe('2025-06-15');
    });

    it('retorna semana correta (segunda a domingo)', () => {
      const { start, end } = getPeriodDates('week', new Date('2025-06-15'));
      expect(start.getDay()).toBe(1);
      expect(end.getDay()).toBe(0);
    });

    it('retorna mês completo', () => {
      const { start, end } = getPeriodDates('month', new Date('2025-06-15'));
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(30);
    });
  });
});
