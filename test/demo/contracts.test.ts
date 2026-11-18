import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoClient } from '../../lib/demo/client';
import { createDemoSeed } from '../../lib/demo/seed';
import { fetchAvailableSlots } from '../../services/publicBooking';
import { demoCompanyId } from '../../lib/demo/mode';
import { createAppointment } from '../../services/scheduling';
import { staffPerformanceResultSchema } from '../../types/staffPerformance';

beforeEach(() => { window.location.hash = '#/demo/barber'; });
it('oferece horários no contrato usado pelo agendamento público real', async () => {
  const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const result = await fetchAvailableSlots(demoCompanyId(), day, null, 30);
  expect(result.slots.length).toBeGreaterThan(0);
  expect(result.slots.every(time => /^\d{2}:\d{2}$/.test(time))).toBe(true);
});
it('cria um atendimento apenas em memória e não o preserva em novo seed', async () => {
  const client = createDemoClient();
  const services = (await client.from('services').select('*')).data;
  const professional = (await client.from('team_members').select('*')).data[0];
  const date = new Date(Date.now() + 86400000).toISOString();
  const result = await client.rpc('create_secure_booking', { p_customer_name: 'Cliente local', p_service_ids: [services[0].id], p_professional_id: professional.id, p_appointment_time: date, p_total_price: 45, p_duration_min: 30 });
  const stored = await client.from('appointments').select('*').eq('id', result.data.booking_id).single();
  expect(stored.data.clients.name).toBe('Cliente local');
  expect(stored.data.duration_minutes).toBe(30);
  expect((await createDemoClient().from('appointments').select('*').eq('id', result.data.booking_id)).data).toEqual([]);
});
it('valida hora de cadeira com o mesmo schema do produto', async () => {
  const { data } = await createDemoClient().rpc('get_staff_performance_v1', { p_start: '2026-11-01', p_end: '2026-11-30' });
  expect(staffPerformanceResultSchema.safeParse(data).success).toBe(true);
});
it('oferece hora de cadeira no contrato consultado pela tela real', async () => {
  const { data } = await createDemoClient().rpc('get_chair_hour_v1', { p_month: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7) + '-01' });
  expect(data.professionals).toHaveLength(3);
  expect(data.total.worked_minutes).toBeGreaterThan(0);
  expect(data.total.revenue_per_worked_hour).toBeGreaterThan(0);
});

it('retorna confirmação no contrato do wizard real', async () => {
  const client = createDemoClient();
  const professional = (await client.from('team_members').select('*')).data[0];
  const services = (await client.from('services').select('*')).data;
  const result = await createAppointment({ companyId: demoCompanyId(), professionalId: professional.id, customerName: 'Cliente do wizard', appointmentTime: new Date(Date.now() + 86400000), serviceIds: [services[0].id], totalPrice: 45, durationMinutes: 30, status: 'Confirmed' });
  expect(result).toMatchObject({ success: true, booking_id: expect.any(String) });
});
it('respeita o período selecionado na performance e na hora de cadeira', async () => {
  const client = createDemoClient();
  const performance = await client.rpc('get_staff_performance_v1', { p_start: '2001-01-01', p_end: '2001-01-31' });
  expect(performance.data.team_totals.receita_servicos).toBe(0);
  const chair = await client.rpc('get_chair_hour_v1', { p_month: '2001-01-01' });
  expect(chair.data.total.worked_minutes).toBe(0);
});

it('apresenta dados fictícios coerentes na demonstração', async () => {
  const client = createDemoClient();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const { data: chair } = await client.rpc('get_chair_hour_v1', { p_month: `${today.slice(0, 7)}-01` });
  const dayOfMonth = Number(today.slice(8, 10));
  expect(chair.total.estimated_count).toBeGreaterThanOrEqual(Math.max(3, dayOfMonth * 4));
  expect(chair.total.estimated_count).toBeLessThanOrEqual(dayOfMonth * 8 + 10);
  expect(chair.total.occupancy).toBeGreaterThanOrEqual(0.55);
  expect(chair.total.occupancy).toBeLessThanOrEqual(0.7);
  expect(chair.total.revenue_per_available_hour).toBeGreaterThanOrEqual(45);
  expect(chair.total.revenue_per_available_hour).toBeLessThanOrEqual(90);
  expect(chair.total.margin_per_hour).toBeGreaterThan(0);
  const { data: records } = await client.from('finance_records').select('*');
  expect(records.some((row: any) => row.type === 'expense' && row.expense > 0)).toBe(true);
  expect(records.map((row: any) => row.payment_method)).toEqual(expect.arrayContaining(['pix', 'dinheiro', 'cartao']));
  const stats = await client.rpc('get_finance_stats', { p_start_date: `${today.slice(0, 7)}-01T00:00:00Z`, p_end_date: `${today.slice(0, 7)}-28T23:59:59Z` });
  expect(Object.values(stats.data.revenue_by_method).every(value => Number(value) > 0)).toBe(true);
  const { data: services } = await client.from('services').select('*');
  expect(services.every((service: any) => typeof service.image_url === 'string' && service.image_url.startsWith('/demo/'))).toBe(true);
  const { data: gallery } = await client.rpc('get_public_gallery_catalog', { p_business_id: demoCompanyId() });
  expect(gallery).toHaveLength(12);
  expect(gallery.every((item: any) => typeof item.image_url === 'string' && item.image_url.startsWith('/demo/'))).toBe(true);
  const { data: queue } = await client.from('queue_entries').select('*');
  const activeQueue = queue.filter((entry: any) => entry.status !== 'completed');
  expect(activeQueue.length).toBeGreaterThan(0);
  expect(activeQueue.every((entry: any) => Date.now() - new Date(entry.joined_at).getTime() < 60 * 60 * 1000)).toBe(true);
  expect(queue.filter((entry: any) => entry.status === 'completed').length).toBeGreaterThan(0);
});

describe('comparação mensal e fila concluída ao longo do mês', () => {
  it.each([1, 2, 7, 15, 28, 31])('mantém faturamento positivo vs mês anterior e fila sem futuro no dia %d', (day) => {
    vi.useFakeTimers();
    try {
      const now = new Date(`2026-08-${String(day).padStart(2, '0')}T12:30:00Z`);
      vi.setSystemTime(now);
      const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

      for (const niche of ['barber', 'beauty'] as const) {
        const seed = createDemoSeed(niche);
        const currentRevenue = seed.finance_records
          .filter(r => r.type === 'revenue' && dayKey(r.created_at).startsWith('2026-08'))
          .reduce((sum, r) => sum + Number(r.revenue), 0);
        const previousRevenue = seed.finance_records
          .filter(r => r.type === 'revenue' && dayKey(r.created_at).startsWith('2026-07'))
          .reduce((sum, r) => sum + Number(r.revenue), 0);

        expect(currentRevenue, `${niche} dia ${day} mês atual`).toBeGreaterThan(0);
        expect(previousRevenue, `${niche} dia ${day} mês anterior`).toBeGreaterThan(0);
        expect(currentRevenue, `${niche} dia ${day} crescimento positivo`).toBeGreaterThan(previousRevenue);

        const completedQueue = seed.queue_entries.filter(q => q.status === 'completed');
        expect(completedQueue.length).toBeGreaterThan(0);
        for (const entry of completedQueue) {
          expect(new Date(entry.completed_at).getTime()).toBeLessThanOrEqual(now.getTime());
        }
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
