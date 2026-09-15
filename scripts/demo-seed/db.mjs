import { createClient } from '@supabase/supabase-js';
import {
  DEMO_MARKER,
  OPERATIONAL_DELETE_ORDER,
  PROFILE_DELETE_TABLES,
} from './constants.mjs';
import { assertDemoTenantIds, isUuidLike } from './safety.mjs';
import {
  buildAppointmentRows,
  buildFinanceRows,
  buildGoalRow,
  buildPublicBookingRows,
  buildQueueRows,
  expectedSeedCounts,
  financeMonthSpan,
  summarizeAppointments,
} from './payloads.mjs';

export function createAdminClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function throwIfError(label, error) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function insertRows(sb, table, rows) {
  if (!rows.length) return [];
  const { data, error } = await sb.from(table).insert(rows).select();
  await throwIfError(`insert ${table}`, error);
  return data || [];
}

export async function deleteOperationalData(sb, tenantIds) {
  const ids = assertDemoTenantIds(tenantIds);
  const skipped = [];
  for (const { table, column } of OPERATIONAL_DELETE_ORDER) {
    const { error } = await sb.from(table).delete().in(column, ids);
    if (error) {
      const missing = /schema cache|does not exist|não existe|Could not find/i.test(error.message);
      if (missing) {
        skipped.push(`${table} (${error.message})`);
        continue;
      }
      throw new Error(`delete ${table}: ${error.message}`);
    }
  }
  return skipped;
}

export async function deleteProfileScopedData(sb, tenantIds) {
  const ids = assertDemoTenantIds(tenantIds);
  for (const { table, column } of PROFILE_DELETE_TABLES) {
    const { error } = await sb.from(table).delete().in(column, ids);
    await throwIfError(`delete ${table}`, error);
  }
}

export async function findProfilesByEmails(sb, emails) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, email, business_name, business_slug, user_type, subscription_status, role, company_id')
    .in('email', emails);
  await throwIfError('select profiles by email', error);
  return data || [];
}

export async function ensureAuthUser(admin, { email, password, fullName, businessName, userType, region, phone }) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      business_name: businessName,
      type: userType,
      region,
      phone,
    },
  });

  if (!createError && created?.user?.id) {
    return { user: created.user, created: true };
  }

  const duplicate = /already been registered|already exists|User already registered/i.test(
    createError?.message || '',
  );
  if (!duplicate) {
    throw new Error(`auth.admin.createUser(${email}): ${createError?.message || 'falhou'}`);
  }

  const existing = await findAuthUserByEmail(admin, email);
  if (!existing) {
    throw new Error(`Usuário ${email} já existe no Auth, mas não foi possível localizar o id.`);
  }
  return { user: existing, created: false };
}

async function findAuthUserByEmail(admin, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    await throwIfError(`auth.admin.listUsers page ${page}`, error);
    const found = (data?.users || []).find((user) => (user.email || '').toLowerCase() === target);
    if (found) return found;
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  const { data: profile } = await admin.from('profiles').select('id, email').eq('email', email).maybeSingle();
  if (profile?.id) {
    const { data: userData, error } = await admin.auth.admin.getUserById(profile.id);
    if (!error && userData?.user) return userData.user;
  }
  return null;
}

export async function upsertDemoProfile(sb, tenantId, blueprint) {
  const payload = {
    id: tenantId,
    email: blueprint.email,
    full_name: blueprint.fullName,
    business_name: blueprint.businessName,
    phone: blueprint.phone,
    user_type: blueprint.userType,
    region: blueprint.region,
    business_slug: blueprint.slug,
    public_booking_enabled: true,
    booking_lead_time_hours: 2,
    max_bookings_per_day: 24,
    tutorial_completed: true,
    activation_completed: true,
    activated_at: new Date().toISOString(),
    subscription_status: 'active',
    monthly_goal: blueprint.monthlyGoal,
    daily_goal: blueprint.dailyGoal,
    address_street: blueprint.address,
    instagram_handle: blueprint.instagram,
    role: 'owner',
    company_id: tenantId,
  };

  const { data: existing, error: selectError } = await sb
    .from('profiles')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();
  await throwIfError('select profile', selectError);

  if (existing?.id) {
    const { error } = await sb.from('profiles').update(payload).eq('id', tenantId);
    await throwIfError('update profile', error);
    return;
  }

  const { error } = await sb.from('profiles').insert(payload);
  await throwIfError('insert profile', error);
}

