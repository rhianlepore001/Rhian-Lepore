import { formatTimeInTimeZone } from './businessTimezone';

export function getPublicBookingSuccessCopy(input: {
  isBeauty: boolean;
  status?: string | null;
  isEdit?: boolean;
  editSentSubtitle?: string | null;
}): {
  title: string;
  subtitle: string;
  whatsappCta: string;
  stepperLastLabel: string;
} {
  const isConfirmed = input.status === 'confirmed';
  const isBeauty = input.isBeauty;

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

  if (isConfirmed) {
    return {
      title: isBeauty ? 'Sua beleza agendada' : 'AGENDAMENTO CONFIRMADO',
      subtitle: isBeauty
        ? 'Prepare-se para um momento único de auto-cuidado e transformação.'
        : 'VOCÊ ESTÁ UM PASSO À FRENTE. PREPARAMOS TUDO PARA SUA CHEGADA.',
      whatsappCta: 'Confirmar no WhatsApp',
      stepperLastLabel: 'Confirmado',
    };
  }

  if (input.isEdit) {
    const subtitle = (input.editSentSubtitle ?? '').trim() || (
      isBeauty
        ? 'O salão ainda precisa confirmar o novo horário. Acompanhe na Minha Área.'
        : 'PEDIDO ENVIADO. AGUARDANDO CONFIRMAÇÃO DO SALÃO.'
    );
    return {
      title: isBeauty ? 'Alteração enviada' : 'ALTERAÇÃO ENVIADA',
      subtitle,
      whatsappCta: 'Pedir confirmação no WhatsApp',
      stepperLastLabel: 'Enviado',
    };
  }

  return {
    title: isBeauty ? 'Solicitação enviada' : 'SOLICITAÇÃO ENVIADA',
    subtitle: isBeauty
      ? 'Seu pedido está aguardando a confirmação do salão. Acompanhe na Minha Área.'
      : 'PEDIDO ENVIADO. AGUARDANDO CONFIRMAÇÃO DO SALÃO.',
    whatsappCta: 'Pedir confirmação no WhatsApp',
    stepperLastLabel: 'Enviado',
  };
}

export function getPublicBookingAwaitingWhatsAppText(input: {
  businessName: string;
  dateLabel: string;
  timeLabel: string;
  serviceLabel?: string;
  professionalName?: string | null;
}): string {
  const businessName = input.businessName.trim();
  const greeting = businessName ? `Olá, ${businessName}!` : 'Olá!';
  const serviceLabel = (input.serviceLabel ?? '').trim() || 'serviço';
  const professional = (input.professionalName ?? '').trim();
  const withProfessional = professional
    ? ` com ${professional}`
    : ' com qualquer profissional';
  return `${greeting} Fiz um agendamento online para ${serviceLabel}${withProfessional} em ${input.dateLabel} às ${input.timeLabel}. Pode confirmar, por favor?`;
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
