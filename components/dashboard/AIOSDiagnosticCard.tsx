import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { Sparkles, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useAIOSDiagnostic } from '../../hooks/useAIOSDiagnostic';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';

interface AIOSDiagnosticCardProps {
    isBeauty?: boolean;
}

export const AIOSDiagnosticCard: React.FC<AIOSDiagnosticCardProps> = ({ isBeauty }) => {
    const { aiosEnabled, region } = useAuth();
    const { diagnostic, loading } = useAIOSDiagnostic();

    if (!aiosEnabled || loading || !diagnostic || diagnostic.recoverable_revenue <= 0) {
        return null;
    }

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';

    return (
        <div className="animate-in fade-in zoom-in duration-500 mb-6">
            <BrutalCard
                id="aios-diagnostic-alert"
                className={`border-2 ${isBeauty ? 'border-beauty-neon/50 shadow-neon' : 'border-accent-gold/50 shadow-heavy'}`}
                noPadding
            >
                <div className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className={`${accentBg} p-4 rounded-xl text-black`}>
                        <Sparkles className="w-8 h-8" />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl md:text-2xl font-heading text-white mb-1 flex items-center justify-center md:justify-start gap-2">
                            Radar de Lucro Ativado
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-white/10 rounded uppercase tracking-widest opacity-70">AIOS 2.0</span>
                        </h3>
                        <p className="text-text-secondary text-sm md:text-base max-w-xl">
                            Detectamos <span className={`${accentText} font-bold`}>{diagnostic.at_risk_clients.length} clientes habituais</span> que não retornam há mais de 30 dias.
                            Você está deixando de ganhar aproximadamente <span className="text-white font-bold">{formatCurrency(diagnostic.recoverable_revenue, region)}</span> este mês.
                        </p>
                    </div>

                    <button
                        className={`${accentBg} text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg w-full md:w-auto justify-center`}
                        onClick={() => window.location.href = '/crm'}
                    >
                        Recuperar Agora
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-white/5 p-3 flex justify-around border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-tighter text-text-secondary">
                        <Users className="w-3 h-3" />
                        <span>{diagnostic.at_risk_clients.length} Reativações Pendentes</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-tighter text-text-secondary">
                        <TrendingUp className="w-3 h-3" />
                        <span>Ticket Médio: {formatCurrency(diagnostic.recoverable_revenue / diagnostic.at_risk_clients.length, region)}</span>
                    </div>
                </div>
            </BrutalCard>
        </div>
    );
};
