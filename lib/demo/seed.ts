import { demoCompanyId } from './mode';

export type DemoRow = Record<string, any>;
export type DemoTables = Record<string, DemoRow[]>;
const id = (niche: string, n: number) => `d0000000-0000-4000-${niche === 'beauty' ? '8002' : '8001'}-${String(n).padStart(12, '0')}`;

export function createDemoSeed(niche: 'barber' | 'beauty'): DemoTables {
  const beauty = niche === 'beauty';
  const company = demoCompanyId(niche);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const at = (hour: number, day = date) => `${day}T${String(hour).padStart(2, '0')}:00:00-03:00`;
  const common = { user_id: company, company_id: company, business_id: company };
  const category = id(niche, 10);
  const services = (beauty ? [['Corte e finalização', 120, 60], ['Escova', 80, 45], ['Coloração', 220, 90]] : [['Corte masculino', 45, 30], ['Barba', 35, 30], ['Corte + barba', 75, 60]])
    .map(([name, price, duration_minutes], i) => ({ ...common, id: id(niche, 20 + i), name, price, duration_minutes, category_id: category, active: true, description: null, image_url: null }));
  const team = (beauty ? ['Marina Costa', 'Luiza Martins', 'Ana Ribeiro'] : ['Rafael Costa', 'Lucas Mendes', 'André Lima']).map((name, i) => ({ ...common, id: id(niche, 30 + i), name, active: true, is_owner: i === 0, commission_rate: 40, photo_url: null, staff_user_id: i === 0 ? company : null, specialties: [], work_schedule: null }));
  const clients = (beauty ? ['Beatriz Souza', 'Clara Ferreira', 'Juliana Alves', 'Camila Santos', 'Helena Lima', 'Isabela Rocha'] : ['Pedro Souza', 'Gabriel Ferreira', 'João Alves', 'Bruno Santos', 'Felipe Lima', 'Diego Rocha']).map((name, i) => ({ ...common, id: id(niche, 40 + i), name, phone: '', email: null, photo_url: null }));
  const appointments = Array.from({ length: 9 }, (_, i) => {
    const service = services[i % services.length];
    const client = clients[i % clients.length];
    return { ...common, id: id(niche, 60 + i), client_id: client.id, clients: client, professional_id: team[i % team.length].id, service: service.name, price: service.price, duration_minutes: service.duration_minutes, appointment_time: at(9 + Math.floor(i / 3) * 2), status: i < 3 ? 'Completed' : 'Confirmed', origin: 'internal', notes: '', payment_method: i < 3 ? 'pix' : null, public_booking_id: null };
  });
  const finance = Array.from({ length: 24 }, (_, i) => {
    const service = services[i % 3];
    const when = new Date(`${date}T15:00:00-03:00`);
    when.setDate(Math.max(1, when.getDate() - Math.floor(i / 3)));
    return { ...common, id: id(niche, 100 + i), type: 'revenue', revenue: service.price, amount: service.price, commission_value: Number(service.price) * 0.4, expense: 0, professional_id: team[i % 3].id, barber_name: team[i % 3].name, client_name: clients[i % 6].name, service_name: service.name, created_at: when.toISOString(), commission_paid: false, status: 'paid', payment_method: i % 2 ? 'pix' : 'cash' };
  });
  const settings = { ...common, id: id(niche, 1), business_hours: Object.fromEntries(Array.from({ length: 7 }, (_, d) => [['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d], { isOpen: true, blocks: [{ start: '08:00', end: '20:00' }] }])), timezone: 'America/Sao_Paulo', onboarding_completed: true, onboarding_step: 5, commission_settlement_day_of_month: 5, payment_day: 5, machine_fee_enabled: false, debit_fee_percent: 0, credit_fee_percent: 0, public_products_enabled: false, enable_self_rescheduling: true, online_booking_requires_approval: true, staff_appointment_edit_scope: 'own', staff_agenda_block_scope: 'own', client_cancel_cutoff_hours: 2 };
  const profile = { ...common, id: company, business_name: beauty ? 'Studio Aurora' : 'Barbearia Corte Fino', full_name: team[0].name, user_type: niche, role: 'owner', region: 'BR', tutorial_completed: true, subscription_status: 'active', business_slug: `simulacao-${niche}`, public_booking_enabled: true, booking_lead_time_hours: 0, booking_lead_time_minutes: 0, logo_url: null, cover_photo_url: `/landing/${beauty ? 'salon' : 'barber'}-800.webp`, address_street: null, phone: null, monthly_goal: 10000 };
  return { profiles: [profile], business_settings: [settings], services, service_categories: [{ ...common, id: category, name: beauty ? 'Cabelo' : 'Barbearia' }], team_members: team, clients, appointments, finance_records: finance, notifications: [], onboarding_progress: [{ company_id: company, is_completed: true }], agenda_blocks: [], public_bookings: [], public_clients: [], appointment_reschedules: [], products: [], appointment_products: [], product_sales: [], team_member_services: [], client_dependents: [], queue_entries: clients.slice(0, 2).map((client, i) => ({ ...common, id: id(niche, 150 + i), client_id: client.id, client_name: client.name, client_phone: '', customer_name: client.name, status: 'waiting', position: i + 1, joined_at: at(10), service_ids: [services[0].id], service_name: services[0].name, estimated_duration: 30, professional_id: null, total_price: services[0].price, payment_status: 'unpaid', created_at: at(10) })) };
}
