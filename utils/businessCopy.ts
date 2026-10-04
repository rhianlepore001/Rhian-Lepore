export type BusinessTheme = 'barber' | 'beauty';

export interface BusinessCopy {
  segmentLabel: string;
  segmentLabelShort: string;
  segmentLabelPlural: string;
  businessNoun: string;
  ownerOfBusiness: string;
  establishmentFallback: string;
  businessNamePlaceholder: string;
  slugPlaceholder: string;
  slugTip: string;
  ownerAccessRestricted: string;
  setupCompleteMessage: string;
  staffLinkAccountMessage: string;
  activationBannerMessage: string;
  homeNavLabel: string;
  rolePlaceholder: string;
  /** Exemplo do campo Especialidades no perfil do profissional. */
  specialtiesPlaceholder: string;
  clubPlanNamePlaceholder: string;
  clubPlanDescriptionPlaceholder: string;
  clubPlansSubtitle: string;
  tourServicesDescription: string;
  serviceExamplesHint: string;
  registerSubtitle: string;
}

const BARBER_COPY: BusinessCopy = {
  segmentLabel: 'Barbearia',
  segmentLabelShort: 'Barbearia',
  segmentLabelPlural: 'Barbearias',
  businessNoun: 'barbearia',
  ownerOfBusiness: 'dono da barbearia',
  establishmentFallback: 'Barbearia',
  businessNamePlaceholder: 'Barbearia Silva',
  slugPlaceholder: 'minha-barbearia',
  slugTip: 'Use o nome da sua barbearia sem espaços',
  ownerAccessRestricted: 'Acesso restrito ao dono da barbearia',
  setupCompleteMessage:
    'Sua barbearia já está online e pronta para receber agendamentos. Continue gerenciando sua agenda e clientes pelo menu abaixo.',
  staffLinkAccountMessage:
    'Não foi possível identificar o seu perfil de profissional. Fale com o dono da barbearia para vincular a sua conta à equipe.',
  activationBannerMessage:
    'Sua barbearia está oficialmente online. Você completou as configurações iniciais e está pronto para decolar!',
  homeNavLabel: 'Início',
  rolePlaceholder: 'Ex: Barbeiro',
  specialtiesPlaceholder: 'Ex: Corte, Barba, Degradê',
  clubPlanNamePlaceholder: 'Corte Ilimitado',
  clubPlanDescriptionPlaceholder: 'Cortes de cabelo ilimitados durante o mês.',
  clubPlansSubtitle: 'Crie os planos que seus clientes podem assinar (corte ilimitado, combo, etc).',
  tourServicesDescription: 'Cadastre seus cortes, tratamentos e preços. É o cardápio do seu sucesso.',
  serviceExamplesHint: 'Cadastre pelo menos um serviço para continuar. Exemplos: Corte, Barba, Hidratação.',
  registerSubtitle: 'Sua barbearia pronta em menos de 2 minutos',
};

const BEAUTY_COPY: BusinessCopy = {
  segmentLabel: 'Salão de Beleza',
  segmentLabelShort: 'Salão',
  segmentLabelPlural: 'Salões & Studios',
  businessNoun: 'salão',
  ownerOfBusiness: 'dono do salão',
  establishmentFallback: 'Salão',
  businessNamePlaceholder: 'Studio Bella',
  slugPlaceholder: 'meu-studio',
  slugTip: 'Use o nome do seu salão ou studio sem espaços',
  ownerAccessRestricted: 'Acesso restrito ao dono do salão',
  setupCompleteMessage:
    'Seu salão já está online e pronto para receber agendamentos. Continue gerenciando sua agenda e clientes pelo menu abaixo.',
  staffLinkAccountMessage:
    'Não foi possível identificar o seu perfil de profissional. Fale com o responsável do salão para vincular a sua conta à equipe.',
  activationBannerMessage:
    'Seu salão está oficialmente online. Você completou as configurações iniciais e está pronto para decolar!',
  homeNavLabel: 'Início',
  rolePlaceholder: 'Ex: Cabeleireira',
  specialtiesPlaceholder: 'Ex: Corte, Coloração, Escova',
  clubPlanNamePlaceholder: 'Beleza Ilimitada',
  clubPlanDescriptionPlaceholder: 'Serviços selecionados ilimitados durante o mês.',
  clubPlansSubtitle: 'Crie os planos que seus clientes podem assinar (manicure, combo, etc).',
  tourServicesDescription: 'Cadastre seus serviços, tratamentos e preços. É o cardápio do seu sucesso.',
  serviceExamplesHint: 'Cadastre pelo menos um serviço para continuar. Exemplos: Manicure, Escova, Hidratação.',
  registerSubtitle: 'Seu salão configurado em menos de 2 minutos',
};

export function resolveBusinessTheme(userType: string | null | undefined): BusinessTheme {
  return userType === 'beauty' ? 'beauty' : 'barber';
}

export function getBusinessCopy(theme: BusinessTheme): BusinessCopy {
  return theme === 'beauty' ? BEAUTY_COPY : BARBER_COPY;
}

/** Artigo + substantivo do estabelecimento, sem assumir o tipo no restante da UI. */
export interface BusinessRemainderNoun {
  noun: string;
  article: 'a' | 'o';
  withArticle: string;
  remainderLabel: string;
}

function remainderOf(article: 'a' | 'o', noun: string): BusinessRemainderNoun {
  const withArticle = `${article} ${noun}`;
  return { noun, article, withArticle, remainderLabel: `Ficou para ${withArticle}` };
}

/**
 * Rótulo "Ficou para {a barbearia | o salão | o estúdio}".
 * Tipo desconhecido → "Ficou para o negócio". Não usa o tema visual (que cai em barbearia).
 */
export function getBusinessRemainderNoun(userType: string | null | undefined): BusinessRemainderNoun {
  const raw = String(userType ?? '').trim().toLowerCase();
  if (raw === 'barber' || raw === 'barbearia') return remainderOf('a', 'barbearia');
  if (raw === 'beauty' || raw === 'salao' || raw === 'salão' || raw === 'salon') return remainderOf('o', 'salão');
  if (raw === 'tattoo' || raw === 'estudio' || raw === 'estúdio' || raw === 'studio') return remainderOf('o', 'estúdio');
  return remainderOf('o', 'negócio');
}
