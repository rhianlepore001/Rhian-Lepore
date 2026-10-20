import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { fetchPublicClientByPhone, getActiveBookingByPhone, submitPublicBooking, cancelPublicBooking, fetchPublicBookingById } from '@/services/publicBooking';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
const input = { businessId: 'business-a', customerName: 'Nome informado', customerPhone: '11999998888', serviceIds: ['service-a'], professionalId: null, appointmentTime: '2030-10-20T15:00:00Z', totalPrice: 40, durationMinutes: 30 };
const booking = { id: 'booking-a', business_id: 'business-a', customer_name: input.customerName };
const token = 'a'.repeat(64);

describe('SEC-02 public booking privacy', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not query client or booking by phone', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ name: 'Nome privado' }], error: null } as any);
    expect(await fetchPublicClientByPhone(input.customerPhone, input.businessId)).toBeNull();
    expect(await getActiveBookingByPhone(input.customerPhone, input.businessId)).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('creates without OTP and keeps the private link response without CRM upsert', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { booking, management_token: token, management_expires_at: '2030-11-20T15:00:00Z' }, error: null } as any);
    const result = await submitPublicBooking(input);
    expect(supabase.rpc).toHaveBeenCalledWith('create_public_booking_private', expect.objectContaining({ p_customer_name: input.customerName }));
    expect(result).toMatchObject({ id: 'booking-a', management_token: token });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
  it('fails closed when private endpoint is missing, without table or phone fallback', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { code: 'PGRST202' } } as any);
    await expect(submitPublicBooking(input)).rejects.toMatchObject({ code: 'PGRST202' });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
  it('uses token for read and cancellation', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [booking], error: null } as any).mockResolvedValueOnce({ data: true, error: null } as any);
    await fetchPublicBookingById('booking-a', 'business-a', token);
    await cancelPublicBooking('booking-a', token);
    expect(supabase.rpc).toHaveBeenCalledWith('get_public_booking_with_token', { p_booking_id: 'booking-a', p_token: token });
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_public_booking_with_token', { p_booking_id: 'booking-a', p_token: token });
  });
});
