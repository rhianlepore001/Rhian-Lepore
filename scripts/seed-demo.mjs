#!/usr/bin/env node
/**
 * Seed DEMO isolado — AgendiX.
 * Default: dry-run (não escreve). Ver docs/demo-seed.md
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WRITE_CONFIRM_VALUE } from './demo-seed/constants.mjs';
import { listBlueprints } from './demo-seed/fixtures.mjs';
import { expectedSeedCounts } from './demo-seed/payloads.mjs';
import {
  helpText,
  isAllowedDemoEmail,
  isKnownProductionUrl,
  parseArgs,
  requireDeleteAuthConfirm,
  requireDemoPassword,
  requireProductionConfirm,
  requireWriteConfirm,
} from './demo-seed/safety.mjs';

function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!override && process.env[match[1]]) continue;
    process.env[match[1]] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'), { override: true });

function log(message) {
  console.log(message);
}

function loadEnvKeys() {
  return {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    anon: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

async function loadDb() {
  return import('./demo-seed/db.mjs');
}

function printPlan(blueprints, mode) {
  const expected = expectedSeedCounts();
  log(`Modo: ${mode}`);
  log(`Marcador: [AGENDIX-DEMO]  |  e-mails: ${blueprints.map((item) => item.email).join(', ')}`);
  for (const blueprint of blueprints) {
    log('');
    log(`• ${blueprint.kind}  ${blueprint.businessName}`);
    log(`  email     ${blueprint.email}`);
    log(`  slug      ${blueprint.slug}  →  /#/book/${blueprint.slug}`);
    log(`  tema      ${blueprint.userType} / ${blueprint.region}`);
    log(`  equipe    ${blueprint.team.length}  serviços ${blueprint.services.length}  clientes ${blueprint.clients.length}  produtos ${blueprint.products.length}`);
  }
  log('');
  log(`Por tenant (esperado): agenda hoje ${expected.todayAppointments}, total ${expected.appointments}, fila ${expected.queueEntries}, public_bookings ${expected.publicBookings}.`);
  log('Financeiro: receitas+despesas em 3 meses. Clube: 1 plano ativo + 1 inativo, 1 assinante active + 1 pending.');
}

async function withClientForTenant(db, envKeys, email, password, useServiceRole, fn) {
  if (useServiceRole) {
    return fn(db.createAdminClient(envKeys.url, envKeys.service), { via: 'service_role' });
  }
  const anon = db.createAnonClient(envKeys.url, envKeys.anon);
  const user = await db.signInOwner(anon, email, password);
  try {
    return await fn(anon, { via: 'owner_session', userId: user.id });
  } finally {
    await anon.auth.signOut();
  }
}

async function resolveExisting(db, envKeys, emails) {
  if (envKeys.service) {
    const admin = db.createAdminClient(envKeys.url, envKeys.service);
    return db.findProfilesByEmails(admin, emails);
  }
  if (!envKeys.anon) return [];
  const anon = db.createAnonClient(envKeys.url, envKeys.anon);
  return db.findProfilesByEmails(anon, emails);
}

async function applySeed(args, blueprints, envKeys) {
  requireWriteConfirm(process.env);
  requireProductionConfirm(envKeys.url, process.env);
  if (!envKeys.url) {
    throw new Error('VITE_SUPABASE_URL (ou SUPABASE_URL) é obrigatória para --apply.');
  }
  const useServiceRole = Boolean(envKeys.service);
  if (!useServiceRole && !envKeys.anon) {
    throw new Error('Informe SUPABASE_SERVICE_ROLE_KEY (preferível) ou VITE_SUPABASE_ANON_KEY + DEMO_SEED_PASSWORD.');
  }
  const password = requireDemoPassword(process.env);
  const db = await loadDb();

  if (isKnownProductionUrl(envKeys.url)) {
    log('AVISO: URL parece o Supabase de PRODUÇÃO. Só tenants DEMO serão tocados.');
  }
  log(`Host: ${new URL(envKeys.url).host}`);
  log(`Auth: ${useServiceRole ? 'service_role (cria usuários se faltar)' : 'login owner (usuários já precisam existir)'}`);

  const summaries = [];
  for (const blueprint of blueprints) {
    log(`\n=== ${blueprint.kind} ${blueprint.email} ===`);
    let tenantId;

    if (useServiceRole) {
      const admin = db.createAdminClient(envKeys.url, envKeys.service);
      const ensured = await db.ensureAuthUser(admin, {
        email: blueprint.email,
        password,
        fullName: blueprint.fullName,
        businessName: blueprint.businessName,
        userType: blueprint.userType,
        region: blueprint.region,
        phone: blueprint.phone,
      });
      tenantId = ensured.user.id;
      log(`  auth ${ensured.created ? 'criado' : 'já existia'}  id=${tenantId}`);
      await db.upsertDemoProfile(admin, tenantId, blueprint);
      await db.upsertBusinessSettings(admin, tenantId, blueprint);
      await db.upsertOnboarding(admin, tenantId);
      const skipped = await db.deleteOperationalData(admin, [tenantId]);
      if (skipped.length) log(`  delete opcional pulado: ${skipped.join('; ')}`);
      const summary = await db.seedTenantContent(admin, tenantId, blueprint);
      summaries.push({ ...summary, tenantId, email: blueprint.email, slug: blueprint.slug });
      log(`  ok  agenda hoje=${summary.appointments.today}  fila=${JSON.stringify(summary.queue)}  bookings=${summary.publicBookings}`);
    } else {
      await withClientForTenant(db, envKeys, blueprint.email, password, false, async (sb, meta) => {
        tenantId = meta.userId;
        log(`  logado id=${tenantId}`);
        await db.upsertDemoProfile(sb, tenantId, blueprint);
        await db.upsertBusinessSettings(sb, tenantId, blueprint);
        await db.upsertOnboarding(sb, tenantId);
        const skipped = await db.deleteOperationalData(sb, [tenantId]);
        if (skipped.length) log(`  delete opcional pulado: ${skipped.join('; ')}`);
        const summary = await db.seedTenantContent(sb, tenantId, blueprint);
        summaries.push({ ...summary, tenantId, email: blueprint.email, slug: blueprint.slug });
        log(`  ok  agenda hoje=${summary.appointments.today}  fila=${JSON.stringify(summary.queue)}  bookings=${summary.publicBookings}`);
      });
    }
  }
  return summaries;
}

async function applyPurge(args, blueprints, envKeys) {
  requireWriteConfirm(process.env);
  requireProductionConfirm(envKeys.url, process.env);
  if (args.deleteAuthUsers) requireDeleteAuthConfirm(process.env);
  if (!envKeys.url) throw new Error('VITE_SUPABASE_URL é obrigatória para --purge.');

  const emails = blueprints.map((item) => item.email);
  if (!emails.every(isAllowedDemoEmail)) {
    throw new Error('Purge recusado: e-mail fora do padrão DEMO.');
  }

  const useServiceRole = Boolean(envKeys.service);
  if (args.deleteAuthUsers && !useServiceRole) {
    throw new Error('--delete-auth-users exige SUPABASE_SERVICE_ROLE_KEY.');
  }

  const db = await loadDb();
  const profiles = await resolveExisting(db, envKeys, emails);
  const allowed = profiles.filter((row) => isAllowedDemoEmail(row.email));
  if (allowed.length !== profiles.length) {
    throw new Error('Purge recusado: profile retornado com e-mail fora do allowlist.');
  }
  if (allowed.length === 0) {
    log('Nenhum tenant DEMO encontrado com esses e-mails. Nada a apagar.');
    return { deleted: 0 };
  }

  const ids = allowed.map((row) => row.id);
  log(`Apagando dados de ${allowed.length} tenant(s):`);
  for (const row of allowed) {
    log(`  ${row.email}  ${row.id}  slug=${row.business_slug || '—'}`);
  }

  if (useServiceRole) {
    const admin = db.createAdminClient(envKeys.url, envKeys.service);
    const skipped = await db.deleteOperationalData(admin, ids);
    if (skipped.length) log(`  delete opcional pulado: ${skipped.join('; ')}`);
    await db.deleteProfileScopedData(admin, ids);
    const { error } = await admin.from('profiles').delete().in('id', ids);
    if (error) throw new Error(`delete profiles: ${error.message}`);
    if (args.deleteAuthUsers) {
      await db.deleteAuthUsers(admin, ids);
      log('  auth.users DEMO removidos.');
    } else {
      log('  profiles apagados; auth.users mantidos (passe --delete-auth-users para remover login).');
    }
  } else {
    const password = requireDemoPassword(process.env);
    for (const row of allowed) {
      await withClientForTenant(db, envKeys, row.email, password, false, async (sb, meta) => {
        if (meta.userId !== row.id) {
          throw new Error(`Sessão ${meta.userId} ≠ profile ${row.id}. Abortando.`);
        }
        const skipped = await db.deleteOperationalData(sb, [row.id]);
        if (skipped.length) log(`  delete opcional pulado: ${skipped.join('; ')}`);
        await db.deleteProfileScopedData(sb, [row.id]);
        log(`  dados operacionais apagados para ${row.email}. Profile/auth mantidos (precisa service_role para apagar conta).`);
      });
    }
  }
  return { deleted: allowed.length, ids };
}

async function inspect(blueprints, envKeys) {
  const emails = blueprints.map((item) => item.email);
  if (!envKeys.url) {
    log('Sem URL — inspeção de banco pulada.');
    return [];
  }
  if (!envKeys.service && !envKeys.anon) {
    log('Sem anon/service key — inspeção de banco pulada.');
    return [];
  }
  try {
    const db = await loadDb();
    const profiles = await resolveExisting(db, envKeys, emails);
    if (!profiles.length) {
      log('Banco alcançável: nenhum profile DEMO ainda.');
      return [];
    }
    log('Profiles DEMO encontrados:');
    for (const row of profiles) {
      log(`  ${row.email}  ${row.id}  ${row.business_name || '—'}  slug=${row.business_slug || '—'}  ${row.user_type || ''}`);
    }
    return profiles;
  } catch (error) {
    log(`Inspeção falhou (credencial/rede): ${error.message}`);
    return [];
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (args.help) {
    log(helpText());
    return;
  }

  const blueprints = listBlueprints(args.tenants, process.env);
  const envKeys = loadEnvKeys();
  const mode = args.purge ? 'PURGE' : args.apply ? 'APPLY' : args.inspect ? 'INSPECT' : 'DRY-RUN';

  printPlan(blueprints, mode);
  if (envKeys.url) {
    log(`\nSupabase: ${envKeys.url}`);
    if (isKnownProductionUrl(envKeys.url)) {
      log('AVISO: host conhecido de PRODUÇÃO. .env.local do time costuma apontar para cá.');
    }
  } else {
    log('\nSem VITE_SUPABASE_URL neste ambiente — dry-run só mostra o plano.');
  }

  if (!args.apply && !args.purge) {
    await inspect(blueprints, envKeys);
    log('\nNada foi escrito. Para gravar: DEMO_SEED_CONFIRM=' + WRITE_CONFIRM_VALUE + ' node scripts/seed-demo.mjs --apply');
    log('Documentação: docs/demo-seed.md');
    return;
  }

  if (args.purge) {
    const result = await applyPurge(args, blueprints, envKeys);
    if (args.json) log(JSON.stringify(result, null, 2));
    log('\nPurge concluído.');
    return;
  }

  const summaries = await applySeed(args, blueprints, envKeys);
  if (args.json) log(JSON.stringify(summaries, null, 2));
  log('\nSeed concluído. Login com os e-mails DEMO e DEMO_SEED_PASSWORD.');
  log('Rotas públicas: ' + blueprints.map((item) => `/#/book/${item.slug}`).join('  '));
}

main().catch((error) => {
  console.error('\nFalha:', error.message || error);
  process.exit(1);
});
