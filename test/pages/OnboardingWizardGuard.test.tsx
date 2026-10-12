import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));

const auth: any = {};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
const onboarding: any = {};
vi.mock('../../hooks/useOnboardingState', () => ({ useOnboardingState: () => onboarding }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ isBeauty: false, colors: { bg: '', text: '', textSecondary: '' } }) }));
vi.mock('../../components/OnboardingLayout', () => ({ OnboardingLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('../../components/onboarding/StepBusinessInfo', () => ({ StepBusinessInfo: () => <div>StepBusinessInfo</div> }));
vi.mock('../../components/onboarding/StepServices', () => ({ StepServices: () => <div>StepServices</div> }));
vi.mock('../../components/onboarding/StepTeam', () => ({ StepTeam: () => <div>StepTeam</div> }));
vi.mock('../../components/onboarding/StepBusinessHours', () => ({ StepBusinessHours: () => <div>StepBusinessHours</div> }));
vi.mock('../../components/onboarding/StepMonthlyGoal', () => ({ StepMonthlyGoal: () => <div>StepMonthlyGoal</div> }));
vi.mock('../../components/onboarding/StepSuccess', () => ({ StepSuccess: () => <div>StepSuccess</div> }));

import { OnboardingWizard } from '../../pages/OnboardingWizard';

beforeEach(() => {
  navigate.mockReset();
  Object.assign(auth, { loading: false, tutorialCompleted: false, markTutorialCompleted: vi.fn().mockResolvedValue({ error: null }) });
  Object.assign(onboarding, { step: 1, loading: false, completed: false, goToStep: vi.fn(), skipOnboarding: vi.fn() });
});

describe('OnboardingWizard: sem ping-pong com o guard de rota', () => {
  it('progresso concluído mas AuthContext não: sincroniza 1x e NÃO navega até o AuthContext concordar', async () => {
    onboarding.completed = true;
    const { rerender } = render(<OnboardingWizard />);
    await waitFor(() => expect(auth.markTutorialCompleted).toHaveBeenCalledTimes(1));
    expect(navigate).not.toHaveBeenCalled();
    // re-renders (ex.: o guard re-monta) não disparam outra sincronização nem navegação
    rerender(<OnboardingWizard />); rerender(<OnboardingWizard />);
    expect(auth.markTutorialCompleted).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    // AuthContext passa a "concluído" → navega uma vez
    auth.tutorialCompleted = true;
    rerender(<OnboardingWizard />);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('enquanto o perfil carrega (auth loading) não navega nem sincroniza', () => {
    onboarding.completed = true; auth.loading = true; auth.tutorialCompleted = true;
    render(<OnboardingWizard />);
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.markTutorialCompleted).not.toHaveBeenCalled();
    expect(screen.getByText('Carregando...')).toBeTruthy();
  });

  it('falha ao sincronizar: mostra "Tentar de novo" em vez de ficar em loop', async () => {
    onboarding.completed = true;
    auth.markTutorialCompleted = vi.fn().mockResolvedValue({ error: new Error('x') });
    render(<OnboardingWizard />);
    expect(await screen.findByTestId('onboarding-sync-error')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('tudo concluído: vai para o app', () => {
    onboarding.completed = true; auth.tutorialCompleted = true;
    render(<OnboardingWizard />);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
    expect(auth.markTutorialCompleted).not.toHaveBeenCalled();
  });

  it('não concluído: mostra o wizard e não navega', () => {
    render(<OnboardingWizard />);
    expect(navigate).not.toHaveBeenCalled();
  });
});
