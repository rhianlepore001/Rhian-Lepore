import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ upsert: upsertMock })) },
}));

import { supabase } from '@/lib/supabase';
import { updateStaffAgendaBlockScope } from '@/services/settings';
import { businessSettingsSchema } from '@/types/settings';
import type { StaffAgendaBlockScope } from '@/utils/agendaBlockPermission';

describe('updateStaffAgendaBlockScope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava só a coluna nova (o banco sincroniza o booleano antigo)', async () => {
    upsertMock.mockResolvedValueOnce({ error: null });
    await expect(updateStaffAgendaBlockScope('biz-1', 'all')).resolves.toBe('saved');
    expect(supabase.from).toHaveBeenCalledWith('business_settings');
    expect(upsertMock).toHaveBeenCalledWith({ user_id: 'biz-1', staff_agenda_block_scope: 'all' }, { onConflict: 'user_id' });
  });

  it('antes da migration (coluna inexistente) devolve "unsupported"', async () => {
    upsertMock.mockResolvedValueOnce({
      error: { code: 'PGRST204', message: "Could not find the 'staff_agenda_block_scope' column of 'business_settings' in the schema cache" },
    });
    await expect(updateStaffAgendaBlockScope('biz-1', 'none')).resolves.toBe('unsupported');
  });

  it('outro erro sobe', async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: '42501', message: 'new row violates row-level security policy' } });
    await expect(updateStaffAgendaBlockScope('biz-1', 'own')).rejects.toMatchObject({ code: '42501' });
  });

  it('valor fora de none/own/all não vai ao banco', async () => {
    await expect(updateStaffAgendaBlockScope('biz-1', 'tudo' as StaffAgendaBlockScope)).rejects.toThrow(/invalid_staff_agenda_block_scope/);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('businessSettingsSchema — permissão de bloqueio', () => {
  const base = { user_id: '03254cc1-3f37-44f8-a31c-e4fdffd1304b' };
  it('row antigo (sem colunas) não ganha as chaves', () => {
    const parsed = businessSettingsSchema.parse(base);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'staff_can_block_agenda')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'staff_agenda_block_scope')).toBe(false);
  });
  it('row novo preserva os valores', () => {
    const parsed = businessSettingsSchema.parse({ ...base, staff_can_block_agenda: true, staff_agenda_block_scope: 'all' });
    expect(parsed.staff_can_block_agenda).toBe(true);
    expect(parsed.staff_agenda_block_scope).toBe('all');
  });
});
