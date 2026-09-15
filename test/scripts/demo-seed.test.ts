import { describe, expect, it } from 'vitest';
import {
  BLOCKED_EMAILS,
  BUSINESS_PREFIX,
  CONFIRM_PURGE,
  CONFIRM_SEED,
  DEFAULT_EMAILS,
  MARKER,
  PURGE_TABLES,
  REMOTE_CONFIRM_VALUE,
  SLUG_PREFIX,
  SeedSafetyError,
  addDaysYmd,
  assertDemoEmail,
  assertWriteAllowed,
  canClaimAsDemo,
  dropColumn,
  isAllowedDemoEmail,
  isDemoProfileRow,
  isRemoteSupabaseUrl,
  isoFromZoned,
  missingColumnFromError,
  monthIndexFromYmd,
  note,
  parseArgs,
  resolveDemoEmails,
  todayAgendaPlan,
  weekdayOpenHours,
  yearFromYmd,
  ymdInZone,
} from '../../scripts/demo-seed/lib.mjs';
import { assertFixtureCoverage, buildTenantSpecs } from '../../scripts/demo-seed/fixtures.mjs';

describe('demo-seed safety rails', () => {
  it('aceita só o padrão agendix.demo.barber|beauty', () => {
    expect(isAllowedDemoEmail(DEFAULT_EMAILS.barber)).toBe(true);
    expect(isAllowedDemoEmail(DEFAULT_EMAILS.beauty)).toBe(true);
    expect(isAllowedDemoEmail('agendix.demo.barber+prints@example.com')).toBe(true);
    expect(isAllowedDemoEmail('bob.teste@gmail.com')).toBe(false);
    expect(isAllowedDemoEmail('rhianlepore@gmail.com')).toBe(false);
    expect(isAllowedDemoEmail('agendix.demo.other@example.com')).toBe(false);
    expect(isAllowedDemoEmail('demo@example.com')).toBe(false);
    expect(() => assertDemoEmail('owner@salon.com')).toThrow(SeedSafetyError);
  });

  it('bloqueia e-mails conhecidos de teste/produção mesmo se alguém forçar o padrão', () => {
    for (const email of BLOCKED_EMAILS) {
      expect(isAllowedDemoEmail(email)).toBe(false);
    }
  });

  it('não deixa barber e beauty apontarem para o mesmo e-mail', () => {
    expect(() => resolveDemoEmails({
      DEMO_BARBER_EMAIL: DEFAULT_EMAILS.barber,
      DEMO_BEAUTY_EMAIL: DEFAULT_EMAILS.barber,
    })).toThrow(/iguais/);
  });

  it('recusa e-mail de override fora do padrão', () => {
    expect(() => resolveDemoEmails({
      DEMO_BARBER_EMAIL: 'bob.teste@gmail.com',
      DEMO_BEAUTY_EMAIL: DEFAULT_EMAILS.beauty,
    })).toThrow(SeedSafetyError);
  });

  it('só considera perfil reivindicável se for demo ou conta vazia recém-criada', () => {
    const email = DEFAULT_EMAILS.barber;
    expect(canClaimAsDemo(null, email)).toBe(true);
    expect(isDemoProfileRow({
      email,
      business_name: `${BUSINESS_PREFIX} Barbearia Corte Fino`,
      business_slug: 'demo-barbearia-corte-fino',
      role: 'owner',
    }, email)).toBe(true);
    expect(isDemoProfileRow({
      email,
      business_name: '',
      business_slug: null,
      role: 'owner',
    }, email)).toBe(true);
    expect(isDemoProfileRow({
      email,
      business_name: 'Barbearia Silva',
      business_slug: 'barbearia-silva',
      role: 'owner',
      activation_completed: true,
    }, email)).toBe(false);
    expect(isDemoProfileRow({
      email,
      business_name: `${BUSINESS_PREFIX} X`,
      role: 'staff',
    }, email)).toBe(false);
    expect(isDemoProfileRow({
      email: 'cliente@real.com',
      business_name: `${BUSINESS_PREFIX} Hack`,
      business_slug: 'demo-hack',
    }, email)).toBe(false);
  });

  it('dry-run é o padrão; apply exige frase de confirmação', () => {
    const args = parseArgs([]);
    expect(args.apply).toBe(false);
    expect(() => parseArgs(['--tenant=finance'])).toThrow(SeedSafetyError);
    expect(parseArgs(['--tenant=beauty', '--refresh']).tenant).toBe('beauty');

    expect(assertWriteAllowed({
      apply: false,
      confirm: null,
      expectedConfirm: CONFIRM_SEED,
      allowRemote: false,
      supabaseUrl: 'http://localhost:54321',
    }).dryRun).toBe(true);

    expect(() => assertWriteAllowed({
      apply: true,
      confirm: 'yes',
      expectedConfirm: CONFIRM_SEED,
      allowRemote: false,
      supabaseUrl: 'http://localhost:54321',
    })).toThrow(/SEED_DEMO_TENANTS/);

    expect(assertWriteAllowed({
      apply: true,
      confirm: CONFIRM_SEED,
      expectedConfirm: CONFIRM_SEED,
      allowRemote: false,
      supabaseUrl: 'http://127.0.0.1:54321',
    })).toEqual({ dryRun: false, remote: false });
  });

  it('banco remoto exige --allow-remote e env de confirmação', () => {
    expect(isRemoteSupabaseUrl('https://xyz.supabase.co')).toBe(true);
    expect(isRemoteSupabaseUrl('http://localhost:54321')).toBe(false);

    expect(() => assertWriteAllowed({
      apply: true,
      confirm: CONFIRM_SEED,
      expectedConfirm: CONFIRM_SEED,
      allowRemote: false,
      supabaseUrl: 'https://xyz.supabase.co',
    })).toThrow(/produção|remoto/i);

    expect(() => assertWriteAllowed({
      apply: true,
      confirm: CONFIRM_SEED,
      expectedConfirm: CONFIRM_SEED,
      allowRemote: true,
      supabaseUrl: 'https://xyz.supabase.co',
      remoteEnvValue: 'yes',
    })).toThrow(REMOTE_CONFIRM_VALUE);

    expect(assertWriteAllowed({
      apply: true,
      confirm: CONFIRM_PURGE,
      expectedConfirm: CONFIRM_PURGE,
      allowRemote: true,
      supabaseUrl: 'https://xyz.supabase.co',
      remoteEnvValue: REMOTE_CONFIRM_VALUE,
    })).toEqual({ dryRun: false, remote: true });
  });
});

