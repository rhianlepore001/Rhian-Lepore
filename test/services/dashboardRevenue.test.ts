import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const calls: Array<{ method: string; args: unknown[] }> = [];
let rows: Array<Record<string, unknown>> = [];

vi.mock('../../lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'gte', 'lte', 'or', 'order']) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
  return { supabase: builder };
});

import { fetchTodayRevenue, fetchRevenueSparkline } from '../../services/dashboard';

describe('receita do dashboard reconhecida na conclusão', () => {
  beforeEach(() => {
    calls.length = 0;
    rows = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 14, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('receita de hoje filtra pela data de conclusão (com fallback legado), não pela data marcada', async () => {
    rows = [{ price: 40 }];
    await expect(fetchTodayRevenue('tenant-1')).resolves.toBe(40);
    const usedAppointmentTimeDirectly = calls.some(
      (c) => (c.method === 'gte' || c.method === 'lte') && c.args[0] === 'appointment_time',
    );
    expect(usedAppointmentTimeDirectly).toBe(false);
    const or = calls.find((c) => c.method === 'or');
    expect(or).toBeDefined();
    const start = new Date(2026, 10, 10, 0, 0, 0, 0).toISOString();
    const end = new Date(2026, 10, 10, 23, 59, 59, 999).toISOString();
    expect(or!.args[0]).toBe(
      `and(completed_at.gte.${start},completed_at.lte.${end}),` +
        `and(completed_at.is.null,appointment_time.gte.${start},appointment_time.lte.${end})`,
    );
  });

  it('sparkline soma no dia da conclusão: atendimento de 14/11 concluído hoje cai em hoje', async () => {
    rows = [
      { price: 40, appointment_time: new Date(2026, 10, 14, 15).toISOString(), completed_at: new Date(2026, 10, 10, 12).toISOString() },
      { price: 25, appointment_time: new Date(2026, 10, 8, 10).toISOString(), completed_at: null },
    ];
    const days = await fetchRevenueSparkline('tenant-1');
    expect(days).toEqual([0, 0, 0, 0, 25, 0, 40]);
    const usedAppointmentTimeDirectly = calls.some((c) => c.method === 'gte' && c.args[0] === 'appointment_time');
    expect(usedAppointmentTimeDirectly).toBe(false);
  });
});
