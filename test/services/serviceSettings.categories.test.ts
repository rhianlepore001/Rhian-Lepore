import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const category = {
    id: 'cat-1',
    name: 'Cabelo',
    display_order: 0,
    user_id: 'co-1',
  };

  const singleMock = vi.fn();
  const selectAfterUpdateMock = vi.fn(() => ({ single: singleMock }));
  const eqUserIdMock = vi.fn(() => ({ select: selectAfterUpdateMock }));
  const eqCategoryIdMock = vi.fn(() => ({ eq: eqUserIdMock }));
  const updateMock = vi.fn(() => ({ eq: eqCategoryIdMock }));

  return {
    category,
    singleMock,
    selectAfterUpdateMock,
    eqUserIdMock,
    eqCategoryIdMock,
    updateMock,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mocks.updateMock,
    })),
  },
}));

import { updateServiceCategory } from '@/services/serviceSettings';
import { supabase } from '@/lib/supabase';

const { category, singleMock, eqUserIdMock, eqCategoryIdMock, updateMock } = mocks;

describe('updateServiceCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockResolvedValue({ data: category, error: null });
  });

  it('atualiza nome com trim e filtra por id e user_id', async () => {
    const result = await updateServiceCategory({
      companyId: 'co-1',
      categoryId: 'cat-1',
      name: '  Barba  ',
    });

    expect(supabase.from).toHaveBeenCalledWith('service_categories');
    expect(updateMock).toHaveBeenCalledWith({ name: 'Barba' });
    expect(eqCategoryIdMock).toHaveBeenCalledWith('id', 'cat-1');
    expect(eqUserIdMock).toHaveBeenCalledWith('user_id', 'co-1');
    expect(result.name).toBe('Cabelo');
  });

  it('rejeita nome vazio após trim (zod)', async () => {
    await expect(
      updateServiceCategory({ companyId: 'co-1', categoryId: 'cat-1', name: '   ' }),
    ).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('propaga erro do supabase', async () => {
    const dbError = { message: 'permission denied', code: '42501' };
    singleMock.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      updateServiceCategory({ companyId: 'co-1', categoryId: 'cat-1', name: 'Novo' }),
    ).rejects.toMatchObject(dbError);
  });
});
