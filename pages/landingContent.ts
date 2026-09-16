import { TRIAL_DAYS } from '../constants';

export const REGISTER_PATH = '/register';
export const LOGIN_PATH = '/login';

export const DEMO_BOOK = {
  barber: {
    href: 'https://www.agendixstudio.com/#/book/demo-barbearia-corte-fino',
    label: 'Ver agendamento da barbearia (demo)',
    name: 'DEMO · Barbearia Corte Fino',
  },
  beauty: {
    href: 'https://www.agendixstudio.com/#/book/demo-studio-aurora',
    label: 'Ver agendamento do salão (demo)',
    name: 'DEMO · Studio Aurora',
  },
} as const;

export const PRICING = {
  BRL: {
    solo: 'R$ 34,90',
    team: 'R$ 59,90',
  },
  EUR: {
    solo: '€ 9,90',
    team: '€ 19,90',
  },
} as const;

export type PricingCurrency = keyof typeof PRICING;

export function registerPath(type?: 'barber' | 'beauty'): string {
  return type ? `${REGISTER_PATH}?type=${type}` : REGISTER_PATH;
}

export const LANDING = {
  title: 'AgendiX — a agenda que faz o salão crescer',
  description: `Agenda, link de agendamento, fila, CRM e caixa para barbearias e salões. ${TRIAL_DAYS} dias para testar. Brasil e Portugal.`,
  h1: ['A agenda que faz', 'a casa crescer.'],
  sub: 'Cliente marca pelo link. Você atende. O horário vazio vira visita — na barbearia e no salão.',
  ctaTrial: `Testar ${TRIAL_DAYS} dias`,
  ctaHow: 'Ver como funciona',
  ctaLogin: 'Entrar',
  facts: [
    `${TRIAL_DAYS} dias de teste. Cadastro sem cartão.`,
    'Solo R$ 34,90 ou € 9,90. Equipe R$ 59,90 ou € 19,90. Depois do teste.',
    'Barbearias e salões. O mesmo produto.',
    'Brasil no Pix. Portugal no MB WAY. Sem aplicativo nativo.',
  ],
  problemLead: 'A casa cresce no WhatsApp e fura na agenda.',
  problemBody:
    'Recado, encaixe e cobrança no mesmo chat. Horário vazio não se oferece sozinho. Planilha organiza o passado. Não traz gente na terça à tarde.',
  promise:
    'O AgendiX recebe o cliente no link, organiza o dia e ajuda a agenda a se reencher. É booking com crescimento, não um ERP de módulos.',
  pillars: [
    {
      title: 'Agendar',
      body: 'Link público com a cara da casa, agenda por profissional e fila digital para quem chega sem hora marcada.',
      points: ['Link público', 'Agenda por profissional', 'Fila digital'],
    },
    {
      title: 'Crescer',
      body: 'CRM da casa, clube com Pix ou MB WAY, produto no meio do atendimento. O próximo horário deixa de depender só da memória.',
      points: ['CRM da casa', 'Clube Pix ou MB WAY', 'Produto no atendimento'],
    },
    {
      title: 'Fechar o dia',
      body: 'Checkout no fim do serviço, financeiro, comissões da equipe e análises do que ocupou a grade.',
      points: ['Checkout do serviço', 'Financeiro e comissões', 'Análises da grade'],
    },
  ],
  productIntro: 'O link que o cliente abre.',
  shots: [
    {
      src: '/landing/shots/book-barber.png',
      alt: 'Agendamento público da DEMO Barbearia Corte Fino: serviços, preços e clube.',
      caption: 'Barbearia Corte Fino. Serviço, preço e clube. Tudo no link.',
      heroLabel: 'Barbearia',
      href: DEMO_BOOK.barber.href,
      hrefLabel: DEMO_BOOK.barber.label,
    },
    {
      src: '/landing/shots/book-beauty.png',
      alt: 'Agendamento público da DEMO Studio Aurora: serviços de salão e clube.',
      caption: 'Studio Aurora. Cabelo, unhas, estética. O mesmo fluxo.',
      heroLabel: 'Salão',
      href: DEMO_BOOK.beauty.href,
      hrefLabel: DEMO_BOOK.beauty.label,
    },
  ],
  vsOld: {
    title: 'Caderno e zap',
    items: [
      'Horário combinado em mensagem e perdido no histórico',
      'Fila na porta, sem número, sem prazo',
      'Caixa no fim do dia, de cabeça',
    ],
  },
  vsErp: {
    title: 'Só gestão',
    items: [
      'Módulo para cada canto da casa',
      'Pouco foco em trazer o próximo cliente',
      'App nativo que o cliente precisa instalar',
    ],
  },
  vsUs: {
    title: 'AgendiX',
    items: [
      'Link de agendamento que o cliente abre no celular',
      'Fila, clube e caixa no mesmo ritmo do atendimento',
      'Nenhum percentual inventado de movimento',
    ],
  },
  steps: [
    {
      title: 'Abre a conta',
      body: `Barbearia ou salão. ${TRIAL_DAYS} dias. Brasil ou Portugal.`,
    },
    {
      title: 'Sobe o link',
      body: 'Serviços, equipe, horários. Copia o link e manda no WhatsApp da casa.',
    },
    {
      title: 'Atende e fecha',
      body: 'Confirma, cobra, põe na fila, vende produto, acerta comissão.',
    },
  ],
  trialLead: 'Vinte dias com o produto inteiro.',
  trialIncludes: [
    'Agendar: link público, agenda por profissional, fila digital',
    'Crescer: CRM, clube Pix ou MB WAY, produto no atendimento',
    'Fechar: checkout, financeiro, comissões, análises',
    'Temas de app para barbearia e salão, depois do cadastro',
  ],
  trialNote: 'Não inclui aplicativo nativo. Lembrete automático por WhatsApp ainda não faz parte do produto.',
  pricingLead: 'Depois do teste, dois planos. Mesma agenda.',
  plans: [
    {
      id: 'solo',
      name: 'Solo',
      who: 'Quem atende sozinho.',
      features: [
        'Agenda ilimitada',
        'Clientes',
        'Página de agendamento online',
        'Relatórios básicos',
        'Suporte via WhatsApp',
      ],
    },
    {
      id: 'team',
      name: 'Equipe',
      who: 'Casa com profissionais.',
      features: [
        'Tudo do Solo',
        'Vários profissionais',
        'Comissões',
        'Relatórios avançados',
        'Clube de assinatura',
        'Prioridade no suporte',
      ],
    },
  ],
  faq: [
    {
      q: 'O cliente precisa baixar um aplicativo?',
      a: 'Não. Ele agenda pelo link da casa, no navegador.',
    },
    {
      q: `Os ${TRIAL_DAYS} dias pedem cartão?`,
      a: 'Não. O cadastro abre o teste. A assinatura entra depois, se você quiser continuar.',
    },
    {
      q: 'Quanto custa depois do teste?',
      a: 'Solo sai R$ 34,90/mês ou € 9,90/mês. Equipe sai R$ 59,90/mês ou € 19,90/mês, conforme a região da conta (Brasil ou Portugal).',
    },
    {
      q: 'Serve barbearia e salão?',
      a: 'Serve os dois. Você escolhe o segmento no cadastro. O app acompanha o tipo de casa; esta página é a mesma para os dois.',
    },
    {
      q: 'Pix e MB WAY são do AgendiX?',
      a: 'Não. No clube, o pagamento vai para a chave Pix ou o MB WAY cadastrados pela casa. O AgendiX não fica no meio do dinheiro.',
    },
    {
      q: 'Tem fila, financeiro e comissão de verdade?',
      a: 'Tem. Fila digital, checkout no atendimento, lançamentos no financeiro, comissões da equipe e análises. Sem módulo de marketing e sem IA no plano atual.',
    },
  ],
  closeLead: 'Vinte dias com a casa real. Depois você decide.',
  footerNote: 'AgendiX · barbearias e salões · Brasil e Portugal',
} as const;
