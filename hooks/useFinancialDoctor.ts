import { useMemo } from 'react';
import type { DataMaturity, FinancialDoctorData } from './useDashboardData';

export interface FinancialInsight {
    id: string;
    category: 'growth' | 'risk' | 'opportunity' | 'achievement';
    title: string;
    description: string;
    action?: string;
    impact: 'high' | 'medium' | 'low';
    value?: string; // valor monetário ou percentual relevante
}

// Calcula o score de saúde de 0 a 100
function calculateHealthScore(params: {
    weeklyGrowth: number;
    churnRiskCount: number;
    repeatClientRate: number;
    completedThisMonth: number;
    currentMonthRevenue: number;
    monthlyGoal: number;
    dataMaturityScore: number;
}): number {
    const { weeklyGrowth, churnRiskCount, repeatClientRate, completedThisMonth, currentMonthRevenue, monthlyGoal, dataMaturityScore } = params;

    if (dataMaturityScore < 10) return 0; // sem dados suficientes

    let score = 50; // base neutra

    // Crescimento semanal: até +20 points
    if (weeklyGrowth > 10) score += 20;
    else if (weeklyGrowth > 0) score += 10;
    else if (weeklyGrowth < -10) score -= 20;
    else if (weeklyGrowth < 0) score -= 10;

    // Taxa de retorno: até +15 points
    if (repeatClientRate >= 50) score += 15;
    else if (repeatClientRate >= 25) score += 8;
    else if (repeatClientRate < 10) score -= 5;

    // Risco de churn: penalidade
    if (churnRiskCount >= 5) score -= 15;
    else if (churnRiskCount >= 2) score -= 8;

    // Progresso na meta mensal: até +15 points
    const goalProgress = monthlyGoal > 0 ? (currentMonthRevenue / monthlyGoal) * 100 : 0;
    if (goalProgress >= 100) score += 15;
    else if (goalProgress >= 70) score += 8;
    else if (goalProgress >= 50) score += 4;
    else if (goalProgress < 25) score -= 5;

    // Volume de serviços este mês
    if (completedThisMonth >= 30) score += 5;
    else if (completedThisMonth >= 15) score += 2;

    return Math.max(0, Math.min(100, Math.round(score)));
}

