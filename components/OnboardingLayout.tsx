import React from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingLayoutProps {
    children: React.ReactNode;
    currentStep: number;
    totalSteps: number;
    title: string;
    description: string;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
    children,
    currentStep,
    totalSteps,
    title,
    description
}) => {
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';

    return (
        <div className={isBeauty ? 'min-h-screen bg-beauty-dark flex flex-col overflow-hidden' : 'min-h-screen bg-brutal-main flex flex-col overflow-hidden'}>
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm z-50 flex-shrink-0">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={isBeauty ? 'w-8 h-8 rounded bg-beauty-neon flex items-center justify-center font-bold text-black' : 'w-8 h-8 rounded bg-accent-gold flex items-center justify-center font-bold text-black'}>
                            B
                        </div>
                        <span className="text-white font-heading uppercase tracking-wider">
                            {isBeauty ? 'Beauty OS' : 'Barber OS'}
                        </span>
                    </div>
                    <div className="text-sm text-neutral-400 font-mono">
                        Passo {currentStep} de {totalSteps}
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-neutral-800 w-full flex-shrink-0">
                <div
                    className={isBeauty ? 'h-full bg-beauty-neon transition-all duration-500 ease-out' : 'h-full bg-accent-gold transition-all duration-500 ease-out'}
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="w-full max-w-2xl mx-auto py-8">
                    <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-2xl md:text-4xl font-heading text-white uppercase mb-3">
                            {title}
                        </h1>
                        <p className="text-neutral-400 text-lg">
                            {description}
                        </p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 md:p-8 shadow-2xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
