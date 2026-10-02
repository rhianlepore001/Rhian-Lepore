import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ upsert: upsertMock })) },
}));

import { supabase } from '@/lib/supabase';
import { updateStaffCanBlockAgenda } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';

describe('updateStaffCanBlockAgenda', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava a escolha do dono em business_settings', async () => {
    upsertMock.mockResolvedValueOnce({ error: null });
    await expect(updateStaffCanBlockAgenda('biz-1', false)).resolves.toBe('saved');
    expect(supabase.from).toHaveBeenCalledWith('business_settings');
    expect(upsertMock).toHaveBeenCalledWith({ user_id: 'biz-1', staff_can_block_agenda: false }, { onConflict: 'user_id' });
  });

  it('antes da migration (coluna inexistente) devolve "unsupported"', async () => {
    upsertMock.mockResolvedValueOnce({
      error: { code: 'PGRST204', message: "Could not find the 'staff_can_block_agenda' column of 'business_settings' in the schema cache" },
    });
    await expect(updateStaffCanBlockAgenda('biz-1', true)).resolves.toBe('unsupported');
  });
});

describe('businessSettingsSchema — staff_can_block_agenda', () => {
  const base = { user_id: '03254cc1-3f37-44f8-a31c-e4fdffd1304b' };
  it('row antigo (sem coluna) não ganha a chave', () => {
    expect(Object.prototype.hasOwnProperty.call(businessSettingsSchema.parse(base), 'staff_can_block_agenda')).toBe(false);
  });
  it('row novo preserva o valor', () => {
    expect(businessSettingsSchema.parse({ ...base, staff_can_block_agenda: false }).staff_can_block_agenda).toBe(false);
  });
});
