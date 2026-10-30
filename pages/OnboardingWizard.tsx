import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useOnboardingState, OnboardingStep } from '../hooks/useOnboardingState';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { StepBusinessInfo } from '../components/onboarding/StepBusinessInfo';
import { StepServices } from '../components/onboarding/StepServices';
import { StepTeam } from '../components/onboarding/StepTeam';
import { StepBusinessHours } from '../components/onboarding/StepBusinessHours';
import { StepMonthlyGoal } from '../components/onboarding/StepMonthlyGoal';
import { StepSuccess } from '../components/onboarding/StepSuccess';
import { Modal, Button } from '../components/ui';

const ImportDataWizard = React.lazy(() => import('../components/ImportDataWizard').then(module => ({ default: module.ImportDataWizard })));

const TOTAL_STEPS = 6; // 5 etapas + tela de sucesso (welcome, services, team, hours, goal, success)

export const OnboardingWizard: React.FC = () => {
    const { isBeauty, colors } = useBrutalTheme();
    const navigate = useNavigate();
    const { step, loading, completed, goToStep, skipOnboarding } = useOnboardingState();

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    const { loading: authLoading, tutorialCompleted, markTutorialCompleted, user, companyId, region, role } = useAuth();
    const [showImport, setShowImport] = useState(false);
    const [importGeneration, setImportGeneration] = useState(0);
    const syncAttempted = useRef(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Sai do wizard só quando o AuthContext (que o guard de rota usa) também diz "concluído".
    // Se o progresso está concluído mas o AuthContext não (perfil ainda sem a flag), sincroniza
    // UMA vez antes de navegar: nunca ping-pong wizard ↔ "/" (Safari derrubava o app com
    // "replaceState() more than 100 times").
    useEffect(() => {
        if (authLoading || !completed) return;
        if (tutorialCompleted) {
            navigate('/', { replace: true });
            return;
        }
        if (syncAttempted.current) return;
        syncAttempted.current = true;
        void markTutorialCompleted().then(({ error }) => {
            if (error) setSyncError('Não conseguimos concluir a configuração da sua conta.');
        });
    }, [authLoading, completed, tutorialCompleted, markTutorialCompleted, navigate]);

    if (completed && syncError) {
        return (
            <div className={`min-h-screen ${colors.bg} flex items-center justify-center p-4`}>
                <div className="text-center max-w-sm" data-testid="onboarding-sync-error">
                    <p className={`${colors.text} text-lg mb-2`}>{syncError}</p>
                    <p className={`${colors.textSecondary} text-sm mb-6`}>Verifique sua internet e tente de novo.</p>
                    <button
                        type="button"
                        className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-[var(--color-on-accent,#000)] font-bold"
                        onClick={() => { syncAttempted.current = false; setSyncError(null); window.location.reload(); }}
                    >
                        Tentar de novo
                    </button>
                </div>
            </div>
        );
    }

    if (loading || authLoading || completed) {
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

    const steps: Array<{ title: string; description: string; component: React.ReactNode }> = [
        {
            title: isBeauty ? 'Bem-vindo ao AgendiX Beauty' : 'Bem-vindo ao AgendiX Barber',
            description: 'Primeiro, conte-nos sobre o seu negócio.',
            component: (
                <StepBusinessInfo
                    onNext={() => goToStep(2 as OnboardingStep)}
                    onSkip={async () => {
                        await skipOnboarding();
                        navigate('/', { replace: true });
                    }}
                    accentColor={accentColor}
                />
            ),
        },
        {
            title: 'Seus Serviços',
            description: 'Cadastre pelo menos um serviço com preço para ativar seu financeiro.',
            component: (
                <StepServices
                    key={importGeneration}
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
            {(step === 1 || step === 2) && role === 'owner' && user && companyId && <div className="mt-5"><Button variant="secondary" onClick={() => setShowImport(true)}>Trazer meus dados de outro aplicativo</Button></div>}
            {user && companyId && <Modal open={showImport} onClose={() => {}} preventClose showCloseButton={false} title="Trazer meus dados" size="xl"><React.Suspense fallback={<p>Carregando...</p>}><ImportDataWizard companyId={companyId} userId={user.id} region={region} onClose={() => { setShowImport(false); setImportGeneration(value => value + 1); }} /></React.Suspense></Modal>}
        </OnboardingLayout>
    );
};
