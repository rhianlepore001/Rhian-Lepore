import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DELETE_AUTH_CONFIRM_VALUE,
  DEMO_EMAIL_PATTERN,
  DEMO_MARKER,
  OPERATIONAL_DELETE_ORDER,
  PRODUCTION_CONFIRM_VALUE,
  WRITE_CONFIRM_VALUE,
} from '../../scripts/demo-seed/constants.mjs';
import { listBlueprints } from '../../scripts/demo-seed/fixtures.mjs';
import {
  buildAppointmentRows,
  buildFinanceRows,
  buildPublicBookingRows,
  buildQueueRows,
  expectedSeedCounts,
  financeMonthSpan,
  isoDateInZone,
  summarizeAppointments,
  zonedIso,
} from '../../scripts/demo-seed/payloads.mjs';
import {
  assertDemoTenantIds,
  demoKindFromEmail,
  isAllowedDemoEmail,
  isAllowedDemoSlug,
  isKnownProductionUrl,
  parseArgs,
  requireDeleteAuthConfirm,
  requireProductionConfirm,
  requireWriteConfirm,
  resolveDemoEmail,
  resolveDemoSlug,
} from '../../scripts/demo-seed/safety.mjs';

const NOW = new Date('2026-09-15T17:36:00.000Z'); // 14:36 em São Paulo
const TENANT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function fakeTeam() {
  return [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Rafael Mendes' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Lucas Oliveira' },
    { id: '33333333-3333-4333-8333-333333333333', name: 'Diego Costa' },
  ];
}

function fakeClients() {
  return Array.from({ length: 18 }, (_, index) => ({
    id: `c${String(index).padStart(7, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`,
    name: `Cliente ${index}`,
    phone: `(11) 97000-10${String(index).padStart(2, '0')}`,
  }));
}

function fakeServices() {
  return [
    { id: 's1', name: 'Corte masculino', price: 55, duration_minutes: 30 },
    { id: 's2', name: 'Barba completa', price: 40, duration_minutes: 30 },
    { id: 's3', name: 'Corte + barba', price: 85, duration_minutes: 60 },
    { id: 's4', name: 'Sobrancelha', price: 20, duration_minutes: 15 },
    { id: 's5', name: 'Pigmentação', price: 90, duration_minutes: 45 },
    { id: 's6', name: 'Ritual VIP', price: 140, duration_minutes: 75 },
  ];
}

describe('demo-seed safety', () => {
  it('aceita só o padrão de e-mail DEMO', () => {
    expect(isAllowedDemoEmail('agendix.demo.barber@example.com')).toBe(true);
    expect(isAllowedDemoEmail('agendix.demo.beauty+prints@example.com')).toBe(true);
    expect(isAllowedDemoEmail('bob.teste@gmail.com')).toBe(false);
    expect(isAllowedDemoEmail('agendix.demo.barber@gmail.com')).toBe(false);
    expect(isAllowedDemoEmail('owner@example.com')).toBe(false);
    expect(DEMO_EMAIL_PATTERN.test('agendix.demo.barber@example.com')).toBe(true);
  });

  it('deriva o nicho a partir do e-mail', () => {
    expect(demoKindFromEmail('agendix.demo.barber@example.com')).toBe('barber');
    expect(demoKindFromEmail('agendix.demo.beauty@example.com')).toBe('beauty');
  });

  it('slug DEMO precisa do prefixo demo-', () => {
    expect(isAllowedDemoSlug('demo-barbearia-corte-fino')).toBe(true);
    expect(isAllowedDemoSlug('barbearia-silva')).toBe(false);
    expect(isAllowedDemoSlug('../admin')).toBe(false);
  });

  it('recusa lista vazia de tenants antes de qualquer delete', () => {
    expect(() => assertDemoTenantIds([])).toThrow(/vazia/);
    expect(() => assertDemoTenantIds(['not-a-uuid'])).toThrow(/UUID/);
    expect(assertDemoTenantIds([TENANT])).toEqual([TENANT]);
  });

  it('exige confirmations explícitas de escrita', () => {
    expect(() => requireWriteConfirm({})).toThrow(/WRITE_DEMO_TENANTS_ONLY/);
    expect(() => requireWriteConfirm({ DEMO_SEED_CONFIRM: WRITE_CONFIRM_VALUE })).not.toThrow();
    expect(() => requireProductionConfirm('https://lcqwrngscsziysyfhpfj.supabase.co', {})).toThrow(/PRODUÇÃO/);
    expect(() => requireProductionConfirm(
      'https://lcqwrngscsziysyfhpfj.supabase.co',
      { DEMO_SEED_PRODUCTION_OK: PRODUCTION_CONFIRM_VALUE },
    )).not.toThrow();
    expect(() => requireDeleteAuthConfirm({})).toThrow(/DELETE_DEMO_AUTH_USERS/);
    expect(() => requireDeleteAuthConfirm({ DEMO_SEED_DELETE_AUTH: DELETE_AUTH_CONFIRM_VALUE })).not.toThrow();
  });

  it('reconhece o host de produção conhecido', () => {
    expect(isKnownProductionUrl('https://lcqwrngscsziysyfhpfj.supabase.co')).toBe(true);
    expect(isKnownProductionUrl('http://localhost:54321')).toBe(false);
  });

  it('parseArgs bloqueia combinações perigosas', () => {
    expect(parseArgs([]).apply).toBe(false);
    expect(parseArgs(['--tenants', 'beauty']).tenants).toEqual(['beauty']);
    expect(() => parseArgs(['--apply', '--purge'])).toThrow(/não os dois/);
    expect(() => parseArgs(['--delete-auth-users'])).toThrow(/--purge/);
    expect(() => parseArgs(['--wipe-all'])).toThrow(/desconhecida/);
  });

  it('env de e-mail/slug fora do padrão explode', () => {
    expect(() => resolveDemoEmail('barber', { DEMO_SEED_EMAIL_BARBER: 'eu@cliente.com' })).toThrow();
    expect(() => resolveDemoSlug('barber', { DEMO_SEED_SLUG_BARBER: 'minha-barbearia' })).toThrow();
    expect(resolveDemoEmail('barber', {})).toBe('agendix.demo.barber@example.com');
  });
});

