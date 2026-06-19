import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmPublicBooking,
  createAcceptedAppointmentFromBooking,
  fetchPublicClientByPhone,
  getActiveBookingByPhone,
  rejectPublicBooking,
  submitPublicBooking,
} from '@/services/publicBooking';
import { supabase } from '@/lib/supabase';

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock, single: singleMock }));
const insertMock = vi.fn(() => Object.assign(
  Promise.resolve({ data: null, error: null }),
  { select: selectMock },
));
const updateEqMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: insertMock,
      update: updateMock,
      select: selectMock,
    })),
  },
}));

describe('public booking service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockResolvedValue({
      data: {
        id: 'booking-001',
        business_id: 'business-001',
        customer_name: 'Joao',
        customer_phone: '11999999999',
        service_ids: ['service-001'],
        professional_id: null,
        appointment_time: '2026-05-30T10:00:00-03:00',
        total_price: 80,
        status: 'pending',
        duration_minutes: 30,
      },
      error: null,
    });
  });

  it('busca booking ativo por telefone via RPC', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{ id: 'booking-001', status: 'pending' }],
      error: null,
    });

    const result = await getActiveBookingByPhone('11999999999', 'business-001');

    expect(result).toEqual({ id: 'booking-001', status: 'pending' });
    expect(supabase.rpc).toHaveBeenCalledWith('get_active_booking_by_phone', {
      p_phone: '11999999999',
      p_business_id: 'business-001',
    });
  });

  it('cria novo public_booking com status pending', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{
        id: 'booking-001',
        business_id: 'business-001',
        customer_name: 'Joao',
        customer_phone: '11999999999',
        service_ids: ['service-001'],
        professional_id: null,
        appointment_time: '2026-05-30T10:00:00-03:00',
        total_price: 80,
        status: 'pending',
        duration_minutes: 30,
      }],
      error: null,
    });

    const result = await submitPublicBooking({
      businessId: 'business-001',
      customerName: 'Joao',
      customerPhone: '11999999999',
      serviceIds: ['service-001'],
      professionalId: null,
      appointmentTime: '2026-05-30T10:00:00-03:00',
      totalPrice: 80,
      durationMinutes: 30,
      editingBookingId: null,
      originalAppointmentTime: null,
    });

    expect(supabase.from).toHaveBeenCalledWith('public_bookings');
    expect(insertMock).toHaveBeenCalledWith({
      business_id: 'business-001',
      customer_name: 'Joao',
      customer_phone: '11999999999',
      service_ids: ['service-001'],
      professional_id: null,
      appointment_time: '2026-05-30T10:00:00-03:00',
      total_price: 80,
      status: 'pending',
      duration_minutes: 30,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_public_client', {
      p_business_id: 'business-001',
      p_name: 'Joao',
      p_phone: '11999999999',
      p_photo_url: null,
      p_email: null,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('get_active_booking_by_phone', {
      p_phone: '11999999999',
      p_business_id: 'business-001',
    });
    expect(result.id).toBe('booking-001');
  });

  it('edita booking preservando original_appointment_time e marcando is_edit', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{
        id: 'booking-001',
        business_id: 'business-001',
        customer_name: 'Joao',
        customer_phone: '11999999999',
        service_ids: ['service-001'],
        professional_id: 'pro-001',
        appointment_time: '2026-05-31T10:00:00-03:00',
        total_price: 90,
        status: 'pending',
        duration_minutes: 45,
        is_edit: true,
      }],
      error: null,
    });

    await submitPublicBooking({
      businessId: 'business-001',
      customerName: 'Joao',
      customerPhone: '11999999999',
      serviceIds: ['service-001'],
      professionalId: 'pro-001',
      appointmentTime: '2026-05-31T10:00:00-03:00',
      totalPrice: 90,
      durationMinutes: 45,
      editingBookingId: 'booking-001',
      originalAppointmentTime: '2026-05-30T10:00:00-03:00',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_public_booking_by_client', expect.objectContaining({
      p_booking_id: 'booking-001',
      p_phone: '11999999999',
      p_service_ids: ['service-001'],
      p_professional_id: 'pro-001',
      p_appointment_time: '2026-05-31T10:00:00-03:00',
      p_original_appointment_time: '2026-05-30T10:00:00-03:00',
      p_customer_name: 'Joao',
      p_customer_phone: '11999999999',
      p_total_price: 90,
      p_duration_minutes: 45,
    }));
  });

  it('cria appointment aceito sem atualizar historico original', async () => {
    await createAcceptedAppointmentFromBooking({
      businessId: 'business-001',
      clientId: 'client-001',
      professionalId: 'pro-001',
      serviceNames: 'Corte',
      bookingId: 'booking-001',
      appointmentTime: '2026-05-30T10:00:00-03:00',
      totalPrice: 80,
      durationMinutes: 30,
      preservePublicBookingLink: true,
    });

    expect(supabase.from).toHaveBeenCalledWith('appointments');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'business-001',
      client_id: 'client-001',
      professional_id: 'pro-001',
      service: 'Corte',
      appointment_time: '2026-05-30T10:00:00-03:00',
      price: 80,
      status: 'Confirmed',
      duration_minutes: 30,
      public_booking_id: 'booking-001',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('busca cliente publico por telefone via RPC', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{ name: 'Joao', photo_url: null }],
      error: null,
    });

    const result = await fetchPublicClientByPhone('11999999999', 'business-001');

    expect(result).toEqual({ name: 'Joao', photo_url: null });
    expect(supabase.rpc).toHaveBeenCalledWith('get_public_client_by_phone', {
      p_business_id: 'business-001',
      p_phone: '11999999999',
    });
  });

  it('confirma e rejeita booking pelo tenant do negocio', async () => {
    await confirmPublicBooking('booking-001', 'business-001');
    await rejectPublicBooking('booking-002', 'business-001');

    expect(updateMock).toHaveBeenNthCalledWith(1, { status: 'confirmed' });
    expect(updateMock).toHaveBeenNthCalledWith(2, { status: 'cancelled' });
  });
});
