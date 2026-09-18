import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const isDeleted = vi.fn(() => ({ order: orderMock }));
  const eqUser = vi.fn(() => ({ is: isDeleted, order: orderMock }));
  const orderSecond = vi.fn();
  const orderMock = vi.fn(() => ({ order: orderSecond }));
  const select = vi.fn(() => ({ eq: eqUser }));
  const rpc = vi.fn();

  return {
    isDeleted,
    eqUser,
    orderMock,
    orderSecond,
    select,
    rpc,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.select,
    })),
    rpc: mocks.rpc,
  },
}));

import { deleteTeamMember, fetchTeamMembers, generateSlug } from '@/services/team';
import { supabase } from '@/lib/supabase';

const companyId = '22222222-2222-4222-8222-222222222222';
const memberId = '11111111-1111-4111-8111-111111111111';

describe('team service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orderSecond.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('lista só profissionais que não foram excluídos', async () => {
    await fetchTeamMembers(companyId);

    expect(supabase.from).toHaveBeenCalledWith('team_members');
    expect(mocks.select).toHaveBeenCalledWith('*');
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', companyId);
    expect(mocks.isDeleted).toHaveBeenCalledWith('deleted_at', null);
  });

  it('exclui profissional via RPC que também remove a conta de acesso', async () => {
    await deleteTeamMember(memberId, companyId);

    expect(supabase.rpc).toHaveBeenCalledWith('delete_staff_collaborator', {
      p_member_id: memberId,
    });
  });

  it('falha se o profissional for dono ou já estiver excluído', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'OWNER_OR_MISSING_TEAM_MEMBER' },
    });

    await expect(deleteTeamMember(memberId, companyId)).rejects.toThrow('OWNER_OR_MISSING_TEAM_MEMBER');
  });

  it('gera slug sem acento a partir do nome', () => {
    expect(generateSlug('João Silva')).toBe('joao-silva');
  });
});
