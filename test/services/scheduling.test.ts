import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calcCheckoutNetAmount, calcMachineFee, completeAppointment, createAppointment, getMachineFeePercent } from '@/services/scheduling';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('scheduling service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  it('calcula taxa de maquininha apenas para debito e credito', () => {
    expect(calcMachineFee(100, 'debit', 2.5)).toBe(2.5);
    expect(calcMachineFee(100, 'credit', 4)).toBe(4);
    expect(calcMachineFee(100, 'pix', 4)).toBe(0);
    expect(calcMachineFee(100, 'cash', 4)).toBe(0);
  });

  it('calcula valor liquido sem permitir negativo', () => {
    expect(calcCheckoutNetAmount(100, 2.5)).toBe(97.5);
    expect(calcCheckoutNetAmount(10, 20)).toBe(0);
  });

  it('resolve percentual padrao por metodo quando taxa esta habilitada', () => {
    const settings = {
      machine_fee_enabled: true,
      debit_fee_percent: 2.5,
      credit_fee_percent: 4,
    };

    expect(getMachineFeePercent('debit', settings)).toBe(2.5);
    expect(getMachineFeePercent('credit', settings)).toBe(4);
    expect(getMachineFeePercent('pix', settings)).toBe(0);
    expect(getMachineFeePercent('debit', { ...settings, machine_fee_enabled: false })).toBe(0);
  });

  it('completeAppointment chama somente a RPC atomica com preco final', async () => {
    await completeAppointment({
      appointmentId: 'apt-001',
      paymentMethod: 'debit',
      receivedBy: '11111111-1111-4111-8111-111111111111',
      completedBy: '11111111-1111-4111-8111-111111111111',
      finalPrice: 80,
      machineFeePercent: 2.5,
      machineFeeAmount: 2,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('complete_appointment', {
      p_appointment_id: 'apt-001',
      p_payment_method: 'debit',
      p_received_by: '11111111-1111-4111-8111-111111111111',
      p_completed_by: '11111111-1111-4111-8111-111111111111',
      p_final_price: 80,
      p_machine_fee_percent: 2.5,
      p_machine_fee_amount: 2,
    });
  });

  it('completeAppointment propaga erro da RPC', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: new Error('falha rpc'),
    });

    await expect(completeAppointment({
      appointmentId: 'apt-001',
      paymentMethod: 'pix',
      receivedBy: null,
      completedBy: null,
      finalPrice: 40,
      machineFeePercent: 0,
      machineFeeAmount: 0,
    })).rejects.toThrow('falha rpc');
  });

  it('createAppointment chama create_secure_booking com payload normalizado', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });
    const appointmentTime = new Date('2026-05-30T10:00:00.000Z');

    const result = await createAppointment({
      companyId: 'company-001',
      professionalId: '11111111-1111-4111-8111-111111111111',
      customerName: 'Joao Silva',
      customerPhone: '11999999999',
      customerEmail: null,
      appointmentTime,
      serviceIds: ['service-001'],
      totalPrice: 80,
      durationMinutes: 30,
      status: 'Confirmed',
      clientId: 'client-001',
      notes: 'Preferencia por maquina 1',
      customServiceName: null,
      paymentMethod: 'pix',
    });

    expect(result).toEqual({ success: true });
    expect(supabase.rpc).toHaveBeenCalledWith('create_secure_booking', {
      p_business_id: 'company-001',
      p_professional_id: '11111111-1111-4111-8111-111111111111',
      p_customer_name: 'Joao Silva',
      p_customer_phone: '11999999999',
      p_customer_email: null,
      p_appointment_time: appointmentTime.toISOString(),
      p_service_ids: ['service-001'],
      p_total_price: 80,
      p_duration_min: 30,
      p_status: 'Confirmed',
      p_client_id: 'client-001',
      p_notes: 'Preferencia por maquina 1',
      p_custom_service_name: null,
      p_payment_method: 'pix',
    });
  });
});