// Gera insights contextuais baseados nos dados reais
function generateInsights(params: {
    weeklyGrowth: number;
    churnRiskCount: number;
    repeatClientRate: number;
    avgTicket: number;
    topService: string;
    completedThisMonth: number;
    currentMonthRevenue: number;
    monthlyGoal: number;
    campaignsSent: number;
    dataMaturity: DataMaturity;
}): FinancialInsight[] {
    const insights: FinancialInsight[] = [];
    const {
        weeklyGrowth, churnRiskCount, repeatClientRate, avgTicket,
        topService, completedThisMonth, currentMonthRevenue,
        monthlyGoal, campaignsSent, dataMaturity
    } = params;

    const goalProgress = monthlyGoal > 0 ? (currentMonthRevenue / monthlyGoal) * 100 : 0;
    const currFmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

    // Insight de churn risk (alta prioridade)
    if (churnRiskCount >= 2 && dataMaturity.score >= 25) {
        insights.push({
            id: 'churn-risk',
            category: 'risk',
            title: `${churnRiskCount} clientes sumidos`,
            description: `${churnRiskCount} clientes frequentes não voltam há mais de 30 dias. Em barbeiros, isso representa alta rotatividade. Reconquistá-los custa 5x menos que captar novos.`,
            action: 'Criar campanha de reativação no CRM',
            impact: 'high',
            value: `${churnRiskCount} clientes`
        });
    }

    // Insight de crescimento semanal positivo
    if (weeklyGrowth > 5 && dataMaturity.accountDaysOld >= 14) {
        insights.push({
            id: 'growth-positive',
            category: 'achievement',
            title: `Crescendo ${weeklyGrowth}% esta semana`,
            description: 'Semana acima da média. Mantenha o calendário de marketing ativo para sustentar o ritmo.',
            impact: 'medium',
            value: `+${weeklyGrowth}%`
        });
    } else if (weeklyGrowth < -10 && dataMaturity.accountDaysOld >= 14) {
        insights.push({
            id: 'growth-negative',
            category: 'risk',
            title: `Faturamento caiu ${Math.abs(weeklyGrowth)}%`,
            description: 'Semana abaixo da anterior. Considere uma promoção relâmpago para preencher horários vazios.',
            action: 'Gerar conteúdo de oferta no Marketing',
            impact: 'high',
            value: `${weeklyGrowth}%`
        });
    }

    // Insight de meta mensal
    if (goalProgress >= 100) {
        insights.push({
            id: 'goal-achieved',
            category: 'achievement',
            title: 'Meta do mês atingida! 🏆',
            description: `Você já gerou ${currFmt(currentMonthRevenue)}, superando sua meta de ${currFmt(monthlyGoal)}. Pense em aumentar a meta para o próximo mês.`,
            impact: 'high',
            value: currFmt(currentMonthRevenue)
        });
    } else if (goalProgress >= 70) {
        const remaining = monthlyGoal - currentMonthRevenue;
        insights.push({
            id: 'goal-close',
            category: 'opportunity',
            title: `Faltam ${currFmt(remaining)} para a meta`,
            description: `Você está a ${Math.round(100 - goalProgress)}% da meta. Alguns agendamentos extras esta semana já te colocam lá.`,
            action: 'Compartilhar link de agendamento',
            impact: 'medium',
            value: `${Math.round(goalProgress)}%`
        });
    } else if (goalProgress < 30 && dataMaturity.accountDaysOld >= 14) {
        insights.push({
            id: 'goal-behind',
            category: 'risk',
            title: 'Meta do mês em risco',
            description: `Apenas ${Math.round(goalProgress)}% da meta atingida. Uma campanha de reativação agora pode reverter o quadro antes do fechamento do mês.`,
            action: 'Ver clientes inativos no CRM',
            impact: 'high',
            value: `${Math.round(goalProgress)}%`
        });
    }

    // Insight de taxa de retorno
    if (repeatClientRate < 20 && dataMaturity.appointmentsTotal >= 10) {
        insights.push({
            id: 'low-repeat-rate',
            category: 'opportunity',
            title: 'Poucos clientes voltando',
            description: `Apenas ${repeatClientRate}% dos seus clientes retornam. A média saudável para barbearias é 40%+. Campanhas de retenção podem dobrar essa taxa.`,
            action: 'Criar campanha de fidelidade',
            impact: 'high',
            value: `${repeatClientRate}%`
        });
    } else if (repeatClientRate >= 50) {
        insights.push({
            id: 'high-repeat-rate',
            category: 'achievement',
            title: `${repeatClientRate}% de fidelidade`,
            description: 'Taxa de retorno excelente. Seus clientes são fãs! Explore upselling de serviços premium.',
            impact: 'low',
            value: `${repeatClientRate}%`
        });
    }

    // Insight de ticket médio baixo
    if (avgTicket > 0 && avgTicket < 50 && dataMaturity.appointmentsTotal >= 10) {
        insights.push({
            id: 'low-avg-ticket',
            category: 'opportunity',
            title: 'Ticket médio pode crescer',
            description: `Seu ticket médio é ${currFmt(avgTicket)}. Adicionar serviços complementares (hidratação, barba) ao pacote mais popular pode aumentar isso em 30%.`,
            action: `Upsell no serviço "${topService}"`,
            impact: 'medium',
            value: currFmt(avgTicket)
        });
    }

    // Insight de campanhas zeradas
    if (campaignsSent === 0 && dataMaturity.appointmentsTotal >= 5) {
        insights.push({
            id: 'no-campaigns',
            category: 'opportunity',
            title: 'IA ociosa por falta de campanhas',
            description: 'O AgenX pode reativar clientes inativos automaticamente via WhatsApp, mas ainda nenhuma campanha foi enviada. Ative o piloto automático.',
            action: 'Ir para Marketing → Nova Campanha',
            impact: 'high'
        });
    }

    // Insight do serviço mais popular
    if (topService && completedThisMonth >= 10) {
        insights.push({
            id: 'top-service',
            category: 'opportunity',
            title: `"${topService}" em destaque`,
            description: `Seu serviço mais agendado este mês. Crie conteúdo específico para ele no Instagram para atrair mais clientes similares.`,
            action: 'Gerar post no Marketing',
            impact: 'low',
            value: topService
        });
    }

    // Ordenar por impacto: high > medium > low
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]).slice(0, 5);
}

export function useFinancialDoctor(params: {
    weeklyGrowth: number;
    currentMonthRevenue: number;
    monthlyGoal: number;
    campaignsSent: number;
    dataMaturity: DataMaturity;
    financialDoctor: FinancialDoctorData;
    completedThisMonth: number;
}) {
    const { weeklyGrowth, currentMonthRevenue, monthlyGoal, campaignsSent, dataMaturity, financialDoctor, completedThisMonth } = params;

    const healthScore = useMemo(() => calculateHealthScore({
        weeklyGrowth,
        churnRiskCount: financialDoctor.churnRiskCount,
        repeatClientRate: financialDoctor.repeatClientRate,
        completedThisMonth,
        currentMonthRevenue,
        monthlyGoal,
        dataMaturityScore: dataMaturity.score
    }), [weeklyGrowth, financialDoctor, completedThisMonth, currentMonthRevenue, monthlyGoal, dataMaturity.score]);

    const insights = useMemo(() => generateInsights({
        weeklyGrowth,
        churnRiskCount: financialDoctor.churnRiskCount,
        repeatClientRate: financialDoctor.repeatClientRate,
        avgTicket: financialDoctor.avgTicket,
        topService: financialDoctor.topService,
        completedThisMonth,
        currentMonthRevenue,
        monthlyGoal,
        campaignsSent,
        dataMaturity
    }), [weeklyGrowth, financialDoctor, completedThisMonth, currentMonthRevenue, monthlyGoal, campaignsSent, dataMaturity]);

    const healthLabel = useMemo(() => {
        if (dataMaturity.score < 10) return { label: 'Aguardando dados', color: 'text-text-secondary' };
        if (healthScore >= 80) return { label: 'Saúde Excelente', color: 'text-green-400' };
        if (healthScore >= 60) return { label: 'Saúde Boa', color: 'text-blue-400' };
        if (healthScore >= 40) return { label: 'Atenção Necessária', color: 'text-yellow-400' };
        return { label: 'Intervenção Urgente', color: 'text-red-400' };
    }, [healthScore, dataMaturity.score]);

    return { healthScore, insights, healthLabel, hasData: dataMaturity.score >= 10 };
}
