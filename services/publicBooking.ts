import { supabase } from '@/lib/supabase';
import type { PublicClient } from '@/types';
import { formatPhone } from '@/utils/formatters';
import {
  createAcceptedAppointmentInputSchema,
  submitPublicBookingInputSchema,
  type CreateAcceptedAppointmentInput,
  type PublicBookingRecord,
  type SubmitPublicBookingInput,
} from '@/types/publicBooking';

export async function upsertPublicClientSession(params: {
  businessId: string;
  name: string;
  phone: string;
  photoUrl?: string | null;
  email?: string | null;
}): Promise<PublicClient> {
  const { data: rows, error } = await supabase.rpc('upsert_public_client', {
    p_business_id: params.businessId,
    p_name: params.name,
    p_phone: params.phone,
    p_photo_url: params.photoUrl ?? null,
    p_email: params.email ?? null,
  });

  if (error) throw error;

  const row = rows?.[0];
  if (!row) {
    throw new Error('upsert_public_client returned no row');
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    photo_url: row.photo_url ?? null,
    business_id: row.business_id ?? params.businessId,
  };
}

export async function resolveClientForBookingAcceptance(params: {
  businessId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
}): Promise<string> {
  const rawPhone = params.customerPhone;
  const formattedPhoneBR = formatPhone(rawPhone, 'BR');
  const formattedPhonePT = formatPhone(rawPhone, 'PT');
  const orFilter = `phone.eq.${rawPhone},phone.eq.${formattedPhoneBR},phone.eq.${formattedPhonePT}`;

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, photo_url')
    .eq('user_id', params.businessId)
    .or(orFilter)
    .maybeSingle();

  if (existingClient) {
    const { data: publicClient } = await supabase
      .from('public_clients')
      .select('photo_url')
      .eq('phone', params.customerPhone)
      .eq('business_id', params.businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (publicClient?.photo_url && existingClient.photo_url !== publicClient.photo_url) {
      await supabase
        .from('clients')
        .update({ photo_url: publicClient.photo_url })
        .eq('id', existingClient.id)
        .eq('user_id', params.businessId);
    }

    return existingClient.id;
  }

  const { data: publicClient } = await supabase
    .from('public_clients')
    .select('photo_url')
    .eq('phone', params.customerPhone)
    .eq('business_id', params.businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: params.businessId,
      name: params.customerName,
      phone: params.customerPhone,
      email: params.customerEmail ?? null,
      photo_url: publicClient?.photo_url || null,
    })
    .select('id')
    .single();

  if (clientError) throw clientError;
  return newClient.id;
}

export async function fetchServiceNamesByIds(businessId: string, serviceIds: string[]): Promise<string> {
  const { data: serviceDetails, error } = await supabase
    .from('services')
    .select('name')
    .in('id', serviceIds)
    .eq('user_id', businessId);

  if (error) throw error;
  return (serviceDetails ?? []).map((s) => s.name).join(', ');
}

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
    const { data: updatedRows, error: updateError } = await supabase.rpc('update_public_booking_by_client', {
      p_booking_id: parsed.editingBookingId,
      p_phone: parsed.customerPhone,
      p_service_ids: parsed.serviceIds,
      p_professional_id: parsed.professionalId,
      p_appointment_time: parsed.appointmentTime,
      p_original_appointment_time: parsed.originalAppointmentTime,
      p_customer_name: parsed.customerName,
      p_customer_phone: parsed.customerPhone,
      p_total_price: parsed.totalPrice,
      p_duration_minutes: parsed.durationMinutes,
    });

    if (updateError) throw updateError;
    const updatedBooking = updatedRows?.[0];
    if (!updatedBooking) {
      throw new Error('Booking not found or not editable');
    }

    try {
      await upsertPublicClientSession({
        businessId: parsed.businessId,
        name: parsed.customerName,
        phone: parsed.customerPhone,
      });
    } catch (clientErr) {
      console.error('Failed to upsert public client after booking edit:', clientErr);
    }

    return updatedBooking as PublicBookingRecord;
  }

  const { error: insertError } = await supabase
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
    });

  if (insertError) throw insertError;

  try {
    await upsertPublicClientSession({
      businessId: parsed.businessId,
      name: parsed.customerName,
      phone: parsed.customerPhone,
    });
  } catch (clientErr) {
    console.error('Failed to upsert public client after booking:', clientErr);
  }

  const activeBooking = await getActiveBookingByPhone(parsed.customerPhone, parsed.businessId);
  if (!activeBooking) {
    throw new Error('Booking created but could not be retrieved');
  }
  return activeBooking;
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

