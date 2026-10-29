import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicServices, submitPublicGroupBooking } from '@/services/publicBooking';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

const input = {
  businessId: 'business-001',
  customerName: 'Titular Fictício',
  customerPhone: '11999990000',
  appointmentTime: '2026-11-02T10:00:00.000Z',
  people: [
    { attendeeName: null, professionalId: 'pro-a', serviceIds: ['s1'] },
    { attendeeName: 'Pessoa Dois', professionalId: 'pro-b', serviceIds: ['s1', 's2'] },
  ],
};

describe('catálogo público sem preço ou duração', () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());
  it('esconde serviço sem preço ou sem duração até o dono preencher', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [
      { id: 'a', name: 'Corte', price: 40, duration_minutes: 30, active: true },
      { id: 'b', name: 'Sem preço', price: 0, duration_minutes: 30, active: true },
      { id: 'c', name: 'Sem duração', price: 20, duration_minutes: 0, active: true },
      { id: 'd', name: 'Vazio', price: null, duration_minutes: null, active: true },
    ], error: null } as never);
    const rows = await fetchPublicServices('business-001');
    expect(rows.map(row => row.id)).toEqual(['a']);
  });
});

describe('submitPublicGroupBooking', () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());

  it('envia todas as pessoas em uma única chamada atômica', async () => {
    const rows = [
      { id: 'b1', business_id: 'business-001', customer_name: 'Titular Fictício', attendee_name: null, group_id: 'g1', status: 'pending' },
      { id: 'b2', business_id: 'business-001', customer_name: 'Titular Fictício', attendee_name: 'Pessoa Dois', group_id: 'g1', status: 'pending' },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: rows, error: null } as never);
    const result = await submitPublicGroupBooking(input);
    expect(vi.mocked(supabase.rpc).mock.calls.filter(([name]) => name === 'create_public_group_booking')).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledWith('create_public_group_booking', {
      p_business_id: 'business-001',
      p_customer_name: 'Titular Fictício',
      p_customer_phone: '11999990000',
      p_appointment_time: '2026-11-02T10:00:00.000Z',
      p_people: [
        { professional_id: 'pro-a', service_ids: ['s1'] },
        { attendee_name: 'Pessoa Dois', professional_id: 'pro-b', service_ids: ['s1', 's2'] },
      ],
    });
    expect(result).toHaveLength(2);
  });

  it('repassa o erro do servidor sem salvar parcialmente', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'slot_unavailable', code: 'P0001' } } as never);
    await expect(submitPublicGroupBooking(input)).rejects.toMatchObject({ message: 'slot_unavailable' });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('recusa grupo com menos de 2 ou mais de 5 pessoas e pessoa sem profissional', async () => {
    await expect(submitPublicGroupBooking({ ...input, people: input.people.slice(0, 1) })).rejects.toThrow();
    await expect(submitPublicGroupBooking({ ...input, people: Array.from({ length: 6 }, (_, i) => ({ attendeeName: i ? `P${i}` : null, professionalId: 'pro-a', serviceIds: ['s1'] })) })).rejects.toThrow();
    await expect(submitPublicGroupBooking({ ...input, people: [input.people[0], { ...input.people[1], professionalId: '' }] })).rejects.toThrow();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
