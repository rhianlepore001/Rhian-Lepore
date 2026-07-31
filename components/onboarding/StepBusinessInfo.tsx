import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, SkipForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';
import { useToast } from '../ui/Toast';
import { mapError, formatUserFacingError } from '../../utils/mapError';

interface StepWelcomeProps {
    onNext: () => Promise<void> | void;
    onSkip: () => Promise<void> | void;
    accentColor: string;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ onNext, onSkip, accentColor }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<'next' | 'skip' | null>(null);

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

    const runAction = async (kind: 'next' | 'skip', action: () => Promise<void> | void) => {
        if (busy) return;
        setBusy(kind);
        try {
            await action();
        } catch (error: unknown) {
            const ui = mapError(
                error,
                kind === 'skip'
                    ? 'Não foi possível pular a configuração. Tente de novo.'
                    : 'Não foi possível avançar. Verifique sua conexão e tente de novo.',
            );
            showToast(formatUserFacingError(ui), 'error');
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
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
                    onClick={() => runAction('next', onNext)}
                    disabled={!!busy}
                    id="wizard-welcome-next"
                    className={`group w-full py-4 px-6 font-bold text-lg rounded-xl transition-all duration-200 
                               flex items-center justify-center gap-2.5 active:scale-[0.98]
                               disabled:opacity-60 disabled:pointer-events-none
                               ${classes.buttonPrimary}`}
                >
                    {busy === 'next' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Abrindo...
                        </>
                    ) : (
                        <>
                            Começar configuração
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => runAction('skip', onSkip)}
                    disabled={!!busy}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors
                               flex items-center justify-center gap-2 font-medium
                               disabled:opacity-60 disabled:pointer-events-none"
                >
                    {busy === 'skip' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saindo...
                        </>
                    ) : (
                        <>
                            <SkipForward className="w-4 h-4" />
                            Fazer depois
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// Alias retroativo: rota legada /onboarding-wizard referenciava este nome
export { StepWelcome as StepBusinessInfo };
