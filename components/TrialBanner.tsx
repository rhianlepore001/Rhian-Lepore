import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const TrialBanner: React.FC = () => {
    const { trialDaysRemaining, isTrial, isExpired } = useSubscription();
    const { role } = useAuth();
    const { accent, colors } = useBrutalTheme();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('trial-banner-dismissed') === '1');

    // Staff não vê banner de trial (herda plano do dono)
    if (role === 'staff') return null;
    if (!isTrial && !isExpired) return null;

    const goToPlans = () => navigate('/configuracoes/assinatura');

    // Expirado: bloqueante — mantém vermelho, mas em 1 linha compacta
    if (isExpired) {
        return (
<div className="w-full h-10 px-3 md:px-4 flex items-center justify-center gap-2 bg-red-600 text-white text-xs md:text-sm font-bold z-[60] relative whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">Período de teste expirado — assine para continuar usando.</span>
                <button
                    onClick={goToPlans}
                    className="bg-white text-red-600 px-3 py-1 rounded-full text-xs hover:bg-neutral-100 transition-colors flex items-center gap-1 shrink-0"
                >
                    Ver planos <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        );
    }

    const isCritical = trialDaysRemaining <= 2;

    // Dispensável por sessão quando não é crítico (crítico/expirado sempre visível)
    if (dismissed && !isCritical) return null;

    const handleDismiss = () => {
        sessionStorage.setItem('trial-banner-dismissed', '1');
        setDismissed(true);
    };

    const remainingText = trialDaysRemaining === 0 ? 'expira hoje' :
        trialDaysRemaining === 1 ? 'expira amanhã' :
            `${trialDaysRemaining} dias restantes`;

    // Crítico: urgência real — mantém fundo amarelo, 1 linha compacta
    if (isCritical) {
        return (
            <div className="w-full h-10 px-3 md:px-4 flex items-center justify-center gap-2 bg-yellow-400 text-black text-xs md:text-sm font-bold z-[60] relative whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                <span className="truncate">Seu teste {remainingText}.</span>
                <button
                    onClick={goToPlans}
                    className="bg-black text-white px-3 py-1 rounded-full text-xs hover:bg-neutral-900 transition-colors flex items-center gap-1 shrink-0"
                >
                    Assinar <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        );
    }

    // Trial normal: barra neutra discreta — informa sem competir com o conteúdo
    return (
        <div className={`w-full h-10 px-3 md:px-4 flex items-center justify-center gap-2 text-xs z-[60] relative whitespace-nowrap border-b ${colors.divider} bg-[var(--color-card)] ${colors.textSecondary}`}>
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${accent.text}`} />
            <span className="truncate">
                Teste grátis · <span className={`font-bold ${colors.text}`}>{remainingText}</span>
            </span>
            <button
                onClick={goToPlans}
                className={`${accent.text} font-bold hover:underline transition-all flex items-center gap-0.5 shrink-0`}
            >
                Assinar <ArrowRight className="w-3 h-3" />
            </button>
            <button
                onClick={handleDismiss}
                aria-label="Dispensar aviso de período de teste"
                className={`p-1 rounded-full hover:bg-[var(--color-card-hover)] transition-colors shrink-0 ${colors.textSecondary}`}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
