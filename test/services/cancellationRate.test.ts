import { describe, it, expect } from 'vitest';
import { computeCancellationRate } from '../../services/cancellationRate';

describe('cancellationRate service', () => {
  describe('computeCancellationRate', () => {
    it('retorna zeros quando não há appointments', () => {
      const result = computeCancellationRate([], null);
      expect(result.totalAppointments).toBe(0);
      expect(result.cancellationRate).toBe(0);
      expect(result.noShowRate).toBe(0);
      expect(result.revenueLost).toBe(0);
    });

    it('conta corretamente completados, cancelados e no-shows', () => {
      const result = computeCancellationRate(
        [
          { status: 'Completed', price: 50 },
          { status: 'Cancelled', price: 30 },
          { status: 'NoShow', price: 40 },
          { status: 'Cancelled', price: 20 },
        ],
        null,
      );
      expect(result.breakdown.completed).toBe(1);
      expect(result.breakdown.cancelled).toBe(2);
      expect(result.breakdown.noShow).toBe(1);
      expect(result.breakdown.total).toBe(4);
    });

    it('calcula taxa de cancelamento', () => {
      const result = computeCancellationRate(
        [
          { status: 'Completed' },
          { status: 'Cancelled' },
          { status: 'Completed' },
          { status: 'Cancelled' },
        ],
        null,
      );
      expect(result.cancellationRate).toBe(50);
    });

    it('calcula taxa de no-show', () => {
      const result = computeCancellationRate(
        [
          { status: 'Completed' },
          { status: 'NoShow' },
          { status: 'Completed' },
          { status: 'Completed' },
        ],
        null,
      );
      expect(result.noShowRate).toBe(25);
    });

    it('soma receita perdida', () => {
      const result = computeCancellationRate(
        [
          { status: 'Completed', price: 50 },
          { status: 'Cancelled', price: 30 },
          { status: 'NoShow', price: 40 },
        ],
        null,
      );
      expect(result.revenueLost).toBe(70);
    });

    it('marca trend como "up" quando > 15%', () => {
      const result = computeCancellationRate(
        [
          { status: 'Completed' },
          { status: 'Cancelled' },
          { status: 'Completed' },
          { status: 'Cancelled' },
        ],
        null,
      );
      expect(result.trend).toBe('up');
    });

    it('marca trend como "down" quando < 5%', () => {
      const result = computeCancellationRate(
        Array(100).fill({ status: 'Completed' }).concat([{ status: 'Cancelled' }]),
        null,
      );
      expect(result.trend).toBe('down');
    });

    it('marca trend como "stable" entre 5-15%', () => {
      const result = computeCancellationRate(
        Array(10).fill({ status: 'Completed' }).concat([{ status: 'Cancelled' }]),
        null,
      );
      expect(result.trend).toBe('stable');
    });

    it('aceita variações de status (cancelled, Canceled, no_show, no-show)', () => {
      const result = computeCancellationRate(
        [
          { status: 'cancelled' },
          { status: 'Canceled' },
          { status: 'no_show' },
          { status: 'no-show' },
        ],
        null,
      );
      expect(result.breakdown.cancelled).toBe(2);
      expect(result.breakdown.noShow).toBe(2);
    });

    it('trata price ausente como 0', () => {
      const result = computeCancellationRate(
        [{ status: 'Cancelled' }, { status: 'Cancelled' }],
        null,
      );
      expect(result.revenueLost).toBe(0);
    });
  });
});
