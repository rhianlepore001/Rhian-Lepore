import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AgendiXLogo } from './AgendiXLogo';
import { useMetaOnboardingStep } from '../hooks/useMetaEngagement';

interface OnboardingLayoutProps {
    children: React.ReactNode;
    currentStep: number;
    totalSteps: number;
    title: string;
    description: string;
    forceTheme?: 'beauty' | 'barber';
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
    children,
    currentStep,
    totalSteps,
    title,
    description,
    forceTheme
}) => {
    const { userType, user, role, fullName, region } = useAuth();
    // Meta (passivo, só com consentimento): registra o passo alcançado; não altera a tela.
    useMetaOnboardingStep(currentStep, totalSteps, { email: user?.email, id: user?.id, fullName, region }, role === 'owner');
    const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';
    const progressSteps = totalSteps - 1;

    return (
        <div className="min-h-screen bg-theme-bg flex flex-col relative">
            <header className="border-b border-[var(--color-border)] bg-theme-card flex-shrink-0">
                <div className="max-w-3xl mx-auto px-4 min-h-16 flex items-center justify-between">
                    <AgendiXLogo size={28} isBeauty={isBeauty} showText={true} />
                    <div className="text-sm font-semibold tabular-nums text-theme-textSecondary">
                        {currentStep < totalSteps ? `${currentStep} de ${progressSteps}` : 'Concluído'}
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 py-5 md:p-8">
                <div className="mx-auto w-full max-w-2xl">
                    {currentStep < totalSteps && (
                        <div
                            role="progressbar"
                            aria-label="Progresso da configuração"
                            aria-valuemin={0}
                            aria-valuemax={progressSteps}
                            aria-valuenow={currentStep}
                            className="mb-5 flex gap-1.5"
                        >
                            {Array.from({ length: progressSteps }, (_, index) => (
                                <span key={index} className={`h-1 flex-1 rounded-full ${index < currentStep ? 'bg-theme-accent' : 'bg-[var(--color-border-strong)]'}`} />
                            ))}
                        </div>
                    )}
                    <div className="mb-5 md:mb-6">
                        <h1 className="text-2xl md:text-3xl font-heading font-bold leading-tight tracking-tight text-theme-text mb-1.5">
                            {title}
                        </h1>
                        <p className="max-w-[55ch] text-sm leading-relaxed text-theme-textSecondary">
                            {description}
                        </p>
                    </div>

                    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 md:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
