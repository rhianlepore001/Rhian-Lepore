#!/usr/bin/env node
/**
 * Seed isolado de 2 tenants DEMO (barber + beauty) para prints da landing.
 *
 * Default: dry-run (zero escrita).
 * Nunca toca em e-mail fora de agendix.demo.(barber|beauty)@…
 *
 * Uso: ver docs/demo-seed.md
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIRM_SEED,
  MARKER,
  SeedSafetyError,
  addDaysYmd,
  assertWriteAllowed,
  isoFromZoned,
  loadEnvFile,
  monthIndexFromYmd,
  note,
  parseArgs,
  requireSeedPassword,
  resolveDemoEmails,
  todayAgendaPlan,
  yearFromYmd,
  ymdInZone,
} from './lib.mjs';
import { assertFixtureCoverage, buildTenantSpecs, hoursPayload } from './fixtures.mjs';
import {
  assertProfileLock,
  createClients,
  deleteByTenant,
  ensureAuthUser,
  insertBestEffort,
  loadProfileByEmail,
  purgeDemoTenantRows,
  upsertBestEffort,
} from './db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function help() {
  console.log(`
AgendiX — seed demo isolado (barber + beauty)

  node scripts/demo-seed/seed-demo.mjs                  # dry-run
  node scripts/demo-seed/seed-demo.mjs --apply --confirm=${CONFIRM_SEED}
  node scripts/demo-seed/seed-demo.mjs --apply --confirm=${CONFIRM_SEED} --refresh --tenant=barber

Flags:
  --dry-run          (padrão) só mostra o plano
  --apply            escreve, exige --confirm=${CONFIRM_SEED}
  --refresh          apaga só as linhas do tenant demo e reseeds
  --tenant=all|barber|beauty
  --allow-remote     obrigatório se a URL não for localhost
  --json             resumo machine-readable (sem senha)

Env: docs/demo-seed.md
`);
}

function log(message) {
  console.log(message);
}

async function selectEq(client, table, column, value, columns = '*') {
  const { data, error } = await client.from(table).select(columns).eq(column, value);
  if (error) {
    if (/does not exist|Could not find the table/i.test(error.message)) return [];
    throw new SeedSafetyError(`select ${table}: ${error.message}`);
  }
  return data || [];
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function paymentMethods() {
  return ['pix', 'cash', 'debit', 'credit'];
}

async function signInDemo(factory, email, password) {
  const client = factory();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new SeedSafetyError(`login ${email}: ${error.message}`);
  return client;
}

async function upsertProfile(client, spec, userId, { dryRun }) {
  const now = new Date().toISOString();
  const row = {
    id: userId,
    email: spec.email,
    full_name: spec.fullName,
    business_name: spec.businessName,
    business_slug: spec.slug,
    phone: spec.phone,
    address_street: spec.address,
    instagram_handle: spec.instagram,
    user_type: spec.userType,
    region: spec.region,
    role: 'owner',
    company_id: userId,
    public_booking_enabled: true,
    booking_lead_time_hours: 2,
    max_bookings_per_day: 24,
    tutorial_completed: true,
    activation_completed: true,
    activated_at: now,
    subscription_status: 'active',
    monthly_goal: spec.monthlyGoal,
    daily_goal: spec.dailyGoal,
    aios_enabled: false,
    bio: note('tenant fictício para prints — dados inventados'),
  };
  if (dryRun) {
    log(`  [dry-run] profiles upsert ${spec.slug}`);
    return row;
  }
  const existing = await loadProfileByEmail(client, spec.email);
  if (existing) {
    await assertProfileLock(existing, spec);
    const { data: slugOwner, error: slugError } = await client
      .from('profiles')
      .select('id, email')
      .eq('business_slug', spec.slug)
      .maybeSingle();
    if (slugError) throw new SeedSafetyError(slugError.message);
    if (slugOwner && slugOwner.id !== userId) {
      throw new SeedSafetyError(
        `ABORT: slug ${spec.slug} já pertence a outro perfil (${slugOwner.email}). Não sobrescrevo.`,
      );
    }
    const { error } = await client
      .from('profiles')
      .update(row)
      .eq('id', userId)
      .eq('email', spec.email);
    if (error) throw new SeedSafetyError(`update profile: ${error.message}`);
    return { ...existing, ...row };
  }
  const inserted = await insertBestEffort(client, 'profiles', [row], { dryRun, log });
  return inserted[0] || row;
}

async function upsertSettings(client, spec, userId, { dryRun }) {
  const row = {
    user_id: userId,
    business_hours: hoursPayload(),
    cancellation_policy:
      'Cancelamentos com até 24h de antecedência sem custo. Dados fictícios [AGENDIX-DEMO].',
    onboarding_completed: true,
    onboarding_step: 6,
    public_booking_enabled: true,
    enable_professional_selection: true,
    enable_self_rescheduling: true,
    public_products_enabled: true,
    payment_day: 5,
    commission_settlement_day_of_month: 5,
    machine_fee_enabled: true,
    debit_fee_percent: 1.5,
    credit_fee_percent: 3.2,
    queue_mode: 'shared',
    queue_allow_leave: true,
    queue_late_minutes: 10,
    ...spec.pix,
  };
  await upsertBestEffort(client, 'business_settings', [row], 'user_id', { dryRun, log });
}

async function upsertOnboarding(client, spec, userId, { dryRun }) {
  const row = {
    company_id: userId,
    current_step: 6,
    completed_steps: [1, 2, 3, 4, 5, 6],
    is_completed: true,
    is_skipped: false,
    completed_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    step_data: {
      demo: true,
      marker: MARKER,
      business_name: spec.businessName,
    },
  };
  try {
    await upsertBestEffort(client, 'onboarding_progress', [row], 'company_id', { dryRun, log });
  } catch (error) {
    log(`  [warn] onboarding_progress: ${error.message}`);
  }
}

async function upsertGoals(client, spec, userId, todayYmd, { dryRun }) {
  const year = yearFromYmd(todayYmd);
  const month = monthIndexFromYmd(todayYmd);
  const prev = addDaysYmd(todayYmd.slice(0, 8) + '01', -1);
  const rows = [
    { user_id: userId, year, month, monthly_goal: spec.monthlyGoal },
    {
      user_id: userId,
      year: yearFromYmd(prev),
      month: monthIndexFromYmd(prev),
      monthly_goal: Math.round(spec.monthlyGoal * 0.92),
    },
  ];
  try {
    await upsertBestEffort(client, 'goal_settings', rows, 'user_id,month,year', { dryRun, log });
  } catch (error) {
    log(`  [warn] goal_settings: ${error.message}`);
  }
}

async function ensureCategoriesAndServices(client, spec, userId, { dryRun }) {
  let categories = await selectEq(client, 'service_categories', 'user_id', userId);
  if (categories.length < spec.categories.length) {
    const existingNames = new Set(categories.map((row) => row.name));
    const toInsert = spec.categories
      .filter((cat) => !existingNames.has(cat.name))
      .map((cat) => ({
        user_id: userId,
        name: cat.name,
        display_order: cat.order,
      }));
    const inserted = await insertBestEffort(client, 'service_categories', toInsert, { dryRun, log });
    categories = [...categories, ...inserted];
  }
  const byName = Object.fromEntries(categories.map((row) => [row.name, row]));

  let services = await selectEq(client, 'services', 'user_id', userId);
  if (services.length < spec.services.length) {
    const existingNames = new Set(services.map((row) => row.name));
    const toInsert = spec.services
      .filter((svc) => !existingNames.has(svc.name))
      .map((svc) => ({
        user_id: userId,
        name: svc.name,
        description: svc.description,
        price: svc.price,
        duration_minutes: svc.duration,
        active: true,
        category_id: byName[svc.category]?.id ?? null,
      }));
    const inserted = await insertBestEffort(client, 'services', toInsert, { dryRun, log });
    services = [...services, ...inserted];
  }
  return { categories, services };
}

async function ensureTeam(client, spec, userId, { dryRun }) {
  let members = (await selectEq(client, 'team_members', 'user_id', userId))
    .filter((row) => !row.deleted_at);
  if (members.length < spec.staff.length) {
    const existingSlugs = new Set(members.map((row) => row.slug).filter(Boolean));
    const toInsert = spec.staff
      .filter((person) => !existingSlugs.has(person.slug) && !members.some((row) => row.name === person.name))
      .map((person, index) => ({
        user_id: userId,
        name: person.name,
        role: person.role,
        bio: person.bio,
        slug: person.slug,
        active: true,
        is_owner: person.isOwner,
        commission_rate: person.commission,
        commission_percent: person.commission,
        display_order: index,
        staff_user_id: null,
      }));
    const inserted = await insertBestEffort(client, 'team_members', toInsert, { dryRun, log });
    members = [...members, ...inserted];
  }
  return members;
}

async function ensureClients(client, spec, userId, { dryRun }) {
  let clients = await selectEq(client, 'clients', 'user_id', userId);
  if (clients.length < spec.clients.length) {
    const existingPhones = new Set(clients.map((row) => row.phone));
    const toInsert = spec.clients
      .filter((person) => !existingPhones.has(person.phone))
      .map((person, index) => ({
        user_id: userId,
        name: person.name,
        phone: person.phone,
        email: person.email,
        notes: note(person.vip ? 'Cliente VIP fictício' : 'Cadastro fictício'),
        loyalty_tier: person.vip ? 'Gold' : 'Silver',
        is_active: true,
        source: 'manual',
        total_visits: person.vip ? 14 : 4 + (index % 5),
        last_visit: addDaysYmd(ymdInZone(), -((index % 20) + 1)),
        birth_date: `199${index % 10}-0${(index % 8) + 1}-${String(10 + index).padStart(2, '0')}`,
      }));
    const inserted = await insertBestEffort(client, 'clients', toInsert, { dryRun, log });
    clients = [...clients, ...inserted];
  }
  return clients;
}

async function ensureProducts(client, spec, userId, { dryRun }) {
  let products = await selectEq(client, 'products', 'company_id', userId);
  if (products.length < spec.products.length) {
    const existing = new Set(products.map((row) => row.name));
    const toInsert = spec.products
      .filter((product) => !existing.has(product.name))
      .map((product) => ({
        company_id: userId,
        name: `${product.name}`,
        sale_price: product.sale,
        cost_price: product.cost,
        stock_quantity: product.stock,
        min_stock_quantity: 3,
        is_active: true,
        commission_percent: 10,
        show_in_public: true,
      }));
    const inserted = await insertBestEffort(client, 'products', toInsert, { dryRun, log });
    products = [...products, ...inserted];
  }
  return products;
}

async function ensureClub(client, spec, userId, services, clients, { dryRun }) {
  const serviceIds = services.slice(0, 3).map((row) => row.id).filter(Boolean);
  let plans = await selectEq(client, 'membership_plans', 'user_id', userId);
  if (plans.length === 0) {
    const inserted = await insertBestEffort(client, 'membership_plans', [
      {
        user_id: userId,
        name: spec.club.active.name,
        description: note('plano ativo fictício'),
        price_cents: spec.club.active.priceCents,
        service_ids: serviceIds,
        usage_limit_per_month: spec.club.active.limit,
        badge_color: spec.club.active.badge,
        active: true,
      },
      {
        user_id: userId,
        name: spec.club.inactive.name,
        description: note('plano inativo fictício'),
        price_cents: spec.club.inactive.priceCents,
        service_ids: serviceIds.slice(0, 1),
        usage_limit_per_month: spec.club.inactive.limit,
        badge_color: spec.club.inactive.badge,
        active: false,
      },
    ], { dryRun, log });
    plans = inserted;
  }
  const activePlan = plans.find((plan) => plan.active) || plans[0];
  const memberships = await selectEq(client, 'client_memberships', 'user_id', userId);
  if (memberships.length === 0 && activePlan && clients.length >= 2) {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    await insertBestEffort(client, 'client_memberships', [
      {
        user_id: userId,
        client_id: clients[0].id,
        plan_id: activePlan.id,
        status: 'active',
        payment_method: 'pix',
        starts_at: start.toISOString(),
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        next_billing_at: end.toISOString(),
        last_paid_at: start.toISOString(),
        notes: note('assinante ativo fictício'),
      },
      {
        user_id: userId,
        client_id: clients[1].id,
        plan_id: activePlan.id,
        status: 'pending',
        payment_method: 'pix',
        starts_at: start.toISOString(),
        notes: note('assinatura pendente fictícia'),
      },
    ], { dryRun, log });
  }
}

async function rebuildTimeSensitive(client, spec, ctx, { dryRun }) {
  const { userId, services, members, clients, todayYmd } = ctx;
  if (!services.length || !clients.length || !members.length) {
    log('  pulando agenda/fila/booking: faltam serviços, clientes ou equipe');
    return;
  }
  await deleteByTenant(client, 'queue_payments', 'business_id', userId, { dryRun, log });
  await deleteByTenant(client, 'queue_entries', 'business_id', userId, { dryRun, log });
  await deleteByTenant(client, 'public_bookings', 'business_id', userId, { dryRun, log });
  if (!dryRun) {
    const { error } = await client
      .from('appointments')
      .delete()
      .eq('user_id', userId)
      .like('notes', `${MARKER}%`);
    if (error && !/does not exist/i.test(error.message)) {
      throw new SeedSafetyError(`limpar agenda demo: ${error.message}`);
    }
  }

  const staff = members.filter((row) => !row.is_owner);
  const professionals = staff.length ? staff : members;
  const plan = todayAgendaPlan();
  const appts = plan.map((slot, index) => {
    const service = pick(services, index);
    const clientRow = pick(clients, index);
    const pro = pick(professionals, index);
    return {
      user_id: userId,
      client_id: clientRow.id,
      professional_id: pro.id,
      service: service.name,
      price: service.price,
      duration_minutes: slot.duration,
      appointment_time: isoFromZoned(todayYmd, slot.time),
      status: slot.status,
      origin: slot.origin,
      notes: note(`hoje ${slot.time} ${slot.status}`),
      payment_method: slot.status === 'Completed' ? pick(paymentMethods(), index) : null,
    };
  });

  const pastCount = 8;
  for (let i = 1; i <= pastCount; i += 1) {
    const service = pick(services, i);
    const clientRow = pick(clients, i + 2);
    const pro = pick(professionals, i);
    appts.push({
      user_id: userId,
      client_id: clientRow.id,
      professional_id: pro.id,
      service: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes || 30,
      appointment_time: isoFromZoned(addDaysYmd(todayYmd, -i), i % 2 === 0 ? '11:00' : '16:00'),
      status: i % 5 === 0 ? 'Cancelled' : 'Completed',
      origin: 'agenda',
      notes: note(`passado D-${i}`),
      payment_method: i % 5 === 0 ? null : pick(paymentMethods(), i),
    });
  }
  for (let i = 1; i <= 5; i += 1) {
    const service = pick(services, i + 1);
    const clientRow = pick(clients, i + 4);
    const pro = pick(professionals, i + 1);
    appts.push({
      user_id: userId,
      client_id: clientRow.id,
      professional_id: pro.id,
      service: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes || 30,
      appointment_time: isoFromZoned(addDaysYmd(todayYmd, i), '10:00'),
      status: i === 2 ? 'Pending' : 'Confirmed',
      origin: 'booking',
      notes: note(`futuro D+${i}`),
      payment_method: null,
    });
  }
  await insertBestEffort(client, 'appointments', appts.filter((row) => row.client_id), { dryRun, log });

  const tomorrow = addDaysYmd(todayYmd, 1);
  const bookings = [0, 1, 2].map((index) => {
    const service = pick(services, index);
    const person = spec.clients[index + 3] || spec.clients[index];
    const pro = pick(professionals, index);
    return {
      business_id: userId,
      customer_name: person.name,
      customer_phone: person.phone,
      customer_email: person.email,
      professional_id: pro.id,
      appointment_time: isoFromZoned(tomorrow, ['10:00', '11:30', '14:00'][index]),
      service_ids: [service.id],
      total_price: service.price,
      duration_minutes: service.duration_minutes || 30,
      status: 'pending',
      notes: note('solicitação pública pendente'),
      product_lines: [],
    };
  });
  await insertBestEffort(client, 'public_bookings', bookings, { dryRun, log });

  const publicClients = spec.clients.slice(0, 4).map((person) => ({
    business_id: userId,
    name: person.name,
    phone: person.phone,
    email: person.email,
  }));
  try {
    await insertBestEffort(client, 'public_clients', publicClients, { dryRun, log });
  } catch (error) {
    log(`  [warn] public_clients: ${error.message}`);
  }

  const queuePeople = spec.clients.slice(8, 12);
  const queueRows = [
    { status: 'serving', payment_status: 'paid', ticket_status: 'open', minutesAgo: 25, method: 'pix' },
    { status: 'calling', payment_status: 'unpaid', ticket_status: 'none', minutesAgo: 12, method: null },
    { status: 'waiting', payment_status: 'unpaid', ticket_status: 'none', minutesAgo: 8, method: null },
    { status: 'waiting', payment_status: 'membership', ticket_status: 'none', minutesAgo: 3, method: 'membership' },
  ].map((entry, index) => {
    const person = queuePeople[index];
    const service = pick(services, index);
    const joined = new Date(new Date(isoFromZoned(todayYmd, '14:00')).getTime() - entry.minutesAgo * 60000);
    return {
      business_id: userId,
      client_name: person.name,
      client_phone: person.phone,
      client_id: clients.find((row) => row.phone === person.phone)?.id ?? null,
      service_id: service.id,
      professional_id: entry.status === 'serving' ? professionals[0]?.id : null,
      status: entry.status,
      joined_at: joined.toISOString(),
      duration_minutes: service.duration_minutes || 30,
      service_price_cents: Math.round(Number(service.price) * 100),
      payment_status: entry.payment_status,
      ticket_status: entry.ticket_status,
      payment_method: entry.method,
      notes: note(`fila v2 ${entry.status}`),
      extra_service_lines: [],
      product_lines: [],
    };
  });
  const insertedQueue = await insertBestEffort(client, 'queue_entries', queueRows, { dryRun, log });
  const paidEntry = (insertedQueue || []).find((row) => row.payment_status === 'paid');
  if (paidEntry?.id) {
    await insertBestEffort(client, 'queue_payments', [{
      business_id: userId,
      queue_entry_id: paidEntry.id,
      method: 'pix',
      amount_cents: paidEntry.service_price_cents || 5500,
      status: 'paid',
      br_code: '000201BR.GOV.BCB.PIX[AGENDIX-DEMO]',
      txid: 'DEMOSEEDPIX01',
      confirmed_at: new Date().toISOString(),
    }], { dryRun, log });
  }
}

async function ensureFinance(client, spec, userId, members, services, clients, todayYmd, { dryRun, refresh }) {
  const existing = await selectEq(client, 'finance_records', 'user_id', userId, 'id, description, created_at');
  const demoExisting = existing.filter((row) => String(row.description || '').includes(MARKER));
  if (demoExisting.length >= 20 && !refresh) {
    log(`  financeiro demo já tem ${demoExisting.length} lançamentos. Pulando (use --refresh).`);
    return;
  }
  if (refresh && !dryRun) {
    await client.from('finance_records').delete().eq('user_id', userId).like('description', `${MARKER}%`);
  }
  const staff = members.filter((row) => !row.is_owner);
  const rows = [];
  const months = [0, 1, 2];
  months.forEach((monthsAgo) => {
    const ymd = addDaysYmd(`${todayYmd.slice(0, 8)}15`, -(monthsAgo * 30));
    spec.expenses.forEach((expense, index) => {
      rows.push({
        user_id: userId,
        type: 'expense',
        revenue: 0,
        commission_value: expense.amount,
        commission_rate: 0,
        description: note(expense.description),
        category: expense.category,
        barber_name: 'Manual',
        client_name: '',
        service_name: expense.description,
        payment_method: 'pix',
        status: 'paid',
        commission_paid: true,
        created_at: isoFromZoned(ymd, ['09:00', '11:00', '15:00'][index]),
      });
    });
    for (let i = 0; i < 8; i += 1) {
      const service = pick(services, i);
      const pro = pick(staff.length ? staff : members, i);
      const person = pick(clients, i);
      const rate = Number(pro.commission_rate || 40);
      const revenue = Number(service.price);
      rows.push({
        user_id: userId,
        type: 'revenue',
        revenue,
        commission_rate: rate,
        commission_value: Number(((revenue * rate) / 100).toFixed(2)),
        description: note(`${service.name} ${ymd.slice(0, 7)}`),
        category: 'servico',
        barber_name: pro.name || 'Equipe',
        professional_id: pro.id,
        client_name: person.name,
        service_name: service.name,
        payment_method: pick(paymentMethods(), i),
        status: 'paid',
        commission_paid: i % 4 === 0,
        created_at: isoFromZoned(addDaysYmd(ymd, -(i % 12)), ['10:00', '13:00', '16:00', '18:00'][i % 4]),
      });
    }
  });
  await insertBestEffort(client, 'finance_records', rows, { dryRun, log });
}

async function seedTenant({ spec, admin, newAnon, password, url, serviceKey, dryRun, refresh, hasServiceRole }) {
  log(`\n=== ${spec.key.toUpperCase()} · ${spec.businessName} ===`);
  log(`email: ${spec.email}`);
  log(`slug:  /#/book/${spec.slug}`);

  let userId;
  let writer;
  if (hasServiceRole) {
    const auth = await ensureAuthUser(admin, spec, password, { dryRun, log, url, serviceKey });
    userId = auth.id;
    writer = admin;
    if (!dryRun && auth.created) {
      for (let i = 0; i < 5; i += 1) {
        const ready = await loadProfileByEmail(admin, spec.email);
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  } else if (dryRun) {
    userId = `dry-run-${spec.key}`;
    writer = admin || newAnon();
  } else {
    log('  sem service role: login no e-mail demo já cadastrado');
    writer = await signInDemo(newAnon, spec.email, password);
    const { data: { user }, error } = await writer.auth.getUser();
    if (error || !user) throw new SeedSafetyError('sessão demo inválida');
    if (user.email?.toLowerCase() !== spec.email) {
      throw new SeedSafetyError('ABORT: sessão não é o e-mail demo pedido');
    }
    userId = user.id;
  }

  if (!dryRun) {
    const profile = await loadProfileByEmail(writer, spec.email);
    if (profile) await assertProfileLock(profile, spec);
  }

  await upsertProfile(writer, spec, userId, { dryRun });
  await upsertSettings(writer, spec, userId, { dryRun });
  await upsertOnboarding(writer, spec, userId, { dryRun });
  const todayYmd = ymdInZone();
  await upsertGoals(writer, spec, userId, todayYmd, { dryRun });

  if (refresh && !dryRun) {
    log('  --refresh: limpando só este tenant demo');
    await purgeDemoTenantRows(writer, userId, { dryRun, log });
    await upsertSettings(writer, spec, userId, { dryRun });
    await upsertOnboarding(writer, spec, userId, { dryRun });
    await upsertGoals(writer, spec, userId, todayYmd, { dryRun });
  }

  const { services } = await ensureCategoriesAndServices(writer, spec, userId, { dryRun });
  const members = await ensureTeam(writer, spec, userId, { dryRun });
  const clients = await ensureClients(writer, spec, userId, { dryRun });
  await ensureProducts(writer, spec, userId, { dryRun });
  await ensureClub(writer, spec, userId, services, clients, { dryRun });
  await ensureFinance(writer, spec, userId, members, services, clients, todayYmd, { dryRun, refresh });
  await rebuildTimeSensitive(writer, spec, { userId, services, members, clients, todayYmd }, { dryRun });

  return {
    key: spec.key,
    email: spec.email,
    userId,
    slug: spec.slug,
    businessName: spec.businessName,
    publicBooking: `/#/book/${spec.slug}`,
    queue: `/#/queue/${spec.slug}`,
    club: `/#/clube/${spec.slug}`,
    clientArea: `/#/minha-area/${spec.slug}`,
  };
}

async function main() {
  loadEnvFile(resolve(ROOT, '.env.local'), { readFileSync, existsSync });
  loadEnvFile(resolve(ROOT, '.env'), { readFileSync, existsSync });

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    help();
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { dryRun, remote } = assertWriteAllowed({
    apply: args.apply,
    confirm: args.confirm,
    expectedConfirm: CONFIRM_SEED,
    allowRemote: args.allowRemote,
    supabaseUrl: url || 'http://localhost',
    remoteEnvValue: process.env.DEMO_SEED_REMOTE,
  });

  const emails = resolveDemoEmails(process.env);
  const specs = buildTenantSpecs(emails);
  const coverage = assertFixtureCoverage(specs);
  if (coverage.length) throw new SeedSafetyError(`fixtures inválidas:\n- ${coverage.join('\n- ')}`);

  const selected = args.tenant === 'all'
    ? [specs.barber, specs.beauty]
    : [specs[args.tenant]];

  log('AgendiX demo seed');
  log(`modo: ${dryRun ? 'DRY-RUN (nenhuma escrita)' : 'APPLY'}`);
  log(`banco: ${remote ? 'REMOTO' : 'local'} · refresh=${args.refresh} · tenants=${selected.map((s) => s.key).join(',')}`);
  if (!serviceKey) log('aviso: sem SUPABASE_SERVICE_ROLE_KEY — --apply só funciona se os e-mails demo já existirem.');

  if (dryRun && (!url || !anonKey)) {
    log('aviso: VITE_SUPABASE_URL/ANON_KEY ausentes — plano local (fixtures) sem conectar no banco.');
    for (const spec of selected) {
      log(`\n=== ${spec.key.toUpperCase()} · ${spec.businessName} ===`);
      log(`email: ${spec.email}`);
      log(`slug:  /#/book/${spec.slug}`);
      log(`equipe ${spec.staff.length} · serviços ${spec.services.length} · clientes ${spec.clients.length}`);
    }
    log('\nNenhuma escrita. Configure .env.local para um dry-run contra o projeto real.');
    if (args.json) console.log(JSON.stringify({ dryRun: true, offline: true, tenants: selected.map((s) => s.key) }));
    return;
  }

  const password = dryRun ? null : requireSeedPassword(process.env);
  const { admin, hasServiceRole, newAnon } = createClients({ url, anonKey, serviceKey });

  const results = [];
  for (const spec of selected) {
    results.push(await seedTenant({
      spec,
      admin,
      newAnon,
      password,
      url,
      serviceKey,
      dryRun,
      refresh: args.refresh,
      hasServiceRole,
    }));
  }

  log('\nPronto. Identificação: e-mail agendix.demo.* + business_name "DEMO ·" + notes [AGENDIX-DEMO]');
  log('Rollback: node scripts/demo-seed/purge-demo.mjs --apply --confirm=DELETE_DEMO_TENANTS');
  if (args.json) console.log(JSON.stringify({ dryRun, remote, results }, null, 2));
  else {
    for (const row of results) {
      log(`  ${row.key}: ${row.email} → ${row.publicBooking}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof SeedSafetyError ? `✗ ${error.message}` : error);
  process.exit(1);
});
