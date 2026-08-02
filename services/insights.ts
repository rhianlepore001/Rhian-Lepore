import { supabase } from '@/lib/supabase';
import {
  businessPerformanceSchema,
  type BusinessPerformance,
  type RankingItem,
} from '@/types/insights';

function monthBounds(month: number, year: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function toRanking(
  rows: Array<{ id: string; name: string; count: number; revenue: number; margin?: number }>,
  limit = 8,
): RankingItem[] {
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  return rows
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      name: row.name,
      count: row.count,
      revenue: row.revenue,
      share: totalRevenue > 0 ? Number(((row.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      ...(row.margin !== undefined ? { margin: row.margin } : {}),
    }));
}

/**
 * Performance do catálogo (serviços + produtos + profissionais) no mês selecionado.
 * Tenant via user_id/company_id do session — nunca de input externo.
 */
export async function fetchBusinessPerformance(
  companyId: string,
  month: number,
  year: number,
): Promise<BusinessPerformance> {
  const { start, end } = monthBounds(month, year);

  const [{ data: appointments, error: aptError }, { data: productSales, error: productError }, { data: team, error: teamError }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, service, price, professional_id')
        .eq('user_id', companyId)
        .eq('status', 'Completed')
        .gte('appointment_time', `${start}T00:00:00`)
        .lte('appointment_time', `${end}T23:59:59`),
      supabase
        .from('product_sales')
        .select('id, product_id, quantity, total_revenue, total_cost, products (id, name)')
        .eq('company_id', companyId)
        .gte('created_at', `${start}T00:00:00`)
        .lte('created_at', `${end}T23:59:59`),
      supabase
        .from('team_members')
        .select('id, name')
        .eq('user_id', companyId)
        .eq('active', true),
    ]);

  if (aptError) throw aptError;
  if (productError) throw productError;
  if (teamError) throw teamError;

  const serviceMap = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  const professionalMap = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  const teamNames = new Map((team || []).map((m) => [m.id as string, (m.name as string) || 'Profissional']));

  for (const apt of appointments || []) {
    const serviceName = String(apt.service || 'Serviço').trim() || 'Serviço';
    const price = Number(apt.price) || 0;
    const serviceKey = serviceName.toLowerCase();
    const current = serviceMap.get(serviceKey) || { id: serviceKey, name: serviceName, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += price;
    serviceMap.set(serviceKey, current);

    const professionalId = apt.professional_id as string | null;
    if (professionalId) {
      const name = teamNames.get(professionalId) || 'Profissional';
      const currentPro = professionalMap.get(professionalId) || {
        id: professionalId,
        name,
        count: 0,
        revenue: 0,
      };
      currentPro.count += 1;
      currentPro.revenue += price;
      professionalMap.set(professionalId, currentPro);
    }
  }

  const productMap = new Map<
    string,
    { id: string; name: string; count: number; revenue: number; margin: number }
  >();

  for (const sale of productSales || []) {
    const productRel = sale.products as { id?: string; name?: string } | { id?: string; name?: string }[] | null;
    const product = Array.isArray(productRel) ? productRel[0] : productRel;
    const productId = String(sale.product_id || product?.id || 'unknown');
    const name = String(product?.name || 'Produto').trim() || 'Produto';
    const qty = Number(sale.quantity) || 0;
    const revenue = Number(sale.total_revenue) || 0;
    const cost = Number(sale.total_cost) || 0;
    const current = productMap.get(productId) || {
      id: productId,
      name,
      count: 0,
      revenue: 0,
      margin: 0,
    };
    current.count += qty;
    current.revenue += revenue;
    current.margin += revenue - cost;
    productMap.set(productId, current);
  }

  const services = toRanking([...serviceMap.values()]);
  const products = toRanking([...productMap.values()]);
  const professionals = toRanking([...professionalMap.values()], 5);

  const servicesRevenue = [...serviceMap.values()].reduce((sum, row) => sum + row.revenue, 0);
  const productsRevenue = [...productMap.values()].reduce((sum, row) => sum + row.revenue, 0);
  const productsUnits = [...productMap.values()].reduce((sum, row) => sum + row.count, 0);

  return businessPerformanceSchema.parse({
    services,
    products,
    professionals,
    summary: {
      servicesRevenue,
      productsRevenue,
      servicesCount: [...serviceMap.values()].reduce((sum, row) => sum + row.count, 0),
      productsUnits,
      appointmentsCount: (appointments || []).length,
    },
  });
}
