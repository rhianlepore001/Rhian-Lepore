import React from 'react';
import { Database, Sparkles, CheckCircle } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import type { DataMaturity } from '../../hooks/useDashboardData';

interface DataMaturityBadgeProps {
    maturity: DataMaturity;
    isBeauty?: boolean;
}

function getMaturityLabel(score: number, status: ReturnType<typeof useBrutalTheme>['status'], colors: ReturnType<typeof useBrutalTheme>['colors']): { label: string; color: string } {
    if (score >= 75) return { label: 'Dados Maduros', color: status.success };
    if (score >= 50) return { label: 'Em Crescimento', color: status.warning };
    if (score >= 25) return { label: 'Em Aprendizado', color: 'text-blue-400' };
    return { label: 'Início de Jornada', color: colors.textSecondary };
}

export const DataMaturityBadge: React.FC<DataMaturityBadgeProps> = ({ maturity, isBeauty }) => {
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const { label, color } = getMaturityLabel(maturity.score, status, colors);
    const percentage = Math.min(maturity.score, 100);

    if (maturity.score >= 75) return null;

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${colors.surface} ${colors.border} border backdrop-blur-sm mb-4`}>
            <div className="relative flex-shrink-0 w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle
                        cx="18" cy="18" r="15"
                        fill="none"
                        stroke={accent.hex}
                        strokeWidth="3"
                        strokeDasharray={`${(percentage / 100) * 94.2} 94.2`}
                        strokeLinecap="round"
                        style={{ opacity: 0.7 }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    {maturity.score >= 50
                        ? <Sparkles className={`w-4 h-4 ${colors.textSecondary}`} />
                        : <Database className={`w-4 h-4 ${colors.textSecondary}`} />
                    }
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-xs ${font.mono} uppercase tracking-wider font-bold ${color}`}>{label}</span>
                    <span className={`text-xs ${colors.textSecondary} opacity-50 ${font.mono}`}>{percentage}%</span>
                </div>
                <p className={`text-xs ${colors.textSecondary} opacity-60 mt-0.5 leading-snug`}>
                    {maturity.appointmentsTotal < 5
                        ? `${5 - maturity.appointmentsTotal} agendamentos para desbloquear métricas avançadas.`
                        : maturity.accountDaysOld < 14
                            ? `${14 - maturity.accountDaysOld} dias para comparativos semanais.`
                            : 'Quase lá — seus dados estão amadurecendo.'
                    }
                </p>
            </div>

            <div className="hidden md:flex flex-col gap-1 flex-shrink-0">
                <div className={`flex items-center gap-1 text-xs ${font.mono} ${maturity.appointmentsTotal > 0 ? status.success : `${colors.textSecondary} opacity-30`}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>Receita</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${font.mono} ${maturity.appointmentsTotal >= 5 ? status.success : `${colors.textSecondary} opacity-30`}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>Faltas</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${font.mono} ${maturity.hasPublicBookings ? status.success : `${colors.textSecondary} opacity-30`}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>Vagas</span>
                </div>
            </div>
        </div>
    );
};