describe('demo-seed fixtures e payloads', () => {
  it('monta dois blueprints fictícios com slugs e e-mails DEMO', () => {
    const [barber, beauty] = listBlueprints(['barber', 'beauty'], {});
    expect(barber.userType).toBe('barber');
    expect(beauty.userType).toBe('beauty');
    expect(barber.slug.startsWith('demo-')).toBe(true);
    expect(beauty.clients.length).toBeGreaterThanOrEqual(12);
    expect(barber.team.some((member) => member.is_owner)).toBe(true);
    expect(barber.hours.sun.isOpen).toBe(false);
    expect(barber.hours.mon.blocks[0].start).toBe('09:00');
  });

  it('agenda de hoje cobre status de screenshot e não fica vazia', () => {
    const rows = buildAppointmentRows({
      now: NOW,
      tenantId: TENANT,
      professionals: fakeTeam(),
      clients: fakeClients(),
      services: fakeServices(),
    });
    const summary = summarizeAppointments(rows, NOW);
    const expected = expectedSeedCounts();
    expect(summary.today).toBe(expected.todayAppointments);
    expect(summary.total).toBe(expected.appointments);
    expect(summary.statuses.Confirmed).toBeGreaterThan(0);
    expect(summary.statuses.Pending).toBeGreaterThan(0);
    expect(summary.statuses.Completed).toBeGreaterThan(0);
    expect(summary.statuses.NoShow).toBeGreaterThan(0);
    expect(summary.statuses.Cancelled).toBeGreaterThan(0);
    expect(rows.every((row) => row.user_id === TENANT)).toBe(true);
    expect(rows.every((row) => ['agenda', 'queue', 'booking'].includes(row.origin))).toBe(true);
  });

  it('financeiro cobre pelo menos 2 meses com revenue e expense', () => {
    const rows = buildFinanceRows({
      now: NOW,
      tenantId: TENANT,
      professionals: fakeTeam(),
      clients: fakeClients(),
      services: fakeServices(),
    });
    const months = financeMonthSpan(rows);
    expect(months.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((row) => row.type === 'revenue' && row.revenue > 0)).toBe(true);
    expect(rows.some((row) => row.type === 'expense' && row.commission_value > 0)).toBe(true);
    expect(rows.every((row) => row.user_id === TENANT)).toBe(true);
  });

  it('fila v2 usa payment_status/ticket_status válidos e telefones únicos no ativo', () => {
    const rows = buildQueueRows({
      now: NOW,
      tenantId: TENANT,
      professionals: fakeTeam(),
      clients: fakeClients(),
      services: fakeServices(),
    });
    expect(rows.length).toBe(5);
    const active = rows.filter((row) => ['waiting', 'calling', 'serving'].includes(row.status));
    const phones = active.map((row) => row.client_phone);
    expect(new Set(phones).size).toBe(phones.length);
    expect(rows.every((row) => ['unpaid', 'awaiting_confirmation', 'paid', 'membership'].includes(row.payment_status))).toBe(true);
    expect(rows.every((row) => ['none', 'open', 'settled'].includes(row.ticket_status))).toBe(true);
    expect(rows.every((row) => isoDateInZone(row.joined_at) === '2026-09-15')).toBe(true);
  });

  it('public_bookings pending são 3 e usam business_id', () => {
    const rows = buildPublicBookingRows({
      now: NOW,
      tenantId: TENANT,
      professionals: fakeTeam(),
      services: fakeServices(),
      customers: [
        { name: 'A', phone: '(11) 97200-2001' },
        { name: 'B', phone: '(11) 97200-2002' },
        { name: 'C', phone: '(11) 97200-2003' },
      ],
    });
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === 'pending')).toBe(true);
    expect(rows[0].notes).toContain(DEMO_MARKER);
  });

  it('zonedIso usa offset de Brasília', () => {
    expect(zonedIso(2026, 9, 15, 9, 0)).toBe('2026-09-15T12:00:00.000Z');
  });
});

describe('demo-seed SQL de rollback', () => {
  it('purge SQL nunca deleta sem o CTE de e-mail DEMO', () => {
    const sql = readFileSync(resolve(process.cwd(), 'scripts/demo-seed/purge-demo.sql'), 'utf8');
    expect(sql).toContain('agendix\\.demo');
    expect(sql).toContain('demo_tenants');
    const deletes = sql.split('\n').filter((line) => line.trim().startsWith('DELETE FROM'));
    expect(deletes.length).toBeGreaterThan(10);
    for (const line of deletes) {
      expect(line.includes('demo_tenants') || sql.includes('WHERE')).toBe(true);
    }
    expect(sql).toMatch(/DELETE FROM public\.profiles\s+WHERE id IN \(SELECT id FROM demo_tenants\)/);
    expect(sql).not.toMatch(/DELETE FROM public\.profiles\s*;/);
    expect(OPERATIONAL_DELETE_ORDER[0].table).toBe('queue_payments');
  });
});
