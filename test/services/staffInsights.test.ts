import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import staff from '../fixtures/staffPerformance/staff.json';
import { aggregateStaffProducts, aggregateStaffServices, resolveStaffPeriodRange } from '@/services/staffInsights';

const fetchStaffPerformance = vi.fn();
vi.mock('@/services/staffPerformance', () => ({
  fetchStaffPerformance: (...a: unknown[]) => fetchStaffPerformance(...a),
  isRpcUnavailable: (e: { code?: string }) => e?.code === 'PGRST202',
}));

import { fetchStaffInsights } from '@/services/staffInsights';

describe('resolveStaffPeriodRange — datas locais sem T00:00:00 (B8)', () => {
  const originalTz = process.env.TZ;
  afterEach(() => { process.env.TZ = originalTz; });

  it.each(['Europe/Lisbon', 'America/Sao_Paulo'])('mês, dia e semana em %s sem deslocar o dia', (tz) => {
    process.env.TZ = tz;
    const now = new Date(2026, 7, 2, 0, 30, 0);
    const day = resolveStaffPeriodRange('day', 7, 2026, now);
    expect(day).toMatchObject({ start: '2026-08-02', end: '2026-08-02', label: 'Hoje' });
    const week = resolveStaffPeriodRange('week', 7, 2026, now);
    expect(week.start).toBe('2026-08-02');
    expect(week.end).toBe('2026-08-08');
    const past = resolveStaffPeriodRange('month', 5, 2026, now);
    expect(past.start).toBe('2026-06-01');
    expect(past.end).toBe('2026-06-30');
    expect(past.label.toLowerCase()).toContain('junho');
  });
});

describe('fetchStaffInsights — modo staff da P1 (B9, D1)', () => {
  beforeEach(() => fetchStaffPerformance.mockReset());

  it('chama get_staff_performance_v1 com datas do mês, sem company_id', async () => {
    fetchStaffPerformance.mockResolvedValueOnce(staff);
    const result = await fetchStaffInsights({
      companyId: 'company-001',
      professionalId: 'pro-001',
      period: 'month',
      selectedMonth: 8,
      selectedYear: 2026,
    });
    expect(fetchStaffPerformance).toHaveBeenCalledWith({
      start: '2026-09-01',
      end: '2026-09-30',
      professionalId: null,
      compare: true,
    });
    expect(result.mode).toBe('staff');
    expect(result.me.metrics.comissao_periodo).toBe(257);
    expect(result.me.metrics).not.toHaveProperty('retorno');
    expect(result).not.toHaveProperty('members');
  });

  it('recusa payload de dono (não vaza ranking/retorno)', async () => {
    fetchStaffPerformance.mockResolvedValueOnce({ mode: 'owner', members: [{ name: 'Colega', metrics: { retorno: 1 } }] });
    await expect(fetchStaffInsights({
      companyId: 'c', professionalId: 'p', period: 'month', selectedMonth: 8, selectedYear: 2026,
    })).rejects.toThrow(/staff/);
  });
});

describe('agregadores locais (listas auxiliares)', () => {
  it('aggregateStaffServices lista todos os serviços ordenados por volume', () => {
    const rows = aggregateStaffServices([
      { id: '1', service: 'Corte', clientName: 'A', appointmentTime: '2026-08-01T10:00:00', price: 50, commissionValue: 20 },
      { id: '2', service: 'Barba', clientName: 'B', appointmentTime: '2026-08-01T11:00:00', price: 30, commissionValue: 12 },
      { id: '3', service: 'Corte', clientName: 'C', appointmentTime: '2026-08-01T12:00:00', price: 50, commissionValue: 20 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Corte');
    expect(rows[0].count).toBe(2);
  });

  it('aggregateStaffProducts soma unidades e comissão', () => {
    const rows = aggregateStaffProducts([
      { id: '1', productName: 'Pomada', clientName: 'A', quantity: 3, totalRevenue: 120, commissionValue: 12, stockQuantity: 4, createdAt: '2026-08-01' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
    expect(rows[0].commission).toBe(12);
  });
});
