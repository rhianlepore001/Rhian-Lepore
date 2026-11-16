import { beforeEach, expect, it } from 'vitest';
import { createDemoClient } from '../../lib/demo/client';
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
