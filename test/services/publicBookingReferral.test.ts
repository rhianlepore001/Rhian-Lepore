import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitPublicBooking } from '@/services/publicBooking';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: vi.fn(),
  },
}));

describe('submitPublicBooking referral_source', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  const baseInput = {
    businessId: 'b0000000-0000-4000-8000-000000000001',
    customerName: 'João Silva',
    customerPhone: '11999998888',
    serviceIds: ['d0000000-0000-4000-8001-000000000020'],
    professionalId: 'd0000000-0000-4000-8001-000000000030',
    appointmentTime: '2099-01-10T14:00:00Z',
    totalPrice: 50,
    durationMinutes: 30,
    productLines: [],
    reviewToken: '11111111-2222-4333-8444-555555555555',
    referralSource: 'instagram' as const,
  };

  const mockBookingRow = {
    id: 'bk-1',
    business_id: baseInput.businessId,
    customer_name: baseInput.customerName,
    customer_phone: baseInput.customerPhone,
    service_ids: baseInput.serviceIds,
    professional_id: baseInput.professionalId,
    appointment_time: baseInput.appointmentTime,
    total_price: 50,
    status: 'confirmed',
    duration_minutes: 30,
  };

  it('envia p_referral_source para create_public_booking quando informado', async () => {
    rpcMock.mockResolvedValue({ data: [mockBookingRow], error: null });

    await submitPublicBooking(baseInput);

    expect(rpcMock).toHaveBeenCalledWith(
      'create_public_booking',
      expect.objectContaining({
        p_referral_source: 'instagram',
        p_review_token: baseInput.reviewToken,
      }),
    );
  });

  it('faz fallback gracioso para a assinatura anterior se p_referral_source ainda não existir no banco', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function create_public_booking' },
      })
      .mockResolvedValueOnce({ data: [mockBookingRow], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'pc-1', name: 'João Silva', phone: '11999998888' }], error: null });

    const result = await submitPublicBooking(baseInput);
    expect(result.id).toBe('bk-1');
    expect(rpcMock).toHaveBeenNthCalledWith(
      2,
      'create_public_booking',
      expect.not.objectContaining({ p_referral_source: expect.anything() }),
    );
  });
});
