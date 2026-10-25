export type WhatsAppTheme = 'barber' | 'beauty';
export type WhatsAppRegion = 'BR' | 'PT';

export type WhatsAppTemplateKey =
  | 'booking_accepted'
  | 'booking_confirmed'
  | 'wizard_confirm'
  | 'reschedule'
  | 'reactivation'
  | 'rebooking'
  | 'queue_joined'
  | 'membership_contact'
  | 'client_request_confirm'
  | 'client_change'
  | 'client_question'
  | 'client_cancel'
  | 'membership_overdue'
  | 'membership_pending';

export type WhatsAppVariable =
  | 'cliente'
  | 'primeiro_nome'
  | 'data'
  | 'hora'
  | 'servico'
  | 'profissional'
  | 'estabelecimento'
  | 'valor'
  | 'data_anterior'
  | 'hora_anterior'
  | 'dias_ausente'
  | 'link_fila'
  | 'plano';

export type WhatsAppTemplateVars = Partial<Record<WhatsAppVariable, string | number | null | undefined>>;
type TemplatePair = Record<WhatsAppTheme, string>;
type TemplateVariant = 'confirmed' | 'vip';

export const WHATSAPP_TEMPLATE_KEYS: readonly WhatsAppTemplateKey[] = [
  'booking_accepted',
  'booking_confirmed',
  'wizard_confirm',
  'reschedule',
  'reactivation',
  'rebooking',
  'queue_joined',
  'membership_contact',
  'client_request_confirm',
  'client_change',
  'client_question',
  'client_cancel',
  'membership_overdue',
  'membership_pending',
];

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, TemplatePair> = {
  booking_accepted: {
    beauty: 'Olá {cliente}! Tudo bem? ✨\nSua reserva em *{estabelecimento}* está confirmada!\n📅 *{data}* às *{hora}*\n💼 *Serviço*: {servico}\n💰 *Valor*: {valor}\n📍 Local: estamos te esperando!\n\nEstamos preparando tudo para te receber com a melhor experiência. Até logo! 💖',
    barber: 'Fala, {cliente}! Seu horário está garantido! 🛡️\nMarque na sua agenda:\n🗓️ *{data}* às *{hora}*\n✂️ *Serviço*: {servico}\n💰 *Valor*: {valor}\n📍 Onde: *{estabelecimento}*.\n\nPrepare-se para o trato! Nos vemos em breve. 👋',
  },
  booking_confirmed: {
    beauty: 'Agendamento confirmado! ✨\nData: {data}\nHorário: {hora}\nServiço: {servico}\nValor: {valor}\n\nAgradecemos a confiança! Te espero em *{estabelecimento}*.',
    barber: 'Agendamento confirmado! ✨\nData: {data}\nHorário: {hora}\nServiço: {servico}\nValor: {valor}\n\nAgradecemos a confiança! Te espero em *{estabelecimento}*.',
  },
  wizard_confirm: {
    beauty: 'Olá {cliente}! ✨\nPassando para confirmar seu horário em *{estabelecimento}*. Tudo certo para *{data} às {hora}*?\n\nTe aguardamos com muito carinho! 💖',
    barber: 'Fala, {cliente}! ✂️\nSeu horário está garantido em *{estabelecimento}*.\nNos vemos dia *{data}* às *{hora}*.\n\nTe aguardamos para dar aquele talento! 🚀',
  },
  reschedule: {
    beauty: '{cliente}\nSeu horário em *{estabelecimento}* foi remarcado.\nAntes: {data_anterior} às {hora_anterior}\nAgora: *{data}* às *{hora}* {profissional}.\nSe precisar de outro horário, é só responder. 💖',
    barber: '{cliente}\nSeu horário em *{estabelecimento}* foi remarcado.\nAntes: {data_anterior} às {hora_anterior}\nAgora: *{data}* às *{hora}* {profissional}.\nQualquer dúvida é só responder aqui. Até lá! ✂️',
  },
  reactivation: {
    beauty: 'Oi, {primeiro_nome}! Você sempre cuida do seu {servico} com a gente em *{estabelecimento}* e sua última visita foi incrível, mas notamos que já faz {dias_ausente} dias que não nos vemos. Por isso, separei alguns horários exclusivos para você renovar esse estilo esta semana. Vamos agendar?',
    barber: 'Oi, {primeiro_nome}! Você sempre cuida do seu {servico} com a gente em *{estabelecimento}* e sua última visita foi incrível, mas notamos que já faz {dias_ausente} dias que não nos vemos. Por isso, separei alguns horários exclusivos para você renovar esse estilo esta semana. Vamos agendar?',
  },
  rebooking: {
    beauty: 'Oi {primeiro_nome}! Faz um tempo que não nos vemos. Que tal agendar um horário esta semana? ✨',
    barber: 'Oi {primeiro_nome}! Faz um tempo que não nos vemos. Que tal agendar um horário esta semana? ✂️',
  },
  queue_joined: {
    beauty: 'Olá, {primeiro_nome}! Você entrou na fila de *{estabelecimento}*.\nAcompanhe sua senha neste link:\n{link_fila}\n\nSe for a primeira vez, informe o mesmo WhatsApp usado no balcão e veja a posição na fila.',
    barber: 'Olá, {primeiro_nome}! Você entrou na fila de *{estabelecimento}*.\nAcompanhe sua senha neste link:\n{link_fila}\n\nSe for a primeira vez, informe o mesmo WhatsApp usado no balcão e veja a posição na fila.',
  },
  membership_contact: {
    beauty: 'Olá {primeiro_nome}! Tudo bem? Aqui é de *{estabelecimento}*. Sobre seu plano "{plano}"...',
    barber: 'Olá {primeiro_nome}! Tudo bem? Aqui é de *{estabelecimento}*. Sobre seu plano "{plano}"...',
  },
  client_request_confirm: {
    beauty: 'Olá, {estabelecimento}! Fiz um agendamento online para {servico} com {profissional} em {data} às {hora}. Pode confirmar, por favor?',
    barber: 'Olá, {estabelecimento}! Fiz um agendamento online para {servico} com {profissional} em {data} às {hora}. Pode confirmar, por favor?',
  },
  client_change: {
    beauty: 'Olá! {cliente} Queria alterar meu horário.',
    barber: 'Olá! {cliente} Queria alterar meu horário.',
  },
  client_question: {
    beauty: 'Olá! Sou {cliente} e tenho uma dúvida sobre meu agendamento de {data} às {hora}.',
    barber: 'Olá! Sou {cliente} e tenho uma dúvida sobre meu agendamento de {data} às {hora}.',
  },
  client_cancel: {
    beauty: 'Olá! Sou {cliente}. Queria cancelar meu horário de {data} às {hora}.',
    barber: 'Olá! Sou {cliente}. Queria cancelar meu horário de {data} às {hora}.',
  },
  membership_overdue: {
    beauty: 'Olá, aqui é {primeiro_nome}. Minha assinatura do plano "{plano}" venceu. Como faço para renovar?',
    barber: 'Olá, aqui é {primeiro_nome}. Minha assinatura do plano "{plano}" venceu. Como faço para renovar?',
  },
  membership_pending: {
    beauty: 'Olá, aqui é {primeiro_nome}. Queria falar sobre minha solicitação do plano "{plano}" em *{estabelecimento}*.',
    barber: 'Olá, aqui é {primeiro_nome}. Queria falar sobre minha solicitação do plano "{plano}" em *{estabelecimento}*.',
  },
};

