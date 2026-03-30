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
        <div className="space-y-8 text-center">
            <div>
                <p className="text-white text-2xl font-bold">
                    Bem-vindo ao AgenX{businessName ? ',' : '!'}{' '}
                    {businessName && (
                        <span className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}>
                            {businessName}!
                        </span>
                    )}
                </p>
                <p className="text-neutral-400 text-base mt-3">
                    Vamos configurar seu primeiro serviço para ativar o sistema de agendamento.
                </p>
                <p className="text-neutral-500 text-sm mt-2">
                    Leva menos de 2 minutos.
                </p>
            </div>

            <button
                type="button"
                onClick={onNext}
                id="wizard-welcome-next"
                className={`w-full py-4 text-black font-bold transition-all flex items-center justify-center gap-2 text-lg
                    ${isBeauty
                        ? 'bg-beauty-neon rounded-xl hover:bg-beauty-neon/90 shadow-neon hover:shadow-neonStrong'
                        : 'bg-accent-gold rounded-lg hover:bg-accent-gold/90 shadow-heavy active:shadow-none active:translate-y-1'}`}
            >
                Configurar meu primeiro serviço →
            </button>
        </div>
    );
};

// Compatibilidade retroativa: StepBusinessInfo exportado para rota legada /onboarding-wizard
export { StepWelcome as StepBusinessInfo };
