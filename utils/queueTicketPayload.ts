import type { QueueTicketItem } from '@/types/queue';
import type { CheckoutPaymentMethod } from '@/types/scheduling';

export interface QueueTicketLine {
  name: string;
  price: number;
}

export interface BuildQueueTicketInput {
  entryId: string;
  baseServiceName: string;
  basePrice: number;
  extraServices?: QueueTicketLine[];
  productLines?: QueueTicketLine[];
  professionalId?: string | null;
  paymentMethod?: CheckoutPaymentMethod | null;
  alreadyPaid?: boolean;
}

export function sumQueueTicketTotal(input: Pick<BuildQueueTicketInput, 'basePrice' | 'extraServices' | 'productLines'>): number {
  const extras = (input.extraServices ?? []).reduce((sum, line) => sum + line.price, 0);
  const products = (input.productLines ?? []).reduce((sum, line) => sum + line.price, 0);
  return Math.max(0, Number((input.basePrice + extras + products).toFixed(2)));
}

/**
 * Valor lançado no atendimento: serviço + extras. Produtos ficam de fora porque cada venda
 * vira um lançamento próprio no financeiro (sell_product); somá-los aqui duplicaria a receita.
 */
export function sumQueueServiceAmount(input: Pick<BuildQueueTicketInput, 'basePrice' | 'extraServices'>): number {
  return sumQueueTicketTotal({ basePrice: input.basePrice, extraServices: input.extraServices });
}

export function buildQueueSettlePayload(input: BuildQueueTicketInput) {
  const extraNames = (input.extraServices ?? []).map((line) => line.name).filter(Boolean);
  const serviceName = [input.baseServiceName, ...extraNames].filter(Boolean).join(' + ') || 'Serviço';
  return {
    entryId: input.entryId,
    serviceName,
    finalPrice: sumQueueServiceAmount(input),
    professionalId: input.professionalId ?? null,
    paymentMethod: input.alreadyPaid ? null : input.paymentMethod ?? null,
  };
}

export interface QueueTicketSavedLine extends QueueTicketLine {
  id: string;
}

/** Itens adicionados antes de "Deixar em aberto" viajam com a comanda para reaparecerem na finalização. */
export function buildQueueClosePayload(
  entryId: string,
  lines: { extraServices?: QueueTicketSavedLine[]; productLines?: QueueTicketSavedLine[] } = {},
) {
  const items: QueueTicketItem[] = [
    ...(lines.extraServices ?? []).map((line) => ({ kind: 'service' as const, id: line.id, name: line.name, price: line.price })),
    ...(lines.productLines ?? []).map((line) => ({ kind: 'product' as const, id: line.id, name: line.name, price: line.price })),
  ];
  return { entryId, items };
}
