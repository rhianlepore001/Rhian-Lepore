import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { BrutalButton } from '@/components/BrutalButton';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/Logger';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import type { Appointment } from '@/types';
import { calcCheckoutNetAmount, calcMachineFee, getMachineFeePercent } from '@/services/scheduling';
import { useCheckout } from '@/hooks/useScheduling';
import type { CheckoutPaymentMethod } from '@/types/scheduling';

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
  const checkout = useCheckout();
  const { isPending, mutateAsync, reset } = checkout;

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [machineFeePercent, setMachineFeePercent] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [errors, setErrors] = useState<{ paymentMethod?: string; receivedBy?: string }>({});

  void companyId;

  useEffect(() => {
    if (appointment) {
      setPaymentMethod('');
      setReceivedBy('');
      setMachineFeePercent('');
      setFinalPrice(appointment.price ?? 0);
      setErrors({});
      reset();
    }
  }, [appointment?.id, reset]);

  useEffect(() => {
    const defaultFeePercent = getMachineFeePercent(paymentMethod, financialSettings);
    if (defaultFeePercent > 0) {
      setMachineFeePercent(String(defaultFeePercent));
    } else if (!['debit', 'credit'].includes(paymentMethod)) {
      setMachineFeePercent('');
    }
  }, [paymentMethod, financialSettings]);

  const showMachineFee = ['debit', 'credit'].includes(paymentMethod);
  const feePercent = parseFloat(machineFeePercent) || 0;
  const feeAmount = paymentMethod ? calcMachineFee(finalPrice, paymentMethod, feePercent) : 0;
  const netAmount = calcCheckoutNetAmount(finalPrice, feeAmount);
  const loading = isPending;

  const handleConfirm = async () => {
    const newErrors: { paymentMethod?: string; receivedBy?: string } = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Selecione a forma de pagamento';
    }
    if (!receivedBy) {
      newErrors.receivedBy = 'Selecione quem recebeu o pagamento';
    }
    if (showMachineFee && feeAmount > finalPrice) {
      newErrors.paymentMethod = 'Taxa não pode exceder o valor do serviço';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    if (!appointment || !paymentMethod) return;

    setErrors({});

    try {
      const receivedByUUID = receivedBy !== 'owner' ? receivedBy : null;

      await mutateAsync({
        appointmentId: appointment.id,
        paymentMethod,
        receivedBy: receivedByUUID,
        completedBy: receivedByUUID,
        finalPrice,
        machineFeePercent: feePercent,
        machineFeeAmount: feeAmount,
      });

      onConfirm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro ao concluir atendimento via checkout', { error: errorMessage });
      alert('Erro ao concluir atendimento. Tente novamente.');
    }
  };

  const paymentMethodIcon = (value: string) => {
    if (value === 'cash') return <Banknote size={16} />;
    if (value === 'pix' || value === 'mbway') return <Smartphone size={16} />;
    return <CreditCard size={16} />;
  };

  const paymentMethods: Array<{ value: CheckoutPaymentMethod; label: string }> = region === 'PT'
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
      <div className="space-y-5">
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-1 border border-white/[0.08] backdrop-blur-md">
          <p className="text-xs font-mono uppercase text-neutral-400">Serviço</p>
          <p className="text-white font-medium">{appointment?.service}</p>
        </div>

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
            onChange={(event) => setFinalPrice(parseFloat(event.target.value) || 0)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-accent-gold"
          />
        </div>

        <div>
          <p className={`block text-xs font-mono uppercase mb-2 ${errors.paymentMethod ? 'text-red-400' : 'text-neutral-400'}`}>
            Forma de Pagamento <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {paymentMethods.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2.5 border transition-all duration-200 ${
                  paymentMethod === value
                    ? 'border-accent-gold bg-accent-gold/10 text-accent-gold shadow-[0_0_12px_rgba(194,155,64,0.15)]'
                    : errors.paymentMethod
                    ? 'border-red-500/50 text-neutral-300 hover:border-red-400'
                    : 'border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.03]'
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
                {paymentMethodIcon(value)}
                {label}
              </label>
            ))}
          </div>
          {errors.paymentMethod && (
            <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>
          )}
        </div>

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
                onChange={(event) => setMachineFeePercent(event.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-accent-gold"
              />
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center">
              <span className="text-xs text-neutral-400 font-mono uppercase">Valor que você recebe</span>
              <span className="text-emerald-400 font-mono font-bold">
                R$ {netAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

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
            onChange={(event) => {
              setReceivedBy(event.target.value);
              setErrors((prev) => ({ ...prev, receivedBy: undefined }));
            }}
            className={`w-full bg-white/[0.04] border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-accent-gold ${
              errors.receivedBy ? 'border-red-500' : 'border-white/[0.10]'
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
