import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ upsert: upsertMock })) },
}));

import { supabase } from '@/lib/supabase';
import { updateStaffAppointmentEditScope } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';

describe('updateStaffAppointmentEditScope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava a escolha do dono em business_settings', async () => {
    upsertMock.mockResolvedValueOnce({ error: null });
    await expect(updateStaffAppointmentEditScope('biz-1', 'own')).resolves.toBe('saved');
    expect(supabase.from).toHaveBeenCalledWith('business_settings');
    expect(upsertMock).toHaveBeenCalledWith({ user_id: 'biz-1', staff_appointment_edit_scope: 'own' }, { onConflict: 'user_id' });
  });

  it('antes da migration (coluna inexistente) devolve "unsupported" sem lançar', async () => {
    upsertMock.mockResolvedValueOnce({
      error: { code: 'PGRST204', message: "Could not find the 'staff_appointment_edit_scope' column of 'business_settings' in the schema cache" },
    });
    await expect(updateStaffAppointmentEditScope('biz-1', 'all')).resolves.toBe('unsupported');
  });

  it('outros erros (ex.: colaborador sem permissão) são lançados', async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: '42501', message: 'new row violates row-level security policy' } });
    await expect(updateStaffAppointmentEditScope('biz-1', 'all')).rejects.toMatchObject({ code: '42501' });
  });

  it('recusa valor fora de none/own/all sem chamar o banco', async () => {
    await expect(updateStaffAppointmentEditScope('biz-1', 'everything' as never)).rejects.toThrow(/invalid_staff_appointment_edit_scope/);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('businessSettingsSchema — staff_appointment_edit_scope', () => {
  const base = { user_id: '03254cc1-3f37-44f8-a31c-e4fdffd1304b' };
  it('row antigo (sem coluna) não ganha a chave', () => {
    expect(Object.prototype.hasOwnProperty.call(businessSettingsSchema.parse(base), 'staff_appointment_edit_scope')).toBe(false);
  });
  it('row novo preserva o valor', () => {
    expect(businessSettingsSchema.parse({ ...base, staff_appointment_edit_scope: 'own' }).staff_appointment_edit_scope).toBe('own');
  });
});
