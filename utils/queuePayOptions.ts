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
      label: 'Usar minha assinatura',
      description: 'Este serviço está incluído no seu plano. Sem cobrança adicional.',
    });
  }

  options.push({
    id: 'cash',
    label: 'Pagar no balcão',
    description: 'Dinheiro, cartão ou Pix na hora, ao final do atendimento.',
  });

  if (digital === 'pix') {
    options.push({
      id: 'pix',
      label: 'Pagar agora com Pix',
      description: 'Copie o código e pague pelo app do banco. A equipe confirma o recebimento.',
    });
  } else {
    options.push({
      id: 'mbway',
      label: 'Pagar agora com MB WAY',
      description: 'Envie pelo MB WAY para o número indicado. A equipe confirma o recebimento.',
    });
  }

  return options;
}
