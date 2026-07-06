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
    serviceName: item.service_name || item.description || 'Serviço',
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

export async function fetchMonthlyHistory(companyId: string, monthsCount: number = 12): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_monthly_finance_history', {
    p_user_id: companyId,
    p_months_count: monthsCount,
  });
  if (error) throw error;
  return data || [];
}

export async function deleteFinanceTransaction(transactionId: string, companyId: string): Promise<void> {
  void companyId; // tenant validado server-side pela RPC (get_auth_company_id/auth.uid)
  const { error } = await supabase.rpc('delete_finance_transaction', {
    p_record_id: transactionId,
  });
  if (error) throw error;
}

export async function markExpenseAsPaid(recordId: string, companyId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_expense_as_paid', {
    p_record_id: recordId,
    p_user_id: companyId,
  });
  if (error) throw error;
}

export async function createFinanceRecord(input: {
  companyId: string;
  type: string;
  amount: number;
  expense: number;
  description: string;
  paymentMethod: string;
  professionalId: string | null;
  professionalName: string;
  clientId: string | null;
  clientName: string;
  serviceName: string;
  appointmentId: string | null;
  dueDate: string | null;
  commissionPaid: boolean;
}): Promise<void> {
  const record: Record<string, any> = {
    user_id: input.companyId,
    type: input.type,
    amount: input.amount,
    expense: input.expense,
    description: input.description,
    payment_method: input.paymentMethod,
    professional_id: input.professionalId,
    barber_name: input.professionalName,
    client_id: input.clientId,
    client_name: input.clientName,
    service_name: input.serviceName,
    appointment_id: input.appointmentId,
    due_date: input.dueDate,
    commission_paid: input.commissionPaid,
  };
  const { error } = await supabase.from('finance_records').insert(record);
  if (error) throw error;
}

export async function fetchDropdownOptions(companyId: string): Promise<{
  services: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  professionals: { id: string; name: string }[];
}> {
  const [servicesRes, clientsRes, professionalsRes] = await Promise.all([
    supabase.from('services').select('id, name').eq('user_id', companyId),
    supabase.from('clients').select('id, name').eq('user_id', companyId).order('name'),
    supabase.from('team_members').select('id, name').eq('user_id', companyId).eq('active', true).order('name'),
  ]);

  if (servicesRes.error) throw servicesRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (professionalsRes.error) throw professionalsRes.error;

  return {
    services: servicesRes.data || [],
    clients: clientsRes.data || [],
    professionals: professionalsRes.data || [],
  };
}
