// constants/WIZARD_TARGETS.ts
// IDs de elementos-alvo para o wizard guiado do SetupCopilot.
// Os elementIds são stubs temporários — substituídos com valores reais em US-0403.

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

// Targets reais confirmados por inspeção DOM em US-0403
export const WIZARD_TARGETS: Record<WizardStepId, WizardTarget> = {
  services: {
    elementId: 'setup-step-services',
    position: 'right',
    message: 'Cadastre seus serviços para ativar o agendamento',
    path: '/configuracoes/servicos',
  },
  team: {
    elementId: 'setup-step-team',
    position: 'right',
    message: 'Adicione os profissionais da sua equipe',
    path: '/configuracoes/equipe',
  },
  hours: {
    elementId: 'setup-step-hours',
    position: 'right',
    message: 'Defina seus horários de funcionamento',
    path: '/configuracoes/horarios',
  },
  profile: {
    elementId: 'setup-step-profile',
    position: 'right',
    message: 'Personalize o perfil público do seu negócio',
    path: '/configuracoes/perfil',
  },
  booking: {
    elementId: 'setup-step-booking',
    position: 'right',
    message: 'Ative o link de agendamento online',
    path: '/configuracoes/agendamento',
  },
  appointment: {
    elementId: 'wizard-add-appointment',
    position: 'top',
    message: 'Crie seu primeiro agendamento',
    path: '/agenda',
  },
};