export async function upsertBusinessSettings(sb, tenantId, blueprint) {
  const payload = {
    user_id: tenantId,
    business_hours: blueprint.hours,
    onboarding_completed: true,
    onboarding_step: 5,
    public_booking_enabled: true,
    enable_professional_selection: true,
    enable_self_rescheduling: true,
    pix_key_type: 'email',
    pix_key_value: blueprint.pixEmail,
    pix_holder_name: blueprint.pixHolder,
    pix_merchant_city: 'SAO PAULO',
    machine_fee_enabled: true,
    debit_fee_percent: 1.5,
    credit_fee_percent: 3.2,
    commission_settlement_day_of_month: 5,
    payment_day: 5,
    public_products_enabled: true,
    queue_mode: 'shared',
    queue_allow_leave: true,
    queue_late_minutes: 10,
  };

  const { error } = await sb.from('business_settings').upsert(payload, { onConflict: 'user_id' });
  await throwIfError('upsert business_settings', error);
}

export async function upsertOnboarding(sb, tenantId) {
  const now = new Date().toISOString();
  const payload = {
    company_id: tenantId,
    current_step: 5,
    completed_steps: [1, 2, 3, 4, 5],
    is_completed: true,
    is_skipped: false,
    completed_at: now,
    last_activity: now,
    step_data: { demo: DEMO_MARKER },
  };
  const { error } = await sb.from('onboarding_progress').upsert(payload, { onConflict: 'company_id' });
  await throwIfError('upsert onboarding_progress', error);
}

