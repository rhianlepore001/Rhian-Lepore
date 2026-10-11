import { formatTimeInTimeZone } from './businessTimezone';
import { getBusinessRemainderNoun } from './businessCopy';

/**
 * "da barbearia" / "do salão" / "do estúdio" / "do negócio" a partir do tipo do
 * negócio (nunca "salão" fixo). Sem tipo, cai no tema visual (beauty → salão).
 */
function businessOf(userType: string | null | undefined, isBeauty: boolean): { of: string; who: string } {
  const remainder = getBusinessRemainderNoun(userType ?? (isBeauty ? 'beauty' : 'barber'));
  const of = `${remainder.article === 'a' ? 'da' : 'do'} ${remainder.noun}`;
  const who = `${remainder.article === 'a' ? 'A' : 'O'} ${remainder.noun}`;
  return { of, who };
}

export function getPublicBookingSuccessCopy(input: {
  isBeauty: boolean;
  status?: string | null;
  isEdit?: boolean;
  editSentSubtitle?: string | null;
  /** `profiles.user_type` do negócio (barber/beauty/…): define barbearia/salão/estúdio. */
  userType?: string | null;
}): {
  title: string;
  subtitle: string;
  whatsappCta: string;
  stepperLastLabel: string;
} {
  const isConfirmed = input.status === 'confirmed';
  const isBeauty = input.isBeauty;
  const business = businessOf(input.userType, isBeauty);

  // Item 5b: aqui "cancelled" costuma ser pedido recusado pelo salão ou
  // cancelado pelo próprio cliente em outra aba; não dá para saber quem
  // cancelou, então o texto é neutro (a Minha Área diferencia quando sabe).
  if (input.status === 'cancelled') {
    return {
      title: isBeauty ? 'Agendamento cancelado' : 'AGENDAMENTO CANCELADO',
      subtitle: isBeauty
        ? 'Este agendamento foi cancelado. Escolha um novo horário.'
        : 'ESTE AGENDAMENTO FOI CANCELADO. ESCOLHA UM NOVO HORÁRIO.',
      whatsappCta: 'Falar no WhatsApp',
      stepperLastLabel: 'Cancelado',
    };
  }

  // Confirmado: aprovação manual desligada (entra confirmado direto) ou pedido
  // já aceito enquanto o cliente olhava a tela.
  if (isConfirmed) {
    return {
      title: isBeauty ? 'Agendamento confirmado' : 'AGENDAMENTO CONFIRMADO',
      subtitle: isBeauty
        ? 'Seu horário está garantido. Te esperamos!'
        : 'SEU HORÁRIO ESTÁ GARANTIDO. TE ESPERAMOS!',
      whatsappCta: 'Falar no WhatsApp',
      stepperLastLabel: 'Confirmado',
    };
  }

  if (input.isEdit) {
    const subtitle = (input.editSentSubtitle ?? '').trim() || (
      isBeauty
        ? `${business.who} ainda precisa confirmar o novo horário. Acompanhe na Minha Área.`
        : `PEDIDO ENVIADO. AGUARDANDO A CONFIRMAÇÃO ${business.of.toUpperCase()}.`
    );
    return {
      title: isBeauty ? 'Alteração enviada' : 'ALTERAÇÃO ENVIADA',
      subtitle,
      whatsappCta: 'Pedir confirmação no WhatsApp',
      stepperLastLabel: 'Enviado',
    };
  }

  return {
    title: isBeauty ? 'Pedido enviado' : 'PEDIDO ENVIADO',
    subtitle: isBeauty
      ? `Aguardando a confirmação ${business.of}. Acompanhe na Minha Área.`
      : `AGUARDANDO A CONFIRMAÇÃO ${business.of.toUpperCase()}. ACOMPANHE NA MINHA ÁREA.`,
    whatsappCta: 'Pedir confirmação no WhatsApp',
    stepperLastLabel: 'Enviado',
  };
}

/**
 * Botão final do link público. Com aprovação manual o resultado é um pedido
 * ("Enviar pedido"); com confirmação automática o horário já fica garantido.
 * Alteração de agendamento sempre vira pedido (aprovação do negócio), nos dois modos.
 */
export function getPublicBookingSubmitLabel(input: { autoConfirm: boolean; isEdit?: boolean }): string {
  if (input.isEdit) return 'Enviar pedido';
  return input.autoConfirm ? 'Confirmar agendamento' : 'Enviar pedido';
}

export function getPublicBookingAwaitingWhatsAppText(input: {
  businessName: string;
  dateLabel: string;
  timeLabel: string;
  serviceLabel?: string;
  professionalName?: string | null;
  /** true = agendamento já confirmado: a mensagem não pede confirmação. */
  confirmed?: boolean;
}): string {
  const businessName = input.businessName.trim();
  const greeting = businessName ? `Olá, ${businessName}!` : 'Olá!';
  const serviceLabel = (input.serviceLabel ?? '').trim() || 'serviço';
  const professional = (input.professionalName ?? '').trim();
  const withProfessional = professional
    ? ` com ${professional}`
    : ' com qualquer profissional';
  const base = `${greeting} Fiz um agendamento online para ${serviceLabel}${withProfessional} em ${input.dateLabel} às ${input.timeLabel}.`;
  return input.confirmed ? base : `${base} Pode confirmar, por favor?`;
}

export function getOwnerAcceptWhatsAppText(input: {
  isBeauty: boolean;
  customerName: string;
  businessName: string;
  appointmentTime: string;
  timeZone: string;
  serviceNames: string;
  priceLabel: string;
  currencySymbol: string;
  establishmentFallback: string;
}): string {
  const dateObj = new Date(input.appointmentTime);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: input.timeZone });
  const formattedTime = formatTimeInTimeZone(dateObj, input.timeZone);
  const establishment = input.businessName.trim();

  if (input.isBeauty) {
    return (
      `Olá ${input.customerName}! Tudo bem? ✨\n` +
      `Sua reserva na *${establishment || 'Estética'}* está confirmada!\n` +
      `📅 *${formattedDate}* às *${formattedTime}*\n` +
      `💼 *Serviço*: ${input.serviceNames}\n` +
      `💰 *Valor*: ${input.currencySymbol} ${input.priceLabel}\n` +
      `📍  Local: estamos te esperando!\n\n` +
      `Estamos preparando tudo para te receber com a melhor experiência. Até logo! 💖`
    );
  }

  return (
    `Fala, ${input.customerName}! Seu horário está garantido! 🛡️ \n` +
    `Marque na sua agenda:\n` +
    `🗓️  *${formattedDate}* às *${formattedTime}*\n` +
    `✂️  *Serviço*: ${input.serviceNames}\n` +
    `💰 *Valor*: ${input.currencySymbol} ${input.priceLabel}\n` +
    `📍  Onde: *${establishment || input.establishmentFallback}*.\n\n` +
    `Prepare-se para o trato! Nos vemos em breve. 👋`
  );
}