export async function cancelPublicBooking(bookingId: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('public_bookings')
    .delete()
    .eq('id', bookingId)
    .eq('business_id', businessId);

  if (error) throw error;
}

export async function fetchEditBooking(editId: string, businessId: string, phone: string) {
  const { data, error } = await supabase.rpc('get_booking_by_id', {
    p_booking_id: editId,
    p_phone: phone,
  });

  if (error) throw error;
  const booking = data?.[0];
  if (!booking || booking.business_id !== businessId) {
    return null;
  }
  return booking;
}

export async function fetchPublicClientByPhone(phone: string, businessId: string) {
  const { data, error } = await supabase.rpc('get_public_client_by_phone', {
    p_business_id: businessId,
    p_phone: phone,
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return { name: row.name, photo_url: row.photo_url ?? null };
}

export async function fetchClientByPhone(phone: string, businessId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('name, photo_url')
    .eq('phone', phone)
    .eq('user_id', businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchPublicBookingById(
  bookingId: string,
  businessId: string,
  phone: string,
) {
  const { data, error } = await supabase.rpc('get_public_booking_by_id', {
    p_booking_id: bookingId,
    p_business_id: businessId,
    p_phone: phone,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchAvailableSlots(businessId: string, date: string, professionalId: string | null, durationMin: number) {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_business_id: businessId,
    p_date: date,
    p_professional_id: professionalId,
    p_duration_min: durationMin,
  });

  if (error) throw error;
  return (data?.slots || []) as string[];
}

export async function fetchFullDates(businessId: string, startDate: string, endDate: string, professionalId: string | null, durationMin: number) {
  const { data, error } = await supabase.rpc('get_full_dates', {
    p_business_id: businessId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_professional_id: professionalId,
    p_duration_min: durationMin,
  });

  if (error) throw error;
  return data as string[];
}

export async function fetchBusinessProfileBySlug(slug: string) {
  const { data, error } = await supabase.rpc('get_public_profile_by_slug', {
    p_slug: slug,
  });

  if (error) throw error;
  if (!data) {
    throw new Error('Business not found');
  }
  return data;
}

export async function fetchBusinessSettings(businessId: string) {
  const { data, error } = await supabase.rpc('get_public_business_settings_json', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data ?? null;
}

export async function fetchPublicServices(businessId: string) {
  const { data, error } = await supabase.rpc('get_public_services_catalog', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicCategories(businessId: string) {
  const { data, error } = await supabase.rpc('get_public_categories_catalog', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicProfessionals(businessId: string) {
  const { data, error } = await supabase.rpc('get_public_team_catalog', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicGallery(businessId: string) {
  const { data, error } = await supabase.rpc('get_public_gallery_catalog', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function getFirstAvailableProfessional(businessId: string, appointmentTime: string, durationMin: number) {
  const { data } = await supabase.rpc('get_first_available_professional', {
    p_business_id: businessId,
    p_appointment_time: appointmentTime,
    p_duration_min: durationMin,
  });
  return data as string | null;
}

export async function uploadClientPhoto(businessId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `public_${businessId}_${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage.from('client_photos').upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('client_photos').getPublicUrl(fileName);
  return publicUrl;
}
