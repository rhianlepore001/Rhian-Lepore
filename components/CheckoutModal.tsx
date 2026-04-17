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
  const { companyId, region } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [machineFeePercent, setMachineFeePercent] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ paymentMethod?: string; receivedBy?: string }>({});

  // Suprime lint warning — companyId mantido para futuras queries multi-tenant
  void companyId;

  // Reset estado quando appointment muda
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

  // Pré-preencher taxa quando método de pagamento muda
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

  const feePercent = parseFloat(machineFeePercent) || 0;
  const feeAmount = showMachineFee ? parseFloat((finalPrice * feePercent / 100).toFixed(2)) : 0;
  const netAmount = parseFloat((finalPrice - feeAmount).toFixed(2));

  const handleConfirm = async () => {
    const newErrors: { paymentMethod?: string; receivedBy?: string } = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Selecione a forma de pagamento';
    }
    if (!receivedBy) {
      newErrors.receivedBy = 'Selecione quem recebeu o pagamento';
    }
    // EC-F2-05: taxa não pode exceder o valor
    if (showMachineFee && feeAmount > finalPrice) {
      newErrors.paymentMethod = 'Taxa não pode exceder o valor do serviço';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    if (!appointment) return;

    setLoading(true);
    setErrors({});

    try {
      // Atualizar preço final se foi editado
      if (finalPrice !== appointment.price) {
        const { error: priceError } = await supabase
          .from('appointments')
          .update({ price: finalPrice })
          .eq('id', appointment.id);
        if (priceError) throw priceError;
      }

      // Chamar RPC v2 com todos os parâmetros
      const receivedByUUID = receivedBy !== 'owner' ? receivedBy : null;
      const { error: rpcError } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointment.id,
        p_payment_method: paymentMethod,
        p_received_by: receivedByUUID,
        p_completed_by: receivedByUUID,
        p_machine_fee_percent: feePercent,
        p_machine_fee_amount: feeAmount,
      });

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

  // Métodos de pagamento por região
  const paymentMethods = region === 'PT'
    ? [
        { value: 'cash', label: 'Dinheiro' },
        { value: 'mbway', label: 'MBWay' },
        { value: 'debit', label: 'Débito' },
        { value: 'credit', label: 'Crédito' },
      ]
    : [
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
        {/* Resumo do atendimento (read-only) */}
        <div className="bg-neutral-800 rounded-lg p-3 space-y-1 border border-neutral-700">
          <p className="text-xs font-mono uppercase text-neutral-400">Serviço</p>
          <p className="text-white font-medium">{appointment?.service}</p>
        </div>

        {/* Valor final (editável — EC-F2-04: permite valor zero) */}
        <div>
          <label htmlFor="checkout-price" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
            Valor Final (R$)
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

        {/* Forma de Pagamento (obrigatório) */}
        <div>
          <p className={`block text-xs font-mono uppercase mb-2 ${errors.paymentMethod ? 'text-red-400' : 'text-neutral-400'}`}>
            Forma de Pagamento <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 border transition-colors ${
                  paymentMethod === value
                    ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                    : errors.paymentMethod
                    ? 'border-red-500/50 text-neutral-300 hover:border-red-400'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={value}
                  aria-label={label}
                  checked={paymentMethod === value}
                  onChange={() => {
                    setPaymentMethod(value);
                    setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
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

        {/* Taxa de Maquininha — apenas para Débito/Crédito */}
        {showMachineFee && (
          <div className="space-y-2">
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
            {/* Valor líquido em tempo real */}
            <div className="bg-neutral-900 rounded-lg px-3 py-2 border border-neutral-800 flex justify-between items-center">
              <span className="text-xs text-neutral-400 font-mono uppercase">Valor Líquido</span>
              <span className="text-white font-mono font-bold">
                R$ {netAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        {/* Recebido Por (obrigatório) */}
        <div>
          <label
            htmlFor="checkout-received-by"
            className={`block text-xs font-mono uppercase mb-1 ${errors.receivedBy ? 'text-red-400' : 'text-neutral-400'}`}
          >
            Recebido Por <span className="text-red-500">*</span>
          </label>
          <select
            id="checkout-received-by"
            aria-label="Recebido por"
            value={receivedBy}
            onChange={(e) => {
              setReceivedBy(e.target.value);
              setErrors((prev) => ({ ...prev, receivedBy: undefined }));
            }}
            className={`w-full bg-neutral-800 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-gold ${
              errors.receivedBy ? 'border-red-500' : 'border-neutral-700'
            }`}
          >
            <option value="">Selecionar...</option>
            <option value="owner">Dono</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors.receivedBy && (
            <p className="text-red-500 text-xs mt-1">{errors.receivedBy}</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
