import { beforeEach, describe, expect, it, vi } from 'vitest';
const upsert = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => ({ upsert })) } }));
import { updateStaffCanEditClients } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';

describe('staff_can_edit_clients', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([true, false])('grava a chave %s no tenant', async (enabled) => {
    upsert.mockResolvedValue({ error: null });
    await expect(updateStaffCanEditClients('company-fictional', enabled)).resolves.toBe('saved');
    expect(upsert).toHaveBeenCalledWith({ user_id: 'company-fictional', staff_can_edit_clients: enabled }, { onConflict: 'user_id' });
  });
  it('tolera coluna ainda não migrada', async () => {
    upsert.mockResolvedValue({ error: { code: 'PGRST204', message: 'staff_can_edit_clients missing' } });
    await expect(updateStaffCanEditClients('company-fictional', true)).resolves.toBe('unsupported');
  });
  it('propaga erro de permissão', async () => {
    upsert.mockResolvedValue({ error: { code: '42501' } });
    await expect(updateStaffCanEditClients('company-fictional', true)).rejects.toMatchObject({ code: '42501' });
  });
  it('preserva ausência da coluna e valores novos', () => {
    const base = { user_id: '00000000-0000-4000-8000-000000000001' };
    expect(businessSettingsSchema.parse(base)).not.toHaveProperty('staff_can_edit_clients');
    expect(businessSettingsSchema.parse({ ...base, staff_can_edit_clients: true }).staff_can_edit_clients).toBe(true);
  });
});
