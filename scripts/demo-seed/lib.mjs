/**
 * Trilhos de segurança e helpers do seed demo AgendiX.
 * Sem secrets. Sem DELETE sem filtro de tenant demo.
 */

export const MARKER = '[AGENDIX-DEMO]';
export const BUSINESS_PREFIX = 'DEMO ·';
export const SLUG_PREFIX = 'demo-';

/** E-mails reservados a tenants fictícios. Não opera fora deste padrão. */
export const DEMO_EMAIL_RE =
  /^agendix\.demo\.(barber|beauty)(\+[a-z0-9._-]+)?@[a-z0-9.-]+$/i;

export const DEFAULT_EMAILS = {
  barber: 'agendix.demo.barber@example.com',
  beauty: 'agendix.demo.beauty@example.com',
};

export const CONFIRM_SEED = 'SEED_DEMO_TENANTS';
export const CONFIRM_PURGE = 'DELETE_DEMO_TENANTS';
export const REMOTE_CONFIRM_ENV = 'DEMO_SEED_REMOTE';
export const REMOTE_CONFIRM_VALUE = 'I_UNDERSTAND_REMOTE_DB';

export const TZ = 'America/Sao_Paulo';
export const BRT_OFFSET = '-03:00';

export const BLOCKED_EMAILS = [
  'bob.teste@gmail.com',
  'rhianlepore@gmail.com',
];

export class SeedSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SeedSafetyError';
  }
}

export function isAllowedDemoEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (BLOCKED_EMAILS.includes(normalized)) return false;
  return DEMO_EMAIL_RE.test(normalized);
}

export function assertDemoEmail(email, label = 'email') {
  if (!isAllowedDemoEmail(email)) {
    throw new SeedSafetyError(
      `${label} rejeitado: "${email}". Use o padrão agendix.demo.barber|beauty@… (ex.: ${DEFAULT_EMAILS.barber}).`,
    );
  }
  return email.trim().toLowerCase();
}

export function isDemoProfileRow(profile, expectedEmail) {
  if (!profile) return false;
  const email = String(profile.email || '').trim().toLowerCase();
  if (!isAllowedDemoEmail(email)) return false;
  if (expectedEmail && email !== expectedEmail.trim().toLowerCase()) return false;
  if (profile.role === 'staff') return false;
  const name = String(profile.business_name || '');
  const slug = String(profile.business_slug || '');
  const markedName = name.startsWith(BUSINESS_PREFIX) || name.includes(MARKER);
  const markedSlug = slug.startsWith(SLUG_PREFIX);
  const emptyNew =
    !profile.business_slug &&
    (!profile.business_name || profile.business_name === '') &&
    !profile.activation_completed;
  return markedName || markedSlug || emptyNew;
}

export function canClaimAsDemo(profile, expectedEmail) {
  if (!profile) return true;
  return isDemoProfileRow(profile, expectedEmail);
}

export function isRemoteSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return true;
  try {
    const hostname = new URL(url).hostname;
    return !['localhost', '127.0.0.1', '0.0.0.0', 'supabase_kong', 'kong'].includes(hostname);
  } catch {
    return true;
  }
}

export function parseArgs(argv, { defaultConfirm } = {}) {
  const args = {
    apply: false,
    refresh: false,
    allowRemote: false,
    json: false,
    tenant: 'all',
    confirm: null,
  };
  for (const raw of argv) {
    if (raw === '--apply') args.apply = true;
    else if (raw === '--dry-run') args.apply = false;
    else if (raw === '--refresh') args.refresh = true;
    else if (raw === '--allow-remote') args.allowRemote = true;
    else if (raw === '--json') args.json = true;
    else if (raw.startsWith('--tenant=')) {
      const value = raw.slice('--tenant='.length);
      if (!['all', 'barber', 'beauty'].includes(value)) {
        throw new SeedSafetyError(`--tenant inválido: ${value}. Use all|barber|beauty.`);
      }
      args.tenant = value;
    } else if (raw.startsWith('--confirm=')) {
      args.confirm = raw.slice('--confirm='.length);
    } else if (raw === '--help' || raw === '-h') {
      args.help = true;
    } else if (raw.startsWith('-')) {
      throw new SeedSafetyError(`flag desconhecida: ${raw}`);
    }
  }
  if (defaultConfirm && !args.confirm) args.expectedConfirm = defaultConfirm;
  return args;
}

export function assertWriteAllowed({ apply, confirm, expectedConfirm, allowRemote, supabaseUrl, remoteEnvValue = undefined }) {
  if (!apply) return { dryRun: true, remote: isRemoteSupabaseUrl(supabaseUrl) };
  if (confirm !== expectedConfirm) {
    throw new SeedSafetyError(
      `Escrita recusada. Passe --apply --confirm=${expectedConfirm}`,
    );
  }
  const remote = isRemoteSupabaseUrl(supabaseUrl);
  if (remote) {
    if (!allowRemote) {
      throw new SeedSafetyError(
        'A URL do Supabase não é localhost. .env.local do time costuma apontar para produção. ' +
          'Para seguir, adicione --allow-remote e DEMO_SEED_REMOTE=I_UNDERSTAND_REMOTE_DB.',
      );
    }
    if (remoteEnvValue !== REMOTE_CONFIRM_VALUE) {
      throw new SeedSafetyError(
        `Banco remoto exige ${REMOTE_CONFIRM_ENV}=${REMOTE_CONFIRM_VALUE} (além de --allow-remote).`,
      );
    }
  }
  return { dryRun: false, remote };
}

