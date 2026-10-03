import { supabase } from '@/lib/supabase';
import { parseLocalISODate, toLocalISODate } from '@/utils/commissionCycle';

export type LedgerKind = 'atendimento' | 'produto';

export interface LedgerRow {
  id: string;
  kind: LedgerKind;
  at: string;
  title: string;
  amount: number;
  clientName: string | null;
  club: boolean;
}

export interface PerformanceLedgerParams {
  companyId: string;
  professionalId: string;
  start: string;
  end: string;
}

const PAGE = 20;

function nextDay(iso: string): string {
  const d = parseLocalISODate(iso);
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
}

function clientOf(row: { clients?: { name?: string } | { name?: string }[] | null }): string | null {
  const c = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const name = String(c?.name || '').trim();
  return name || null;
}

/** Duas queries (atendimentos + produtos). Sem N+1. Sem log de nome de cliente. */
export async function fetchPerformanceLedger(params: PerformanceLedgerParams): Promise<LedgerRow[]> {
  const from = `${params.start}T00:00:00`;
  const to = `${nextDay(params.end)}T00:00:00`;
  const [aptRes, saleRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, appointment_time, service, price, payment_method, status, clients (name)')
      .eq('user_id', params.companyId)
      .eq('professional_id', params.professionalId)
      .eq('status', 'Completed')
      .gte('appointment_time', from)
      .lt('appointment_time', to)
      .order('appointment_time', { ascending: true }),
    supabase
      .from('product_sales')
      .select('id, created_at, quantity, total_revenue, products (name), clients:client_id (name)')
      .eq('company_id', params.companyId)
      .eq('professional_id', params.professionalId)
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: true }),
  ]);
  if (aptRes.error) throw aptRes.error;
  if (saleRes.error) throw saleRes.error;

  const rows: LedgerRow[] = [];
  for (const a of aptRes.data || []) {
    const method = String(a.payment_method || '').trim().toLowerCase();
    rows.push({
      id: `a-${a.id}`,
      kind: 'atendimento',
      at: a.appointment_time,
      title: String(a.service || 'Serviço').trim() || 'Serviço',
      amount: Number(a.price) || 0,
      clientName: clientOf(a),
      club: method === 'membership',
    });
  }
  for (const s of saleRes.data || []) {
    const prod = Array.isArray(s.products) ? s.products[0] : s.products;
    rows.push({
      id: `p-${s.id}`,
      kind: 'produto',
      at: s.created_at,
      title: String(prod?.name || 'Produto').trim() || 'Produto',
      amount: Number(s.total_revenue) || 0,
      clientName: clientOf(s),
      club: false,
    });
  }
  rows.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return rows;
}

export const LEDGER_PAGE = PAGE;

export function pageLedger(rows: LedgerRow[], page: number): { items: LedgerRow[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(Math.max(page, 1), pages);
  return { items: rows.slice((p - 1) * PAGE, p * PAGE), pages, page: p };
}