export async function seedTenantContent(sb, tenantId, blueprint, now = new Date()) {
  if (!isUuidLike(tenantId)) {
    throw new Error(`tenantId inválido: ${tenantId}`);
  }

  const teamRows = blueprint.team.map((member, index) => ({
    user_id: tenantId,
    name: member.name,
    role: member.role,
    bio: member.bio,
    slug: member.slug,
    active: true,
    is_owner: member.is_owner,
    commission_rate: member.commission_rate,
    commission_percent: member.commission_rate,
    display_order: index,
    deleted_at: null,
  }));
  const team = await insertRows(sb, 'team_members', teamRows);

  const categoryRows = blueprint.categories.map((category) => ({
    user_id: tenantId,
    name: category.name,
    display_order: category.display_order,
  }));
  const categories = await insertRows(sb, 'service_categories', categoryRows);
  const categoryByName = Object.fromEntries(categories.map((row) => [row.name, row.id]));

  const serviceRows = blueprint.services.map((service) => ({
    user_id: tenantId,
    category_id: categoryByName[service.category] || null,
    name: service.name,
    description: service.description,
    price: service.price,
    duration_minutes: service.duration,
    active: true,
  }));
  const services = await insertRows(sb, 'services', serviceRows);

  const clientRows = blueprint.clients.map((client) => ({
    user_id: tenantId,
    name: client.name,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    source: client.source,
    is_active: true,
    loyalty_tier: client.loyalty_tier,
    total_visits: client.total_visits,
    birth_date: client.birth_date,
  }));
  const clients = await insertRows(sb, 'clients', clientRows);

  const productRows = blueprint.products.map((product) => ({
    company_id: tenantId,
    name: product.name,
    sale_price: product.sale_price,
    cost_price: product.cost_price,
    stock_quantity: product.stock_quantity,
    min_stock_quantity: product.min_stock_quantity,
    commission_percent: 10,
    show_in_public: true,
    is_active: true,
  }));
  const products = await insertRows(sb, 'products', productRows);

  const appointments = await insertRows(
    sb,
    'appointments',
    buildAppointmentRows({
      now,
      timeZone: blueprint.timeZone,
      tenantId,
      professionals: team,
      clients,
      services,
    }),
  );

  const finance = await insertRows(
    sb,
    'finance_records',
    buildFinanceRows({
      now,
      timeZone: blueprint.timeZone,
      tenantId,
      professionals: team,
      clients,
      services,
    }),
  );

  await insertRows(sb, 'goal_settings', [buildGoalRow(tenantId, now, blueprint.timeZone, blueprint.monthlyGoal)]);

  const clubServiceIds = services.slice(0, 2).map((service) => service.id);
  const plans = await insertRows(sb, 'membership_plans', [
    {
      user_id: tenantId,
      name: blueprint.club.activeName,
      description: blueprint.club.description,
      price_cents: blueprint.club.priceCents,
      service_ids: clubServiceIds,
      usage_limit_per_month: 4,
      badge_color: 'gold',
      active: true,
    },
    {
      user_id: tenantId,
      name: blueprint.club.inactiveName,
      description: `${DEMO_MARKER} plano inativo fictício`,
      price_cents: blueprint.club.priceCents - 2000,
      service_ids: [clubServiceIds[0]].filter(Boolean),
      usage_limit_per_month: 2,
      badge_color: 'silver',
      active: false,
    },
  ]);
  const activePlan = plans.find((plan) => plan.active) || plans[0];

  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
  const memberships = await insertRows(sb, 'client_memberships', [
    {
      user_id: tenantId,
      client_id: clients[0].id,
      plan_id: activePlan.id,
      status: 'active',
      payment_method: 'pix',
      starts_at: periodStart.toISOString(),
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
      last_paid_at: periodStart.toISOString(),
      notes: `${DEMO_MARKER} assinante ativo`,
    },
    {
      user_id: tenantId,
      client_id: clients[1].id,
      plan_id: activePlan.id,
      status: 'pending',
      payment_method: 'pix',
      starts_at: periodStart.toISOString(),
      notes: `${DEMO_MARKER} assinatura pendente Pix`,
    },
  ]);

  await insertRows(sb, 'public_clients', clients.slice(0, 6).map((client) => ({
    business_id: tenantId,
    name: client.name,
    phone: client.phone,
    email: client.email,
  })));

  const publicBookings = await insertRows(
    sb,
    'public_bookings',
    buildPublicBookingRows({
      now,
      timeZone: blueprint.timeZone,
      tenantId,
      professionals: team,
      services,
      customers: blueprint.bookingCustomers,
    }),
  );

  let queue = [];
  let queuePayments = [];
  try {
    queue = await insertRows(
      sb,
      'queue_entries',
      buildQueueRows({
        now,
        timeZone: blueprint.timeZone,
        tenantId,
        professionals: team,
        clients,
        services,
      }),
    );
    const pixEntry = queue.find((entry) => entry.payment_status === 'awaiting_confirmation');
    if (pixEntry) {
      queuePayments = await insertRows(sb, 'queue_payments', [
        {
          business_id: tenantId,
          queue_entry_id: pixEntry.id,
          method: 'pix',
          amount_cents: pixEntry.service_price_cents || 5500,
          br_code: '000201BR.GOV.BCB.PIX0136agendix.demo.pix@example.com5204000053039865802BR5925AGENDIX DEMO FICTICIO6009SAO PAULO62070503***6304',
          txid: `DEMO${String(tenantId).replace(/-/g, '').slice(0, 20)}`,
          status: 'pending',
          expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        },
      ]);
    }
  } catch (error) {
    queue = { skipped: true, reason: error.message };
  }

  const completedAppointment = appointments.find((row) => row.status === 'Completed');
  const owner = team.find((member) => member.is_owner) || team[0];
  let productSales = [];
  if (completedAppointment && products[0]) {
    try {
      productSales = await insertRows(sb, 'product_sales', [
        {
          company_id: tenantId,
          product_id: products[0].id,
          appointment_id: completedAppointment.id,
          sold_by: owner.id,
          quantity: 1,
          unit_sale_price: products[0].sale_price,
          unit_cost_price: products[0].cost_price,
          total_revenue: products[0].sale_price,
          total_cost: products[0].cost_price,
          client_id: completedAppointment.client_id,
          professional_id: owner.id,
          commission_percent: 10,
          commission_value: Number((products[0].sale_price * 0.1).toFixed(2)),
        },
      ]);
    } catch (error) {
      productSales = { skipped: true, reason: error.message };
    }
  }

  return {
    team: team.length,
    categories: categories.length,
    services: services.length,
    clients: clients.length,
    products: products.length,
    appointments: summarizeAppointments(appointments, now, blueprint.timeZone),
    finance: {
      total: finance.length,
      months: financeMonthSpan(finance, blueprint.timeZone),
    },
    membershipPlans: plans.length,
    memberships: memberships.length,
    publicBookings: publicBookings.length,
    queue: Array.isArray(queue) ? queue.length : queue,
    queuePayments: Array.isArray(queuePayments) ? queuePayments.length : queuePayments,
    productSales: Array.isArray(productSales) ? productSales.length : productSales,
    expected: expectedSeedCounts(),
    slugs: {
      business: blueprint.slug,
      professionals: team.map((member) => member.slug),
    },
  };
}

export async function deleteAuthUsers(admin, userIds) {
  const ids = assertDemoTenantIds(userIds, 'auth user');
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    await throwIfError(`auth.admin.deleteUser(${id})`, error);
  }
}

export async function signInOwner(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  await throwIfError(`login ${email}`, error);
  return data.user;
}
