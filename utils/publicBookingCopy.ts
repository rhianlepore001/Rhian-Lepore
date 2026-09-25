export function getPublicBookingSuccessCopy(input: {
  isBeauty: boolean;
  status?: string | null;
  isEdit?: boolean;
}): {
  title: string;
  subtitle: string;
  whatsappCta: string;
  stepperLastLabel: string;
} {
  const isConfirmed = input.status === 'confirmed';
  const isBeauty = input.isBeauty;

  // Item 5b: pedido recusado ou agendamento cancelado pelo estabelecimento.
  if (input.status === 'cancelled') {
    return {
      title: isBeauty ? 'Agendamento cancelado' : 'AGENDAMENTO CANCELADO',
      subtitle: isBeauty
        ? 'O estabelecimento cancelou este agendamento. Escolha um novo horário.'
        : 'O ESTABELECIMENTO CANCELOU ESTE AGENDAMENTO. ESCOLHA UM NOVO HORÁRIO.',
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
    return {
      title: isBeauty ? 'Alteração enviada' : 'ALTERAÇÃO ENVIADA',
      subtitle: isBeauty
        ? 'O salão ainda precisa confirmar o novo horário. Acompanhe na Minha Área.'
        : 'PEDIDO ENVIADO. AGUARDANDO CONFIRMAÇÃO DO SALÃO.',
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
}): string {
  return `Olá, eu fiz um agendamento online na *${input.businessName}* (para ${input.dateLabel} às ${input.timeLabel}) e estou aguardando a sua confirmação.`;
}
