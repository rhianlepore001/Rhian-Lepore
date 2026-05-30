import { supabase } from '@/lib/supabase';
import {
  checkoutInputSchema,
  createAppointmentInputSchema,
  type CheckoutInput,
  type CheckoutPaymentMethod,
  type CreateAppointmentInput,
  type MachineFeeSettings,
} from '@/types/scheduling';

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
