import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AgenXLogo } from './AgenXLogo';

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
    const { userType } = useAuth();
    const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        const t = setTimeout(() => setVisible(true), 80);
        return () => clearTimeout(t);
    }, [currentStep]);

    // Steps não contam a tela de sucesso no indicador de progresso
    const progressSteps = totalSteps - 1;
    const progressPercent = Math.min((currentStep / progressSteps) * 100, 100);

    return (
        <div className={(isBeauty ? 'min-h-screen bg-beauty-dark flex flex-col' : 'min-h-screen bg-brutal-main flex flex-col') + ' relative'}>
            <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
            <div
                className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
                style={{ backgroundColor: isBeauty ? 'rgba(167,139,250,0.04)' : 'rgba(194,155,64,0.04)' }}
            />
            {/* Header */}
            <header className="border-b border-white/5 bg-black/30 backdrop-blur-sm z-50 flex-shrink-0">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <AgenXLogo size={28} isBeauty={isBeauty} showText={true} />
                    <div className="text-xs text-neutral-500 font-mono tracking-widest uppercase">
                        {currentStep < totalSteps ? `${currentStep} de ${progressSteps}` : 'Concluído'}
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-0.5 bg-white/5 w-full flex-shrink-0">
                <div
                    className={`h-full transition-all duration-500 ease-out ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Step Dots */}
            {currentStep < totalSteps && (
                <div className="flex items-center justify-center gap-2 pt-5 pb-1 flex-shrink-0">
                    {Array.from({ length: progressSteps }).map((_, i) => {
                        const stepNum = i + 1;
                        const isDone = stepNum < currentStep;
                        const isCurrent = stepNum === currentStep;
                        return (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-300 ${
                                    isCurrent
                                        ? `w-6 h-1.5 ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`
                                        : isDone
                                        ? `w-1.5 h-1.5 ${isBeauty ? 'bg-beauty-neon/60' : 'bg-accent-gold/60'}`
                                        : 'w-1.5 h-1.5 bg-white/10'
                                }`}
                            />
                        );
                    })}
                </div>
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div
                    className="w-full max-w-2xl mx-auto py-6 transition-all duration-300"
                    style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(10px)',
                    }}
                >
                    <div className="text-center mb-8 md:mb-10">
                        <h1 className="text-2xl md:text-3xl font-heading text-white uppercase mb-2">
                            {title}
                        </h1>
                        <p className="text-neutral-400">
                            {description}
                        </p>
                    </div>

                    <div className={`
                        ${isBeauty
                            ? 'bg-gradient-to-br from-beauty-card/90 to-beauty-dark/80 backdrop-blur-xl border border-beauty-neon/20 rounded-2xl shadow-[0_0_30px_rgba(167,139,250,0.12)]'
                            : 'bg-neutral-900 border border-white/8 rounded-xl shadow-2xl'}
                        p-6 md:p-8
                    `}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
