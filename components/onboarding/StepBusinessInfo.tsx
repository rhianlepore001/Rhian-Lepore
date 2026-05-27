import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, SkipForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';

interface StepWelcomeProps {
    onNext: () => void;
    accentColor: string;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ onNext, accentColor }) => {
    const { user } = useAuth();
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(true);

    const themeVariant: ThemeVariant = accentColor === 'beauty-neon' ? 'beauty' : 'barber';
    const { accent, classes } = useBrutalTheme({ override: themeVariant });

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center space-y-5">
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
                        Configuração inicial
                    </p>
                    <h3 className="text-foreground text-2xl md:text-3xl font-bold leading-tight font-heading tracking-tight">
                        {businessName ? (
                            <>
                                <span className={`${accent.text} block mb-1 max-w-md`}>
                                    {businessName}
                                </span>
                                está a um passo de decolar.
                            </>
                        ) : (
                            'Seu negócio está a um passo de decolar.'
                        )}
                    </h3>
                </div>
                <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
                    Vamos cadastrar seus serviços principais e horários. Leva menos de 2 minutos e você pode ajustar tudo depois.
                </p>
            </div>

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={onNext}
                    id="wizard-welcome-next"
                    className={`group w-full py-4 px-6 font-bold text-lg rounded-xl transition-all duration-200 
                               flex items-center justify-center gap-2.5 active:scale-[0.98]
                               ${classes.buttonPrimary}`}
                >
                    Começar configuração
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>

                <button
                    type="button"
                    onClick={onNext}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors
                               flex items-center justify-center gap-2 font-medium"
                >
                    <SkipForward className="w-4 h-4" />
                    Fazer depois
                </button>
            </div>
        </div>
    );
};

// Compatibilidade retroativa: StepBusinessInfo exportado para rota legada /onboarding-wizard
export { StepWelcome as StepBusinessInfo };
