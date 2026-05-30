import { supabase } from '@/lib/supabase';
import {
  type CommissionCalculationInput,
  type CommissionCalculationResult,
  type FinanceStatsInput,
  type FinanceTransaction,
} from '@/types/finance';

export function calcCommission(input: CommissionCalculationInput): CommissionCalculationResult {
  const commissionBase = input.machineFeeEnabled
    ? Math.max(input.price - input.machineFeeAmount, 0)
    : input.price;

  return {
    commissionBase: Number(commissionBase.toFixed(2)),
    commissionValue: Number(((commissionBase * input.commissionRate) / 100).toFixed(2)),
  };
}

export function calcSettlementPeriod(
  settlementDay: number,
  currentDate = new Date(),
): { start: Date; end: Date } {
  const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const safeSettlementDay = Math.min(Math.max(settlementDay, 1), lastDayOfCurrentMonth);
  const currentDay = currentDate.getDate();

  const end = currentDay > safeSettlementDay
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), safeSettlementDay)
    : new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, Math.min(settlementDay, new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()));

  const previousMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  const startDay = Math.min(settlementDay + 1, previousMonthLastDay);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, startDay);

  return { start, end };
}

export function calcSettlementDate(year: number, monthIndex: number, settlementDay: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Math.max(settlementDay, 1), lastDay));
}

export async function fetchFinanceStats(input: FinanceStatsInput): Promise<any> {
  const { data, error } = await supabase.rpc('get_finance_stats', {
    p_user_id: input.companyId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_professional_id: input.professionalId ?? null,
  });

  if (error) throw error;
  return data;
}

export function mapFinanceTransaction(item: any): FinanceTransaction {
  const createdAt = new Date(item.created_at);
  const isExpense = item.type === 'expense';
  const isPaid = isExpense
    ? item.commission_paid === true
    : (item.status ? item.status === 'paid' : true);

  return {
    id: item.id,
    serviceName: item.service_name || item.description || 'Servico',
    professionalName: item.barber_name || 'Manual',
    professionalId: item.professional_id ?? null,
    clientName: item.client_name || '',
    amount: Number(item.amount || 0),
    expense: Number(item.expense || 0),
    date: createdAt.toLocaleDateString('pt-BR'),
    time: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    rawDate: createdAt,
    type: item.type === 'expense' ? 'expense' : 'revenue',
    payment_method: item.payment_method ?? null,
    commission_paid: item.commission_paid === true,
    status: isPaid ? 'paid' : 'pending',
  };
}

export function filterStaffTransactions(
  transactions: FinanceTransaction[],
  teamMemberId: string | null,
): FinanceTransaction[] {
  if (!teamMemberId) return [];
  return transactions.filter(transaction => transaction.professionalId === teamMemberId);
}
