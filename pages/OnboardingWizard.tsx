import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { StepBusinessInfo } from '../components/onboarding/StepBusinessInfo';
import { StepBusinessHours } from '../components/onboarding/StepBusinessHours';
import { StepTeam } from '../components/onboarding/StepTeam';
import { StepServices } from '../components/onboarding/StepServices';
import { StepSuccess } from '../components/onboarding/StepSuccess';

export const OnboardingWizard: React.FC = () => {
    const { user, userType } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    useEffect(() => {
        checkProgress();
    }, [user]);

    const checkProgress = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('business_settings')
            .select('onboarding_step, onboarding_completed')
            .eq('user_id', user.id)
            .single();

        if (data?.onboarding_completed) {
            navigate('/');
            return;
        }

        if (data?.onboarding_step) {
            setStep(data.onboarding_step);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className={isBeauty
                        ? "w-16 h-16 border-4 border-beauty-neon border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        : "w-16 h-16 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"
                    }></div>
                    <p className="text-white text-lg font-mono">Carregando...</p>
                    <p className="text-neutral-500 text-sm mt-2">Preparando seu onboarding</p>
                </div>
            </div>
        );
    }

    const steps = [
        {
            title: isBeauty ? 'Bem-vindo ao AgenX Beauty' : 'Bem-vindo ao AgenX Barber',
            description: 'Vamos começar com o básico. O resto? A nossa IA cuida para você.',
            component: <StepBusinessInfo onNext={async () => {
                if (!user) return;
                // Pula direto para o sucesso e marca como concluído
                await supabase.rpc('update_onboarding_step', {
                    p_user_id: user.id,
                    p_step: 2,
                    p_completed: true
                });
                setStep(2);
            }} accentColor={accentColor} />
        },
        {
            title: 'Tudo pronto!',
            description: 'Seu sistema já está inteligente. Vamos ao trabalho?',
            component: <StepSuccess accentColor={accentColor} />
        }
    ];

    const currentStepData = steps[step - 1];

    return (
        <OnboardingLayout
            currentStep={step}
            totalSteps={2}
            title={currentStepData.title}
            description={currentStepData.description}
        >
            {currentStepData.component}
        </OnboardingLayout>
    );
};
