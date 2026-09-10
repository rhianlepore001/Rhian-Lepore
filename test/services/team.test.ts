import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const selectAfterUpdate = vi.fn(() => ({ maybeSingle }));
  const isDeleted = vi.fn(() => ({ select: selectAfterUpdate, order: orderMock }));
  const eqOwner = vi.fn(() => ({ is: isDeleted }));
  const eqUser = vi.fn(() => ({ eq: eqOwner, is: isDeleted, order: orderMock }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const orderSecond = vi.fn();
  const orderMock = vi.fn(() => ({ order: orderSecond }));
  const update = vi.fn(() => ({ eq: eqId }));
  const select = vi.fn(() => ({ eq: eqUser }));

  return {
    maybeSingle,
    selectAfterUpdate,
    isDeleted,
    eqOwner,
    eqUser,
    eqId,
    orderMock,
    orderSecond,
    update,
    select,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.select,
      update: mocks.update,
    })),
  },
}));

import { deleteTeamMember, fetchTeamMembers } from '@/services/team';
import { supabase } from '@/lib/supabase';

const companyId = '22222222-2222-4222-8222-222222222222';
const memberId = '11111111-1111-4111-8111-111111111111';

describe('team service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orderSecond.mockResolvedValue({ data: [], error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: memberId }, error: null });
  });

  it('lista só profissionais que não foram excluídos', async () => {
    await fetchTeamMembers(companyId);

    expect(supabase.from).toHaveBeenCalledWith('team_members');
    expect(mocks.select).toHaveBeenCalledWith('*');
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', companyId);
    expect(mocks.isDeleted).toHaveBeenCalledWith('deleted_at', null);
  });

  it('exclui profissional com soft delete em vez de DELETE físico', async () => {
    await deleteTeamMember(memberId, companyId);

    expect(supabase.from).toHaveBeenCalledWith('team_members');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      active: false,
      deleted_at: expect.any(String),
    }));
    expect(mocks.eqId).toHaveBeenCalledWith('id', memberId);
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', companyId);
    expect(mocks.eqOwner).toHaveBeenCalledWith('is_owner', false);
    expect(mocks.isDeleted).toHaveBeenCalledWith('deleted_at', null);
  });

  it('falha se o profissional for dono ou já estiver excluído', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(deleteTeamMember(memberId, companyId)).rejects.toThrow('OWNER_OR_MISSING_TEAM_MEMBER');
  });
});