describe('demo-seed fixtures', () => {
  it('cobre barber e beauty com volume para prints', () => {
    const specs = buildTenantSpecs();
    expect(assertFixtureCoverage(specs)).toEqual([]);
    expect(specs.barber.userType).toBe('barber');
    expect(specs.beauty.userType).toBe('beauty');
    expect(specs.barber.slug.startsWith(SLUG_PREFIX)).toBe(true);
    expect(specs.beauty.businessName.startsWith(BUSINESS_PREFIX)).toBe(true);
    expect(specs.barber.pix.pix_key_value).toContain('agendix.demo');
    expect(todayAgendaPlan().some((slot) => slot.status === 'NoShow')).toBe(true);
    expect(todayAgendaPlan().length).toBeGreaterThanOrEqual(8);
    expect(weekdayOpenHours().sun.isOpen).toBe(false);
    expect(weekdayOpenHours().mon.blocks[0]).toEqual({ start: '09:00', end: '19:00' });
    expect(note('x')).toContain(MARKER);
  });

  it('usa chaves de tenant distintas por domínio', () => {
    const tables = Object.fromEntries(PURGE_TABLES.map((row) => [row.table, row.column]));
    expect(tables.appointments).toBe('user_id');
    expect(tables.finance_records).toBe('user_id');
    expect(tables.queue_entries).toBe('business_id');
    expect(tables.public_bookings).toBe('business_id');
    expect(tables.products).toBe('company_id');
    expect(tables.onboarding_progress).toBe('company_id');
    expect(PURGE_TABLES.find((row) => row.table === 'profiles')).toBeUndefined();
  });
});

describe('demo-seed time helpers', () => {
  it('monta ISO em BRT sem deslocar o calendário', () => {
    expect(addDaysYmd('2026-09-15', 1)).toBe('2026-09-16');
    expect(monthIndexFromYmd('2026-09-15')).toBe(8);
    expect(yearFromYmd('2026-09-15')).toBe(2026);
    expect(isoFromZoned('2026-09-15', '09:00')).toBe('2026-09-15T12:00:00.000Z');
    expect(ymdInZone(new Date('2026-09-15T15:00:00-03:00'))).toBe('2026-09-15');
  });

  it('purge recusa tenantId que não é UUID', async () => {
    const { purgeDemoTenantRows } = await import('../../scripts/demo-seed/db.mjs');
    await expect(purgeDemoTenantRows({}, 'not-a-tenant', { dryRun: false })).rejects.toThrow(/UUID/);
    await expect(purgeDemoTenantRows({}, '', { dryRun: false })).rejects.toThrow(/vazio/);
  });

  it('extrai coluna faltante da mensagem PostgREST', () => {
    expect(missingColumnFromError("Could not find the 'business_id' column of 'team_members'")).toBe('business_id');
    expect(dropColumn([{ a: 1, b: 2 }], 'b')).toEqual([{ a: 1 }]);
  });
});
