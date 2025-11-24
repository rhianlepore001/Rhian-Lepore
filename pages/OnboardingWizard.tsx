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
        return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando...</div>;
    }

    const steps = [
        {
            title: isBeauty ? 'Bem-vindo ao Beauty OS' : 'Bem-vindo ao Barber OS',
            description: 'Vamos começar configurando as informações básicas do seu negócio.',
            component: <StepBusinessInfo onNext={() => setStep(2)} accentColor={accentColor} />
        },
        {
            title: 'Horário de Funcionamento',
            description: 'Defina os dias e horários que seu estabelecimento está aberto.',
            component: <StepBusinessHours onNext={() => setStep(3)} onBack={() => setStep(1)} accentColor={accentColor} />
        },
        {
            title: 'Sua Equipe',
            description: 'Adicione os profissionais que atenderão seus clientes.',
            component: <StepTeam onNext={() => setStep(4)} onBack={() => setStep(2)} accentColor={accentColor} />
        },
        {
            title: 'Seus Serviços',
            description: 'Cadastre os serviços que você oferece.',
            component: <StepServices onNext={() => setStep(5)} onBack={() => setStep(3)} accentColor={accentColor} />
        },
        {
            title: 'Parabéns!',
            description: 'Configuração concluída com sucesso.',
            component: <StepSuccess accentColor={accentColor} />
        }
    ];

    const currentStepData = steps[step - 1];

    return (
        <OnboardingLayout
            currentStep={step}
            totalSteps={5}
            title={currentStepData.title}
            description={currentStepData.description}
        >
            {currentStepData.component}
        </OnboardingLayout>
    );
};
