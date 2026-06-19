import { supabase } from '@/lib/supabase';
import {
  assignProfessionalInputSchema,
  cancelAppointmentInputSchema,
  checkoutInputSchema,
  createAgendaAppointmentInputSchema,
  createAppointmentInputSchema,
  deleteAppointmentInputSchema,
  markAppointmentCompleteInputSchema,
  type AgendaAppointmentView,
  type AgendaStaffFilter,
  type AssignProfessionalInput,
  type CancelAppointmentInput,
  type CheckoutInput,
  type CheckoutPaymentMethod,
  type CreateAgendaAppointmentInput,
  type CreateAppointmentInput,
  type DeleteAppointmentInput,
  type MachineFeeSettings,
  type MarkAppointmentCompleteInput,
} from '@/types/scheduling';

interface AppointmentRow {
  id: string;
  client_id: string;
  service: string;
  appointment_time: string;
  price: number;
  status: string;
  professional_id: string | null;
  notes?: string | null;
  payment_method?: string | null;
  clients?: { name?: string; id?: string; phone?: string } | null;
}

export interface FutureAppointmentModalItem {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string;
  rawDate: string;
  status: string;
  price: number;
  appointment_time: string;
}

export function mapToAgendaAppointment(
  apt: AppointmentRow,
  servicePriceMap: Map<string, number>,
): AgendaAppointmentView {
  const basePrice = servicePriceMap.get(apt.service) || apt.price;
  return {
    id: apt.id,
    client_id: apt.client_id,
    clientName: apt.clients?.name || 'Cliente Desconhecido',
    clientPhone: apt.clients?.phone || '',
    service: apt.service,
    appointment_time: apt.appointment_time,
    price: apt.price,
    status: apt.status,
    professional_id: apt.professional_id ?? null,
    basePrice,
    notes: apt.notes ?? undefined,
    payment_method: apt.payment_method,
  };
}

export function calcMachineFee(
  finalPrice: number,
  paymentMethod: CheckoutPaymentMethod,
  feePercent: number,
): number {
  if (!['debit', 'credit'].includes(paymentMethod)) return 0;
  return Number(((finalPrice * feePercent) / 100).toFixed(2));
}

export function getMachineFeePercent(
  paymentMethod: CheckoutPaymentMethod | '',
  settings: MachineFeeSettings | null,
): number {
  if (!settings?.machine_fee_enabled) return 0;
  if (paymentMethod === 'debit') return settings.debit_fee_percent || 0;
  if (paymentMethod === 'credit') return settings.credit_fee_percent || 0;
  return 0;
}

export function calcCheckoutNetAmount(finalPrice: number, machineFeeAmount: number): number {
  return Number(Math.max(finalPrice - machineFeeAmount, 0).toFixed(2));
}

