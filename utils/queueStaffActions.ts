import type { QueuePaymentStatus, QueueStatus } from '@/types/queue';

export type QueueStaffPrimaryId = 'start' | 'close';
export type QueueStaffSecondaryId = 'call';

export interface QueueStaffAction {
  id: QueueStaffPrimaryId | QueueStaffSecondaryId;
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
    return { label: 'Aguardando confirmação e pagamento', variant: 'warning' };
  }
  return { label: 'Pagar no balcão', variant: 'neutral' };
}

export function queueStaffActions(input: {
  status: QueueStatus;
  paymentStatus?: QueuePaymentStatus | null;
}): {
  primary: QueueStaffAction | null;
  secondary: QueueStaffAction | null;
  showConfirmPay: boolean;
  showCancelPay: boolean;
} {
  const awaitingPay = input.paymentStatus === 'awaiting_confirmation';
  if (input.status === 'waiting') {
    return {
      primary: { id: 'start', label: 'Iniciar atendimento' },
      secondary: { id: 'call', label: 'Chamar cliente' },
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  if (input.status === 'calling') {
    return {
      primary: { id: 'start', label: 'Iniciar atendimento' },
      secondary: null,
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  if (input.status === 'serving') {
    return {
      primary: { id: 'close', label: 'Fechar comanda' },
      secondary: null,
      showConfirmPay: awaitingPay,
      showCancelPay: awaitingPay,
    };
  }
  return {
    primary: null,
    secondary: null,
    showConfirmPay: false,
    showCancelPay: false,
  };
}
