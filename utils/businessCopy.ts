export type BusinessTheme = 'barber' | 'beauty';

export interface BusinessCopy {
  segmentLabel: string;
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
}

const BARBER_COPY: BusinessCopy = {
  segmentLabel: 'Barbearia',
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
};

const BEAUTY_COPY: BusinessCopy = {
  segmentLabel: 'Salão de Beleza',
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
};

export function resolveBusinessTheme(userType: string | null | undefined): BusinessTheme {
  return userType === 'beauty' ? 'beauty' : 'barber';
}

export function getBusinessCopy(theme: BusinessTheme): BusinessCopy {
  return theme === 'beauty' ? BEAUTY_COPY : BARBER_COPY;
}
