import { supabase } from '@/lib/supabase';
import {
  staffInsightsSchema,
  type StaffInsights,
  type StaffPeriod,
  type StaffProductAggregate,
  type StaffProductSaleLine,
  type StaffServiceAggregate,
  type StaffServiceLine,
  type StaffUpcomingAppointment,
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
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T00:00:00`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T23:59:59`,
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
 * Insights do colaborador: só dados do próprio professional_id.
 * companyId vem do session (useAuth) — nunca de URL/form.
 */
export async function fetchStaffInsights(input: FetchStaffInsightsInput): Promise<StaffInsights> {
  const { companyId, professionalId, period, selectedMonth, selectedYear } = input;
  const range = resolveStaffPeriodRange(period, selectedMonth, selectedYear);
  const todayRange = resolveStaffPeriodRange('day', selectedMonth, selectedYear);

  const [aptRes, productRes, commissionRes, todayRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id,
        service,
        price,
        appointment_time,
        status,
        clients (name),
        finance_records (
          id,
          commission_value,
          type
        )
      `)
      .eq('professional_id', professionalId)
      .eq('user_id', companyId)
      .eq('status', 'Completed')
      .gte('appointment_time', range.start)
      .lte('appointment_time', range.end)
      .order('appointment_time', { ascending: false }),
    supabase
      .from('product_sales')
      .select(`
        id,
        created_at,
        quantity,
        total_revenue,
        commission_value,
        finance_record_id,
        products (id, name, stock_quantity),
        clients:client_id (name)
      `)
      .eq('professional_id', professionalId)
      .eq('company_id', companyId)
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .order('created_at', { ascending: false }),
    supabase
      .from('finance_records')
      .select('commission_value')
      .eq('professional_id', professionalId)
      .eq('user_id', companyId)
      .gte('created_at', range.start)
      .lte('created_at', range.end),
    supabase
      .from('appointments')
      .select('id, service, appointment_time, status, clients(name)')
      .eq('professional_id', professionalId)
      .eq('user_id', companyId)
      .gte('appointment_time', todayRange.start)
      .lte('appointment_time', todayRange.end)
      .in('status', ['Confirmed', 'Pending'])
      .order('appointment_time', { ascending: true }),
  ]);

  if (aptRes.error) throw aptRes.error;
  if (productRes.error) throw productRes.error;
  if (commissionRes.error) throw commissionRes.error;
  if (todayRes.error) throw todayRes.error;

  const productFinanceIds = new Set(
    (productRes.data || [])
      .map((sale: { finance_record_id?: string | null }) => sale.finance_record_id)
      .filter((id): id is string => Boolean(id)),
  );

  const recentServices: StaffServiceLine[] = (aptRes.data || []).map((apt: {
    id: string;
    service?: string | null;
    price?: number | null;
    appointment_time: string;
    clients?: { name?: string } | { name?: string }[] | null;
    finance_records?: Array<{ id: string; commission_value: number | null; type: string | null }> | null;
  }) => {
    const serviceRecord = (apt.finance_records || []).find(
      (fr) => fr.type === 'revenue' && !productFinanceIds.has(fr.id),
    );
    return {
      id: apt.id,
      service: String(apt.service || 'Serviço').trim() || 'Serviço',
      clientName: relName(apt.clients, 'Cliente'),
      appointmentTime: apt.appointment_time,
      price: Number(apt.price) || 0,
      commissionValue: Number(serviceRecord?.commission_value) || 0,
    };
  });

  const recentProducts: StaffProductSaleLine[] = (productRes.data || []).map((sale: {
    id: string;
    created_at: string;
    quantity?: number | null;
    total_revenue?: number | null;
    commission_value?: number | null;
    products?: { id?: string; name?: string; stock_quantity?: number } | { id?: string; name?: string; stock_quantity?: number }[] | null;
    clients?: { name?: string } | { name?: string }[] | null;
  }) => {
    const product = Array.isArray(sale.products) ? sale.products[0] : sale.products;
    const stockRaw = product?.stock_quantity;
    return {
      id: sale.id,
      productName: String(product?.name || 'Produto').trim() || 'Produto',
      clientName: sale.clients ? relName(sale.clients, 'Cliente') : null,
      quantity: Number(sale.quantity) || 0,
      totalRevenue: Number(sale.total_revenue) || 0,
      commissionValue: Number(sale.commission_value) || 0,
      stockQuantity: stockRaw === undefined || stockRaw === null ? null : Number(stockRaw),
      createdAt: sale.created_at,
    };
  }).filter((line) => line.quantity > 0);

  const services = aggregateStaffServices(recentServices);
  const products = aggregateStaffProducts(recentProducts);

  const commissionsFromRecords = (commissionRes.data || []).reduce(
    (sum, row) => sum + (Number(row.commission_value) || 0),
    0,
  );
  const commissionsFromLines =
    recentServices.reduce((sum, line) => sum + line.commissionValue, 0) +
    recentProducts.reduce((sum, line) => sum + line.commissionValue, 0);
  const commissionsTotal = commissionsFromRecords > 0 ? commissionsFromRecords : commissionsFromLines;

  const uniqueClients = new Set(
    [
      ...recentServices.map((line) => line.clientName),
      ...recentProducts.map((line) => line.clientName).filter(Boolean),
    ].filter((name): name is string => Boolean(name) && name !== 'Cliente'),
  ).size;

  const servicesRevenue = recentServices.reduce((sum, line) => sum + line.price, 0);
  const productsRevenue = recentProducts.reduce((sum, line) => sum + line.totalRevenue, 0);
  const productsUnits = recentProducts.reduce((sum, line) => sum + line.quantity, 0);
  const appointmentsCount = recentServices.length;
  const avgTicket = appointmentsCount > 0 ? servicesRevenue / appointmentsCount : 0;

  const todayUpcoming: StaffUpcomingAppointment[] = (todayRes.data || []).map((apt: {
    id: string;
    service?: string | null;
    appointment_time: string;
    status: string;
    clients?: { name?: string } | { name?: string }[] | null;
  }) => ({
    id: apt.id,
    service: String(apt.service || 'Serviço').trim() || 'Serviço',
    clientName: relName(apt.clients, 'Cliente'),
    appointmentTime: apt.appointment_time,
    status: apt.status,
  }));

  return staffInsightsSchema.parse({
    summary: {
      appointmentsCount,
      uniqueClients,
      commissionsTotal,
      productsUnits,
      productsRevenue,
      servicesRevenue,
      avgTicket,
    },
    services,
    products,
    recentServices: recentServices.slice(0, 20),
    recentProducts: recentProducts.slice(0, 20),
    todayUpcoming,
  });
}

export function staffPeriodLabel(
  period: StaffPeriod,
  selectedMonth: number,
  selectedYear: number,
  now = new Date(),
): string {
  return resolveStaffPeriodRange(period, selectedMonth, selectedYear, now).label;
}
