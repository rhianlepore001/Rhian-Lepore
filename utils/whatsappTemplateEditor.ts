import {
  TEMPLATE_ALLOWED_KEYS,
  type WhatsAppTemplateKey,
  type WhatsAppTemplateVars,
} from './whatsappTemplates';

export const WHATSAPP_TEMPLATE_GROUPS: {
  title: string;
  messages: { key: WhatsAppTemplateKey; title: string; summary: string }[];
}[] = [
  {
    title: 'Confirmações',
    messages: [
      {
        key: 'booking_accepted',
        title: 'Pedido aceito',
        summary: 'Confirmação enviada ao aceitar um pedido de agendamento.',
      },
      {
        key: 'booking_confirmed',
        title: 'Agendamento criado',
        summary: 'Confirmação ao criar um horário pela agenda.',
      },
      {
        key: 'wizard_confirm',
        title: 'Novo agendamento',
        summary: 'Confirmação ao concluir o agendamento em etapas.',
      },
    ],
  },
  {
    title: 'Remarcação',
    messages: [
      {
        key: 'reschedule',
        title: 'Horário remarcado',
        summary: 'Avisa o cliente sobre a nova data e o novo horário.',
      },
    ],
  },
  {
    title: 'Trazer cliente de volta',
    messages: [
      {
        key: 'reactivation',
        title: 'Convite para voltar',
        summary: 'Convite personalizado para quem não vem há algum tempo.',
      },
      {
        key: 'rebooking',
        title: 'Lembrete de nova visita',
        summary: 'Convite para agendar o próximo atendimento.',
      },
    ],
  },
  {
    title: 'Fila',
    messages: [
      {
        key: 'queue_joined',
        title: 'Entrada na fila',
        summary: 'Envia o link para acompanhar a posição na fila.',
      },
    ],
  },
  {
    title: 'Clube',
    messages: [
      {
        key: 'membership_contact',
        title: 'Contato com assinante',
        summary: 'Mensagem do negócio para conversar sobre o plano.',
      },
    ],
  },
  {
    title: 'Mensagens do cliente',
    messages: [
      {
        key: 'client_request_confirm',
        title: 'Pedir confirmação',
        summary: 'Mensagem que o cliente envia após agendar online.',
      },
      {
        key: 'client_change',
        title: 'Alterar horário',
        summary: 'Mensagem do cliente para pedir outro horário.',
      },
      {
        key: 'client_question',
        title: 'Dúvida sobre agendamento',
        summary: 'Contato do cliente pela Minha Área.',
      },
      {
        key: 'client_cancel',
        title: 'Pedir cancelamento',
        summary: 'Contato do cliente para conversar sobre o cancelamento.',
      },
      {
        key: 'membership_overdue',
        title: 'Renovar plano vencido',
        summary: 'Mensagem do assinante para saber como renovar.',
      },
      {
        key: 'membership_pending',
        title: 'Falar sobre assinatura',
        summary: 'Mensagem do cliente sobre a solicitação de um plano.',
      },
    ],
  },
];

export function validateWhatsAppTemplate(
  key: WhatsAppTemplateKey,
  body: string,
): string | null {
  if (!body.trim()) return 'Escreva uma mensagem antes de salvar.';
  if (Array.from(body).length > 1000)
    return 'A mensagem pode ter até 1.000 caracteres.';
  if (
    Array.from(body).some((char) => {
      const code = char.codePointAt(0)!;
      return (code < 32 && code !== 10) || (code >= 127 && code <= 159);
    })
  )
    return 'Remova os caracteres invisíveis da mensagem. Use apenas texto e quebras de linha.';
  if (/\n{4}/.test(body))
    return 'Use no máximo três quebras de linha seguidas.';
  const allowed = new Set<string>(TEMPLATE_ALLOWED_KEYS[key]);
  const invalid = [...body.matchAll(/\{([^{}]*)\}/g)]
    .map((match) => match[1])
    .find((variable) => !allowed.has(variable));
  if (invalid !== undefined)
    return `A variável {${invalid}} não está disponível nesta mensagem. Escolha uma das opções abaixo.`;
  if (/[{}]/.test(body.replace(/\{[^{}]*\}/g, '')))
    return 'Confira as variáveis da mensagem. Use os botões abaixo para inseri-las.';
  return null;
}

export function whatsAppPreviewVars(
  businessName: string,
  region: string,
  key?: WhatsAppTemplateKey,
): WhatsAppTemplateVars {
  return {
    cliente: 'Cliente Exemplo',
    atendido: 'Dependente Exemplo',
    para_quem: ' para Dependente Exemplo',
    primeiro_nome: 'Cliente',
    profissional: key === 'reschedule' ? 'com Profissional Exemplo' : 'Profissional Exemplo',
    servico: 'Atendimento personalizado, cuidado complementar',
    estabelecimento: businessName,
    valor: region === 'PT' ? '€ 45,00' : 'R$ 90,00',
    data: '28/10/2026',
    hora: '14:30',
    data_anterior: '27/10/2026',
    hora_anterior: '10:00',
    dias_ausente: 30,
    link_fila: 'https://example.test/#/minha-area/negocio-exemplo?tab=fila',
    plano: 'Plano Essencial',
  };
}
