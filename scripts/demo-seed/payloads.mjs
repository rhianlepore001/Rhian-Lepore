import { DEMO_MARKER, TIME_ZONE } from './constants.mjs';

const PAD = (value) => String(value).padStart(2, '0');

/** America/Sao_Paulo sem horário de verão desde 2019: offset fixo -03:00. */
export function zonedIso(year, month, day, hour, minute, offset = '-03:00') {
  return new Date(
    `${year}-${PAD(month)}-${PAD(day)}T${PAD(hour)}:${PAD(minute)}:00${offset}`,
  ).toISOString();
}

export function zonedParts(date, timeZone = TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function addDays(year, month, day, delta) {
  const utc = Date.UTC(year, month - 1, day + delta);
  const next = new Date(utc);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function shiftMonth(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

const TODAY_SLOTS = Object.freeze([
  { h: 9, min: 0, pro: 0, client: 0, service: 0, status: 'Completed', origin: 'agenda', payment: 'pix' },
  { h: 9, min: 30, pro: 1, client: 1, service: 1, status: 'Confirmed', origin: 'booking', payment: null },
  { h: 10, min: 0, pro: 2, client: 2, service: 2, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 10, min: 30, pro: 0, client: 3, service: 3, status: 'Completed', origin: 'agenda', payment: 'cash' },
  { h: 11, min: 0, pro: 1, client: 4, service: 0, status: 'NoShow', origin: 'agenda', payment: null },
  { h: 11, min: 30, pro: 2, client: 5, service: 4, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 14, min: 0, pro: 0, client: 6, service: 2, status: 'Pending', origin: 'booking', payment: null },
  { h: 14, min: 30, pro: 1, client: 7, service: 1, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 15, min: 30, pro: 2, client: 8, service: 5, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 16, min: 0, pro: 0, client: 9, service: 0, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 16, min: 30, pro: 1, client: 10, service: 2, status: 'Pending', origin: 'booking', payment: null },
  { h: 17, min: 0, pro: 2, client: 11, service: 1, status: 'Confirmed', origin: 'agenda', payment: null },
  { h: 18, min: 0, pro: 0, client: 12, service: 5, status: 'Confirmed', origin: 'agenda', payment: null },
]);

const PAST_SLOTS = Object.freeze([
  { daysAgo: 1, h: 10, min: 0, status: 'Completed', origin: 'agenda', payment: 'pix' },
  { daysAgo: 2, h: 15, min: 0, status: 'Completed', origin: 'queue', payment: 'credit' },
  { daysAgo: 3, h: 11, min: 0, status: 'Cancelled', origin: 'booking', payment: null },
  { daysAgo: 5, h: 16, min: 30, status: 'NoShow', origin: 'agenda', payment: null },
  { daysAgo: 8, h: 9, min: 30, status: 'Completed', origin: 'agenda', payment: 'debit' },
  { daysAgo: 12, h: 14, min: 0, status: 'Completed', origin: 'agenda', payment: 'cash' },
  { daysAgo: 20, h: 17, min: 0, status: 'Cancelled', origin: 'agenda', payment: null },
]);

const FUTURE_SLOTS = Object.freeze([
  { daysAhead: 1, h: 10, min: 0, status: 'Confirmed', origin: 'agenda' },
  { daysAhead: 1, h: 15, min: 30, status: 'Pending', origin: 'booking' },
  { daysAhead: 2, h: 11, min: 0, status: 'Confirmed', origin: 'agenda' },
  { daysAhead: 3, h: 16, min: 0, status: 'Confirmed', origin: 'booking' },
  { daysAhead: 5, h: 9, min: 30, status: 'Pending', origin: 'agenda' },
  { daysAhead: 7, h: 14, min: 0, status: 'Confirmed', origin: 'agenda' },
]);

function pick(list, index) {
  return list[index % list.length];
}

export function buildAppointmentRows({
  now = new Date(),
  timeZone = TIME_ZONE,
  tenantId,
  professionals,
  clients,
  services,
}) {
  if (!professionals.length || !clients.length || !services.length) {
    throw new Error('Agenda DEMO precisa de profissionais, clientes e serviços.');
  }
  const today = zonedParts(now, timeZone);
  const rows = [];

  for (const slot of TODAY_SLOTS) {
    const service = pick(services, slot.service);
    const professional = pick(professionals, slot.pro);
    const client = pick(clients, slot.client);
    rows.push({
      user_id: tenantId,
      client_id: client.id,
      professional_id: professional.id,
      service: service.name,
      appointment_time: zonedIso(today.year, today.month, today.day, slot.h, slot.min),
      price: service.price,
      total_price: service.price,
      duration_minutes: service.duration_minutes ?? service.duration ?? 30,
      status: slot.status,
      origin: slot.origin,
      payment_method: slot.payment,
      notes: slot.status === 'Confirmed' ? 'Cliente pediu degradê' : `${DEMO_MARKER} ${slot.status}`,
    });
  }

  PAST_SLOTS.forEach((slot, index) => {
    const when = addDays(today.year, today.month, today.day, -slot.daysAgo);
    const service = pick(services, index);
    const professional = pick(professionals, index + 1);
    const client = pick(clients, index + 3);
    rows.push({
      user_id: tenantId,
      client_id: client.id,
      professional_id: professional.id,
      service: service.name,
      appointment_time: zonedIso(when.year, when.month, when.day, slot.h, slot.min),
      price: service.price,
      total_price: service.price,
      duration_minutes: service.duration_minutes ?? service.duration ?? 30,
      status: slot.status,
      origin: slot.origin,
      payment_method: slot.payment,
      notes: `${DEMO_MARKER} passado`,
    });
  });

  FUTURE_SLOTS.forEach((slot, index) => {
    const when = addDays(today.year, today.month, today.day, slot.daysAhead);
    const service = pick(services, index + 2);
    const professional = pick(professionals, index);
    const client = pick(clients, index + 6);
    rows.push({
      user_id: tenantId,
      client_id: client.id,
      professional_id: professional.id,
      service: service.name,
      appointment_time: zonedIso(when.year, when.month, when.day, slot.h, slot.min),
      price: service.price,
      total_price: service.price,
      duration_minutes: service.duration_minutes ?? service.duration ?? 30,
      status: slot.status,
      origin: slot.origin,
      payment_method: null,
      notes: `${DEMO_MARKER} futuro`,
    });
  });

  return rows;
}

export function summarizeAppointments(rows, now = new Date(), timeZone = TIME_ZONE) {
  const today = zonedParts(now, timeZone);
  const todayPrefix = `${today.year}-${PAD(today.month)}-${PAD(today.day)}`;
  const todayRows = rows.filter((row) => isoDateInZone(row.appointment_time, timeZone) === todayPrefix);
  const statuses = {};
  for (const row of rows) {
    statuses[row.status] = (statuses[row.status] || 0) + 1;
  }
  return {
    total: rows.length,
    today: todayRows.length,
    statuses,
  };
}

export function isoDateInZone(iso, timeZone = TIME_ZONE) {
  const parts = zonedParts(new Date(iso), timeZone);
  return `${parts.year}-${PAD(parts.month)}-${PAD(parts.day)}`;
}

const EXPENSE_CATALOG = Object.freeze([
  { description: 'Aluguel do salão', amount: 2800, category: 'aluguel', method: 'pix' },
  { description: 'Energia elétrica', amount: 420, category: 'utilidades', method: 'debit' },
  { description: 'Produtos e insumos', amount: 680, category: 'estoque', method: 'pix' },
  { description: 'Internet e telefone', amount: 159, category: 'utilidades', method: 'credit' },
  { description: 'Material de limpeza', amount: 95, category: 'operacao', method: 'cash' },
]);

export function buildFinanceRows({
  now = new Date(),
  timeZone = TIME_ZONE,
  tenantId,
  professionals,
  clients,
  services,
}) {
  const today = zonedParts(now, timeZone);
  const rows = [];
  const months = [0, -1, -2].map((delta) => shiftMonth(today.year, today.month, delta));

  months.forEach((month, monthIndex) => {
    for (let i = 0; i < 8; i += 1) {
      const day = 2 + i * 3;
      const service = pick(services, i + monthIndex);
      const professional = pick(professionals, i);
      const client = pick(clients, i + monthIndex);
      const created = zonedIso(month.year, month.month, Math.min(day, 28), 11 + (i % 6), 0);
      rows.push({
        user_id: tenantId,
        type: 'revenue',
        revenue: service.price,
        commission_value: 0,
        commission_rate: 0,
        description: service.name,
        payment_method: ['pix', 'cash', 'debit', 'credit', 'membership'][i % 5],
        professional_id: professional.id,
        barber_name: professional.name,
        client_name: client.name,
        service_name: service.name,
        appointment_id: null,
        due_date: null,
        commission_paid: true,
        status: 'paid',
        category: 'servico',
        created_at: created,
      });
    }

    EXPENSE_CATALOG.forEach((expense, index) => {
      if (monthIndex === 2 && index > 2) return;
      const created = zonedIso(month.year, month.month, 5 + index * 4, 9, 0);
      rows.push({
        user_id: tenantId,
        type: 'expense',
        revenue: 0,
        commission_value: expense.amount,
        commission_rate: 0,
        description: expense.description,
        payment_method: expense.method,
        professional_id: null,
        barber_name: 'Manual',
        client_name: '',
        service_name: expense.description,
        appointment_id: null,
        due_date: created,
        commission_paid: index !== 0,
        status: index === 0 ? 'pending' : 'paid',
        category: expense.category,
        created_at: created,
      });
    });
  });

  return rows;
}

export function financeMonthSpan(rows, timeZone = TIME_ZONE) {
  const keys = new Set(rows.map((row) => {
    const parts = zonedParts(new Date(row.created_at), timeZone);
    return `${parts.year}-${PAD(parts.month)}`;
  }));
  return [...keys].sort();
}

export function buildQueueRows({
  now = new Date(),
  timeZone = TIME_ZONE,
  tenantId,
  professionals,
  clients,
  services,
}) {
  const today = zonedParts(now, timeZone);
  const specs = [
    { status: 'waiting', payment_status: 'unpaid', ticket_status: 'none', hour: 10, minute: 5, client: 0, pro: 1, service: 0 },
    { status: 'waiting', payment_status: 'paid', ticket_status: 'none', hour: 10, minute: 20, client: 1, pro: 2, service: 1, payment_method: 'pix' },
    { status: 'calling', payment_status: 'awaiting_confirmation', ticket_status: 'none', hour: 10, minute: 35, client: 2, pro: 0, service: 2, payment_method: 'pix' },
    { status: 'serving', payment_status: 'membership', ticket_status: 'open', hour: 10, minute: 50, client: 3, pro: 1, service: 0, payment_method: 'membership' },
    { status: 'completed', payment_status: 'paid', ticket_status: 'settled', hour: 9, minute: 15, client: 4, pro: 2, service: 2, payment_method: 'cash' },
  ];

  return specs.map((spec) => {
    const client = pick(clients, spec.client);
    const professional = pick(professionals, spec.pro);
    const service = pick(services, spec.service);
    const price = Number(service.price);
    return {
      business_id: tenantId,
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      service_id: service.id,
      professional_id: professional.id,
      status: spec.status,
      joined_at: zonedIso(today.year, today.month, today.day, spec.hour, spec.minute),
      estimated_wait_time: spec.status === 'waiting' ? 25 : spec.status === 'calling' ? 5 : 0,
      notes: `${DEMO_MARKER} fila v2`,
      duration_minutes: service.duration_minutes ?? service.duration ?? 30,
      service_price_cents: Math.round(price * 100),
      payment_method: spec.payment_method ?? null,
      payment_status: spec.payment_status,
      ticket_status: spec.ticket_status,
      extra_service_lines: [],
      product_lines: [],
    };
  });
}

export function buildPublicBookingRows({
  now = new Date(),
  timeZone = TIME_ZONE,
  tenantId,
  professionals,
  services,
  customers,
}) {
  const today = zonedParts(now, timeZone);
  return customers.slice(0, 3).map((customer, index) => {
    const when = addDays(today.year, today.month, today.day, index === 0 ? 0 : index + 1);
    const hour = [10, 14, 16][index];
    const service = pick(services, index);
    const professional = pick(professionals, index + 1);
    return {
      business_id: tenantId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: `${customer.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      service_ids: [service.id],
      professional_id: professional.id,
      appointment_time: zonedIso(when.year, when.month, when.day, hour, 0),
      total_price: service.price,
      duration_minutes: service.duration_minutes ?? service.duration ?? 30,
      status: 'pending',
      notes: `${DEMO_MARKER} solicitação pública`,
      product_lines: [],
    };
  });
}

export function buildGoalRow(tenantId, now = new Date(), timeZone = TIME_ZONE, monthlyGoal = 18000) {
  const today = zonedParts(now, timeZone);
  return {
    user_id: tenantId,
    month: today.month - 1,
    year: today.year,
    monthly_goal: monthlyGoal,
  };
}

export function expectedSeedCounts() {
  return {
    todayAppointments: TODAY_SLOTS.length,
    pastAppointments: PAST_SLOTS.length,
    futureAppointments: FUTURE_SLOTS.length,
    appointments: TODAY_SLOTS.length + PAST_SLOTS.length + FUTURE_SLOTS.length,
    queueEntries: 5,
    publicBookings: 3,
  };
}
