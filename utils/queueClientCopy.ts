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
  professionalName?: string | null;
  remainingLateMinutes?: number | null;
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
    if (input.remainingLateMinutes != null && input.remainingLateMinutes <= 0) {
      return {
        title: 'O prazo para chegar acabou',
        subtitle: 'Sua senha foi chamada. Fale com a equipe no balcão agora.',
      };
    }
    return {
      title: name ? `${name}, é a sua vez!` : 'É a sua vez!',
      subtitle: input.professionalName
        ? `Dirija-se ao atendimento de ${input.professionalName}.`
        : 'Dirija-se ao balcão para ser atendido.',
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
      subtitle: 'A equipe registrou que você não compareceu. Para voltar à fila, escaneie o QR Code.',
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
  if (position == null || position < 1) {
    return { title: 'Você está na fila', subtitle: 'Sua posição ainda está indisponível.' };
  }

  if (position === 1) {
    return {
      title: 'Você é o próximo',
      subtitle: 'Acompanhe por aqui. Avisamos neste painel quando for a sua vez.',
    };
  }

  const ahead = position - 1;
  return {
    title: `Você é o ${formatOrdinalPosition(position)} da fila`,
    subtitle: peopleAhead(ahead),
  };
}

export function formatQueueEstimatedWait(etaMinutes: number | null | undefined): string | null {
  if (etaMinutes == null) return null;
  if (etaMinutes <= 0) return 'A qualquer momento';
  return `cerca de ${etaMinutes} min`;
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
