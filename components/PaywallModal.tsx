import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Lock, Sparkles, LogOut, ArrowRight } from 'lucide-react';

export const PaywallModal: React.FC = () => {
    const { isExpired, isLoading } = useSubscription();
    const { logout, role } = useAuth();
    const navigate = useNavigate();
    const { isBeauty, accent, colors } = useBrutalTheme();

    // Staff não vê paywall (herda plano do dono)
    if (role === 'staff') return null;
    // Se estiver carregando ou não estiver expirado, não mostra nada
    if (isLoading || !isExpired) return null;

    return (
        <Modal
            open
            onClose={() => {}}
            preventClose
            showCloseButton={false}
            size="md"
        >
            <div className="relative overflow-hidden text-center py-4">
                {/* Decorative Background */}
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 pointer-events-none ${accent.text}`}>
                    <Lock className="w-full h-full" />
                </div>

                <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${accent.bgDim} ${accent.text}`}>
                    <Lock className="w-10 h-10" />
                </div>

                <h2 className={`text-2xl md:text-3xl font-heading uppercase mb-4 leading-tight ${colors.text}`}>
                    Seu período de teste <br />
                    <span className={accent.text}>expirou</span>
                </h2>

                <p className={`text-sm md:text-base mb-8 max-w-sm mx-auto ${colors.textSecondary}`}>
                    Esperamos que você tenha aproveitado esses 7 dias! Assine agora para continuar usando todas as ferramentas e não perder seus agendamentos.
                </p>

                <div className="space-y-4">
                    <Button
                        variant="primary"
                        fullWidth
                        iconRight={<ArrowRight className="w-4 h-4" />}
                        onClick={() => navigate('/configuracoes/assinatura')}
                    >
                        VER PLANOS E ASSINAR
                    </Button>

                    <button
                        onClick={logout}
                        className={`${colors.textMuted} hover:text-theme-text transition-colors text-xs uppercase font-mono flex items-center gap-2 mx-auto py-2 min-h-[44px]`}
                    >
                        <LogOut className="w-4 h-4" /> Sair da conta
                    </button>
                </div>

                <div className={`mt-8 pt-8 border-t ${colors.divider} flex items-center justify-center gap-4 text-xs ${colors.textMuted} uppercase font-mono tracking-widest`}>
                    <Sparkles className="w-3 h-3" /> BE {isBeauty ? 'BEAUTY' : 'BARBER'} OS <Sparkles className="w-3 h-3" />
                </div>
            </div>
        </Modal>
    );
};
