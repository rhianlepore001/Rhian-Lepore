import React from 'react';
import { TrendingUp, TrendingDown, Users, Star, Scissors, Clock } from 'lucide-react';
import { BrutalCard } from '../BrutalCard';
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

// Retorna null se não há dados suficientes para exibir o card
function buildHealthItems(data: FinancialDoctorData, currencySymbol: string): HealthItem[] | null {
    // Guard: sem dados mínimos, não exibe nada
    if (!data.avgTicket && !data.topService && !data.repeatClientRate && !data.churnRiskCount) {
        return null;
    }

    const items: HealthItem[] = [];

    // Ticket médio por atendimento
    if (data.avgTicket > 0) {
        items.push({
            label: 'Valor médio por atendimento',
            value: `${currencySymbol} ${data.avgTicket.toFixed(2).replace('.', ',')}`,
            icon: TrendingUp,
            sentiment: 'neutral',
        });
    }

    // Clientes fiéis (voltam com frequência)
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

    // Clientes sumidos (risco de perda)
    if (data.churnRiskCount > 0) {
        items.push({
            label: 'Clientes que não apareceram',
            value: `${data.churnRiskCount} ${data.churnRiskCount === 1 ? 'cliente' : 'clientes'}`,
            icon: Users,
            sentiment: 'warning',
            detail: 'Não vêm há mais de 30 dias — uma mensagem pode trazê-los de volta',
        });
    }

    // Serviço mais pedido
    if (data.topService) {
        items.push({
            label: 'Serviço mais pedido',
            value: data.topService,
            icon: Scissors,
            sentiment: 'neutral',
        });
    }

    // Se depois dos guards ainda não tiver nada relevante, retorna null
    return items.length >= 2 ? items : null;
}

export const BusinessHealthCard: React.FC<BusinessHealthCardProps> = ({
    data,
    isBeauty,
    currencySymbol = 'R$',
}) => {
    const items = buildHealthItems(data, currencySymbol);

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';

    const sentimentColor: Record<HealthItem['sentiment'], string> = {
        good: 'text-green-400',
        warning: 'text-yellow-400',
        neutral: accentText,
    };

    return (
        <BrutalCard className={`brutal-card-enhanced ${accentBorder}`}>
            {/* Cabeçalho */}
            <div className="flex items-center gap-2 mb-5">
                <Star className={`w-4 h-4 ${accentText}`} />
                <span className="text-xs font-bold uppercase text-text-secondary tracking-widest">
                    Saúde do negócio
                </span>
            </div>

            {!items ? (
                /* Estado vazio — dados ainda amadurecendo */
                <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <Clock className="w-7 h-7 text-text-secondary/40" />
                    <p className="text-xs text-text-secondary/60 font-mono leading-relaxed">
                        Seus indicadores aparecem após o primeiro mês de atendimentos registrados.
                    </p>
                    <p className="text-[10px] text-text-secondary/40 font-mono">
                        Continue registrando — os dados já estão sendo coletados.
                    </p>
                </div>
            ) : (
                /* Lista de insights */
                <div className="space-y-4">
                    {items.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div key={idx} className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Icon className={`w-4 h-4 shrink-0 ${sentimentColor[item.sentiment]}`} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-text-secondary font-mono truncate">
                                            {item.label}
                                        </p>
                                        {item.detail && (
                                            <p className="text-[10px] text-text-secondary/60 font-mono mt-0.5 leading-relaxed">
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
            )}
        </BrutalCard>
    );
};
