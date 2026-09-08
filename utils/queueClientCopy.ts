import type { QueuePaymentStatus, QueueStatus } from '@/types/queue';
import { formatOrdinalPosition } from '@/utils/queueTime';

export interface QueueClientBadge {
  label: string;
  variant: 'success' | 'warning' | 'accent' | 'neutral';
}

export function queueClientPaymentBadge(status?: QueuePaymentStatus | null): QueueClientBadge {
  if (status === 'paid') return { label: 'Pago', variant: 'success' };
  if (status === 'membership') return { label: 'Assinatura', variant: 'accent' };
  if (status === 'awaiting_confirmation') return { label: 'Pagamento em confirmação', variant: 'warning' };
  return { label: 'Pagamento no balcão', variant: 'neutral' };
}

export interface QueueClientHeadlineInput {
  status: QueueStatus;
  position: number | null | undefined;
  firstName?: string | null;
  etaMinutes?: number | null;
  professionalName?: string | null;
}

export interface QueueClientHeadline {
  title: string;
  subtitle: string | null;
}

function peopleAhead(count: number): string {
  if (count === 1) return '1 pessoa na sua frente';
  return `${count} pessoas na sua frente`;
}

export function queueClientHeadline(input: QueueClientHeadlineInput): QueueClientHeadline {
  const name = input.firstName?.trim() || null;

  if (input.status === 'calling') {
    return {
      title: name ? `${name}, é a sua vez!` : 'É a sua vez!',
      subtitle: input.professionalName
        ? `${input.professionalName} está esperando por você.`
        : 'Pode vir. A equipe está esperando por você.',
    };
  }

  if (input.status === 'serving') {
    return {
      title: 'Em atendimento',
      subtitle: input.professionalName
        ? `Você está sendo atendido por ${input.professionalName}.`
        : 'Seu atendimento já começou.',
    };
  }

  if (input.status === 'completed') {
    return {
      title: 'Atendimento concluído',
      subtitle: name ? `Obrigado pela visita, ${name}. Até a próxima!` : 'Obrigado pela visita. Até a próxima!',
    };
  }

  if (input.status === 'no_show') {
    return {
      title: 'Sua senha foi encerrada',
      subtitle: 'Você foi chamado e não compareceu. Para voltar à fila, escaneie o QR Code novamente.',
    };
  }

  if (input.status === 'cancelled') {
    return {
      title: 'Você saiu da fila',
      subtitle: 'Para entrar de novo, escaneie o QR Code do estabelecimento.',
    };
  }

  // `undefined` = quadro ainda não carregou; `null` = a RPC não devolveu posição.
  if (input.position === undefined) {
    return { title: 'Você está na fila', subtitle: 'Atualizando sua posição…' };
  }

  const position = input.position;
  if (position == null || position <= 1) {
    return {
      title: 'Você é o próximo',
      subtitle: 'Fique por perto. Vamos chamar você em instantes.',
    };
  }

  const ahead = position - 1;
  const eta = input.etaMinutes != null && input.etaMinutes > 0
    ? ` · cerca de ${input.etaMinutes} min`
    : '';
  return {
    title: `Você é o ${formatOrdinalPosition(position)} da fila`,
    subtitle: `${peopleAhead(ahead)}${eta}`,
  };
}

export function queueClientRuleLine(input: {
  status: QueueStatus;
  allowLeave: boolean | undefined;
  lateMinutes: number | undefined;
  remainingLateMinutes?: number | null;
}): string | null {
  const late = input.lateMinutes ?? 10;

  if (input.status === 'calling') {
    if (input.allowLeave === false) return 'Vá até o atendimento agora.';
    if (input.remainingLateMinutes == null) return `Você tem ${late} min para chegar.`;
    if (input.remainingLateMinutes <= 0) return 'O prazo para chegar terminou. Fale com a equipe no balcão.';
    return `Você tem ${input.remainingLateMinutes} min para chegar.`;
  }

  if (input.status === 'waiting') {
    if (input.allowLeave === false) return 'Aguarde no local. Você será chamado pelo nome.';
    return `Você pode sair e voltar. Ao ser chamado, terá ${late} min para chegar.`;
  }

  return null;
}
