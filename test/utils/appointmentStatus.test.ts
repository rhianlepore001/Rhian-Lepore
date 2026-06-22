import { describe, it, expect } from 'vitest';
import {
  getVisualStatus,
  VISUAL_STATUS_LABEL,
  VISUAL_STATUS_CLASSES,
  OVERDUE_TOLERANCE_MIN,
  DEFAULT_DURATION_MIN,
} from '@/utils/appointmentStatus.ts';

const NOW = new Date('2026-06-21T12:00:00.000Z');

describe('appointmentStatus', () => {
  describe('getVisualStatus — estados terminais (precedência)', () => {
    it('Completed → completed mesmo se ainda dentro do prazo', () => {
      const apt = { status: 'Completed', appointment_time: '2026-06-21T11:55:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('completed');
    });

    it('Completed → completed mesmo se já passou do prazo (não vira overdue)', () => {
      const apt = { status: 'Completed', appointment_time: '2026-06-21T08:00:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('completed');
    });

    it('Cancelled → cancelled', () => {
      const apt = { status: 'Cancelled', appointment_time: '2026-06-21T08:00:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('cancelled');
    });

    it('NoShow → noshow', () => {
      const apt = { status: 'NoShow', appointment_time: '2026-06-21T08:00:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('noshow');
    });
  });

  describe('getVisualStatus — cálculo do overdue (amarelo)', () => {
    it('Confirmed dentro do prazo → normal', () => {
      const apt = { status: 'Confirmed', appointment_time: '2026-06-21T11:50:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('normal');
    });

    it('Confirmed exatamente no limite (start + duration + 15min) → normal (não estritamente maior)', () => {
      // 11:15 + 30min + 15min = 12:00 = NOW → now > deadline é falso
      const apt = { status: 'Confirmed', appointment_time: '2026-06-21T11:15:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('normal');
    });

    it('Confirmed 1min após o limite → overdue', () => {
      const apt = { status: 'Confirmed', appointment_time: '2026-06-21T11:14:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('overdue');
    });

    it('Pending muito atrasado → overdue', () => {
      const apt = { status: 'Pending', appointment_time: '2026-06-21T08:00:00.000Z', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('overdue');
    });

    it('usa DEFAULT_DURATION_MIN quando duration_minutes ausente', () => {
      // 11:15 + 30(default) + 15 = 12:00 = NOW → normal; 1min antes → overdue
      const noDuration = { status: 'Confirmed', appointment_time: '2026-06-21T11:15:00.000Z' };
      expect(getVisualStatus(noDuration, NOW)).toBe('normal');
      const overdueNoDuration = { status: 'Confirmed', appointment_time: '2026-06-21T11:14:00.000Z' };
      expect(getVisualStatus(overdueNoDuration, NOW)).toBe('overdue');
    });

    it('duração longa empurra o deadline (serviço de 2h não fica atrasado cedo)', () => {
      // 10:00 + 120min + 15min = 12:15 > NOW(12:00) → normal
      const apt = { status: 'Confirmed', appointment_time: '2026-06-21T10:00:00.000Z', duration_minutes: 120 };
      expect(getVisualStatus(apt, NOW)).toBe('normal');
    });

    it('appointment_time inválido → normal (sem crash)', () => {
      const apt = { status: 'Confirmed', appointment_time: '', duration_minutes: 30 };
      expect(getVisualStatus(apt, NOW)).toBe('normal');
    });
  });

  describe('getVisualStatus — desconhecido', () => {
    it('status não mapeado → normal', () => {
      const apt = { status: 'Whatever', appointment_time: '2026-06-21T08:00:00.000Z' };
      expect(getVisualStatus(apt, NOW)).toBe('normal');
    });
  });

  describe('constantes e mapas', () => {
    it('tolerância e duração default conforme PRD', () => {
      expect(OVERDUE_TOLERANCE_MIN).toBe(15);
      expect(DEFAULT_DURATION_MIN).toBe(30);
    });

    it('todo estado tem label e classes', () => {
      const states = ['completed', 'overdue', 'normal', 'noshow', 'cancelled'] as const;
      for (const s of states) {
        expect(VISUAL_STATUS_LABEL[s]).toBeTruthy();
        expect(VISUAL_STATUS_CLASSES[s].card).toBeTruthy();
        expect(VISUAL_STATUS_CLASSES[s].dot).toBeTruthy();
        expect(VISUAL_STATUS_CLASSES[s].text).toBeTruthy();
      }
    });
  });
});
