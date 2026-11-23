import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicServices, submitPublicGroupBooking } from '@/services/publicBooking';
import { supabase } from '@/lib/supabase';
import { getCustomerReviewReceipt } from '@/utils/customerReviewReceipt';

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

  it('liga o comprovante à posição da pessoa mesmo se a resposta vier fora de ordem', async () => {
    const reviewTokens = ['70deac24-8742-4704-8b63-5ee69d6510cd', '059d9e79-165c-4ea8-93cb-73bb5888873a'];
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: [{ id: 'b2', group_position: 1 }, { id: 'b1', group_position: 0 }], error: null } as never)
      .mockResolvedValueOnce({ data: [{ id: 'pc-1' }], error: null } as never);
    await submitPublicGroupBooking({ ...input, reviewTokens });
    expect(supabase.rpc).toHaveBeenCalledWith('create_public_group_booking', expect.objectContaining({ p_review_tokens: reviewTokens }));
    expect(getCustomerReviewReceipt(input.businessId, 'b1')).toBe(reviewTokens[0]);
    expect(getCustomerReviewReceipt(input.businessId, 'b2')).toBe(reviewTokens[1]);
    localStorage.removeItem('agendix-review:business-001:b1');
    localStorage.removeItem('agendix-review:business-001:b2');
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
