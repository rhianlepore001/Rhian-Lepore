import React from 'react';
import { Database, Sparkles, CheckCircle } from 'lucide-react';
import type { DataMaturity } from '../../hooks/useDashboardData';

interface DataMaturityBadgeProps {
    maturity: DataMaturity;
    isBeauty?: boolean;
}

// Descrição do nível de maturidade conforme o score
function getMaturityLabel(score: number): { label: string; color: string } {
    if (score >= 75) return { label: 'Dados Maduros', color: 'text-green-400' };
    if (score >= 50) return { label: 'Em Crescimento', color: 'text-yellow-400' };
    if (score >= 25) return { label: 'Em Aprendizado', color: 'text-blue-400' };
    return { label: 'Início de Jornada', color: 'text-text-secondary' };
}

export const DataMaturityBadge: React.FC<DataMaturityBadgeProps> = ({ maturity, isBeauty }) => {
    const accentColor = isBeauty ? '#a855f7' : '#F5C242';
    const { label, color } = getMaturityLabel(maturity.score);
    const percentage = Math.min(maturity.score, 100);

    // Não exibir o badge se já está maduro (não incomoda quem já usa o sistema)
    if (maturity.score >= 75) return null;

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm mb-4">
            {/* Ícone com score circular */}
            <div className="relative flex-shrink-0 w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle
                        cx="18" cy="18" r="15"
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="3"
                        strokeDasharray={`${(percentage / 100) * 94.2} 94.2`}
                        strokeLinecap="round"
                        style={{ opacity: 0.7 }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    {maturity.score >= 50
                        ? <Sparkles className="w-4 h-4 text-text-secondary" />
                        : <Database className="w-4 h-4 text-text-secondary" />
                    }
                </div>
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono uppercase tracking-wider font-bold ${color}`}>{label}</span>
                    <span className="text-xs text-text-secondary/50 font-mono">{percentage}%</span>
                </div>
                <p className="text-xs text-text-secondary/60 mt-0.5 leading-snug">
                    {maturity.appointmentsTotal < 5
                        ? `${5 - maturity.appointmentsTotal} agendamentos para desbloquear métricas avançadas.`
                        : maturity.accountDaysOld < 14
                            ? `${14 - maturity.accountDaysOld} dias para comparativos semanais.`
                            : 'Continue usando para refinar os insights.'
                    }
                </p>
            </div>

            {/* Itens desbloqueados */}
            <div className="hidden md:flex flex-col gap-1 flex-shrink-0">
                <div className={`flex items-center gap-1 text-[10px] font-mono ${maturity.appointmentsTotal > 0 ? 'text-green-400' : 'text-text-secondary/30'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>Lucro</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-mono ${maturity.appointmentsTotal >= 5 ? 'text-green-400' : 'text-text-secondary/30'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>No-Shows</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-mono ${maturity.hasPublicBookings ? 'text-green-400' : 'text-text-secondary/30'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>Vagas</span>
                </div>
            </div>
        </div>
    );
};
