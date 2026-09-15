#!/usr/bin/env node
/**
 * Rollback do seed demo. Só apaga tenants cujo e-mail casa com
 * agendix.demo.(barber|beauty)@… E o perfil está marcado DEMO.
 * Nunca trunca tabela. Nunca apaga tenant alheio.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUSINESS_PREFIX,
  CONFIRM_PURGE,
  SLUG_PREFIX,
  SeedSafetyError,
  assertWriteAllowed,
  isAllowedDemoEmail,
  loadEnvFile,
  parseArgs,
  resolveDemoEmails,
} from './lib.mjs';
import {
  assertProfileLock,
  createClients,
  deleteAuthUser,
  loadProfileByEmail,
  purgeDemoTenantRows,
} from './db.mjs';
import { buildTenantSpecs } from './fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function help() {
  console.log(`
AgendiX — apaga SOMENTE os tenants demo

  node scripts/demo-seed/purge-demo.mjs                  # dry-run
  node scripts/demo-seed/purge-demo.mjs --apply --confirm=${CONFIRM_PURGE}

Requer o mesmo --allow-remote + DEMO_SEED_REMOTE se o banco for remoto.
SQL equivalente (revisar o SELECT antes): scripts/demo-seed/purge-demo.sql
`);
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
    expectedConfirm: CONFIRM_PURGE,
    allowRemote: args.allowRemote,
    supabaseUrl: url || 'http://localhost',
    remoteEnvValue: process.env.DEMO_SEED_REMOTE,
  });

  const emails = resolveDemoEmails(process.env);
  const specs = buildTenantSpecs(emails);
  const selected = args.tenant === 'all'
    ? [specs.barber, specs.beauty]
    : [specs[args.tenant]];

  console.log('AgendiX demo purge');
  console.log(`modo: ${dryRun ? 'DRY-RUN' : 'APPLY'} · banco: ${remote ? 'REMOTO' : 'local'}`);

  if (dryRun && (!url || !anonKey)) {
    console.log('sem credenciais — plano local:');
    for (const spec of selected) {
      console.log(`  apagaria ${spec.email} / ${spec.slug} (se existir e estiver marcado DEMO)`);
    }
    console.log('Nenhuma escrita.');
    return;
  }

  if (!serviceKey && args.apply) {
    throw new SeedSafetyError(
      'Purge com --apply exige SUPABASE_SERVICE_ROLE_KEY (precisa apagar auth.users do demo).',
    );
  }

  const { admin, anon } = createClients({ url, anonKey, serviceKey });
  const client = admin || anon;

  for (const spec of selected) {
    if (!isAllowedDemoEmail(spec.email)) {
      throw new SeedSafetyError(`e-mail fora do padrão: ${spec.email}`);
    }
    const profile = await loadProfileByEmail(client, spec.email);
    if (!profile) {
      console.log(`  ${spec.key}: perfil não existe (${spec.email}) — nada a fazer`);
      continue;
    }
    await assertProfileLock(profile, spec);
    const marked =
      String(profile.business_name || '').startsWith(BUSINESS_PREFIX) ||
      String(profile.business_slug || '').startsWith(SLUG_PREFIX);
    if (!marked) {
      throw new SeedSafetyError(
        `ABORT: ${spec.email} passou no e-mail mas o nome/slug não está marcado DEMO. Recuso apagar.`,
      );
    }
    console.log(`  ${spec.key}: apagando tenant ${profile.id} (${profile.business_slug})`);
    const summary = await purgeDemoTenantRows(client, profile.id, { dryRun, log: console.log });
    if (!dryRun) {
      const { error } = await client.from('profiles').delete().eq('id', profile.id).eq('email', spec.email);
      if (error) throw new SeedSafetyError(`delete profile: ${error.message}`);
      await deleteAuthUser(admin, profile.id, spec.email, { dryRun, log: console.log });
    }
    if (args.json) console.log(JSON.stringify({ email: spec.email, id: profile.id, summary }, null, 2));
  }

  console.log('Purge concluído. Tenants reais não foram listados nem tocados.');
}

main().catch((error) => {
  console.error(error instanceof SeedSafetyError ? `✗ ${error.message}` : error);
  process.exit(1);
});
