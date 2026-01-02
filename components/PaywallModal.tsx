import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { Lock, Sparkles, LogOut, ArrowRight } from 'lucide-react';

export const PaywallModal: React.FC = () => {
    const { isExpired, isLoading } = useSubscription();
    const { userType, logout } = useAuth();
    const navigate = useNavigate();

    // Se estiver carregando ou não estiver expirado, não mostra nada
    if (isLoading || !isExpired) return null;

    const isBeauty = userType === 'beauty';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            {/* Content */}
            <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-300">
                <BrutalCard forceTheme={isBeauty ? 'beauty' : 'barber'} className="relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}>
                        <Lock className="w-full h-full" />
                    </div>

                    <div className="text-center py-6">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
                            ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon' : 'bg-accent-gold/10 text-accent-gold'}`}>
                            <Lock className="w-10 h-10" />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-heading text-white uppercase mb-4 leading-tight">
                            Seu período de teste <br />
                            <span className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}>expirou</span>
                        </h2>

                        <p className="text-neutral-400 text-sm md:text-base mb-8 max-w-sm mx-auto">
                            Esperamos que você tenha aproveitado esses 7 dias! Assine agora para continuar usando todas as ferramentas e não perder seus agendamentos.
                        </p>

                        <div className="space-y-4">
                            <BrutalButton
                                forceTheme={isBeauty ? 'beauty' : 'barber'}
                                variant="primary"
                                onClick={() => navigate('/configuracoes/assinatura')}
                                className="w-full justify-center"
                            >
                                VER PLANOS E ASSINAR <ArrowRight className="ml-2 w-4 h-4" />
                            </BrutalButton>

                            <button
                                onClick={logout}
                                className="text-neutral-500 hover:text-white transition-colors text-xs uppercase font-mono flex items-center gap-2 mx-auto py-2"
                            >
                                <LogOut className="w-4 h-4" /> Sair da conta
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-4 text-[10px] text-neutral-600 uppercase font-mono tracking-widest">
                            <Sparkles className="w-3 h-3" /> BE {isBeauty ? 'BEAUTY' : 'BARBER'} OS <Sparkles className="w-3 h-3" />
                        </div>
                    </div>
                </BrutalCard>
            </div>
        </div>
    );
};
