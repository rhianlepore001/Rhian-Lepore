import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { agendaStaticKeys } from '@/lib/agendaStaticKeys';
import { invalidateAgendaStaticData } from '@/lib/agendaStaticInvalidation';

const insertMock = vi.fn();
const notMock = vi.fn();
const chain: any = {};
Object.assign(chain, {
  select: vi.fn(() => chain), eq: vi.fn(() => chain), not: notMock,
  insert: insertMock, update: vi.fn(() => chain), delete: vi.fn(() => chain),
  single: vi.fn().mockResolvedValue({ data: { id: 'x', user_id: 'co-1', client_id: 'c1', name: 'Ana', nickname: null, notes: null, is_active: true }, error: null }),
});
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => chain), rpc: vi.fn().mockResolvedValue({ error: null }) } }));

const seed = (companyId: string) => {
  for (const key of Object.values(agendaStaticKeys)) queryClient.setQueryData(key(companyId), ['cached']);
};
const stale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated;

describe('invalidação dos dados fixos da Agenda', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    notMock.mockResolvedValue({ data: [], error: null });
    insertMock.mockReturnValue(Object.assign(Promise.resolve({ error: null }), chain));
  });

  it('cadastro de cliente no CRM invalida a query de clientes da Agenda (só da empresa)', async () => {
    seed('co-1'); seed('co-2');
    const { createClient } = await import('@/services/crm');
    await createClient({ companyId: 'co-1', name: 'Ana', phone: '11999990000' } as any);
    expect(stale(agendaStaticKeys.clients('co-1'))).toBe(true);
    expect(stale(agendaStaticKeys.services('co-1'))).toBe(false);
    expect(stale(agendaStaticKeys.clients('co-2'))).toBe(false);
  });

  it('dependentes invalidam clientes', async () => {
    seed('co-1');
    const { createDependent } = await import('@/services/clientDependents');
    await createDependent('co-1', 'c1', { name: 'Bia' });
    expect(stale(agendaStaticKeys.clients('co-1'))).toBe(true);
  });

  it('helper mapeia cada entidade', () => {
    seed('co-1');
    invalidateAgendaStaticData('co-1', 'services', 'categories', 'team');
    expect(stale(agendaStaticKeys.services('co-1'))).toBe(true);
    expect(stale(agendaStaticKeys.categories('co-1'))).toBe(true);
    expect(stale(agendaStaticKeys.team('co-1'))).toBe(true);
    expect(stale(agendaStaticKeys.clients('co-1'))).toBe(false);
  });
});
