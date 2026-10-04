import { isMissingRpcError } from '@/utils/supabaseRpc';

export type FinanceDeleteKind = 'appointment' | 'product_sale' | 'manual' | 'expense';

const KINDS = new Set<FinanceDeleteKind>(['appointment', 'product_sale', 'manual', 'expense']);

export class FinanceDeleteError extends Error {
  readonly code: string;
  readonly staffName?: string;
  readonly paidAt?: string | null;

  constructor(code: string, extras?: { staffName?: string; paidAt?: string | null }) {
    super(code);
    this.name = 'FinanceDeleteError';
    this.code = code;
    this.staffName = extras?.staffName;
    this.paidAt = extras?.paidAt ?? null;
  }
}

export function shouldShowFinanceDelete(role: string | null | undefined): boolean {
  return role === 'owner';
}

export function classifyFinanceDeleteKind(item: {
  type?: string | null;
  description?: string | null;
  kind?: string | null;
  deleteKind?: string | null;
}): FinanceDeleteKind {
  const explicit = item.kind ?? item.deleteKind;
  if (typeof explicit === 'string' && KINDS.has(explicit as FinanceDeleteKind)) {
    return explicit as FinanceDeleteKind;
  }
  if (item.type === 'expense') return 'expense';
  const description = (item.description ?? '').trim();
  if (/^venda de produto\b/i.test(description)) return 'product_sale';
  if (description === '') return 'appointment';
  return 'manual';
}

export function financeDeleteConfirmMessage(input: {
  deleteKind: FinanceDeleteKind;
  clientName?: string | null;
  date?: string | null;
  serviceName?: string | null;
}): string {
  if (input.deleteKind === 'appointment') {
    const client = (input.clientName ?? '').trim() || 'este cliente';
    const date = (input.date ?? '').trim() || 'esta data';
    return `Isto remove o atendimento de ${client} em ${date} e a comissão dele. Não dá para desfazer.`;
  }
  if (input.deleteKind === 'product_sale') {
    return 'Só o produto sai. O atendimento continua.';
  }
  const label = (input.serviceName ?? '').trim();
  if (label) return `Excluir "${label}"? Não dá para desfazer.`;
  return input.deleteKind === 'expense'
    ? 'Excluir esta despesa? Não dá para desfazer.'
    : 'Excluir este lançamento? Não dá para desfazer.';
}

interface RawDeleteError {
  code?: string;
  error?: string;
  message?: string;
  details?: string;
  hint?: string;
  staff_name?: string;
  staffName?: string;
  paid_at?: string | null;
  paidAt?: string | null;
}

function asRawError(error: unknown): RawDeleteError {
  if (error instanceof FinanceDeleteError) {
    return {
      code: error.code,
      message: error.message,
      staffName: error.staffName,
      paidAt: error.paidAt,
    };
  }
  if (error && typeof error === 'object') return error as RawDeleteError;
  return { message: String(error ?? '') };
}

export function formatFinancePaidAt(value: unknown): string {
  if (value == null || value === '') return '';
  const raw = String(value);
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function blobOf(raw: RawDeleteError): string {
  return `${raw.code ?? ''} ${raw.error ?? ''} ${raw.message ?? ''} ${raw.details ?? ''} ${raw.hint ?? ''}`.toLowerCase();
}

export function mapFinanceDeleteError(error: unknown): string {
  if (isMissingRpcError(error)) {
    return 'Não foi possível excluir esta transação. Atualize a página e tente de novo.';
  }

  const raw = asRawError(error);
  const blob = blobOf(raw);
  const code = String(raw.code ?? raw.error ?? '');
  const staffName = (raw.staffName ?? raw.staff_name ?? '').trim() || 'o profissional';
  const paidAt = formatFinancePaidAt(raw.paidAt ?? raw.paid_at);

  if (code === 'commission_already_paid' || blob.includes('commission_already_paid')) {
    if (paidAt) {
      return `A comissão deste serviço já foi paga a ${staffName} em ${paidAt}, então ele não pode ser excluído.`;
    }
    return `A comissão deste serviço já foi paga a ${staffName}, então ele não pode ser excluído.`;
  }
  if (code === 'commission_payment_record' || blob.includes('commission_payment_record')) {
    return 'Pagamentos de comissão são controlados em Pagamentos > Pagos.';
  }
  if (code === 'not_found' || blob.includes('not_found')) {
    return 'Esta transação não foi encontrada. Pode já ter sido excluída.';
  }
  if (code === '42501' || blob.includes('insufficient_privilege') || blob.includes('apenas o dono')) {
    return 'Você não tem permissão para excluir transações.';
  }

  return 'Não foi possível excluir a transação. Tente de novo.';
}
