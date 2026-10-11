import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { updateOnlineBookingRequiresApproval } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';

describe('updateOnlineBookingRequiresApproval', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([true, false])('grava só a coluna nova (%s) na linha do negócio', async (value) => {
    upsertMock.mockResolvedValueOnce({ error: null });
    await expect(updateOnlineBookingRequiresApproval('biz-1', value)).resolves.toBe('saved');
    expect(fromMock).toHaveBeenCalledWith('business_settings');
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'biz-1', online_booking_requires_approval: value },
      { onConflict: 'user_id' },
    );
  });

  it('antes da migration (PGRST204) vira "unsupported" sem lançar', async () => {
    upsertMock.mockResolvedValueOnce({
      error: { code: 'PGRST204', message: "Could not find the 'online_booking_requires_approval' column of 'business_settings' in the schema cache" },
    });
    await expect(updateOnlineBookingRequiresApproval('biz-1', false)).resolves.toBe('unsupported');
  });

  it('42703 de outra coluna continua lançando', async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: '42703', message: 'column "foo" does not exist' } });
    await expect(updateOnlineBookingRequiresApproval('biz-1', false)).rejects.toMatchObject({ code: '42703' });
  });

  it('permissão negada continua lançando', async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: '42501', message: 'permission denied' } });
    await expect(updateOnlineBookingRequiresApproval('biz-1', true)).rejects.toMatchObject({ code: '42501' });
  });

  it('recusa valor não booleano sem chamar o banco', async () => {
    await expect(updateOnlineBookingRequiresApproval('biz-1', 'false' as unknown as boolean)).rejects.toThrow(/invalid_online_booking_requires_approval/);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('businessSettingsSchema — online_booking_requires_approval opcional', () => {
  const base = { user_id: '03254cc1-3f37-44f8-a31c-e4fdffd1304b' };
  it('linha antiga não ganha a chave', () => {
    expect(Object.prototype.hasOwnProperty.call(businessSettingsSchema.parse(base), 'online_booking_requires_approval')).toBe(false);
  });
  it('linha nova preserva o valor', () => {
    expect(businessSettingsSchema.parse({ ...base, online_booking_requires_approval: false }).online_booking_requires_approval).toBe(false);
  });
});
