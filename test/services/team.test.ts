import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);

  const deleteQuery = { eq: vi.fn() };
  const deleteMock = vi.fn(() => deleteQuery);
  const fromMock = vi.fn(() => ({
    select: vi.fn(() => query),
    delete: deleteMock,
  }));
  const rpcMock = vi.fn();

  return { deleteMock, deleteQuery, fromMock, query, rpcMock };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.fromMock,
    rpc: mocks.rpcMock,
  },
}));

import { deleteTeamMember, fetchTeamMembers } from '@/services/team';
import { supabase } from '@/lib/supabase';

const companyId = '22222222-2222-4222-8222-222222222222';
const member = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: companyId,
  name: 'Ana',
  role: 'staff',
  active: true,
};

describe('team service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.order
      .mockReturnValueOnce(mocks.query)
      .mockResolvedValueOnce({ data: [member], error: null });
    mocks.deleteQuery.eq
      .mockReturnValueOnce(mocks.deleteQuery)
      .mockResolvedValueOnce({ error: null });
    mocks.rpcMock.mockResolvedValue({ data: null, error: null });
  });

  it('lista apenas profissionais não excluídos do tenant', async () => {
    const result = await fetchTeamMembers(companyId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(member.id);
    expect(supabase.from).toHaveBeenCalledWith('team_members');
    expect(mocks.query.eq).toHaveBeenCalledWith('user_id', companyId);
    expect(mocks.query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('exclui o profissional pela operação transacional do banco', async () => {
    await deleteTeamMember(member.id);

    expect(supabase.rpc).toHaveBeenCalledWith('delete_team_member', {
      p_id: member.id,
    });
  });
});
