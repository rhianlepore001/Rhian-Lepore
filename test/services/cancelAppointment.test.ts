import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cadeia supabase.from('appointments').update().eq().eq().select('id')
const selectMock = vi.fn();
const eqUserMock = vi.fn(() => ({ select: selectMock }));
const eqIdMock = vi.fn(() => ({ eq: eqUserMock }));
const updateMock = vi.fn(() => ({ eq: eqIdMock }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ update: updateMock })), rpc: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
import { cancelAppointment } from '@/services/scheduling';

describe('cancelAppointment (Agenda: cancelar pelo dono/colaborador)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancela filtrando por id + empresa e pede as linhas alteradas', async () => {
    selectMock.mockResolvedValueOnce({ data: [{ id: 'apt-1' }], error: null });
    await expect(cancelAppointment({ appointmentId: 'apt-1', companyId: 'biz-1' })).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('appointments');
    expect(updateMock).toHaveBeenCalledWith({ status: 'Cancelled' });
    expect(eqIdMock).toHaveBeenCalledWith('id', 'apt-1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'biz-1');
    expect(selectMock).toHaveBeenCalledWith('id');
  });

  it('0 linhas alteradas (RLS filtrou / id errado) é erro — sem sucesso falso', async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(cancelAppointment({ appointmentId: 'apt-1', companyId: 'biz-1' })).rejects.toThrow(
      'appointment_cancel_no_rows',
    );
  });

  it('data nulo também é tratado como 0 linhas', async () => {
    selectMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(cancelAppointment({ appointmentId: 'apt-1', companyId: 'biz-1' })).rejects.toThrow(
      'appointment_cancel_no_rows',
    );
  });

  it('erro do banco (trigger de permissão) é repassado', async () => {
    selectMock.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'staff_appointment_edit_forbidden' },
    });
    await expect(cancelAppointment({ appointmentId: 'apt-1', companyId: 'biz-1' })).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('sem empresa não chama o banco', async () => {
    await expect(cancelAppointment({ appointmentId: 'apt-1', companyId: '' })).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('Agenda usa cancelAppointment (sem UPDATE inline sem .select)', () => {
  it('pages/Agenda.tsx cancela pelo serviço', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(__dirname, '../../pages/Agenda.tsx'), 'utf8');
    expect(src).toMatch(/await cancelAppointment\(\{ appointmentId, companyId: /);
    expect(src).not.toMatch(/\.update\(\{ status: 'Cancelled' \}\)/);
  });
});
