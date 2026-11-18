import { getDateStringInTimeZone } from '../../utils/businessTimezone';
import { demoSlots } from './slots';
import { demoPerformance } from './performance';
import { getDemoNiche, demoCompanyId } from './mode';
import { createDemoSeed, type DemoRow } from './seed';

const unsupported = (name: string): never => { throw new Error(`Operação indisponível na simulação: ${name}`); };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const ok = (data: any) => ({ data: copy(data), error: null, count: Array.isArray(data) ? data.length : null });

const comparable = (value: unknown) => typeof value === 'string' && /T\d/.test(value) ? new Date(value).getTime() : value;
const compare = (left: unknown, op: string, right: unknown) => {
  const a = comparable(left) as any;
  const b = comparable(right) as any;
  switch (op) {
    case 'eq': return String(a) === String(b);
    case 'neq': return String(a) !== String(b);
    case 'gte': return a >= b;
    case 'gt': return a > b;
    case 'lte': return a <= b;
    case 'lt': return a < b;
    case 'is': return (a ?? null) === (b === 'null' ? null : b === 'true' ? true : b === 'false' ? false : b);
    case 'in': return String(b).replace(/^\(|\)$/g, '').split(',').map(v => v.trim().replace(/^"|"$/g, '')).includes(String(a));
    default: return unsupported(`operador ${op}`);
  }
};
const splitTopLevel = (input: string) => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) { parts.push(current); current = ''; } else current += char;
  }
  if (current) parts.push(current);
  return parts;
};
/** Avalia um filtro PostgREST `.or('a.eq.1,and(b.gte.x,c.is.null)')` sobre uma linha. */
function matchesOrFilter(row: DemoRow, filter: string, mode: 'or' | 'and' = 'or'): boolean {
  const results = splitTopLevel(filter).map(part => {
    const group = part.match(/^(and|or)\((.*)\)$/);
    if (group) return matchesOrFilter(row, group[2], group[1] as 'or' | 'and');
    const [key, op, ...rest] = part.split('.');
    return compare(row[key], op, rest.join('.'));
  });
  return mode === 'or' ? results.some(Boolean) : results.every(Boolean);
}

