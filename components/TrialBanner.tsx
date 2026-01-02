import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

export const TrialBanner: React.FC = () => {
    const { trialDaysRemaining, isTrial, isExpired, subscriptionStatus } = useSubscription();
    const { userType } = useAuth();
    const navigate = useNavigate();

    if (!isTrial && !isExpired) return null;

    const isBeauty = userType === 'beauty';

    // Se estiver expirado, mostramos algo mais urgente
    if (isExpired) {
        return (
            <div className={`w-full h-10 px-4 flex items-center justify-center gap-4 text-white text-xs md:text-sm font-bold z-[60] relative
                ${isBeauty ? 'bg-red-600' : 'bg-red-600'}`}>
                <AlertTriangle className="w-4 h-4" />
                <span>SEU PERÍODO DE TESTE EXPIROU. ASSINE AGORA PARA CONTINUAR USANDO.</span>
                <button
                    onClick={() => navigate('/configuracoes/assinatura')}
                    className="bg-white text-red-600 px-3 py-1 rounded-full text-xs hover:bg-neutral-100 transition-colors flex items-center gap-1"
                >
                    VER PLANOS <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        );
    }

    // Se estiver no trial
    const isCritical = trialDaysRemaining <= 2;

    return (
        <div className={`w-full h-10 px-4 flex items-center justify-center gap-4 text-black text-xs md:text-sm font-bold z-[60] relative transition-all
            ${isCritical
                ? 'bg-yellow-400'
                : (isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold')}`}>
            {isCritical ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
            <span>
                VOCÊ ESTÁ NO PERÍODO DE TESTE GRÁTIS:
                <span className="ml-1 uppercase">
                    {trialDaysRemaining === 0 ? 'Expira hoje' :
                        trialDaysRemaining === 1 ? 'Expira amanhã' :
                            `${trialDaysRemaining} dias restantes`}
                </span>
            </span>
            <button
                onClick={() => navigate('/configuracoes/assinatura')}
                className="bg-black text-white px-3 py-1 rounded-full text-xs hover:bg-neutral-900 transition-colors flex items-center gap-1"
            >
                ASSINAR AGORA <ArrowRight className="w-3 h-3" />
            </button>
        </div>
    );
};
