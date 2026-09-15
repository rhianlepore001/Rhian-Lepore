import {
  DEMO_EMAIL_PATTERN,
  DEMO_SLUG_PATTERN,
  DELETE_AUTH_CONFIRM_VALUE,
  KNOWN_PRODUCTION_HOST_FRAGMENT,
  PRODUCTION_CONFIRM_VALUE,
  TENANT_KEYS,
  WRITE_CONFIRM_VALUE,
} from './constants.mjs';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isAllowedDemoEmail(email) {
  return DEMO_EMAIL_PATTERN.test(normalizeEmail(email));
}

export function isAllowedDemoSlug(slug) {
  return DEMO_SLUG_PATTERN.test(String(slug || '').trim());
}

export function demoKindFromEmail(email) {
  const match = normalizeEmail(email).match(/^agendix\.demo\.(barber|beauty)/i);
  return match ? match[1].toLowerCase() : null;
}

export function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
}

/**
 * Recusa lista vazia ou IDs que não parecem UUID.
 * Impede DELETE/UPDATE sem filtro de tenant DEMO.
 */
export function assertDemoTenantIds(ids, label = 'tenant') {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`Recusado: lista de ${label} vazia — recusar-se-ia a apagar o banco inteiro.`);
  }
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (unique.length !== ids.length) {
    throw new Error(`Recusado: ${label} com id vazio ou duplicado.`);
  }
  for (const id of unique) {
    if (!isUuidLike(id)) {
      throw new Error(`Recusado: ${label} id não parece UUID: ${id}`);
    }
  }
  return unique;
}

export function supabaseHost(url) {
  try {
    return new URL(String(url || '')).host;
  } catch {
    return '';
  }
}

export function isKnownProductionUrl(url) {
  const host = supabaseHost(url);
  return host.includes(KNOWN_PRODUCTION_HOST_FRAGMENT);
}

export function isRemoteSupabaseUrl(url) {
  const host = supabaseHost(url).toLowerCase();
  if (!host) return true;
  return !(host.includes('localhost') || host.startsWith('127.') || host.endsWith('.local') || host.includes('kong:'));
}

export function requireWriteConfirm(env = process.env) {
  const value = String(env.DEMO_SEED_CONFIRM || '').trim();
  if (value !== WRITE_CONFIRM_VALUE) {
    throw new Error(
      `Escrita bloqueada. Defina DEMO_SEED_CONFIRM=${WRITE_CONFIRM_VALUE} (só tenants DEMO).`,
    );
  }
}

export function requireProductionConfirm(url, env = process.env) {
  if (!isKnownProductionUrl(url)) return;
  const value = String(env.DEMO_SEED_PRODUCTION_OK || '').trim();
  if (value !== PRODUCTION_CONFIRM_VALUE) {
    throw new Error(
      `A URL do Supabase parece o projeto de PRODUÇÃO. ` +
        `Defina DEMO_SEED_PRODUCTION_OK=${PRODUCTION_CONFIRM_VALUE} se for mesmo isso. ` +
        `O seed só toca e-mails agendix.demo.(barber|beauty)@example.com.`,
    );
  }
}

export function requireDeleteAuthConfirm(env = process.env) {
  const value = String(env.DEMO_SEED_DELETE_AUTH || '').trim();
  if (value !== DELETE_AUTH_CONFIRM_VALUE) {
    throw new Error(
      `Apagar auth.users bloqueado. Defina DEMO_SEED_DELETE_AUTH=${DELETE_AUTH_CONFIRM_VALUE}.`,
    );
  }
}

export function parseTenantsFlag(raw) {
  if (raw == null || raw === '') return [...TENANT_KEYS];
  const parts = String(raw)
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error('--tenants vazio. Use barber, beauty ou barber,beauty.');
  }
  for (const part of parts) {
    if (!TENANT_KEYS.includes(part)) {
      throw new Error(`Tenant desconhecido "${part}". Use: ${TENANT_KEYS.join(', ')}.`);
    }
  }
  return [...new Set(parts)];
}

