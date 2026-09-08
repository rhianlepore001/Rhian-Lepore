import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
  baseServiceName?: string | null;
  loggedProfessionalId: string | null;
  onClose: () => void;
  onDone: () => void;
}

interface TicketLine {
  key: string;
  id: string;
  name: string;
  price: number;
}

export const QueueCheckoutSheet: React.FC<QueueCheckoutSheetProps> = ({
  open,
  entry,
  companyId,
  region,
  services,
  baseServiceName = null,
  loggedProfessionalId,
  onClose,
  onDone,
}) => {
  const { showToast } = useToast();
  const alreadyPaid = entry?.payment_status === 'paid' || entry?.payment_status === 'membership';
  const [extras, setExtras] = useState<TicketLine[]>([]);
  const [products, setProducts] = useState<TicketLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [saving, setSaving] = useState<'settle' | 'close' | null>(null);
  const { data: catalog = [] } = useProducts({ companyId, includeInactive: false });

  useEffect(() => {
    if (!open) return;
    setExtras([]);
    setProducts([]);
    setPaymentMethod('');
  }, [open, entry?.id]);

  const basePrice = (entry?.service_price_cents ?? 0) / 100;
  const serviceLabel = baseServiceName ?? 'Serviço';
  const extraLines = extras.map((line) => ({ name: line.name, price: line.price }));
  const productLines = products.map((line) => ({ name: line.name, price: line.price }));
  const extrasTotal = extraLines.reduce((sum, line) => sum + line.price, 0)
    + productLines.reduce((sum, line) => sum + line.price, 0);
  const total = extrasTotal + basePrice;
  // Serviço já pago (Pix/MB WAY confirmado ou assinatura): só o que foi adicionado é cobrado agora.
  const dueNow = alreadyPaid ? extrasTotal : total;
  const needsPaymentMethod = dueNow > 0;

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

  const isOpenTicket = entry?.ticket_status === 'open';

  const handleCloseOnly = async () => {
    if (!entry) return;
    setSaving('close');
    try {
      await closeQueueTicket(buildQueueClosePayload(entry.id).entryId);
      showToast('Comanda salva. Finalize quando o cliente for pagar.', 'success');
      onDone();
    } catch {
      showToast('Não foi possível salvar a comanda. Tente de novo.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleSettle = async () => {
    if (!entry) return;
    if (needsPaymentMethod && !paymentMethod) {
      showToast(alreadyPaid ? 'Informe como o cliente pagou os itens adicionados.' : 'Escolha como o cliente pagou.', 'error');
      return;
    }
    setSaving('settle');
    try {
      const payload = buildQueueSettlePayload({
        entryId: entry.id,
        baseServiceName: serviceLabel,
        basePrice,
        extraServices: extraLines,
        productLines,
        professionalId: loggedProfessionalId ?? entry.professional_id,
        paymentMethod: needsPaymentMethod ? paymentMethod || null : null,
        alreadyPaid: alreadyPaid && !needsPaymentMethod,
      });
      await settleQueueTicket(payload);
      await Promise.all(products.map((line) => sellProduct({
        productId: line.id,
        quantity: 1,
        professionalId: loggedProfessionalId ?? entry.professional_id,
        paymentMethod: needsPaymentMethod ? paymentMethod || null : entry.payment_method,
      })));
      showToast(`Atendimento de ${entry.client_name} finalizado.`, 'success');
      onDone();
    } catch {
      showToast('Não foi possível finalizar a comanda. Tente de novo.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const removeLine = (kind: 'extra' | 'product', key: string) => {
    if (kind === 'extra') setExtras((current) => current.filter((line) => line.key !== key));
    else setProducts((current) => current.filter((line) => line.key !== key));
  };

  const renderLine = (line: { key?: string; name: string; price: number }, onRemove?: () => void) => (
    <li key={line.key ?? line.name} className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-theme-text min-w-0 truncate">{line.name}</span>
      <span className="flex items-center gap-1 shrink-0">
        <span className="text-sm tabular-nums text-theme-textSecondary">{formatCurrency(line.price, region)}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${line.name}`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-3 rounded-lg text-theme-textMuted hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </span>
    </li>
  );

  return (
    <Modal
      open={open && !!entry}
      onClose={onClose}
      title={isOpenTicket ? 'Finalizar comanda' : 'Fechar comanda'}
      size="md"
    >
      {entry && (
        <div className="space-y-5">
          <div>
            <p className="font-bold text-theme-text">{entry.client_name}</p>
            {alreadyPaid ? (
              <p className="text-sm mt-1 text-theme-textSecondary">
                {entry.payment_status === 'membership'
                  ? 'Serviço coberto pela assinatura. Adicione extras se houver e finalize.'
                  : 'Serviço já pago. Adicione extras se houver e finalize.'}
              </p>
            ) : (
              <p className="text-sm mt-1 text-theme-textSecondary">
                Confira os itens, informe como o cliente pagou e finalize.
              </p>
            )}
          </div>

          <ul className="divide-y divide-theme-border rounded-xl border border-theme-border px-4">
            <li className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block text-sm text-theme-text truncate">{serviceLabel}</span>
                {alreadyPaid && (
                  <span className="block text-xs text-[var(--color-success)]">
                    {entry.payment_status === 'membership' ? 'Incluído na assinatura' : 'Pago antecipadamente'}
                  </span>
                )}
              </span>
              <span className="text-sm tabular-nums text-theme-textSecondary shrink-0">{formatCurrency(basePrice, region)}</span>
            </li>
            {extras.map((line) => renderLine(line, () => removeLine('extra', line.key)))}
            {products.map((line) => renderLine(line, () => removeLine('product', line.key)))}
            <li className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm font-semibold text-theme-text">Total</span>
              <span className="text-base font-bold tabular-nums text-theme-text">{formatCurrency(total, region)}</span>
            </li>
            {alreadyPaid && extrasTotal > 0 && (
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-semibold text-theme-text">A receber agora</span>
                <span className="text-sm font-bold tabular-nums text-theme-accent">{formatCurrency(dueNow, region)}</span>
              </li>
            )}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Adicionar serviço"
              placeholder="Escolher serviço"
              value=""
              options={services.filter((service) => service.active).map((service) => ({
                value: service.id,
                label: `${service.name} · ${formatCurrency(service.price, region)}`,
              }))}
              onChange={(event) => {
                const next = services.find((service) => service.id === event.target.value);
                if (!next) return;
                setExtras((current) => [
                  ...current,
                  { key: `${next.id}-${Date.now()}`, id: next.id, name: next.name, price: next.price },
                ]);
              }}
            />
            <Select
              label="Adicionar produto"
              placeholder="Escolher produto"
              value=""
              options={catalog.filter((product) => product.is_active && product.stock_quantity > 0).map((product) => ({
                value: product.id,
                label: `${product.name} · ${formatCurrency(product.sale_price, region)}`,
              }))}
              onChange={(event) => {
                const next = catalog.find((product) => product.id === event.target.value);
                if (!next) return;
                setProducts((current) => [
                  ...current,
                  { key: `${next.id}-${Date.now()}`, id: next.id, name: next.name, price: next.sale_price },
                ]);
              }}
            />
          </div>

          {needsPaymentMethod && (
            <Select
              label={alreadyPaid ? 'Pagamento dos itens adicionados' : 'Forma de pagamento'}
              placeholder="Como o cliente pagou"
              value={paymentMethod}
              options={paymentOptions}
              onChange={(event) => setPaymentMethod(event.target.value as CheckoutPaymentMethod)}
            />
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              fullWidth
              loading={saving === 'settle'}
              disabled={saving === 'close'}
              onClick={() => void handleSettle()}
            >
              {needsPaymentMethod ? `Receber ${formatCurrency(dueNow, region)} e finalizar` : 'Finalizar atendimento'}
            </Button>
            {!isOpenTicket && (
              <Button
                variant="secondary"
                fullWidth
                loading={saving === 'close'}
                disabled={saving === 'settle'}
                onClick={() => void handleCloseOnly()}
              >
                Deixar em aberto para pagar depois
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
