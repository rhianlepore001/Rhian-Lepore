import React, { useState } from 'react';
import { Button, Modal, Select, useToast } from '@/components/ui';
import { useProducts } from '@/hooks/useCatalog';
import { sellProduct } from '@/services/catalog';
import { closeQueueTicket, settleQueueTicket } from '@/services/queue';
import { buildQueueClosePayload, buildQueueSettlePayload } from '@/utils/queueTicketPayload';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { QueueRecord } from '@/types/queue';
import type { ServiceItem } from '@/types/serviceSettings';
import type { CheckoutPaymentMethod } from '@/types/scheduling';

interface QueueCheckoutSheetProps {
  open: boolean;
  entry: QueueRecord | null;
  companyId: string;
  region: Region;
  services: ServiceItem[];
  loggedProfessionalId: string | null;
  onClose: () => void;
  onDone: () => void;
}

export const QueueCheckoutSheet: React.FC<QueueCheckoutSheetProps> = ({
  open,
  entry,
  companyId,
  region,
  services,
  loggedProfessionalId,
  onClose,
  onDone,
}) => {
  const { showToast } = useToast();
  const alreadyPaid = entry?.payment_status === 'paid' || entry?.payment_status === 'membership';
  const [extraId, setExtraId] = useState('');
  const [productId, setProductId] = useState('');
  const [extras, setExtras] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [saving, setSaving] = useState(false);
  const { data: catalog = [] } = useProducts({ companyId, includeInactive: false });

  const basePrice = (entry?.service_price_cents ?? 0) / 100;
  const extraLines = extras.map((line) => ({ name: line.name, price: line.price }));
  const productLines = products.map((line) => ({ name: line.name, price: line.price }));
  const total = extraLines.reduce((sum, line) => sum + line.price, 0)
    + productLines.reduce((sum, line) => sum + line.price, 0)
    + basePrice;

  const paymentOptions = region === 'PT'
    ? [
      { value: 'cash', label: 'Dinheiro' },
      { value: 'mbway', label: 'MB WAY' },
      { value: 'debit', label: 'Débito' },
      { value: 'credit', label: 'Crédito' },
    ]
    : [
      { value: 'pix', label: 'Pix' },
      { value: 'cash', label: 'Dinheiro' },
      { value: 'debit', label: 'Débito' },
      { value: 'credit', label: 'Crédito' },
    ];

  const reset = () => {
    setExtras([]);
    setProducts([]);
    setExtraId('');
    setProductId('');
    setPaymentMethod('');
  };

  const handleCloseOnly = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await closeQueueTicket(buildQueueClosePayload(entry.id).entryId);
      reset();
      onDone();
    } catch {
      showToast('Não foi possível fechar a comanda.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async () => {
    if (!entry) return;
    if (!alreadyPaid && !paymentMethod) {
      showToast('Selecione a forma de pagamento.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = buildQueueSettlePayload({
        entryId: entry.id,
        baseServiceName: 'Serviço',
        basePrice,
        extraServices: extraLines,
        productLines,
        professionalId: loggedProfessionalId ?? entry.professional_id,
        paymentMethod: paymentMethod || null,
        alreadyPaid,
      });
      await settleQueueTicket(payload);
      await Promise.all(products.map((line) => sellProduct({
        productId: line.id,
        quantity: 1,
        professionalId: loggedProfessionalId ?? entry.professional_id,
        paymentMethod: alreadyPaid ? entry.payment_method : paymentMethod,
      })));
      reset();
      onDone();
    } catch {
      showToast('Não foi possível finalizar a comanda.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open && !!entry}
      onClose={onClose}
      title="Fechar comanda"
      size="md"
    >
      {entry && (
        <div className="space-y-4">
          <div>
            <p className="font-bold text-theme-text">{entry.client_name}</p>
            <p className="text-sm text-theme-textSecondary">
              Total {formatCurrency(total, region)}
            </p>
          </div>

          {alreadyPaid && (
            <p className="text-sm rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)] p-3">
              Pagamento já registrado. Confira e finalize.
            </p>
          )}

          <Select
            label="Serviço extra"
            placeholder="Adicionar serviço"
            value={extraId}
            options={services.filter((service) => service.active).map((service) => ({
              value: service.id,
              label: `${service.name} · ${formatCurrency(service.price, region)}`,
            }))}
            onChange={(event) => {
              const next = services.find((service) => service.id === event.target.value);
              setExtraId('');
              if (!next) return;
              setExtras((current) => [...current, { id: next.id, name: next.name, price: next.price }]);
            }}
          />

          <Select
            label="Produto"
            placeholder="Adicionar produto"
            value={productId}
            options={catalog.filter((product) => product.is_active && product.stock_quantity > 0).map((product) => ({
              value: product.id,
              label: `${product.name} · ${formatCurrency(product.sale_price, region)}`,
            }))}
            onChange={(event) => {
              const next = catalog.find((product) => product.id === event.target.value);
              setProductId('');
              if (!next) return;
              setProducts((current) => [...current, { id: next.id, name: next.name, price: next.sale_price }]);
            }}
          />

          {(extras.length > 0 || products.length > 0) && (
            <ul className="text-sm text-theme-textSecondary space-y-1">
              {extras.map((line, index) => (
                <li key={`s-${line.id}-${index}`}>{line.name}</li>
              ))}
              {products.map((line, index) => (
                <li key={`p-${line.id}-${index}`}>{line.name}</li>
              ))}
            </ul>
          )}

          {!alreadyPaid && (
            <Select
              label="Pagamento"
              placeholder="Como recebeu"
              value={paymentMethod}
              options={paymentOptions}
              onChange={(event) => setPaymentMethod(event.target.value as CheckoutPaymentMethod)}
            />
          )}

          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth loading={saving} onClick={() => void handleSettle()}>
              Finalizar agora
            </Button>
            <Button variant="secondary" fullWidth disabled={saving} onClick={() => void handleCloseOnly()}>
              Só salvar em Comandas
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
