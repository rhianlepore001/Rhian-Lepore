import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data: [] as unknown[], error: null as unknown, count: 0 as number | null };
  for (const name of ['select', 'eq', 'not', 'order']) {
    chain[name] = vi.fn(() => chain);
  }
  chain.limit = vi.fn(() => Promise.resolve(result));
  return { chain, result, rpc: vi.fn(), from: vi.fn(() => chain) };
});

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

import { deleteTeamMember, fetchOpenAppointmentsForMember } from '@/services/team';
import { StaffHasOpenAppointmentsError, StaffLegacyLinkedRecordsError } from '@/utils/staffDelete';

const companyId = '22222222-2222-4222-8222-222222222222';
const memberId = '11111111-1111-4111-8111-111111111111';

describe('deleteTeamMember — códigos do servidor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('STAFF_HAS_OPEN_APPOINTMENTS vira erro tipado com a contagem do servidor', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'STAFF_HAS_OPEN_APPOINTMENTS', details: 'open_count=4', hint: 'staff_has_open_appointments' },
    });
    const err = await deleteTeamMember(memberId, companyId).catch((e) => e);
    expect(err).toBeInstanceOf(StaffHasOpenAppointmentsError);
    expect((err as StaffHasOpenAppointmentsError).openCount).toBe(4);
  });

  it('23503 (registros antigos no perfil do colaborador) vira erro tipado', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'update or delete on table "profiles" violates foreign key constraint "appointments_user_id_fkey"' },
    });
    await expect(deleteTeamMember(memberId, companyId)).rejects.toBeInstanceOf(StaffLegacyLinkedRecordsError);
  });

  it('sucesso continua igual (com ou sem login: o servidor decide)', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(deleteTeamMember(memberId, companyId)).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith('delete_staff_collaborator', { p_member_id: memberId });
  });

  it('outros erros seguem para o tratamento genérico', async () => {
    const raw = { code: '42501', message: 'permission denied' };
    mocks.rpc.mockResolvedValue({ data: null, error: raw });
    await expect(deleteTeamMember(memberId, companyId)).rejects.toBe(raw);
  });
});

describe('fetchOpenAppointmentsForMember — lista do dono (RLS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result.error = null;
  });

  it('filtra pelo negócio e pelo profissional, sem terminais, mais antigos primeiro', async () => {
    mocks.result.data = [
      { id: 'a1', appointment_time: '2026-07-05T10:30:00Z', status: 'Pending', service: 'Corte', duration_minutes: 30, clients: { name: 'Lucas' } },
      { id: 'a2', appointment_time: '2026-07-05T11:00:00Z', status: 'no_show', service: 'Barba', duration_minutes: 30, clients: { name: 'X' } },
      { id: 'a3', appointment_time: '2026-07-06T11:00:00Z', status: 'Confirmed', service: null, duration_minutes: null, clients: [{ name: 'Vanessa' }] },
    ];
    mocks.result.count = 66;
    const out = await fetchOpenAppointmentsForMember(companyId, memberId);

    expect(mocks.from).toHaveBeenCalledWith('appointments');
    expect(mocks.chain.select).toHaveBeenCalledWith('id, appointment_time, status, service, duration_minutes, clients(name)', { count: 'exact' });
    expect(mocks.chain.eq).toHaveBeenCalledWith('user_id', companyId);
    expect(mocks.chain.eq).toHaveBeenCalledWith('professional_id', memberId);
    expect(mocks.chain.not).toHaveBeenCalledWith('status', 'in', '("Completed","Cancelled","NoShow")');
    expect(mocks.chain.order).toHaveBeenCalledWith('appointment_time', { ascending: true });
    expect(out.items.map((i) => [i.id, i.client_name])).toEqual([['a1', 'Lucas'], ['a3', 'Vanessa']]);
    expect(out.total).toBe(65);
  });

  it('erro de leitura propaga (a tela mostra o fallback "Abrir agenda")', async () => {
    mocks.result.data = [];
    mocks.result.error = { message: 'boom' };
    await expect(fetchOpenAppointmentsForMember(companyId, memberId)).rejects.toEqual({ message: 'boom' });
  });
});