export function ymdInZone(date = new Date(), timeZone = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysYmd(ymd, days) {
  const [year, month, day] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoFromZoned(ymd, hm, offset = BRT_OFFSET) {
  return new Date(`${ymd}T${hm}:00${offset}`).toISOString();
}

export function monthIndexFromYmd(ymd) {
  const month = Number(ymd.slice(5, 7));
  return month - 1;
}

export function yearFromYmd(ymd) {
  return Number(ymd.slice(0, 4));
}

export function weekdayOpenHours() {
  return {
    mon: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    tue: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    wed: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    thu: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    fri: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
    sun: { isOpen: false, blocks: [] },
  };
}

export function loadEnvFile(filePath, { readFileSync, existsSync }) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function resolveDemoEmails(env = process.env) {
  const barber = env.DEMO_BARBER_EMAIL || DEFAULT_EMAILS.barber;
  const beauty = env.DEMO_BEAUTY_EMAIL || DEFAULT_EMAILS.beauty;
  assertDemoEmail(barber, 'DEMO_BARBER_EMAIL');
  assertDemoEmail(beauty, 'DEMO_BEAUTY_EMAIL');
  if (barber.trim().toLowerCase() === beauty.trim().toLowerCase()) {
    throw new SeedSafetyError('DEMO_BARBER_EMAIL e DEMO_BEAUTY_EMAIL não podem ser iguais.');
  }
  return {
    barber: barber.trim().toLowerCase(),
    beauty: beauty.trim().toLowerCase(),
  };
}

export function requireSeedPassword(env = process.env) {
  const password = env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12) {
    throw new SeedSafetyError(
      'DEMO_SEED_PASSWORD é obrigatória no --apply (mínimo 12 caracteres). Não commite a senha.',
    );
  }
  return password;
}

export function missingColumnFromError(message) {
  if (!message) return null;
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" of relation/i,
    /column "([^"]+)" does not exist/i,
  ];
  for (const re of patterns) {
    const match = message.match(re);
    if (match) return match[1];
  }
  return null;
}

export function relationMissing(message) {
  if (!message) return false;
  return /relation .* does not exist/i.test(message) || /Could not find the table/i.test(message);
}

export function dropColumn(rows, column) {
  return rows.map((row) => {
    const next = { ...row };
    delete next[column];
    return next;
  });
}

/** Ordem de DELETE (filhos antes de pais). Nunca truncar. */
export const PURGE_TABLES = [
  { table: 'queue_payments', column: 'business_id' },
  { table: 'queue_entries', column: 'business_id' },
  { table: 'membership_payments', column: 'user_id' },
  { table: 'client_memberships', column: 'user_id' },
  { table: 'membership_plans', column: 'user_id' },
  { table: 'appointment_product_lines', column: 'company_id' },
  { table: 'product_sales', column: 'company_id' },
  { table: 'products', column: 'company_id' },
  { table: 'public_bookings', column: 'business_id' },
  { table: 'public_clients', column: 'business_id' },
  { table: 'finance_records', column: 'user_id' },
  { table: 'appointments', column: 'user_id' },
  { table: 'clients', column: 'user_id' },
  { table: 'services', column: 'user_id' },
  { table: 'service_categories', column: 'user_id' },
  { table: 'goal_settings', column: 'user_id' },
  { table: 'onboarding_progress', column: 'company_id' },
  { table: 'team_members', column: 'user_id' },
  { table: 'business_settings', column: 'user_id' },
];

export function tenantLockSql({ email, tenantId, slug }) {
  return {
    email,
    tenantId,
    slug,
    profileFilter: {
      id: tenantId,
      email,
    },
  };
}

export function todayAgendaPlan() {
  return [
    { time: '09:00', status: 'Completed', origin: 'agenda', duration: 45 },
    { time: '10:00', status: 'Confirmed', origin: 'agenda', duration: 30 },
    { time: '11:00', status: 'Confirmed', origin: 'booking', duration: 60 },
    { time: '12:00', status: 'Pending', origin: 'agenda', duration: 30 },
    { time: '14:00', status: 'Confirmed', origin: 'agenda', duration: 45 },
    { time: '15:30', status: 'Confirmed', origin: 'agenda', duration: 30 },
    { time: '16:00', status: 'NoShow', origin: 'agenda', duration: 30 },
    { time: '17:00', status: 'Confirmed', origin: 'agenda', duration: 60 },
    { time: '18:00', status: 'Pending', origin: 'booking', duration: 30 },
  ];
}

export function note(text = '') {
  return text ? `${MARKER} ${text}` : MARKER;
}
