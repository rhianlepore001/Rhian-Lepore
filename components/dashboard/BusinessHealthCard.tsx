import React from 'react';
import { TrendingUp, TrendingDown, Users, Star, Scissors, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { FinancialDoctorData } from '../../hooks/useDashboardData';

interface BusinessHealthCardProps {
    data: FinancialDoctorData;
    isBeauty: boolean;
    currencySymbol?: string;
}

interface HealthItem {
    label: string;
    value: string;
    icon: React.ElementType;
    sentiment: 'good' | 'warning' | 'neutral';
    detail?: string;
}

function buildHealthItems(data: FinancialDoctorData, currencySymbol: string): HealthItem[] | null {
    if (!data.avgTicket && !data.topService && !data.repeatClientRate && !data.churnRiskCount) {
        return null;
    }

    const items: HealthItem[] = [];

    if (data.avgTicket > 0) {
        items.push({
            label: 'Valor médio por atendimento',
            value: `${currencySymbol} ${data.avgTicket.toFixed(2).replace('.', ',')}`,
            icon: TrendingUp,
            sentiment: 'neutral',
        });
    }

    if (data.repeatClientRate > 0) {
        const isGood = data.repeatClientRate >= 50;
        items.push({
            label: 'Clientes que voltam',
            value: `${Math.round(data.repeatClientRate)}%`,
            icon: isGood ? TrendingUp : TrendingDown,
            sentiment: isGood ? 'good' : 'warning',
            detail: isGood
                ? 'Mais da metade dos seus clientes já voltou'
                : 'Menos da metade voltou — vale tentar chamar quem sumiu',
        });
    }

    if (data.churnRiskCount > 0) {
        items.push({
            label: 'Clientes que não apareceram',
            value: `${data.churnRiskCount} ${data.churnRiskCount === 1 ? 'cliente' : 'clientes'}`,
            icon: Users,
            sentiment: 'warning',
            detail: 'Não vêm há mais de 30 dias — uma mensagem pode trazê-los de volta',
        });
    }

    if (data.topService) {
        items.push({
            label: 'Serviço mais pedido',
            value: data.topService,
            icon: Scissors,
            sentiment: 'neutral',
        });
    }

    return items.length >= 2 ? items : null;
}

export const BusinessHealthCard: React.FC<BusinessHealthCardProps> = ({
    data,
    isBeauty: _isBeauty,
    currencySymbol = 'R$',
}) => {
    const { accent, colors, status } = useBrutalTheme();
    const items = buildHealthItems(data, currencySymbol);

    const sentimentColor: Record<HealthItem['sentiment'], string> = {
        good: status.success,
        warning: status.warning,
        neutral: accent.text,
    };

    const sentimentBorder: Record<HealthItem['sentiment'], string> = {
        good: status.successBorder,
        warning: status.warningBorder,
        neutral: accent.borderDim,
    };

    const sentimentBg: Record<HealthItem['sentiment'], string> = {
        good: status.successBg,
        warning: status.warningBg,
        neutral: colors.surface,
    };

    if (!items) {
        return (
            <Card variant="outlined" className={`${accent.borderDim}`}>
                <div className="flex items-center gap-2.5 mb-4">
                    <div className={`p-2 rounded-xl ${accent.bgDim}`}>
                        <Clock className={`w-4 h-4 ${accent.text}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase ${colors.textMuted} tracking-widest`}>
                        Saúde do negócio
                    </span>
                </div>
                <p className={`text-sm ${colors.textSecondary}`}>
                    Seus indicadores aparecem após o primeiro mês.
                </p>
                <p className={`text-[11px] ${colors.textMuted} mt-1 leading-relaxed`}>
                    Continue registrando — os dados já estão sendo coletados.
                </p>
            </Card>
        );
    }

    const sentimentScore: Record<HealthItem['sentiment'], number> = {
        good: 100,
        neutral: 60,
        warning: 30,
    };
    const totalScore = Math.round(
        items.reduce((acc, it) => acc + sentimentScore[it.sentiment], 0) / items.length
    );

    const scoreBorderClass =
        totalScore >= 70
            ? sentimentBorder.good
            : totalScore < 40
              ? sentimentBorder.warning
              : '';

    const segmentColor =
        totalScore >= 70
            ? status.success
            : totalScore < 40
              ? status.danger
              : status.warning;

    const filledSegments = Math.round((totalScore / 100) * 5);

    return (
        <Card variant="outlined" className={`${accent.borderDim} ${scoreBorderClass} transition-all duration-300`}>
            {/* Cabeçalho */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className={`p-2 rounded-xl ${accent.bgDim}`}>
                    <Star className={`w-4 h-4 ${accent.text}`} />
                </div>
                <div className="flex-1">
                    <span className={`text-xs font-bold uppercase ${colors.textMuted} tracking-widest`}>
                        Saúde do negócio
                    </span>
                    <div className="flex gap-1 mt-2" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`flex-1 h-1 rounded-full transition-colors duration-500 ${
                                    idx < filledSegments ? segmentColor.replace('text-', 'bg-') : colors.divider.replace('border-', 'bg-').replace('/8', '/10').replace('/5', '/10')
                                }`}
                            />
                        ))}
                    </div>
                </div>
                <span className={`text-lg font-bold font-mono ${segmentColor}`}>{totalScore}</span>
            </div>

            {/* Lista de insights */}
            <div className="space-y-3">
                {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={idx}
                            className={`flex items-start justify-between gap-3 p-3 rounded-xl ${sentimentBg[item.sentiment]} border ${sentimentBorder[item.sentiment]} transition-all duration-200`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-1.5 rounded-lg ${sentimentBg[item.sentiment]} shrink-0`}>
                                    <Icon className={`w-3.5 h-3.5 ${sentimentColor[item.sentiment]}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs ${colors.textSecondary} font-medium truncate`}>
                                        {item.label}
                                    </p>
                                    {item.detail && (
                                        <p className={`text-[10px] ${colors.textMuted} mt-0.5 leading-relaxed`}>
                                            {item.detail}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`text-sm font-bold font-mono shrink-0 ${sentimentColor[item.sentiment]}`}>
                                {item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