const TEMPLATE_VARIANTS: Partial<Record<WhatsAppTemplateKey, Partial<Record<TemplateVariant, TemplatePair>>>> = {
  client_request_confirm: {
    confirmed: {
      beauty: 'Olá, {estabelecimento}! Fiz um agendamento online para {servico} com {profissional} em {data} às {hora}.',
      barber: 'Olá, {estabelecimento}! Fiz um agendamento online para {servico} com {profissional} em {data} às {hora}.',
    },
  },
  reactivation: {
    vip: {
      beauty: '{primeiro_nome}, você merece estar na sua melhor versão. Em *{estabelecimento}*, nosso plano é simples: agendar seu horário, dar aquele upgrade na sua autoestima e garantir que você saia daqui se sentindo incrível. Você é especial pra gente. Que tal garantirmos sua próxima visita agora?',
      barber: '{primeiro_nome}, você merece estar na sua melhor versão. Em *{estabelecimento}*, nosso plano é simples: agendar seu horário, manter sua presença impecável e garantir que você saia daqui se sentindo incrível. Você é especial pra gente. Que tal garantirmos sua próxima visita agora?',
    },
  },
};

const TEMPLATE_ALLOWED_KEYS: Record<WhatsAppTemplateKey, readonly WhatsAppVariable[]> = {
  booking_accepted: ['cliente', 'data', 'hora', 'servico', 'valor', 'estabelecimento'],
  booking_confirmed: ['data', 'hora', 'servico', 'valor', 'estabelecimento'],
  wizard_confirm: ['cliente', 'data', 'hora', 'estabelecimento'],
  reschedule: ['cliente', 'data_anterior', 'hora_anterior', 'data', 'hora', 'profissional', 'estabelecimento'],
  reactivation: ['primeiro_nome', 'servico', 'dias_ausente', 'estabelecimento'],
  rebooking: ['primeiro_nome'],
  queue_joined: ['primeiro_nome', 'estabelecimento', 'link_fila'],
  membership_contact: ['primeiro_nome', 'estabelecimento', 'plano'],
  client_request_confirm: ['estabelecimento', 'servico', 'profissional', 'data', 'hora'],
  client_change: ['cliente'],
  client_question: ['cliente', 'data', 'hora'],
  client_cancel: ['cliente', 'data', 'hora'],
  membership_overdue: ['primeiro_nome', 'plano'],
  membership_pending: ['primeiro_nome', 'plano', 'estabelecimento'],
};

