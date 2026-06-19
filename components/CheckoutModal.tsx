import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { logger } from '@/utils/Logger';
import { Banknote, CreditCard, Minus, Package, Plus, Smartphone } from 'lucide-react';
import type { Appointment } from '@/types';
import { calcCheckoutNetAmount, calcMachineFee, getMachineFeePercent } from '@/services/scheduling';
import { useCheckout } from '@/hooks/useScheduling';
import type { CheckoutPaymentMethod } from '@/types/scheduling';
import { useProducts, useSellProduct } from '@/hooks/useCatalog';
import type { Product } from '@/types/catalog';

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

interface CartLine {
  productId: string;
  quantity: number;
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
  const { showToast } = useToast();
  const { colors, accent, font, status } = useBrutalTheme();
  const checkout = useCheckout();
  const sellProductMutation = useSellProduct();
  const { isPending, mutateAsync, reset } = checkout;

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [machineFeePercent, setMachineFeePercent] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [errors, setErrors] = useState<{ paymentMethod?: string; receivedBy?: string }>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: products = [] } = useProducts({
    companyId: companyId ?? '',
    includeInactive: false,
  });

  const availableProducts = useMemo(
    () => products.filter((p: Product) => p.is_active && p.stock_quantity > 0),
    [products]
  );

  useEffect(() => {
    if (appointment) {
      setPaymentMethod('');
      setReceivedBy('');
      setMachineFeePercent('');
      setFinalPrice(appointment.price ?? 0);
      setErrors({});
      setCart([]);
      setSelectedProductId('');
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
  const loading = isPending || sellProductMutation.isPending;

  const getProductById = (id: string) => availableProducts.find(p => p.id === id);

  const addProductToCart = () => {
    if (!selectedProductId) return;
    const product = getProductById(selectedProductId);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(line => line.productId === selectedProductId);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > product.stock_quantity) {
          showToast(`Estoque insuficiente. Disponível: ${product.stock_quantity} un.`, 'warning');
          return prev;
        }
        return prev.map(line =>
          line.productId === selectedProductId ? { ...line, quantity: nextQty } : line
        );
      }
      return [...prev, { productId: selectedProductId, quantity: 1 }];
    });
    setSelectedProductId('');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const product = getProductById(productId);
      if (!product) return prev;

      return prev
        .map(line => {
          if (line.productId !== productId) return line;
          const nextQty = line.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > product.stock_quantity) {
            showToast(`Estoque insuficiente. Disponível: ${product.stock_quantity} un.`, 'warning');
            return line;
          }
          return { ...line, quantity: nextQty };
        })
        .filter((line): line is CartLine => line !== null);
    });
  };

  const productsTotal = cart.reduce((sum, line) => {
    const product = getProductById(line.productId);
    return sum + (product ? product.sale_price * line.quantity : 0);
  }, 0);

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
      for (const line of cart) {
        await sellProductMutation.mutateAsync({
          productId: line.productId,
          quantity: line.quantity,
          appointmentId: appointment.id,
        });
      }

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
      if (errorMessage.includes('insufficient_stock')) {
        showToast('Estoque insuficiente para um dos produtos.', 'error');
      } else {
        showToast('Erro ao concluir atendimento. Tente novamente.', 'error');
      }
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

  const currencyLabel = region === 'PT' ? '€' : 'R$';

  return (
    <Modal
      open={!!appointment}
      onClose={onClose}
      title="Concluir Atendimento"
      size="lg"
      preventClose={loading}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={loading}>
            Confirmar Pagamento
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className={`${colors.surface} rounded-xl p-4 space-y-1 ${colors.border} border backdrop-blur-md`}>
          <p className={`text-xs ${font.mono} uppercase ${colors.textSecondary}`}>Serviço</p>
          <p className={`${colors.text} font-medium`}>{appointment?.service}</p>
        </div>

        {availableProducts.length > 0 && (
          <div className="space-y-3">
            <p className={`text-xs ${font.mono} uppercase ${colors.textSecondary} flex items-center gap-2`}>
              <Package size={14} /> Produtos (opcional)
            </p>
            <div className="flex gap-2">
              <select
                aria-label="Adicionar produto"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className={`flex-1 ${colors.inputBg} ${colors.inputBorder} border rounded-xl px-3 py-2.5 ${colors.text} text-sm focus:outline-none focus:border-[var(--color-input-focus)]`}
              >
                <option value="">Selecionar produto...</option>
                {availableProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {currencyLabel} {product.sale_price.toFixed(2)} ({product.stock_quantity} un.)
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={addProductToCart} disabled={!selectedProductId}>
                Adicionar
              </Button>
            </div>
            {cart.length > 0 && (
              <ul className={`space-y-2 rounded-xl ${colors.border} border p-3 ${colors.surface}`}>
                {cart.map(line => {
                  const product = getProductById(line.productId);
                  if (!product) return null;
                  return (
                    <li key={line.productId} className="flex items-center justify-between gap-2 text-sm">
                      <span className={`${colors.text} truncate`}>{product.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          onClick={() => updateCartQuantity(line.productId, -1)}
                          className={`p-1 rounded-lg hover:${colors.surfaceHover} ${colors.textSecondary}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className={`${font.mono} ${colors.text} w-6 text-center`}>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          onClick={() => updateCartQuantity(line.productId, 1)}
                          className={`p-1 rounded-lg hover:${colors.surfaceHover} ${colors.textSecondary}`}
                        >
                          <Plus size={14} />
                        </button>
                        <span className={`${font.mono} ${accent.text} w-16 text-right`}>
                          {currencyLabel} {(product.sale_price * line.quantity).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  );
                })}
                <li className={`flex justify-between pt-2 border-t ${colors.divider} text-xs ${font.mono} uppercase ${colors.textSecondary}`}>
                  <span>Total produtos</span>
                  <span className={colors.text}>{currencyLabel} {productsTotal.toFixed(2)}</span>
                </li>
              </ul>
            )}
          </div>
        )}

        <div>
          <label htmlFor="checkout-price" className={`block text-xs ${font.mono} uppercase ${colors.textSecondary} mb-1`}>
            Valor Final ({currencyLabel})
          </label>
          <input
            id="checkout-price"
            type="number"
            step="0.01"
            min="0"
            value={finalPrice}
            onChange={(event) => setFinalPrice(parseFloat(event.target.value) || 0)}
            className={`w-full ${colors.inputBg} ${colors.inputBorder} border rounded-xl px-3 py-2.5 ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)]`}
          />
        </div>

        <div>
          <p className={`block text-xs ${font.mono} uppercase mb-2 ${errors.paymentMethod ? status.danger : colors.textSecondary}`}>
            Forma de Pagamento <span className={status.danger}>*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {paymentMethods.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2.5 border transition-all duration-200 ${
                  paymentMethod === value
                    ? `${accent.border} ${accent.bgDim} ${accent.text} ${accent.shadow}`
                    : errors.paymentMethod
                    ? `${status.dangerBorder} ${colors.textSecondary} hover:${status.dangerBorder}`
                    : `${colors.border} ${colors.surface} ${colors.textSecondary} hover:${colors.border} hover:${colors.surfaceHover}`
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
            <p className={`${status.danger} text-xs mt-1`}>{errors.paymentMethod}</p>
          )}
        </div>

        {showMachineFee && (
          <div className="space-y-2">
            <div>
              <label htmlFor="checkout-fee" className={`block text-xs ${font.mono} uppercase ${colors.textSecondary} mb-1`}>
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
                className={`w-full ${colors.inputBg} ${colors.inputBorder} border rounded-xl px-3 py-2.5 ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)]`}
              />
            </div>
            <div className={`p-3 rounded-xl ${status.successBg} ${status.successBorder} border flex justify-between items-center`}>
              <span className={`text-xs ${colors.textSecondary} ${font.mono} uppercase`}>Valor que você recebe</span>
              <span className={`${status.success} ${font.mono} font-bold`}>
                {currencyLabel} {netAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="checkout-received-by"
            className={`block text-xs ${font.mono} uppercase mb-1 ${errors.receivedBy ? status.danger : colors.textSecondary}`}
          >
            Recebido Por <span className={status.danger}>*</span>
          </label>
          <select
            id="checkout-received-by"
            aria-label="Recebido por"
            value={receivedBy}
            onChange={(event) => {
              setReceivedBy(event.target.value);
              setErrors((prev) => ({ ...prev, receivedBy: undefined }));
            }}
            className={`w-full ${colors.inputBg} border rounded-xl px-3 py-2.5 ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)] ${
              errors.receivedBy ? status.dangerBorder : colors.inputBorder
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
            <p className={`${status.danger} text-xs mt-1`}>{errors.receivedBy}</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
