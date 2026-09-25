import { beforeEach, describe, expect, it, vi } from 'vitest';

const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ update: updateMock })) },
}));

import { isMissingColumnError, updateBusinessTimezone } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';

describe('updateBusinessTimezone — compatível antes/depois da migration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava business_settings.timezone do negócio', async () => {
    eqMock.mockResolvedValueOnce({ error: null });
    await expect(updateBusinessTimezone('biz-1', 'America/Manaus')).resolves.toBe('saved');
    expect(updateMock).toHaveBeenCalledWith({ timezone: 'America/Manaus' });
    expect(eqMock).toHaveBeenCalledWith('user_id', 'biz-1');
  });

  it('coluna inexistente (PostgREST PGRST204) vira "unsupported" sem lançar', async () => {
    eqMock.mockResolvedValueOnce({
      error: { code: 'PGRST204', message: "Could not find the 'timezone' column of 'business_settings' in the schema cache" },
    });
    await expect(updateBusinessTimezone('biz-1', 'Europe/Lisbon')).resolves.toBe('unsupported');
  });

  it('coluna inexistente (Postgres 42703) também', async () => {
    eqMock.mockResolvedValueOnce({ error: { code: '42703', message: 'column "timezone" does not exist' } });
    await expect(updateBusinessTimezone('biz-1', 'Europe/Lisbon')).resolves.toBe('unsupported');
  });

  it('outros erros continuam sendo lançados', async () => {
    eqMock.mockResolvedValueOnce({ error: { code: '42501', message: 'permission denied' } });
    await expect(updateBusinessTimezone('biz-1', 'Europe/Lisbon')).rejects.toMatchObject({ code: '42501' });
    expect(isMissingColumnError(null)).toBe(false);
  });
});

describe('businessSettingsSchema — timezone opcional', () => {
  const base = { user_id: '03254cc1-3f37-44f8-a31c-e4fdffd1304b' };

  it('row antigo (sem coluna) não ganha a chave timezone', () => {
    const parsed = businessSettingsSchema.parse(base);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'timezone')).toBe(false);
  });

  it('row novo preserva timezone (inclusive null)', () => {
    expect(businessSettingsSchema.parse({ ...base, timezone: 'America/Sao_Paulo' }).timezone).toBe('America/Sao_Paulo');
    expect(Object.prototype.hasOwnProperty.call(businessSettingsSchema.parse({ ...base, timezone: null }), 'timezone')).toBe(true);
  });
});
