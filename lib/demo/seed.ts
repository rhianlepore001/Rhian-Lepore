import { demoCompanyId } from './mode';

export type DemoRow = Record<string, any>;
export type DemoTables = Record<string, DemoRow[]>;
const id = (niche: string, n: number) => `d0000000-0000-4000-${niche === 'beauty' ? '8002' : '8001'}-${String(n).padStart(12, '0')}`;
export const DEMO_TIME_ZONE = 'America/Sao_Paulo';

/** Gerador determinístico: a simulação precisa ser igual em cada recarga e em cada captura. */
const random = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const dayString = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_TIME_ZONE }).format(date);
const shiftDay = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return dayString(date);
};
const at = (day: string, hour: number, minute = 0) => new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`).toISOString();

const catalog = {
  barber: {
    business: 'Barbearia Corte Fino',
    category: 'Barbearia',
    folder: 'barbearia',
    services: [
      ['Corte masculino', 45, 30, 'servico-corte-masculino.webp'],
      ['Barba', 35, 30, 'servico-barba.webp'],
      ['Corte + barba', 75, 60, 'servico-corte-barba.webp'],
      ['Sobrancelha', 20, 15, 'servico-sobrancelha.webp'],
      ['Pigmentação', 60, 45, 'servico-pigmentacao.webp'],
      ['VIP (Corte + Barba + Sobrancelha)', 90, 75, 'servico-vip-corte-barba-sobrancelha.webp'],
    ],
    team: ['Rafael Costa', 'Lucas Mendes', 'André Lima'],
    clients: ['Pedro Souza', 'Gabriel Ferreira', 'João Alves', 'Bruno Santos', 'Felipe Lima', 'Diego Rocha', 'Matheus Oliveira', 'Thiago Carvalho', 'Rodrigo Nunes', 'Caio Martins', 'Vinícius Araújo', 'Leonardo Dias', 'Henrique Barros', 'Eduardo Pires'],
  },
  beauty: {
    business: 'Studio Aurora',
    category: 'Cabelo',
    folder: 'salao',
    services: [
      ['Corte feminino', 120, 60, 'servico-corte-feminino.webp'],
      ['Escova', 80, 45, 'servico-escova.webp'],
      ['Coloração', 220, 90, 'servico-coloracao.webp'],
      ['Mechas / Luzes', 320, 120, 'servico-mechas-luzes.webp'],
      ['Hidratação', 90, 45, 'servico-hidratacao.webp'],
      ['Manicure', 55, 45, 'servico-manicure.webp'],
      ['Pedicure', 65, 45, 'servico-pedicure.webp'],
      ['Design de sobrancelha', 50, 30, 'servico-design-de-sobrancelha.webp'],
      ['Extensão de cílios', 180, 90, 'servico-extensao-de-cilios.webp'],
      ['Maquiagem', 190, 60, 'servico-maquiagem.webp'],
    ],
    team: ['Marina Costa', 'Luiza Martins', 'Ana Ribeiro'],
    clients: ['Beatriz Souza', 'Clara Ferreira', 'Juliana Alves', 'Camila Santos', 'Helena Lima', 'Isabela Rocha', 'Larissa Oliveira', 'Fernanda Carvalho', 'Mariana Nunes', 'Patrícia Martins', 'Renata Araújo', 'Sofia Dias', 'Amanda Barros', 'Letícia Pires'],
  },
} as const;

export function createDemoSeed(niche: 'barber' | 'beauty'): DemoTables {
  const beauty = niche === 'beauty';
  const data = catalog[niche];
  const company = demoCompanyId(niche);
  const now = new Date();
  const today = dayString(now);
  const rand = random(beauty ? 7 : 3);
  const common = { user_id: company, company_id: company, business_id: company };
  const category = id(niche, 10);
  const services = data.services.map(([name, price, duration_minutes, image], i) => ({ ...common, id: id(niche, 20 + i), name, price, duration_minutes, category_id: category, active: true, description: null, image_url: `/demo/${data.folder}/${image}` }));
  const team = data.team.map((name, i) => ({ ...common, id: id(niche, 30 + i), name, active: true, is_owner: i === 0, commission_rate: 40, photo_url: null, staff_user_id: i === 0 ? company : null, specialties: [], work_schedule: null, deleted_at: null, email: null, phone: null, display_order: i }));
  // Telefones claramente fictícios para a simulação.
  const phone = (i: number) => `11 90000-${String(i + 1).padStart(4, '0')}`;
  const clients = data.clients.map((name, i) => ({ ...common, id: id(niche, 40 + i), name, phone: phone(i), email: null, photo_url: null, birth_date: i === 2 ? `${today.slice(0, 4)}-${today.slice(5, 7)}-${String(Math.min(28, Number(today.slice(8, 10)) + 3)).padStart(2, '0')}` : null, notes: null, is_active: true, created_at: at(shiftDay(today, -120 + i * 6), 10) }));

  const monthStart = `${today.slice(0, 7)}-01`;
  const currentMonth = today.slice(0, 7);
  const previousMonth = shiftDay(monthStart, -1).slice(0, 7);

  // Visitas históricas: alguns clientes frequentes, alguns novos e alguns inativos há mais de 35 dias.
  const appointments: DemoRow[] = [];
  const finance: DemoRow[] = [];
  let sequence = 60;
  const completed = (clientIndex: number, day: string, hour: number, minute: number, serviceIndex: number, memberIndex: number, includeFinance = true) => {
    const service = services[serviceIndex % services.length];
    const client = clients[clientIndex];
    const member = team[memberIndex % team.length];
    const time = at(day, hour, minute);
    const method = ['pix', 'cartao', 'dinheiro'][sequence % 3];
    const appointment = { ...common, id: id(niche, sequence), client_id: client.id, clients: client, professional_id: member.id, service: service.name, price: service.price, duration_minutes: service.duration_minutes, appointment_time: time, completed_at: time, status: 'Completed', origin: sequence % 4 === 0 ? 'public' : 'internal', notes: '', payment_method: method, public_booking_id: null };
    appointments.push(appointment);
    if (includeFinance) {
      finance.push({ ...common, id: id(niche, 1000 + sequence), appointment_id: appointment.id, type: 'revenue', revenue: service.price, amount: service.price, commission_value: member.is_owner ? 0 : Number(service.price) * 0.4, expense: 0, professional_id: member.id, barber_name: member.name, client_name: client.name, service_name: service.name, created_at: time, commission_paid: false, status: 'paid', payment_method: method, description: service.name });
    }
    sequence++;
  };
  const profiles: Array<[number, number, number]> = [
    [0, 14, 10], [1, 21, 9], [2, 12, 18], [3, 28, 6], [4, 10, 9], [5, 18, 8],
    [6, 40, 4], [7, 52, 5], [8, 61, 3], [9, 75, 4], [10, 7, 2], [11, 3, 1], [12, 24, 7], [13, 47, 3],
  ];
  for (const [clientIndex, lastVisitDaysAgo, visits] of profiles) {
    for (let v = 0; v < visits; v++) {
      const day = shiftDay(today, -lastVisitDaysAgo - Math.round(v * (18 + rand() * 14)));
      if (day < shiftDay(today, -365)) break;
      // O faturamento do mês anterior é preenchido proporcionalmente após fechar o mês atual.
      completed(clientIndex, day, 9 + Math.floor(rand() * 10), rand() < .5 ? 0 : 30, (clientIndex + v) % services.length, (clientIndex + v) % team.length, !day.startsWith(previousMonth));
    }
  }
  // Movimento diário do mês corrente, preservando os clientes inativos (6..9, 13).
  const activeClients = [0, 1, 2, 3, 4, 5, 10, 11, 12];
  const currentDayOfMonth = Number(today.slice(8, 10));
  for (let offset = 1; offset < currentDayOfMonth; offset++) {
    const day = shiftDay(today, -offset);
    const weekday = new Date(`${day}T12:00:00-03:00`).getUTCDay();
    if (weekday === 0) continue;
    const baseVolume = weekday === 6 ? 7 : 5 + (offset % 2);
    for (let n = 0; n < baseVolume; n++) {
      completed(
        activeClients[(offset + n) % activeClients.length],
        day,
        9 + Math.floor(n * 1.4),
        n % 2 ? 30 : 0,
        (offset + n) % services.length,
        n % team.length,
      );
    }
  }

  // O dia de hoje: atendimentos concluídos mais cedo (garante receita > 0 no início) e os próximos confirmados.
  const nowMinutes = Number(new Intl.DateTimeFormat('en-GB', { timeZone: DEMO_TIME_ZONE, hour: '2-digit', hour12: false }).format(now)) * 60 + Number(new Intl.DateTimeFormat('en-GB', { timeZone: DEMO_TIME_ZONE, minute: '2-digit' }).format(now));
  const morningCompleted: Array<[number, number, number, number]> = [[8, 0, 0, 0], [8, 30, 1, 1], [9, 0, 2, 2]];
  for (const [hour, minute, clientIndex, memberIndex] of morningCompleted) {
    completed(clientIndex, today, hour, minute, clientIndex % services.length, memberIndex);
  }
  const todayPlan: Array<[number, number, number, number]> = [[10, 0, 3, 0], [10, 30, 4, 1], [11, 30, 5, 2], [13, 0, 0, 0], [14, 0, 10, 1], [15, 0, 1, 2], [16, 0, 12, 0], [17, 0, 2, 1], [18, 0, 4, 2], [18, 30, 11, 0]];
  for (const [hour, minute, clientIndex, memberIndex] of todayPlan) {
    const time = at(today, hour, minute);
    if (hour * 60 + minute + 30 < nowMinutes) { completed(clientIndex, today, hour, minute, clientIndex % services.length, memberIndex); continue; }
    const service = services[clientIndex % services.length];
    const client = clients[clientIndex];
    appointments.push({ ...common, id: id(niche, sequence++), client_id: client.id, clients: client, professional_id: team[memberIndex].id, service: service.name, price: service.price, duration_minutes: service.duration_minutes, appointment_time: time, completed_at: null, status: 'Confirmed', origin: hour % 2 ? 'public' : 'internal', notes: '', payment_method: null, public_booking_id: null });
  }

  // Mês anterior proporcional (~85% do faturamento do mês atual) para comparação sempre positiva e realista.
  const currentMonthRevenue = finance
    .filter(r => r.type === 'revenue' && dayString(new Date(r.created_at)).startsWith(currentMonth))
    .reduce((sum, r) => sum + Number(r.revenue), 0);
  const targetPrevRevenue = Math.max(0, Math.round(currentMonthRevenue * 0.85));
  const prevDays = Array.from({ length: 28 }, (_, i) => `${previousMonth}-${String(i + 1).padStart(2, '0')}`)
    .filter(d => new Date(`${d}T12:00:00-03:00`).getUTCDay() !== 0);
  let prevRevenue = 0;
  let prevIndex = 0;
  while (prevRevenue < targetPrevRevenue && prevIndex < 400) {
    const remaining = targetPrevRevenue - prevRevenue;
    const candidate = services[prevIndex % services.length];
    const fitting = Number(candidate.price) <= remaining
      ? candidate
      : services.find(s => Number(s.price) <= remaining);
    if (!fitting) break;
    const serviceIndex = services.indexOf(fitting);
    const day = prevDays[prevIndex % prevDays.length];
    const slotInDay = Math.floor(prevIndex / prevDays.length);
    completed(
      activeClients[prevIndex % activeClients.length],
      day,
      9 + (slotInDay % 10),
      slotInDay % 2 ? 30 : 0,
      serviceIndex,
      prevIndex % team.length,
    );
    prevRevenue += Number(fitting.price);
    prevIndex++;
  }
  // Amanhã e depois: agenda já com pedidos.
  for (const [dayOffset, hour, clientIndex, memberIndex] of [[1, 9, 3, 0], [1, 10, 11, 1], [1, 14, 4, 2], [1, 16, 9, 0], [2, 9, 0, 1], [2, 11, 13, 2], [2, 15, 2, 0]] as const) {
    const service = services[clientIndex % services.length];
    const client = clients[clientIndex];
    appointments.push({ ...common, id: id(niche, sequence++), client_id: client.id, clients: client, professional_id: team[memberIndex].id, service: service.name, price: service.price, duration_minutes: service.duration_minutes, appointment_time: at(shiftDay(today, dayOffset), hour), completed_at: null, status: 'Confirmed', origin: 'public', notes: '', payment_method: null, public_booking_id: null });
  }

  const expenses = [['Aluguel', 1800], ['Produtos', 620], ['Energia', 310], ['Internet', 120]].flatMap(([name, value], i) => [monthStart, `${previousMonth}-01`].map((day, m) => ({ ...common, id: id(niche, 1400 + i * 2 + m), type: 'expense', revenue: 0, amount: 0, commission_value: 0, expense: value, professional_id: null, barber_name: null, client_name: null, service_name: name, description: name, created_at: at(shiftDay(day, 4 + i), 12), commission_paid: true, status: 'paid', payment_method: null })));
  const settings = { ...common, id: id(niche, 1), business_hours: Object.fromEntries(Array.from({ length: 7 }, (_, d) => [['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d], d === 0 ? { isOpen: false, blocks: [] } : { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] }])), timezone: DEMO_TIME_ZONE, onboarding_completed: true, onboarding_step: 5, commission_settlement_day_of_month: 5, payment_day: 5, machine_fee_enabled: false, debit_fee_percent: 0, credit_fee_percent: 0, public_products_enabled: false, enable_self_rescheduling: true, online_booking_requires_approval: true, staff_appointment_edit_scope: 'own', staff_agenda_block_scope: 'own', client_cancel_cutoff_hours: 2 };
  const profile = { ...common, id: company, business_name: data.business, full_name: team[0].name, user_type: niche, role: 'owner', region: 'BR', tutorial_completed: true, subscription_status: 'active', business_slug: `simulacao-${niche}`, public_booking_enabled: true, booking_lead_time_hours: 0, booking_lead_time_minutes: 0, logo_url: `/demo/${data.folder}/perfil.webp`, cover_photo_url: `/demo/${data.folder}/capa.webp`, address_street: null, phone: null, monthly_goal: beauty ? 18000 : 9000 };
  const gallery = Array.from({ length: 12 }, (_, i) => ({ ...common, id: id(niche, 200 + i), image_url: `/demo/${data.folder}/galeria-${String(i + 1).padStart(2, '0')}.webp`, display_order: i }));
  const queueMinutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const queueActive = [
    { client: clients[7], status: 'serving', waited: 26, serviceIndex: 2, member: team[1] },
    { client: clients[9], status: 'waiting', waited: 14, serviceIndex: 0, member: null },
    { client: clients[11], status: 'waiting', waited: 6, serviceIndex: 1, member: null },
  ].map((entry, i) => ({ ...common, id: id(niche, 150 + i), client_id: entry.client.id, client_name: entry.client.name, client_phone: entry.client.phone, customer_name: entry.client.name, status: entry.status, position: i + 1, joined_at: queueMinutesAgo(entry.waited), called_at: entry.status === 'serving' ? queueMinutesAgo(entry.waited - 8) : null, serving_at: entry.status === 'serving' ? queueMinutesAgo(entry.waited - 10) : null, service_ids: [services[entry.serviceIndex].id], service_name: services[entry.serviceIndex].name, estimated_duration: services[entry.serviceIndex].duration_minutes, professional_id: entry.member?.id ?? null, total_price: services[entry.serviceIndex].price, payment_status: 'unpaid', payment_method: null, created_at: queueMinutesAgo(entry.waited) }));
  const queueServedCount = beauty ? 8 : 12;
  const todayStartMs = new Date(`${today}T00:00:00-03:00`).getTime();
  const queueCompleted = Array.from({ length: queueServedCount }, (_, i) => {
    const joinedAt = currentDayOfMonth > 1
      ? at(shiftDay(today, -(1 + (i % (currentDayOfMonth - 1)))), 10 + (i % 7), (i % 2) * 30)
      : new Date(Math.min(now.getTime(), Math.max(todayStartMs + i * 60_000, now.getTime() - (queueServedCount - i) * 12 * 60_000))).toISOString();
    const service = services[i % services.length];
    const client = clients[activeClients[i % activeClients.length]];
    const member = team[i % team.length];
    return { ...common, id: id(niche, 160 + i), client_id: client.id, client_name: client.name, client_phone: client.phone, customer_name: client.name, status: 'completed', position: i + 1, joined_at: joinedAt, called_at: joinedAt, serving_at: joinedAt, completed_at: joinedAt, service_ids: [service.id], service_name: service.name, estimated_duration: service.duration_minutes, professional_id: member.id, total_price: service.price, payment_status: 'paid', payment_method: ['pix', 'cartao', 'dinheiro'][i % 3], created_at: joinedAt };
  });
  const queue = [...queueActive, ...queueCompleted];
  const publicBookings = [[1, 10, 5, 0], [1, 15, 6, 2]].map(([dayOffset, hour, clientIndex, memberIndex], i) => ({ ...common, id: id(niche, 170 + i), customer_name: clients[clientIndex].name, customer_phone: clients[clientIndex].phone, appointment_time: at(shiftDay(today, dayOffset), hour), professional_id: team[memberIndex].id, service_ids: [services[(clientIndex + 1) % services.length].id], total_price: services[(clientIndex + 1) % services.length].price, duration_minutes: services[(clientIndex + 1) % services.length].duration_minutes, status: 'pending', is_edit: false, created_at: queueMinutesAgo(40 + i * 25), notes: null }));
  return { profiles: [profile], business_settings: [settings], services, service_categories: [{ ...common, id: category, name: data.category }], team_members: team, clients, appointments, finance_records: [...finance, ...expenses], notifications: [], onboarding_progress: [{ company_id: company, is_completed: true }], agenda_blocks: [], public_bookings: publicBookings, public_clients: [], appointment_reschedules: [], products: [], appointment_products: [], product_sales: [], team_member_services: [], client_dependents: [], goal_settings: [], client_photos: [], commission_payments: [], business_galleries: gallery, queue_entries: queue };
}