export async function completeAppointment(input: CheckoutInput): Promise<void> {
  const parsed = checkoutInputSchema.parse(input);

  const { error } = await supabase.rpc('complete_appointment', {
    p_appointment_id: parsed.appointmentId,
    p_payment_method: parsed.paymentMethod,
    p_received_by: parsed.receivedBy ?? null,
    p_completed_by: parsed.completedBy ?? parsed.receivedBy ?? null,
    p_final_price: parsed.finalPrice,
    p_machine_fee_percent: parsed.machineFeePercent,
    p_machine_fee_amount: parsed.machineFeeAmount,
  });

  if (error) throw error;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<unknown> {
  const parsed = createAppointmentInputSchema.parse(input);

  const { data, error } = await supabase.rpc('create_secure_booking', {
    p_business_id: parsed.companyId,
    p_professional_id: parsed.professionalId,
    p_customer_name: parsed.customerName,
    p_customer_phone: parsed.customerPhone ?? null,
    p_customer_email: parsed.customerEmail ?? null,
    p_appointment_time: parsed.appointmentTime.toISOString(),
    p_service_ids: parsed.serviceIds,
    p_total_price: parsed.totalPrice,
    p_duration_min: parsed.durationMinutes,
    p_status: parsed.status,
    p_client_id: parsed.clientId ?? null,
    p_notes: parsed.notes ?? null,
    p_custom_service_name: parsed.customServiceName ?? null,
    p_payment_method: parsed.paymentMethod ?? null,
  });

  if (error) throw error;
  return data;
}

export async function fetchAgendaServices(companyId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes, category_id, description')
    .eq('user_id', companyId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchAgendaClients(companyId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('user_id', companyId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchAgendaTeamMembers(companyId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, photo_url')
    .eq('user_id', companyId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchAgendaCategories(companyId: string) {
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name')
    .eq('user_id', companyId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchServicePriceMap(companyId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('services')
    .select('name, price')
    .eq('user_id', companyId);
  if (error) throw error;
  return new Map(data?.map(s => [s.name, s.price]));
}

export async function fetchBusinessName(companyId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', companyId)
    .single();
  if (error) throw error;
  return data?.business_name || 'Seu Estabelecimento';
}

export async function fetchCheckoutTeamMembers(companyId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, active')
    .eq('user_id', companyId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchCheckoutSettings(companyId: string) {
  const { data, error } = await supabase
    .from('business_settings')
    .select('machine_fee_enabled, debit_fee_percent, credit_fee_percent')
    .eq('user_id', companyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchDayAppointments(
  filter: AgendaStaffFilter & { date: Date },
): Promise<AppointmentRow[]> {
  const startOfDay = new Date(filter.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(filter.date);
  endOfDay.setHours(23, 59, 59, 999);

  const query = supabase
    .from('appointments')
    .select('*, clients(name, id, phone)')
    .eq('user_id', filter.companyId)
    .gte('appointment_time', startOfDay.toISOString())
    .lte('appointment_time', endOfDay.toISOString())
    .in('status', ['Confirmed', 'Pending', 'Completed']);

  const { data, error } = await query.order('appointment_time');
  if (error) throw error;
  return (data ?? []) as AppointmentRow[];
}

export async function fetchOverdueAppointments(
  filter: AgendaStaffFilter,
): Promise<AppointmentRow[]> {
  const now = new Date().toISOString();

  const query = supabase
    .from('appointments')
    .select('*, clients(name, phone)')
    .eq('user_id', filter.companyId)
    .in('status', ['Confirmed', 'Pending'])
    .lt('appointment_time', now);

  const { data, error } = await query.order('appointment_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppointmentRow[];
}

export async function fetchHistoryAppointments(
  filter: AgendaStaffFilter & { month: Date },
): Promise<AppointmentRow[]> {
  const startOfMonth = new Date(filter.month.getFullYear(), filter.month.getMonth(), 1);
  const endOfMonth = new Date(filter.month.getFullYear(), filter.month.getMonth() + 1, 0, 23, 59, 59);

  const query = supabase
    .from('appointments')
    .select('*, clients(name)')
    .eq('user_id', filter.companyId)
    .gte('appointment_time', startOfMonth.toISOString())
    .lte('appointment_time', endOfMonth.toISOString())
    .in('status', ['Completed', 'Cancelled']);

  const { data, error } = await query.order('appointment_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppointmentRow[];
}

export async function fetchFutureAppointmentsForModal(
  filter: AgendaStaffFilter,
): Promise<FutureAppointmentModalItem[]> {
  const now = new Date().toISOString();

  const query = supabase
    .from('appointments')
    .select('*, clients(name)')
    .eq('user_id', filter.companyId)
    .gte('appointment_time', now)
    .in('status', ['Confirmed', 'Pending']);

  const { data, error } = await query.order('appointment_time', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((apt: AppointmentRow) => ({
    id: apt.id,
    clientName: apt.clients?.name || 'Cliente Desconhecido',
    service: apt.service,
    time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
    status: apt.status,
    price: apt.price,
    appointment_time: apt.appointment_time,
  }));
}

export async function fetchPendingPublicBookings(businessId: string) {
  const { data, error } = await supabase
    .from('public_bookings')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('appointment_time');
  if (error) throw error;
  return data ?? [];
}

export async function deleteAppointmentWithFinance(input: DeleteAppointmentInput): Promise<void> {
  const parsed = deleteAppointmentInputSchema.parse(input);
  const { error } = await supabase.rpc('delete_appointment_with_finance', {
    p_appointment_id: parsed.appointmentId,
  });
  if (error) throw error;
}

export async function markAppointmentComplete(input: MarkAppointmentCompleteInput): Promise<void> {
  const parsed = markAppointmentCompleteInputSchema.parse(input);
  const { error } = await supabase.rpc('complete_appointment', {
    p_appointment_id: parsed.appointmentId,
  });
  if (error) throw error;
}

export async function cancelAppointment(input: CancelAppointmentInput): Promise<void> {
  const parsed = cancelAppointmentInputSchema.parse(input);
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'Cancelled' })
    .eq('id', parsed.appointmentId);
  if (error) throw error;
}

export async function assignAppointmentProfessional(input: AssignProfessionalInput): Promise<void> {
  const parsed = assignProfessionalInputSchema.parse(input);
  const { error } = await supabase
    .from('appointments')
    .update({ professional_id: parsed.professionalId })
    .eq('id', parsed.appointmentId);
  if (error) throw error;
}

export async function createAgendaAppointment(input: CreateAgendaAppointmentInput): Promise<void> {
  const parsed = createAgendaAppointmentInputSchema.parse(input);
  const { error } = await supabase
    .from('appointments')
    .insert({
      user_id: parsed.companyId,
      client_id: parsed.clientId,
      professional_id: parsed.professionalId,
      service: parsed.serviceNames,
      appointment_time: parsed.appointmentTime.toISOString(),
      price: parsed.price,
      status: 'Confirmed',
      notes: parsed.notes ?? null,
    });
  if (error) throw error;
}