export function createDemoClient() {
  const tenants = { barber: createDemoSeed('barber'), beauty: createDemoSeed('beauty') };
  const tables = () => tenants[getDemoNiche()];
  function from(table: string): any {
    if (!(table in tables())) return unsupported(`tabela ${table}`);
    const source = tables()[table];
    let rows = [...source];
    let singular = false;
    let mutation: 'insert' | 'update' | 'delete' | null = null;
    let payload: DemoRow[] = [];
    let executed = false;
    let result: ReturnType<typeof ok>;
    const query: Record<string, any> = {};
    const chain = (name: string, fn: (...args: any[]) => void) => { query[name] = (...args: any[]) => { fn(...args); return facade; }; };
    chain('select', () => undefined);
    for (const op of ['overrideTypes', 'returns', 'throwOnError', 'abortSignal']) chain(op, () => undefined);
    chain('eq', (key, value) => { rows = rows.filter(r => r[key] === value); });
    chain('neq', (key, value) => { rows = rows.filter(r => r[key] !== value); });
    chain('in', (key, values) => { rows = rows.filter(r => values.includes(r[key])); });
    chain('is', (key, value) => { rows = rows.filter(r => (r[key] ?? null) === value); });
    for (const op of ['gte', 'gt', 'lte', 'lt']) chain(op, (key, value) => { rows = rows.filter(r => {
      const left = typeof r[key] === 'string' && /T\d/.test(r[key]) ? new Date(r[key]).getTime() : r[key];
      const right = typeof value === 'string' && /T\d/.test(value) ? new Date(value).getTime() : value;
      return op === 'gte' ? left >= right : op === 'gt' ? left > right : op === 'lte' ? left <= right : left < right;
    }); });
    chain('or', (filter: string) => { rows = rows.filter(r => matchesOrFilter(r, filter)); });
    chain('order', (key, options) => { rows.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (options?.ascending === false ? -1 : 1)); });
    chain('limit', n => { rows = rows.slice(0, n); });
    chain('range', (start, end) => { rows = rows.slice(start, end + 1); });
    chain('single', () => { singular = true; });
    chain('maybeSingle', () => { singular = true; });
    chain('insert', value => { mutation = 'insert'; payload = Array.isArray(value) ? value : [value]; });
    chain('update', value => { mutation = 'update'; payload = [value]; });
    chain('delete', () => { mutation = 'delete'; });
    query.then = (resolve: (value: any) => any, reject?: (reason: unknown) => any) => {
      try {
        if (!executed) {
          executed = true;
          if (mutation === 'insert') {
            rows = payload.map(row => ({ ...row, id: row.id ?? crypto.randomUUID(), user_id: demoCompanyId(), company_id: demoCompanyId(), created_at: new Date().toISOString() }));
            source.push(...rows);
          } else if (mutation === 'update') rows.forEach(row => Object.assign(row, payload[0]));
          else if (mutation === 'delete') tables()[table] = source.filter(row => !rows.includes(row));
          result = ok(singular ? rows[0] ?? null : rows);
        }
        return Promise.resolve(result).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    };
    const facade: any = new Proxy(query, { get(target, key) { return key in target ? target[String(key)] : unsupported(`consulta ${String(key)}`); } });
    return facade;
  }
  function rpc(name: string, args: DemoRow = {}): any {
    const t = tables();
    let data: any;
    switch (name) {
      case 'list_company_pending_public_bookings': data = t.public_bookings.filter(b => b.status === 'pending'); break;
      case 'accept_public_booking_v2':
      case 'accept_public_booking': {
        const booking = t.public_bookings.find(b => b.id === args.p_booking_id);
        if (!booking) return unsupported('solicitação pública não encontrada');
        booking.status = 'confirmed';
        const serviceList = t.services.filter(s => (booking.service_ids ?? []).includes(s.id));
        const serviceNames = serviceList.map(s => s.name).join(', ') || 'Serviço';
        let client = t.clients.find(c => c.phone === booking.customer_phone || c.name === booking.customer_name);
        if (!client) {
          client = { id: crypto.randomUUID(), user_id: demoCompanyId(), company_id: demoCompanyId(), name: booking.customer_name, phone: booking.customer_phone ?? '', email: null, photo_url: null, is_active: true };
          t.clients.push(client);
        }
        const appointment = {
          id: crypto.randomUUID(),
          user_id: demoCompanyId(),
          company_id: demoCompanyId(),
          client_id: client.id,
          clients: client,
          professional_id: booking.professional_id ?? t.team_members[0].id,
          service: serviceNames,
          price: booking.total_price ?? serviceList.reduce((sum, s) => sum + Number(s.price), 0),
          duration_minutes: booking.duration_minutes ?? 30,
          appointment_time: booking.appointment_time,
          completed_at: null,
          status: 'Confirmed',
          origin: 'booking',
          notes: booking.notes ?? '',
          payment_method: null,
          public_booking_id: booking.id,
        };
        t.appointments.push(appointment);
        data = [{ appointment_id: appointment.id, service_names: serviceNames }];
        break;
      }
      case 'reject_public_booking_v2':
      case 'reject_public_booking': {
        const booking = t.public_bookings.find(b => b.id === args.p_booking_id);
        if (!booking) return unsupported('solicitação pública não encontrada');
        booking.status = 'cancelled';
        data = null;
        break;
      }
      case 'get_public_profile_by_slug': data = t.profiles[0]; break;
      case 'get_public_business_settings_json': data = t.business_settings[0]; break;
      case 'get_public_services_catalog': data = t.services; break;
      case 'get_public_categories_catalog': data = t.service_categories; break;
      case 'get_public_team_catalog': data = t.team_members; break;
      case 'get_public_products_catalog': case 'get_public_gallery_catalog': case 'get_full_dates_v2': case 'get_full_dates': case 'get_active_booking_by_phone': case 'get_public_client_by_phone': case 'get_client_booking_cancellations': data = []; break;
      case 'get_available_slots_v2': case 'get_available_slots': data = demoSlots(t, args); break;
      case 'get_first_available_professional': data = t.team_members[0].id; break;
      case 'create_secure_booking': {
        const service = t.services.filter(s => (args.p_service_ids ?? []).includes(s.id));
        let client = t.clients.find(c => c.id === args.p_client_id);
        if (!client) { client = { id: crypto.randomUUID(), user_id: demoCompanyId(), name: args.p_customer_name, phone: '' }; t.clients.push(client); }
        const row = { id: crypto.randomUUID(), user_id: demoCompanyId(), company_id: demoCompanyId(), client_id: client.id, clients: client, service: service.map(s => s.name).join(', '), price: args.p_price ?? args.p_total_price ?? service.reduce((sum, s) => sum + s.price, 0), duration_minutes: args.p_duration_min ?? 30, professional_id: args.p_professional_id, appointment_time: args.p_appointment_time, status: 'Confirmed', origin: 'internal' };
        t.appointments.push(row); data = { success: true, booking_id: row.id }; break;
      }
      case 'upsert_public_client': {
        const row = { id: crypto.randomUUID(), business_id: demoCompanyId(), name: args.p_name, phone: args.p_phone, photo_url: null };
        t.public_clients.push(row); data = [row]; break;
      }
      case 'create_public_booking': {
        const row = { id: crypto.randomUUID(), business_id: demoCompanyId(), customer_name: args.p_customer_name, customer_phone: args.p_customer_phone, appointment_time: args.p_appointment_time, professional_id: args.p_professional_id, service_ids: args.p_service_ids, total_price: args.p_total_price, duration_minutes: args.p_duration_minutes, status: 'pending', created_at: new Date().toISOString() };
        t.public_bookings.push(row); data = [row]; break;
      }
      case 'get_finance_stats': {
        const records = t.finance_records.filter(r => { const day = getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo'); return day >= String(args.p_start_date).slice(0, 10) && day <= String(args.p_end_date).slice(0, 10) && (!args.p_professional_id || r.professional_id === args.p_professional_id); }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const revenue = records.reduce((sum, r) => sum + r.revenue, 0);
        const expenses = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.expense, 0);
        const revenueByMethod = Object.fromEntries(['pix', 'dinheiro', 'cartao'].map(method => [method, records.filter(r => r.type === 'revenue' && r.payment_method === method).reduce((sum, r) => sum + r.revenue, 0)]));
        data = { total_revenue: revenue, total_expenses: expenses, net_profit: revenue - expenses, total_appointments: records.filter(r => r.type === 'revenue').length, revenue_by_method: revenueByMethod, transactions: records }; break;
      }
      case 'get_chair_hour_v1': {
        const month = args.p_month.slice(0, 7);
        const today = getDateStringInTimeZone(new Date(), 'America/Sao_Paulo');
        const [year, monthNumber] = month.split('-').map(Number);
        const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
        const end = args.p_end_date ?? (today.startsWith(month) ? today : `${month}-${String(lastDay).padStart(2, '0')}`);
        const days = Number(end.slice(8, 10));
        const metric = (professionalId?: string) => {
          const records = t.finance_records.filter(r => {
            const day = getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo');
            return r.type === 'revenue' && day.startsWith(month) && day <= end && (!professionalId || r.professional_id === professionalId);
          });
          const worked = records.reduce((sum, r) => sum + Number(t.services.find(service => service.name === r.service_name)?.duration_minutes ?? 30), 0);
          const revenue = records.reduce((sum, r) => sum + r.revenue, 0);
          const available = worked ? Math.round(worked / 0.62) : days * 12 * 60 * (professionalId ? 1 : t.team_members.length);
          const expenses = t.finance_records.filter(r => r.type === 'expense' && r.created_at.slice(0, 7) === month).reduce((sum, r) => sum + r.expense, 0) / (professionalId ? t.team_members.length : 1);
          const commission = records.reduce((sum, r) => sum + r.commission_value, 0);
          const costPerHour = worked ? (expenses + commission) / (available / 60) : null;
          return { available_minutes: available, worked_minutes: worked, estimated_count: records.length, revenue_per_worked_hour: worked ? revenue / (worked / 60) : null, revenue_per_available_hour: revenue / (available / 60), occupancy: worked / available, cost_per_hour: costPerHour, margin_per_hour: costPerHour === null ? null : revenue / (available / 60) - costPerHour, idle_cost: worked ? (available - worked) / available * expenses : null };
        };
        data = { month: args.p_month, role: 'owner', professionals: t.team_members.filter(p => !args.p_professional_id || p.id === args.p_professional_id).map(p => ({ id: p.id, name: p.name, ...metric(p.id) })), total: metric(), services: [], services_pending_count: 0, history_estimated: false, unassigned_attendance_count: 0 }; break;
      }
      case 'get_staff_performance_v1': data = demoPerformance(t, args); break;
      case 'get_commission_cycle_v1': {
        const today = getDateStringInTimeZone(new Date(), 'America/Sao_Paulo');
        const start = today.slice(0, 8) + '01';
        const members = t.team_members.map(member => {
          const pending = t.finance_records.filter(r => r.type === 'revenue' && r.professional_id === member.id && !r.commission_paid && r.commission_value > 0);
          const inCycle = pending.filter(r => getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo') >= start);
          const previous = pending.filter(r => getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo') < start);
          const sum = (rows: DemoRow[]) => Math.round(rows.reduce((acc, r) => acc + Number(r.commission_value), 0) * 100) / 100;
          const first = pending.map(r => getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo')).sort()[0] ?? null;
          return { professional_id: member.id, name: member.name, photo_url: null, inactive: false, commission_rate: member.is_owner ? 0 : 40, a_pagar_ciclo: sum(inCycle), saldo_acumulado: sum(pending), saldo_anterior: sum(previous), primeiro_nao_pago: first, servicos_ciclo: inCycle.length, produtos_ciclo: 0, pago_ciclo: 0, pago_ciclo_em: null, pago_calculado: 0, status: pending.length ? 'pendente' : 'nada_a_pagar', ultimo_pagamento: null };
        });
        data = { cycle: { start, end: today, open: true }, settlement_day: 5, tz: 'America/Sao_Paulo', currency: 'BRL', previous_end: start, next_end: today, members, totals: { a_pagar_ciclo: members.reduce((acc, m) => acc + m.a_pagar_ciclo, 0), pendentes: members.filter(m => m.status === 'pendente').length, pago_ciclo: 0 } }; break;
      }
      case 'get_checkout_products_v1': data = []; break;
      case 'update_queue_status': {
        const row = t.queue_entries.find(entry => entry.id === args.p_entry_id);
        if (!row) return unsupported('cliente da fila não encontrado');
        row.status = args.p_status;
        if (args.p_status === 'calling') row.called_at = new Date().toISOString();
        if (args.p_status === 'serving') row.serving_at = new Date().toISOString();
        data = null; break;
      }
      case 'get_monthly_finance_history': data = []; break;
      case 'log_error': case 'generate_commission_reminders_v1': data = null; break;
      case 'fetch_queue_settings': data = { queueMode: 'shared', allowLeave: true, lateMinutes: 5 }; break;
      default: return unsupported(`RPC ${name}`);
    }
    return Promise.resolve(ok(data));
  }
  const channel = () => { const c = { on: () => c, subscribe: () => c, unsubscribe: () => Promise.resolve() }; return c; };
  const auth = new Proxy({ getSession: async () => ({ data: { session: null }, error: null }), getUser: async () => ({ data: { user: { id: demoCompanyId() } }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) }, { get(target, key) { return key in target ? target[key as keyof typeof target] : unsupported(`auth.${String(key)}`); } });
  const storage = { from: (_bucket: string) => new Proxy({}, { get: (_target, key) => unsupported(`storage.${String(key)}`) }) };
  const client = { from, rpc, auth, storage, channel, removeChannel: async () => 'ok', removeAllChannels: async () => [] };
  return new Proxy(client, { get(target, key) { return key in target ? target[key as keyof typeof target] : unsupported(String(key)); } });
}
