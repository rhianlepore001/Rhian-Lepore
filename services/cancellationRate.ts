import { supabase } from '@/lib/supabase';

export interface CancellationBreakdown {
  completed: number;
  cancelled: number;
  noShow: number;
  total: number;
}

export interface CancellationRateResult {
  cancellationRate: number;
  noShowRate: number;
  totalAppointments: number;
  revenueLost: number;
  trend: 'up' | 'down' | 'stable';
  breakdown: CancellationBreakdown;
  comparison: {
    previousRate: number;
    delta: number;
  };
}

export async function fetchCancellationRate(
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<CancellationRateResult> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('status, price, appointment_time')
    .eq('user_id', companyId)
    .gte('appointment_time', startIso)
    .lte('appointment_time', endIso);

  if (error) throw error;

  return computeCancellationRate(data || [], null);
}

export function computeCancellationRate(
  appointments: { status: string; price?: number; appointment_time?: string }[],
  _previousData: unknown,
): CancellationRateResult {
  const breakdown: CancellationBreakdown = {
    completed: 0,
    cancelled: 0,
    noShow: 0,
    total: appointments.length,
  };

  let revenueLost = 0;

  for (const apt of appointments) {
    const price = Number(apt.price) || 0;
    const status = (apt.status || '').toLowerCase();

    if (status === 'completed') breakdown.completed += 1;
    else if (status === 'cancelled' || status === 'canceled') {
      breakdown.cancelled += 1;
      revenueLost += price;
    } else if (status === 'noshow' || status === 'no_show' || status === 'no-show') {
      breakdown.noShow += 1;
      revenueLost += price;
    }
  }

  const total = breakdown.total;
  const problematic = breakdown.cancelled + breakdown.noShow;
  const cancellationRate = total > 0 ? (breakdown.cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (breakdown.noShow / total) * 100 : 0;

  let trend: CancellationRateResult['trend'] = 'stable';
  if (cancellationRate + noShowRate > 15) trend = 'up';
  else if (cancellationRate + noShowRate < 5) trend = 'down';

  return {
    cancellationRate: round1(cancellationRate),
    noShowRate: round1(noShowRate),
    totalAppointments: total,
    revenueLost: round2(revenueLost),
    trend,
    breakdown,
    comparison: {
      previousRate: 0,
      delta: 0,
    },
  };
}

export async function fetchCancellationRateComparison(
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ current: CancellationRateResult; previous: CancellationRateResult }> {
  const daysDiff = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const previousStart = new Date(startDate);
  const previousEnd = new Date(endDate);
  previousStart.setDate(previousStart.getDate() - daysDiff);
  previousEnd.setDate(previousEnd.getDate() - daysDiff);

  const [current, previous] = await Promise.all([
    fetchCancellationRate(companyId, startDate, endDate),
    fetchCancellationRate(companyId, previousStart, previousEnd),
  ]);

  const currentTotal = current.cancellationRate + current.noShowRate;
  const previousTotal = previous.cancellationRate + previous.noShowRate;
  current.comparison = {
    previousRate: previousTotal,
    delta: round1(currentTotal - previousTotal),
  };

  return { current, previous };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
