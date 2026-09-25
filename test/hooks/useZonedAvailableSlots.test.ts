import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

type Deferred = { resolve: (v: string[]) => void; reject: (e: unknown) => void; args: unknown[] };
const pending: Deferred[] = [];

vi.mock('../../services/publicBooking', () => ({
  fetchAvailableSlots: vi.fn((...args: unknown[]) => new Promise<string[]>((resolve, reject) => {
    pending.push({ resolve, reject, args });
  })),
}));

import { useZonedAvailableSlots } from '../../hooks/useZonedAvailableSlots';
import { fetchAvailableSlots } from '../../services/publicBooking';

const FUTURE = '2030-01-15';
type Props = { tz: string; date: string | null };

describe('useZonedAvailableSlots — resposta obsoleta não sobrescreve a atual', () => {
  beforeEach(() => {
    pending.length = 0;
    vi.clearAllMocks();
  });

  it('fuso padrão → fuso dos settings: resposta antiga chegando depois é ignorada', async () => {
    const { result, rerender } = renderHook(
      ({ tz, date }: Props) => useZonedAvailableSlots({
        businessId: 'biz-1', dateStr: date, professionalId: null, durationMinutes: 30, timezone: tz,
      }),
      { initialProps: { tz: 'America/Sao_Paulo', date: FUTURE } },
    );

    rerender({ tz: 'Europe/Lisbon', date: FUTURE });
    expect(pending).toHaveLength(2);

    // A busca nova (fuso certo) volta primeiro; a antiga volta depois.
    await act(async () => { pending[1].resolve(['09:00', '09:30']); });
    await waitFor(() => expect(result.current).toEqual(['09:00', '09:30']));
    await act(async () => { pending[0].resolve(['06:00', '06:30', '07:00']); });

    expect(result.current).toEqual(['09:00', '09:30']);
  });

  it('troca rápida de data: só a última data preenche os horários', async () => {
    const { result, rerender } = renderHook(
      ({ tz, date }: Props) => useZonedAvailableSlots({
        businessId: 'biz-1', dateStr: date, professionalId: 'pro-1', durationMinutes: 45, timezone: tz,
      }),
      { initialProps: { tz: 'Europe/Lisbon', date: '2030-01-15' } },
    );
    rerender({ tz: 'Europe/Lisbon', date: '2030-01-16' });

    await act(async () => { pending[1].resolve(['14:00']); });
    await act(async () => { pending[0].reject(new Error('late failure')); });

    expect(result.current).toEqual(['14:00']);
    expect(fetchAvailableSlots).toHaveBeenLastCalledWith('biz-1', '2030-01-16', 'pro-1', 45);
  });

  it('sem data ou sem negócio não busca', () => {
    renderHook(() => useZonedAvailableSlots({
      businessId: null, dateStr: FUTURE, professionalId: null, durationMinutes: 30, timezone: 'Europe/Lisbon',
    }));
    renderHook(() => useZonedAvailableSlots({
      businessId: 'biz-1', dateStr: null, professionalId: null, durationMinutes: 30, timezone: 'Europe/Lisbon',
    }));
    expect(fetchAvailableSlots).not.toHaveBeenCalled();
  });
});
