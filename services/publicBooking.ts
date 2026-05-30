import { supabase } from '@/lib/supabase';
import {
  createAcceptedAppointmentInputSchema,
  submitPublicBookingInputSchema,
  type CreateAcceptedAppointmentInput,
  type PublicBookingRecord,
  type SubmitPublicBookingInput,
} from '@/types/publicBooking';

export async function getActiveBookingByPhone(
  phone: string,
  businessId: string,
): Promise<PublicBookingRecord | null> {
  const { data, error } = await supabase.rpc('get_active_booking_by_phone', {
    p_phone: phone,
    p_business_id: businessId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function submitPublicBooking(input: SubmitPublicBookingInput): Promise<PublicBookingRecord> {
  const parsed = submitPublicBookingInputSchema.parse(input);

  if (parsed.editingBookingId) {
    const { error: updateError } = await supabase
      .from('public_bookings')
      .update({
        service_ids: parsed.serviceIds,
        professional_id: parsed.professionalId,
        appointment_time: parsed.appointmentTime,
        original_appointment_time: parsed.originalAppointmentTime,
        updated_at: new Date().toISOString(),
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone,
        total_price: parsed.totalPrice,
        status: 'pending',
        duration_minutes: parsed.durationMinutes,
        is_edit: true,
      })
      .eq('id', parsed.editingBookingId);

    if (updateError) throw updateError;

    const { data: updatedBooking, error: fetchError } = await supabase
      .from('public_bookings')
      .select('*')
      .eq('id', parsed.editingBookingId)
      .single();

    if (fetchError) throw fetchError;
    return updatedBooking as PublicBookingRecord;
  }

  const { data: newBooking, error: insertError } = await supabase
    .from('public_bookings')
    .insert({
      business_id: parsed.businessId,
      customer_name: parsed.customerName,
      customer_phone: parsed.customerPhone,
      service_ids: parsed.serviceIds,
      professional_id: parsed.professionalId,
      appointment_time: parsed.appointmentTime,
      total_price: parsed.totalPrice,
      status: 'pending',
      duration_minutes: parsed.durationMinutes,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return newBooking as PublicBookingRecord;
}

export async function createAcceptedAppointmentFromBooking(input: CreateAcceptedAppointmentInput): Promise<void> {
  const parsed = createAcceptedAppointmentInputSchema.parse(input);
  const payload: Record<string, unknown> = {
    user_id: parsed.businessId,
    client_id: parsed.clientId,
    professional_id: parsed.professionalId ?? null,
    service: parsed.serviceNames,
    appointment_time: parsed.appointmentTime,
    price: parsed.totalPrice,
    status: 'Confirmed',
    duration_minutes: parsed.durationMinutes,
  };

  if (parsed.preservePublicBookingLink) {
    payload.public_booking_id = parsed.bookingId;
  }

  const { error } = await supabase
    .from('appointments')
    .insert(payload);

  if (error) throw error;
}

export async function confirmPublicBooking(bookingId: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('public_bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('business_id', businessId);

  if (error) throw error;
}

export async function rejectPublicBooking(bookingId: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('public_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('business_id', businessId);

  if (error) throw error;
}
