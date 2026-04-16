import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { BrutalButton } from '@/components/BrutalButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/Logger';
import type { Appointment } from '@/types';

interface TeamMember {
  id: string;
  name: string;
  active: boolean;
}

interface FinancialSettings {
  machine_fee_enabled: boolean;
  debit_fee_percent: number;
  credit_fee_percent: number;
}

export interface CheckoutModalProps {
  appointment: Appointment | null;
  teamMembers: TeamMember[];
  financialSettings: FinancialSettings | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  appointment,
  teamMembers,
  financialSettings,
  onClose,
  onConfirm,
}) => {
  const { companyId } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [machineFeePercent, setMachineFeePercent] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ paymentMethod?: string }>({});

  // Suprime lint warning — companyId mantido para futuras queries multi-tenant
  void companyId;

  // Reset estado quando appointment muda (D-Pitfall 4)
  useEffect(() => {
    if (appointment) {
      setPaymentMethod('');
      setReceivedBy('');
      setMachineFeePercent('');
      setFinalPrice(appointment.price ?? 0);
      setErrors({});
      setLoading(false);
    }
  }, [appointment?.id]);

  // Pré-preencher taxa quando método muda
  useEffect(() => {
    if (paymentMethod === 'debit' && financialSettings?.debit_fee_percent) {
      setMachineFeePercent(String(financialSettings.debit_fee_percent));
    } else if (paymentMethod === 'credit' && financialSettings?.credit_fee_percent) {
      setMachineFeePercent(String(financialSettings.credit_fee_percent));
    } else if (!['debit', 'credit'].includes(paymentMethod)) {
      setMachineFeePercent('');
    }
  }, [paymentMethod, financialSettings]);

  const showMachineFee = ['debit', 'credit'].includes(paymentMethod);

  const handleConfirm = async () => {
    if (!paymentMethod) {
      setErrors({ paymentMethod: 'Selecione a forma de pagamento' });
      return;
    }
    if (!appointment) return;

    setLoading(true);
    setErrors({});

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_method: paymentMethod,
          received_by: receivedBy || null,
          machine_fee_applied: showMachineFee && !!machineFeePercent,
          machine_fee_percent: showMachineFee && machineFeePercent
            ? parseFloat(machineFeePercent)
            : null,
          price: finalPrice,
        })
        .eq('id', appointment.id);

      if (updateError) throw updateError;

      const { error: rpcError } = await supabase
        .rpc('complete_appointment', { p_appointment_id: appointment.id });

      if (rpcError) throw rpcError;

      onConfirm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro ao concluir atendimento via checkout', { error: errorMessage });
      alert('Erro ao concluir atendimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'pix', label: 'PIX' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
  ];

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title="Concluir Atendimento"
      size="md"
      preventClose={loading}
      footer={
        <div className="flex items-center justify-between w-full">
          <BrutalButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </BrutalButton>
          <BrutalButton variant="primary" onClick={handleConfirm} loading={loading}>
            Confirmar Pagamento
          </BrutalButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Serviço (read-only) */}
        <div>
          <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
            Serviço
          </label>
          <p className="text-white font-medium">{appointment?.service}</p>
        </div>

        {/* Valor (editável) */}
        <div>
          <label htmlFor="checkout-price" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
            Valor (R$)
          </label>
          <input
            id="checkout-price"
            type="number"
            step="0.01"
            min="0"
            value={finalPrice}
            onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-gold"
          />
        </div>

        {/* Forma de Pagamento (obrigatório — D-02) */}
        <div>
          <p className="block text-xs font-mono uppercase text-neutral-400 mb-2">
            Forma de Pagamento <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 border transition-colors ${
                  paymentMethod === value
                    ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                } ${errors.paymentMethod ? 'border-red-500' : ''}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={value}
                  aria-label={label}
                  checked={paymentMethod === value}
                  onChange={() => {
                    setPaymentMethod(value);
                    setErrors({});
                  }}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
          {errors.paymentMethod && (
            <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>
          )}
        </div>

        {/* Taxa de Maquininha — apenas para débito/crédito (D-02) */}
        {showMachineFee && (
          <div>
            <label htmlFor="checkout-fee" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
              Taxa de Maquininha (%)
            </label>
            <input
              id="checkout-fee"
              aria-label="Taxa de maquininha (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Ex: 2.5"
              value={machineFeePercent}
              onChange={(e) => setMachineFeePercent(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-gold"
            />
          </div>
        )}

        {/* Recebido Por (D-02) */}
        <div>
          <label htmlFor="checkout-received-by" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
            Recebido Por
          </label>
          <select
            id="checkout-received-by"
            aria-label="Recebido por"
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-gold"
          >
            <option value="">Selecionar...</option>
            <option value="owner">Dono</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
};