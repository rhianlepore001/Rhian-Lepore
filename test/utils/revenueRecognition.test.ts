import { describe, it, expect } from 'vitest';
import { revenueRecognizedAt, recognizedInRangeFilter } from '../../utils/revenueRecognition';

describe('revenueRecognition', () => {
  it('reconhece a receita na data da conclusão, não na data marcada', () => {
    expect(
      revenueRecognizedAt({ appointment_time: '2026-11-14T15:00:00Z', completed_at: '2026-11-10T12:00:00Z' }),
    ).toBe('2026-11-10T12:00:00Z');
  });

  it('usa a data marcada para atendimentos antigos sem completed_at', () => {
    expect(revenueRecognizedAt({ appointment_time: '2026-09-01T10:00:00Z', completed_at: null })).toBe(
      '2026-09-01T10:00:00Z',
    );
    expect(revenueRecognizedAt({ appointment_time: '2026-09-01T10:00:00Z' })).toBe('2026-09-01T10:00:00Z');
  });

  it('monta o filtro PostgREST com conclusão e fallback legado', () => {
    expect(recognizedInRangeFilter('2026-11-01T00:00:00', '2026-11-30T23:59:59')).toBe(
      'and(completed_at.gte.2026-11-01T00:00:00,completed_at.lte.2026-11-30T23:59:59),' +
        'and(completed_at.is.null,appointment_time.gte.2026-11-01T00:00:00,appointment_time.lte.2026-11-30T23:59:59)',
    );
  });
});