const NAME_VARIABLES = new Set<WhatsAppVariable>([
  'cliente', 'primeiro_nome', 'servico', 'profissional', 'estabelecimento', 'plano',
]);

function cleanVariable(value: WhatsAppTemplateVars[WhatsAppVariable], key: WhatsAppVariable): string {
  let cleaned = Array.from(String(value ?? ''), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) ? ' ' : character;
  }).join('').replace(/\s+/g, ' ').trim();
  if (NAME_VARIABLES.has(key)) cleaned = Array.from(cleaned).slice(0, 80).join('');
  return cleaned;
}

export function renderTemplate(
  body: string,
  vars: WhatsAppTemplateVars,
  allowedKeys: readonly WhatsAppVariable[],
): string {
  const allowed = new Set(allowedKeys);
  return body
    .replace(/\{([a-z_]+)\}/gi, (placeholder, key: string) => {
      if (!allowed.has(key as WhatsAppVariable)) return placeholder;
      return cleanVariable(vars[key as WhatsAppVariable], key as WhatsAppVariable);
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,!.?;:])/g, '$1')
    .replace(/,([!?])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderWhatsAppTemplate(
  key: WhatsAppTemplateKey,
  theme: WhatsAppTheme,
  vars: WhatsAppTemplateVars,
  variant?: TemplateVariant,
): string {
  const body = (variant && TEMPLATE_VARIANTS[key]?.[variant]?.[theme]) || WHATSAPP_TEMPLATES[key][theme];
  return renderTemplate(body, vars, TEMPLATE_ALLOWED_KEYS[key]);
}

export function buildWhatsAppLink(phone: string, region: WhatsAppRegion = 'BR', message?: string): string {
  let digits = String(phone ?? '').replace(/\D/g, '');
  const ddi = region === 'PT' ? '351' : '55';
  const maximumNationalLength = region === 'PT' ? 9 : 11;

  while (digits.startsWith(ddi) && digits.length > maximumNationalLength) {
    digits = digits.slice(ddi.length);
  }

  const text = message === undefined ? '' : `?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${ddi}${digits}${text}`;
}