export function parseArgs(argv) {
  const args = {
    apply: false,
    purge: false,
    deleteAuthUsers: false,
    inspect: false,
    help: false,
    json: false,
    tenants: [...TENANT_KEYS],
  };

  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (token === '--apply') args.apply = true;
    else if (token === '--purge') args.purge = true;
    else if (token === '--delete-auth-users') args.deleteAuthUsers = true;
    else if (token === '--inspect') args.inspect = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--json') args.json = true;
    else if (token === '--tenants') {
      args.tenants = parseTenantsFlag(rest.shift());
    } else if (token.startsWith('--tenants=')) {
      args.tenants = parseTenantsFlag(token.slice('--tenants='.length));
    } else if (token.startsWith('-')) {
      throw new Error(`Flag desconhecida: ${token}. Veja --help.`);
    } else {
      throw new Error(`Argumento inesperado: ${token}. Veja --help.`);
    }
  }

  if (args.apply && args.purge) {
    throw new Error('Use --apply ou --purge, não os dois.');
  }
  if (args.deleteAuthUsers && !args.purge) {
    throw new Error('--delete-auth-users só vale com --purge.');
  }
  return args;
}

export function resolveDemoEmail(kind, env = process.env) {
  const envKey = kind === 'barber' ? 'DEMO_SEED_EMAIL_BARBER' : 'DEMO_SEED_EMAIL_BEAUTY';
  const fromEnv = env[envKey];
  const email = normalizeEmail(fromEnv || (kind === 'barber'
    ? 'agendix.demo.barber@example.com'
    : 'agendix.demo.beauty@example.com'));
  if (!isAllowedDemoEmail(email)) {
    throw new Error(
      `${envKey} inválido (${email}). Precisa casar com agendix.demo.(barber|beauty)@example.com`,
    );
  }
  const parsedKind = demoKindFromEmail(email);
  if (parsedKind !== kind) {
    throw new Error(`${envKey} é de ${parsedKind}, esperado ${kind}.`);
  }
  return email;
}

export function resolveDemoSlug(kind, env = process.env) {
  const envKey = kind === 'barber' ? 'DEMO_SEED_SLUG_BARBER' : 'DEMO_SEED_SLUG_BEAUTY';
  const fallback = kind === 'barber' ? 'demo-barbearia-corte-fino' : 'demo-studio-luna-belle';
  const slug = String(env[envKey] || fallback).trim().toLowerCase();
  if (!isAllowedDemoSlug(slug)) {
    throw new Error(`${envKey} inválido (${slug}). Precisa começar com demo- e ser slug-safe.`);
  }
  return slug;
}

export function requireDemoPassword(env = process.env) {
  const password = env.DEMO_SEED_PASSWORD;
  if (!password || String(password).length < 8) {
    throw new Error('DEMO_SEED_PASSWORD ausente ou com menos de 8 caracteres (não commitar).');
  }
  return String(password);
}

export function helpText() {
  return `
AgendiX — seed DEMO isolado (prints da landing)

Por padrão é DRY-RUN: não escreve nada.

  node scripts/seed-demo.mjs
  node scripts/seed-demo.mjs --inspect
  node scripts/seed-demo.mjs --apply
  node scripts/seed-demo.mjs --purge
  node scripts/seed-demo.mjs --purge --delete-auth-users
  node scripts/seed-demo.mjs --tenants barber
  node scripts/seed-demo.mjs --tenants beauty

Trilhos:
  - Só e-mails agendix.demo.(barber|beauty)@example.com
  - DEMO_SEED_CONFIRM=${WRITE_CONFIRM_VALUE}
  - Produção conhecida: DEMO_SEED_PRODUCTION_OK=${PRODUCTION_CONFIRM_VALUE}
  - Apagar auth: DEMO_SEED_DELETE_AUTH=${DELETE_AUTH_CONFIRM_VALUE}
  - Nunca deleta sem lista de tenant IDs UUID

Docs: docs/demo-seed.md
`.trim();
}
