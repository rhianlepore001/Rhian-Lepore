import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryState = {
  action: 'select' | 'insert' | 'update';
  payload: unknown;
  filters: Array<[string, string, unknown]>;
};

const mocks = vi.hoisted(() => {
  const states: QueryState[] = [];
  let selectResult: { data: unknown; error: unknown } = { data: [], error: null };
  let insertResult: { data: unknown; error: unknown } = { data: null, error: null };
  let updateResult: { data: unknown; error: unknown } = { data: null, error: null };
  let deletedLookup: { data: unknown; error: unknown } = { data: null, error: null };

  const makeChain = () => {
    const state: QueryState = { action: 'select', payload: null, filters: [] };
    states.push(state);
    const resultFor = () => {
      if (state.action === 'insert') return insertResult;
      if (state.action === 'update') return updateResult;
      const lookingDeleted = state.filters.some(([op, col]) => op === 'not' && col === 'deleted_at');
      if (lookingDeleted) return deletedLookup;
      return selectResult;
    };
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    chain.select = vi.fn(ret);
    chain.insert = vi.fn((payload: unknown) => {
      state.action = 'insert';
      state.payload = payload;
      return chain;
    });
    chain.update = vi.fn((payload: unknown) => {
      state.action = 'update';
      state.payload = payload;
      return chain;
    });
    chain.eq = vi.fn((col: string, val: unknown) => {
      state.filters.push(['eq', col, val]);
      return chain;
    });
    chain.is = vi.fn((col: string, val: unknown) => {
      state.filters.push(['is', col, val]);
      return chain;
    });
    chain.not = vi.fn((col: string, _operator: string, val: unknown) => {
      state.filters.push(['not', col, val]);
      return chain;
    });
    chain.order = vi.fn(ret);
    chain.limit = vi.fn(ret);
    chain.single = vi.fn(async () => resultFor());
    chain.maybeSingle = vi.fn(async () => resultFor());
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(resultFor()).then(resolve, reject);
    return chain;
  };

  return {
    states,
    makeChain,
    setSelectResult: (value: { data: unknown; error: unknown }) => { selectResult = value; },
    setInsertResult: (value: { data: unknown; error: unknown }) => { insertResult = value; },
    setUpdateResult: (value: { data: unknown; error: unknown }) => { updateResult = value; },
    setDeletedLookup: (value: { data: unknown; error: unknown }) => { deletedLookup = value; },
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mocks.makeChain()),
  },
}));

import { createTeamMember, deleteTeamMember, fetchTeamMembers, generateSlug } from '@/services/team';
import { supabase } from '@/lib/supabase';

const companyId = '22222222-2222-4222-8222-222222222222';
const memberId = '11111111-1111-4111-8111-111111111111';

const memberRow = {
  id: memberId,
  user_id: companyId,
  name: 'Tales Furtado',
  slug: 'tales-furtado',
  role: 'Barbeiro',
  active: true,
  display_order: 0,
  is_owner: false,
  deleted_at: null,
  cpf: '42992037800',
};

describe('team service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.states.length = 0;
    mocks.setSelectResult({ data: [], error: null });
    mocks.setInsertResult({ data: memberRow, error: null });
    mocks.setUpdateResult({ data: { id: memberId }, error: null });
    mocks.setDeletedLookup({ data: null, error: null });
  });

  it('lista só profissionais que não foram excluídos', async () => {
    await fetchTeamMembers(companyId);

    expect(supabase.from).toHaveBeenCalledWith('team_members');
    const list = mocks.states[0];
    expect(list.filters).toContainEqual(['eq', 'user_id', companyId]);
    expect(list.filters).toContainEqual(['is', 'deleted_at', null]);
  });

  it('exclui profissional com soft delete e libera o convite', async () => {
    await deleteTeamMember(memberId, companyId);

    expect(supabase.from).toHaveBeenCalledWith('team_members');
    const del = mocks.states[0];
    expect(del.action).toBe('update');
    expect(del.payload).toEqual(expect.objectContaining({
      active: false,
      staff_user_id: null,
      deleted_at: expect.any(String),
    }));
    expect(del.filters).toContainEqual(['eq', 'id', memberId]);
    expect(del.filters).toContainEqual(['eq', 'user_id', companyId]);
    expect(del.filters).toContainEqual(['eq', 'is_owner', false]);
    expect(del.filters).toContainEqual(['is', 'deleted_at', null]);
  });

  it('falha se o profissional for dono ou já estiver excluído', async () => {
    mocks.setUpdateResult({ data: null, error: null });

    await expect(deleteTeamMember(memberId, companyId)).rejects.toThrow('OWNER_OR_MISSING_TEAM_MEMBER');
  });

  it('restaura profissional excluído com o mesmo slug em vez de inserir', async () => {
    mocks.setDeletedLookup({ data: { id: memberId }, error: null });
    mocks.setUpdateResult({ data: memberRow, error: null });

    const result = await createTeamMember(companyId, {
      name: 'Tales Furtado',
      role: 'Barbeiro',
      slug: 'tales-furtado',
      cpf: '42992037800',
      active: true,
    });

    expect(result.id).toBe(memberId);
    const restore = mocks.states.find((state) => state.action === 'update');
    expect(restore?.payload).toEqual(expect.objectContaining({
      slug: 'tales-furtado',
      deleted_at: null,
      active: true,
      staff_user_id: null,
      name: 'Tales Furtado',
    }));
    expect(restore?.payload).not.toHaveProperty('commission_rate');
    expect(mocks.states.some((state) => state.action === 'insert')).toBe(false);
  });

  it('insere profissional novo quando não há exclusão lógica correspondente', async () => {
    mocks.setDeletedLookup({ data: null, error: null });

    const result = await createTeamMember(companyId, {
      name: 'Tales Furtado',
      role: 'Barbeiro',
      slug: 'tales-furtado',
      active: true,
      commission_rate: 0,
      commission_percent: 0,
    });

    expect(result.slug).toBe('tales-furtado');
    const insert = mocks.states.find((state) => state.action === 'insert');
    expect(insert?.payload).toEqual(expect.objectContaining({
      user_id: companyId,
      slug: 'tales-furtado',
      name: 'Tales Furtado',
    }));
  });

  it('gera slug sem acento para nomes compostos', () => {
    expect(generateSlug('João Silva')).toBe('joao-silva');
  });
});
