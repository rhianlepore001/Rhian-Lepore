import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptCompanyPublicBooking,
  cancelPublicBooking,
  confirmPublicBooking,
  createAcceptedAppointmentFromBooking,
  fetchClientBookingCancellations,
  fetchPublicClientByPhone,
  getActiveBookingByPhone,
  rejectPublicBooking,
  submitPublicBooking,
  fetchAvailableSlots,
  fetchFullDates,
  findNextDateWithSlots,
} from '@/services/publicBooking';
import { supabase } from '@/lib/supabase';

const pendingBooking = {
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
};

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
      data: pendingBooking,
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

  it('cria novo public_booking via RPC create_public_booking com status pending', async () => {
    (supabase.rpc as any)
      .mockResolvedValueOnce({ data: [pendingBooking], error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'pc-1', name: 'Joao', phone: '11999999999', business_id: 'business-001' }],
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

    expect(supabase.rpc).toHaveBeenCalledWith('create_public_booking', {
      p_business_id: 'business-001',
      p_customer_name: 'Joao',
      p_customer_phone: '11999999999',
      p_service_ids: ['service-001'],
      p_professional_id: null,
      p_appointment_time: '2026-05-30T10:00:00-03:00',
      p_total_price: 80,
      p_duration_minutes: 30,
      p_product_lines: [],
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(result.status).toBe('pending');
    expect(result.id).toBe('booking-001');
  });

  it('rejeita overlap quando a RPC retorna slot_unavailable (sem fallback INSERT)', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'slot_unavailable', code: 'P0001' },
    });

    await expect(submitPublicBooking({
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
    })).rejects.toMatchObject({ message: 'slot_unavailable' });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('edita booking preservando original_appointment_time e marcando is_edit', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{
        ...pendingBooking,
        professional_id: 'pro-001',
        appointment_time: '2026-05-31T10:00:00-03:00',
        total_price: 90,
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

    expect(supabase.rpc).toHaveBeenCalledWith('update_public_booking_by_client_v2', expect.objectContaining({
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
      p_product_lines: [],
    }));
  });

  it('fallback do aceite grava public_booking_id por padrão, como o RPC (review #98 N2)', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 'appt-002' }, error: null });
    await createAcceptedAppointmentFromBooking({
      businessId: 'business-001',
      clientId: 'client-001',
      professionalId: 'pro-001',
      serviceNames: 'Corte',
      bookingId: 'booking-002',
      appointmentTime: '2026-05-30T10:00:00-03:00',
      totalPrice: 80,
      durationMinutes: 30,
    });
    expect(insertMock).toHaveBeenLastCalledWith(expect.objectContaining({ public_booking_id: 'booking-002' }));
  });

  it('fallback do aceite: preservePublicBookingLink=false explícito continua sem vínculo', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 'appt-003' }, error: null });
    await createAcceptedAppointmentFromBooking({
      businessId: 'business-001',
      clientId: 'client-001',
      serviceNames: 'Corte',
      bookingId: 'booking-003',
      appointmentTime: '2026-05-30T10:00:00-03:00',
      totalPrice: 80,
      durationMinutes: 30,
      preservePublicBookingLink: false,
    });
    expect(insertMock).toHaveBeenLastCalledWith(expect.not.objectContaining({ public_booking_id: expect.anything() }));
  });

  it('cria appointment aceito sem atualizar historico original', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 'appt-001' }, error: null });

    const appointmentId = await createAcceptedAppointmentFromBooking({
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

    expect(appointmentId).toBe('appt-001');
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

  it('confirma pelo tenant e rejeita via RPC autenticada', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

    await confirmPublicBooking('booking-001', 'business-001');
    await rejectPublicBooking('booking-002', 'business-001');

    expect(updateMock).toHaveBeenCalledWith({ status: 'confirmed' });
    expect(supabase.rpc).toHaveBeenCalledWith('reject_public_booking_v2', {
      p_booking_id: 'booking-002',
    });
  });

  it('cancela booking do cliente via RPC com prova de telefone', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

    await cancelPublicBooking('booking-001', '11999999999');

    expect(supabase.rpc).toHaveBeenCalledWith('cancel_public_booking_by_client_v2', {
      p_booking_id: 'booking-001',
      p_phone: '11999999999',
    });
  });

  it('propaga erro quando o cancelamento RPC falha', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'booking_not_cancellable', code: 'P0001' },
    });

    await expect(cancelPublicBooking('booking-001', '11999999999')).rejects.toMatchObject({
      message: 'booking_not_cancellable',
    });
  });

  it('aceita booking da empresa via RPC (staff ou dono)', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: { appointment_id: 'appt-001', service_names: 'Corte' },
      error: null,
    });

    const result = await acceptCompanyPublicBooking('booking-001');

    expect(result).toEqual({ appointmentId: 'appt-001', serviceNames: 'Corte' });
    expect(supabase.rpc).toHaveBeenCalledWith('accept_public_booking_v2', {
      p_booking_id: 'booking-001',
    });
  });

  it('busca quem cancelou os pedidos do cliente (item 5b)', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        { booking_id: 'b1', cancelled_by_business: true },
        { booking_id: 'b2', cancelled_by_business: false },
      ],
      error: null,
    });
    await expect(fetchClientBookingCancellations('351912345678', 'business-001')).resolves.toEqual({ b1: true, b2: false });
    expect(supabase.rpc).toHaveBeenCalledWith('get_client_booking_cancellations', {
      p_phone: '351912345678',
      p_business_id: 'business-001',
    });
  });

  it('sem a RPC (migration não aplicada) devolve {} em vez de quebrar a Minha Área', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(fetchClientBookingCancellations('351912345678', 'business-001')).resolves.toEqual({});
  });

  it('propaga outros erros da RPC de cancelamentos', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(fetchClientBookingCancellations('351912345678', 'business-001')).rejects.toMatchObject({ code: '42501' });
  });

  it('busca horários via get_available_slots_v2 e devolve antecedência', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: { slots: ['18:00', '18:30'], lead_time_hours: 8, empty_reason: null },
      error: null,
    });
    await expect(fetchAvailableSlots('business-001', '2026-10-03', null, 30)).resolves.toEqual({
      slots: ['18:00', '18:30'],
      leadTimeHours: 8,
      emptyReason: null,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('get_available_slots_v2', {
      p_business_id: 'business-001',
      p_date: '2026-10-03',
      p_professional_id: null,
      p_duration_min: 30,
    });
  });

  it('se a v2 ainda não existe, cai na v1', async () => {
    (supabase.rpc as any)
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
      .mockResolvedValueOnce({ data: { slots: ['10:00'] }, error: null });
    await expect(fetchAvailableSlots('business-001', '2026-10-03', 'pro-1', 45)).resolves.toEqual({
      slots: ['10:00'],
      leadTimeHours: 0,
      emptyReason: null,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_available_slots', expect.objectContaining({
      p_business_id: 'business-001',
      p_date: '2026-10-03',
    }));
  });

  it('busca dias cheios via get_full_dates_v2', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: ['2026-10-03'], error: null });
    await expect(fetchFullDates('business-001', '2026-10-03', '2026-10-10', null, 30)).resolves.toEqual(['2026-10-03']);
    expect(supabase.rpc).toHaveBeenCalledWith('get_full_dates_v2', expect.objectContaining({
      p_business_id: 'business-001',
      p_start_date: '2026-10-03',
    }));
  });

  it('findNextDateWithSlots usa um get_full_dates_v2 e devolve o primeiro dia livre', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: ['2026-10-04'], error: null });
    await expect(findNextDateWithSlots('business-001', '2026-10-03', null, 30, 'Europe/Lisbon')).resolves.toBe('2026-10-05');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('get_full_dates_v2', expect.objectContaining({
      p_business_id: 'business-001',
      p_start_date: '2026-10-04',
      p_end_date: '2026-10-17',
    }));
  });
});
