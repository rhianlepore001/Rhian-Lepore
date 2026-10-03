import { fetchStaffPerformance } from '@/services/staffPerformance';
import type { StaffOwnPerformance } from '@/types/staffPerformance';
import {
  type StaffPeriod,
  type StaffProductAggregate,
  type StaffProductSaleLine,
  type StaffServiceAggregate,
  type StaffServiceLine,
} from '@/types/insights';

export interface StaffPeriodRange {
  start: string;
  end: string;
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalIsoBounds(start: Date, end: Date): { start: string; end: string } {
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

/**
 * Resolve o intervalo do período do colaborador.
 * day/week usam o calendário atual; month usa selectedMonth/selectedYear (0-11).
 */
export function resolveStaffPeriodRange(
  period: StaffPeriod,
  selectedMonth: number,
  selectedYear: number,
  now = new Date(),
): StaffPeriodRange {
  if (period === 'day') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { ...toLocalIsoBounds(start, end), label: 'Hoje' };
  }

  if (period === 'week') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { ...toLocalIsoBounds(start, end), label: 'Esta semana' };
  }

  const start = new Date(selectedYear, selectedMonth, 1);
  const end = new Date(selectedYear, selectedMonth + 1, 0);
  const isCurrent =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const monthLabel = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return {
    ...toLocalIsoBounds(start, end),
    label: isCurrent ? 'Este mês' : monthLabel,
  };
}

function relName(
  value: { name?: string } | { name?: string }[] | null | undefined,
  fallback: string,
): string {
  const row = Array.isArray(value) ? value[0] : value;
  const name = String(row?.name || '').trim();
  return name || fallback;
}

export function aggregateStaffServices(lines: StaffServiceLine[]): StaffServiceAggregate[] {
  const map = new Map<string, { id: string; name: string; count: number; revenue: number; commission: number }>();

  for (const line of lines) {
    const name = line.service.trim() || 'Serviço';
    const key = name.toLowerCase();
    const current = map.get(key) || { id: key, name, count: 0, revenue: 0, commission: 0 };
    current.count += 1;
    current.revenue += line.price;
    current.commission += line.commissionValue;
    map.set(key, current);
  }

  const rows = [...map.values()];
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const shareBase = totalCommission > 0 ? totalCommission : totalRevenue;

  return rows
    .sort((a, b) => b.count - a.count || b.commission - a.commission || b.revenue - a.revenue)
    .map((row) => ({
      ...row,
      share: shareBase > 0
        ? Number((((totalCommission > 0 ? row.commission : row.revenue) / shareBase) * 100).toFixed(1))
        : 0,
    }));
}

export function aggregateStaffProducts(lines: StaffProductSaleLine[]): StaffProductAggregate[] {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      count: number;
      revenue: number;
      commission: number;
      stockQuantity: number | null;
    }
  >();

  for (const line of lines) {
    const key = line.productName.trim().toLowerCase() || line.id;
    const current = map.get(key) || {
      id: key,
      name: line.productName.trim() || 'Produto',
      count: 0,
      revenue: 0,
      commission: 0,
      stockQuantity: line.stockQuantity,
    };
    current.count += line.quantity;
    current.revenue += line.totalRevenue;
    current.commission += line.commissionValue;
    if (line.stockQuantity !== null) current.stockQuantity = line.stockQuantity;
    map.set(key, current);
  }

  const rows = [...map.values()];
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const shareBase = totalCommission > 0 ? totalCommission : totalRevenue;

  return rows
    .sort((a, b) => b.count - a.count || b.commission - a.commission || b.revenue - a.revenue)
    .map((row) => ({
      ...row,
      share: shareBase > 0
        ? Number((((totalCommission > 0 ? row.commission : row.revenue) / shareBase) * 100).toFixed(1))
        : 0,
    }));
}

interface FetchStaffInsightsInput {
  companyId: string;
  professionalId: string;
  period: StaffPeriod;
  selectedMonth: number;
  selectedYear: number;
}

/**
 * Insights do colaborador: modo staff da RPC (D1). Sem company_id no fio.
 * Datas AAAA-MM-DD (B8). Comissão só a registrada (B9).
 */
export async function fetchStaffInsights(input: FetchStaffInsightsInput): Promise<StaffOwnPerformance> {
  const range = resolveStaffPeriodRange(input.period, input.selectedMonth, input.selectedYear);
  const result = await fetchStaffPerformance({
    start: range.start,
    end: range.end,
    professionalId: null,
    compare: true,
  });
  if (result.mode !== 'staff') throw new Error('staff_performance_expected_staff_payload');
  return result;
}

export function staffPeriodLabel(
  period: StaffPeriod,
  selectedMonth: number,
  selectedYear: number,
  now = new Date(),
): string {
  return resolveStaffPeriodRange(period, selectedMonth, selectedYear, now).label;
}
