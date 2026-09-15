import { createClient } from '@supabase/supabase-js';
import {
  MARKER,
  PURGE_TABLES,
  SeedSafetyError,
  canClaimAsDemo,
  dropColumn,
  isAllowedDemoEmail,
  missingColumnFromError,
  relationMissing,
} from './lib.mjs';

export function createClients({ url, anonKey, serviceKey }) {
  if (!url || !anonKey) {
    throw new SeedSafetyError('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.');
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const anon = createClient(url, anonKey, options);
  const admin = serviceKey ? createClient(url, serviceKey, options) : null;
  const newAnon = () => createClient(url, anonKey, options);
  return { anon, admin, hasServiceRole: Boolean(admin), newAnon };
}

export async function insertBestEffort(client, table, rows, { dryRun = false, log = console.log } = {}) {
  if (!rows?.length) return [];
  if (dryRun) {
    log(`  [dry-run] ${table}: +${rows.length}`);
    return rows;
  }
  let payload = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await client.from(table).insert(payload).select();
    if (!error) return data || [];
    if (relationMissing(error.message)) {
      log(`  [skip] tabela ${table} ausente neste banco (${error.message})`);
      return [];
    }
    const missing = missingColumnFromError(error.message);
    if (missing && payload.some((row) => Object.prototype.hasOwnProperty.call(row, missing))) {
      log(`  [compat] ${table}: removendo coluna inexistente "${missing}"`);
      payload = dropColumn(payload, missing);
      continue;
    }
    throw new SeedSafetyError(`insert ${table}: ${error.message}`);
  }
  throw new SeedSafetyError(`insert ${table}: esgotou tentativas de compatibilidade de colunas`);
}

export async function upsertBestEffort(client, table, rows, onConflict, { dryRun = false, log = console.log } = {}) {
  if (!rows?.length) return [];
  if (dryRun) {
    log(`  [dry-run] ${table} upsert: ${rows.length}`);
    return rows;
  }
  let payload = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await client.from(table).upsert(payload, { onConflict }).select();
    if (!error) return data || [];
    if (relationMissing(error.message)) {
      log(`  [skip] tabela ${table} ausente neste banco`);
      return [];
    }
    const missing = missingColumnFromError(error.message);
    if (missing && payload.some((row) => Object.prototype.hasOwnProperty.call(row, missing))) {
      log(`  [compat] ${table}: removendo coluna inexistente "${missing}"`);
      payload = dropColumn(payload, missing);
      continue;
    }
    throw new SeedSafetyError(`upsert ${table}: ${error.message}`);
  }
  throw new SeedSafetyError(`upsert ${table}: esgotou tentativas`);
}

export async function deleteByTenant(client, table, column, tenantId, { dryRun = false, log = console.log } = {}) {
  if (dryRun) {
    log(`  [dry-run] DELETE ${table} WHERE ${column} = <demo-tenant>`);
    return 0;
  }
  const { error, count } = await client
    .from(table)
    .delete({ count: 'exact' })
    .eq(column, tenantId);
  if (error) {
    if (relationMissing(error.message)) {
      log(`  [skip] ${table} ausente`);
      return 0;
    }
    throw new SeedSafetyError(`delete ${table}: ${error.message}`);
  }
  return count ?? 0;
}

export async function purgeDemoTenantRows(client, tenantId, { dryRun = false, log = console.log } = {}) {
  if (!tenantId) throw new SeedSafetyError('purge recusado: tenantId vazio');
  if (!dryRun && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new SeedSafetyError('purge recusado: tenantId não é UUID');
  }
  const summary = {};
  for (const { table, column } of PURGE_TABLES) {
    summary[table] = await deleteByTenant(client, table, column, tenantId, { dryRun, log });
  }
  return summary;
}

export async function loadProfileByEmail(client, email) {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, business_name, business_slug, role, company_id, user_type, activation_completed')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new SeedSafetyError(`lookup profile: ${error.message}`);
  return data;
}

export async function assertProfileLock(profile, spec) {
  if (!profile) {
    throw new SeedSafetyError(`perfil não encontrado para ${spec.email}`);
  }
  if (!isAllowedDemoEmail(profile.email)) {
    throw new SeedSafetyError(`ABORT: perfil ${profile.id} não tem e-mail demo. Nada foi alterado.`);
  }
  if (profile.email.trim().toLowerCase() !== spec.email.trim().toLowerCase()) {
    throw new SeedSafetyError('ABORT: e-mail do perfil não bate com o spec. Nada foi alterado.');
  }
  if (profile.role === 'staff') {
    throw new SeedSafetyError('ABORT: recusado semear conta staff como tenant demo.');
  }
  if (!canClaimAsDemo(profile, spec.email)) {
    throw new SeedSafetyError(
      `ABORT: ${spec.email} existe mas não parece tenant demo (business_name="${profile.business_name}", slug="${profile.business_slug}"). Não toco em tenant alheio.`,
    );
  }
}

export async function findAuthUserIdByEmail(admin, email, { url, serviceKey } = {}) {
  if (!admin) return null;
  const profile = await loadProfileByEmail(admin, email);
  if (profile?.id) return profile.id;
  if (!url || !serviceKey) return null;
  const endpoint = new URL('/auth/v1/admin/users', url.endsWith('/') ? url : `${url}/`);
  endpoint.searchParams.set('email', email);
  endpoint.searchParams.set('page', '1');
  endpoint.searchParams.set('per_page', '2');
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  if (!response.ok) return null;
  const body = await response.json();
  const users = body.users || [];
  const found = users.find((user) => String(user.email || '').toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

export async function ensureAuthUser(admin, spec, password, { dryRun, log = console.log, url, serviceKey } = {}) {
  if (dryRun) {
    log(`  [dry-run] auth user ${spec.email}`);
    return { id: `dry-run-${spec.key}`, created: false };
  }
  if (!admin) {
    throw new SeedSafetyError(
      'Criar usuário exige SUPABASE_SERVICE_ROLE_KEY. Alternativa: cadastre o e-mail demo no app e rode de novo com login (anon).',
    );
  }
  const existingId = await findAuthUserIdByEmail(admin, spec.email, { url, serviceKey });
  if (existingId) {
    log(`  auth: usuário já existe (${existingId})`);
    return { id: existingId, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: spec.fullName,
      business_name: spec.businessName,
      type: spec.userType,
      region: spec.region,
      [MARKER]: true,
    },
    app_metadata: {
      demo: true,
      source: 'agendix-demo-seed',
    },
  });
  if (error) throw new SeedSafetyError(`createUser ${spec.email}: ${error.message}`);
  log(`  auth: criado ${data.user.id}`);
  return { id: data.user.id, created: true };
}

export async function deleteAuthUser(admin, userId, email, { dryRun, log = console.log }) {
  if (!isAllowedDemoEmail(email)) {
    throw new SeedSafetyError('deleteAuthUser recusado: e-mail fora do padrão demo');
  }
  if (dryRun) {
    log(`  [dry-run] delete auth user ${email}`);
    return;
  }
  if (!admin) {
    throw new SeedSafetyError('Apagar auth.users exige SUPABASE_SERVICE_ROLE_KEY.');
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new SeedSafetyError(`deleteUser: ${error.message}`);
  log(`  auth: removido ${email}`);
}

export function writerClient({ admin, anon, sessionClient }) {
  return admin || sessionClient || anon;
}
