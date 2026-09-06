import { clubDigitalMethod } from '@/lib/club-payment';
import type { Region } from '@/utils/formatters';

export type QueuePayOptionId = 'membership' | 'cash' | 'pix' | 'mbway';

export interface QueuePayOption {
  id: QueuePayOptionId;
  label: string;
  description: string;
}

export function queuePayOptions(input: {
  canUseMembership: boolean;
  region: Region;
}): QueuePayOption[] {
  const digital = clubDigitalMethod(input.region);
  const options: QueuePayOption[] = [];

  if (input.canUseMembership) {
    options.push({
      id: 'membership',
      label: 'Usar assinatura',
      description: 'Este serviço está incluído no seu plano.',
    });
  }

  options.push({
    id: 'cash',
    label: 'Pagar no balcão',
    description: 'Você paga ao finalizar o atendimento.',
  });

  if (digital === 'pix') {
    options.push({
      id: 'pix',
      label: 'Pagar com Pix',
      description: 'Você entra na fila agora. O pagamento será confirmado pela equipe.',
    });
  } else {
    options.push({
      id: 'mbway',
      label: 'Pagar com MB WAY',
      description: 'Você entra na fila agora. O pagamento será confirmado pela equipe.',
    });
  }

  return options;
}
