import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboardingState, OnboardingStep } from '../hooks/useOnboardingState';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { StepBusinessInfo } from '../components/onboarding/StepBusinessInfo';
import { StepServices } from '../components/onboarding/StepServices';
import { StepTeam } from '../components/onboarding/StepTeam';
import { StepMonthlyGoal } from '../components/onboarding/StepMonthlyGoal';
import { StepSuccess } from '../components/onboarding/StepSuccess';

const TOTAL_STEPS = 5; // 4 etapas + tela de sucesso

export const OnboardingWizard: React.FC = () => {
    const { userType } = useAuth();
    const navigate = useNavigate();
    const { step, loading, completed, goToStep } = useOnboardingState();

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className={
                        isBeauty
                            ? 'w-16 h-16 border-4 border-beauty-neon border-t-transparent rounded-full animate-spin mx-auto mb-4'
                            : 'w-16 h-16 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4'
                    } />
                    <p className="text-white text-lg font-mono">Carregando...</p>
                    <p className="text-neutral-500 text-sm mt-2">Preparando seu setup</p>
                </div>
            </div>
        );
    }

    if (completed) {
        navigate('/');
        return null;
    }

    const steps: Array<{ title: string; description: string; component: React.ReactNode }> = [
        {
            title: isBeauty ? 'Bem-vindo ao AgenX Beauty' : 'Bem-vindo ao AgenX Barber',
            description: 'Primeiro, conte-nos sobre o seu negócio.',
            component: (
                <StepBusinessInfo
                    onNext={() => goToStep(2 as OnboardingStep)}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Seus Serviços',
            description: 'Cadastre pelo menos um serviço com preço para ativar seu financeiro.',
            component: (
                <StepServices
                    onNext={() => goToStep(3 as OnboardingStep)}
                    onBack={() => goToStep(1 as OnboardingStep)}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Sua Equipe',
            description: 'Quem faz os atendimentos? Adicione pelo menos um profissional.',
            component: (
                <StepTeam
                    onNext={() => goToStep(4 as OnboardingStep)}
                    onBack={() => goToStep(2 as OnboardingStep)}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Sua Meta',
            description: 'Defina quanto quer faturar este mês — acompanhe seu progresso no painel.',
            component: (
                <StepMonthlyGoal
                    onNext={() => goToStep(5 as OnboardingStep)}
                    onBack={() => goToStep(3 as OnboardingStep)}
                    onSkip={() => goToStep(5 as OnboardingStep)}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Tudo Pronto!',
            description: 'Seu sistema está configurado e pronto para trabalhar.',
            component: <StepSuccess accentColor={accentColor} />,
        },
    ];

    const currentStepData = steps[step - 1];

    return (
        <OnboardingLayout
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            title={currentStepData.title}
            description={currentStepData.description}
        >
            {currentStepData.component}
        </OnboardingLayout>
    );
};
