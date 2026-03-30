// constants/WIZARD_TARGETS.ts
// Fonte de verdade centralizada dos elementos-alvo do wizard guiado (SetupCopilot).
// IDs verificados por inspeção DOM em US-0403.

export type WizardStepId =
  | 'services'
  | 'team'
  | 'hours'
  | 'profile'
  | 'booking'
  | 'appointment';

export interface WizardTarget {
  elementId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
  path: string;
}

export const WIZARD_TARGETS: Record<WizardStepId, WizardTarget> = {
  services: {
    elementId: 'btn-add-service',
    position: 'bottom',
    message: 'Clique aqui para adicionar um serviço',
    path: '/configuracoes/servicos',
  },
  team: {
    elementId: 'btn-add-team-member',
    position: 'bottom',
    message: 'Adicione os profissionais da sua equipe',
    path: '/configuracoes/equipe',
  },
  hours: {
    elementId: 'business-hours-section',
    position: 'top',
    message: 'Configure seus dias e horários de atendimento',
    path: '/configuracoes/geral',
  },
  profile: {
    elementId: 'profile-logo-upload',
    position: 'right',
    message: 'Adicione a logo e foto de capa do seu espaço',
    path: '/configuracoes/geral',
  },
  booking: {
    elementId: 'toggle-public-booking',
    position: 'bottom',
    message: 'Ative para receber agendamentos online',
    path: '/configuracoes/agendamento',
  },
  appointment: {
    elementId: 'btn-new-appointment',
    position: 'bottom',
    message: 'Crie seu primeiro agendamento aqui',
    path: '/agenda',
  },
} as const;
