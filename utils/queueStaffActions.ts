import type { QueuePaymentStatus, QueueStatus } from '@/types/queue';

export type QueueStaffPrimaryId = 'start' | 'close';
export type QueueStaffSecondaryId = 'call';
export type QueueStaffTertiaryId = 'no_show' | 'requeue';

export interface QueueStaffAction {
  id: QueueStaffPrimaryId | QueueStaffSecondaryId | QueueStaffTertiaryId;
  label: string;
}

export interface QueuePaymentBadge {
  label: string;
  variant: 'success' | 'warning' | 'accent' | 'neutral';
}

export function queuePaymentBadge(status?: QueuePaymentStatus | null): QueuePaymentBadge {
  if (status === 'paid') return { label: 'Pago', variant: 'success' };
  if (status === 'membership') return { label: 'Clube', variant: 'accent' };
  if (status === 'awaiting_confirmation') {
    return { label: 'Aguardando pagamento', variant: 'warning' };
  }
  return { label: 'Pagamento no balcão', variant: 'neutral' };
}

export function queueStaffActions(input: {
  status: QueueStatus;
  paymentStatus?: QueuePaymentStatus | null;
}): {
  primary: QueueStaffAction | null;
  secondary: QueueStaffAction | null;
  tertiary: QueueStaffAction[];
  showConfirmPay: boolean;
  showCancelPay: boolean;
} {
  const awaitingPay = input.paymentStatus === 'awaiting_confirmation';
  const noShow: QueueStaffAction = { id: 'no_show', label: 'Não compareceu' };
  if (input.status === 'waiting') {
    return {
      primary: { id: 'start', label: 'Iniciar atendimento' },
      secondary: { id: 'call', label: 'Chamar cliente' },
      tertiary: [noShow],
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  if (input.status === 'calling') {
    return {
      primary: { id: 'start', label: 'Iniciar atendimento' },
      secondary: null,
      tertiary: [{ id: 'requeue', label: 'Voltar para a fila' }, noShow],
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  if (input.status === 'serving') {
    return {
      primary: { id: 'close', label: 'Fechar comanda' },
      secondary: null,
      tertiary: [],
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  return {
    primary: null,
    secondary: null,
    tertiary: [],
    showConfirmPay: false,
    showCancelPay: false,
  };
}
