import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useOnboardingState, OnboardingStep } from '../hooks/useOnboardingState';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { StepBusinessInfo } from '../components/onboarding/StepBusinessInfo';
import { StepServices } from '../components/onboarding/StepServices';
import { StepTeam } from '../components/onboarding/StepTeam';
import { StepBusinessHours } from '../components/onboarding/StepBusinessHours';
import { StepMonthlyGoal } from '../components/onboarding/StepMonthlyGoal';
import { StepSuccess } from '../components/onboarding/StepSuccess';

const TOTAL_STEPS = 6; // 5 etapas + tela de sucesso (welcome, services, team, hours, goal, success)

export const OnboardingWizard: React.FC = () => {
    const { isBeauty, colors } = useBrutalTheme();
    const navigate = useNavigate();
    const { step, loading, completed, goToStep } = useOnboardingState();

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    useEffect(() => {
        if (completed) navigate('/', { replace: true });
    }, [completed, navigate]);

    if (loading) {
        return (
            <div className={`min-h-screen ${colors.bg} flex items-center justify-center p-4`}>
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className={`${colors.text} text-lg`}>Carregando...</p>
                    <p className={`${colors.textSecondary} text-sm mt-2`}>Preparando tudo para você...</p>
                </div>
            </div>
        );
    }

    if (completed) {
        return null;
    }

    const steps: Array<{ title: string; description: string; component: React.ReactNode }> = [
        {
            title: isBeauty ? 'Bem-vindo ao AgendiX Beauty' : 'Bem-vindo ao AgendiX Barber',
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
            title: 'Horário de Funcionamento',
            description: 'Quando você atende? Configure para o cliente ver no link público.',
            component: (
                <StepBusinessHours
                    onNext={() => goToStep(5 as OnboardingStep)}
                    onBack={() => goToStep(3 as OnboardingStep)}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Sua Meta',
            description: 'Defina quanto quer faturar este mês — acompanhe seu progresso no painel.',
            component: (
                <StepMonthlyGoal
                    onNext={() => goToStep(6 as OnboardingStep)}
                    onBack={() => goToStep(4 as OnboardingStep)}
                    onSkip={() => goToStep(6 as OnboardingStep)}
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
