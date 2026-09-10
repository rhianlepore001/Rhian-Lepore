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
  /** Chave Pix / número MB WAY configurados pelo estabelecimento. Sem isso a opção digital não aparece. */
  digitalAvailable?: boolean;
}): QueuePayOption[] {
  const digital = clubDigitalMethod(input.region);
  const digitalAvailable = input.digitalAvailable ?? true;
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
    description: digital === 'pix'
      ? 'Dinheiro, cartão ou Pix na hora, ao final do atendimento.'
      : 'Dinheiro, cartão ou MB WAY na hora, ao final do atendimento.',
  });

  if (!digitalAvailable) return options;

  if (digital === 'pix') {
    options.push({
      id: 'pix',
      label: 'Pix — ver chave para pagar',
      description: 'Mostra o Pix do estabelecimento. Pague no app e depois confirme abaixo.',
    });
  } else {
    options.push({
      id: 'mbway',
      label: 'MB WAY — ver número para pagar',
      description: 'Mostra o telemóvel da casa. Envie no MB WAY e depois confirme abaixo.',
    });
  }

  return options;
}
