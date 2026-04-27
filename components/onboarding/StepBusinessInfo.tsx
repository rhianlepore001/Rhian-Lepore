import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StepWelcomeProps {
    onNext: () => void;
    accentColor: string;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ onNext, accentColor }) => {
    const { user } = useAuth();
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) { setLoading(false); return; }
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_name')
                .eq('id', user.id)
                .single();
            if (profile?.business_name) {
                setBusinessName(profile.business_name);
            }
            setLoading(false);
        };
        loadProfile();
    }, [user]);

    const isBeauty = accentColor === 'beauty-neon';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center lg:text-left space-y-4">
                <p className="text-foreground text-3xl font-bold leading-tight font-heading tracking-tight">
                    {businessName ? (
                        <>
                            <span className="text-primary block mb-1">
                                {businessName}
                            </span>
                            está a um passo de decolar.
                        </>
                    ) : (
                        'Seu negócio está a um passo de decolar.'
                    )}
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto lg:mx-0">
                    Vamos cadastrar seus serviços principais e horários. O processo leva menos de 2 minutos e pode ser ajustado depois.
                </p>
            </div>

            <button
                type="button"
                onClick={onNext}
                id="wizard-welcome-next"
                className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-xl transition-all duration-200 
                           flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(var(--primary),0.39)] 
                           hover:shadow-[0_6px_20px_rgba(var(--primary),0.23)] hover:-translate-y-0.5 active:translate-y-0"
            >
                Começar configuração
                <span className="font-normal">→</span>
            </button>
        </div>
    );
};

// Compatibilidade retroativa: StepBusinessInfo exportado para rota legada /onboarding-wizard
export { StepWelcome as StepBusinessInfo };
