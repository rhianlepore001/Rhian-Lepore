import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, Lightbulb, ChevronRight, Activity, Stethoscope } from 'lucide-react';
import { useFinancialDoctor, type FinancialInsight } from '../../hooks/useFinancialDoctor';
import type { DataMaturity, FinancialDoctorData } from '../../hooks/useDashboardData';

interface FinancialDoctorPanelProps {
    weeklyGrowth: number;
    currentMonthRevenue: number;
    monthlyGoal: number;
    campaignsSent: number;
    dataMaturity: DataMaturity;
    financialDoctor: FinancialDoctorData;
    completedThisMonth: number;
    isBeauty?: boolean;
    onActionClick?: (action: string) => void;
}

const CATEGORY_CONFIG = {
    risk: {
        icon: AlertTriangle,
        bg: 'bg-red-900/20 border-red-500/20',
        iconColor: 'text-red-400',
        badgeColor: 'bg-red-900/40 text-red-300',
        badgeLabel: 'Risco'
    },
    opportunity: {
        icon: Lightbulb,
        bg: 'bg-yellow-900/20 border-yellow-500/20',
        iconColor: 'text-yellow-400',
        badgeColor: 'bg-yellow-900/40 text-yellow-300',
        badgeLabel: 'Oportunidade'
    },
    achievement: {
        icon: Trophy,
        bg: 'bg-green-900/20 border-green-500/20',
        iconColor: 'text-green-400',
        badgeColor: 'bg-green-900/40 text-green-300',
        badgeLabel: 'Conquista'
    },
    growth: {
        icon: TrendingUp,
        bg: 'bg-blue-900/20 border-blue-500/20',
        iconColor: 'text-blue-400',
        badgeColor: 'bg-blue-900/40 text-blue-300',
        badgeLabel: 'Crescimento'
    }
};

const InsightCard: React.FC<{ insight: FinancialInsight; index: number; onActionClick?: (action: string) => void }> = ({
    insight, index, onActionClick
}) => {
    const config = CATEGORY_CONFIG[insight.category];
    const Icon = config.icon;

    return (
        <div
            className={`flex gap-3 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] cursor-default ${config.bg}`}
            style={{ animationDelay: `${index * 80}ms` }}
        >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-white font-heading leading-snug">{insight.title}</p>
                    {insight.value && (
                        <span className="text-xs font-mono text-text-secondary whitespace-nowrap">{insight.value}</span>
                    )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-2">{insight.description}</p>
                {insight.action && onActionClick && (
                    <button
                        onClick={() => onActionClick(insight.action!)}
                        className={`flex items-center gap-1 text-xs font-mono font-semibold ${config.iconColor} hover:opacity-80 transition-opacity`}
                    >
                        <span>{insight.action}</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
};

// Gauge circular SVG do score de saúde
const HealthGauge: React.FC<{ score: number; label: string; color: string; isBeauty?: boolean }> = ({
    score, label, color, isBeauty
}) => {
    const accentColor = isBeauty ? '#a855f7' : '#F5C242';
    const radius = 40;
    const circumference = Math.PI * radius; // meia circunferência
    const progress = (score / 100) * circumference;

    const getScoreColor = () => {
        if (score >= 80) return '#4ade80'; // verde
        if (score >= 60) return '#60a5fa'; // azul
        if (score >= 40) return '#facc15'; // amarelo
        return '#f87171'; // vermelho
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-14">
                <svg viewBox="0 0 100 60" className="w-24 h-14 overflow-visible">
                    {/* Track */}
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
                    {/* Progress */}
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke={getScoreColor()}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${progress} ${circumference}`}
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
                    <span className="text-2xl font-bold font-heading text-white leading-none">{score}</span>
                </div>
            </div>
            <span className={`text-xs font-mono font-bold ${color}`}>{label}</span>
        </div>
    );
};

export const FinancialDoctorPanel: React.FC<FinancialDoctorPanelProps> = ({
    weeklyGrowth,
    currentMonthRevenue,
    monthlyGoal,
    campaignsSent,
    dataMaturity,
    financialDoctor,
    completedThisMonth,
    isBeauty,
    onActionClick
}) => {
    const { healthScore, insights, healthLabel, hasData } = useFinancialDoctor({
        weeklyGrowth,
        currentMonthRevenue,
        monthlyGoal,
        campaignsSent,
        dataMaturity,
        financialDoctor,
        completedThisMonth
    });

    const [expanded, setExpanded] = useState(true);

    return (
        <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-accent-gold" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold font-heading text-white">Doutor Financeiro</h3>
                        <p className="text-[11px] text-text-secondary font-mono">
                            {hasData ? `${insights.length} insights • Atualizado agora` : 'Aguardando dados suficientes'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasData && (
                        <Activity className={`w-4 h-4 ${healthLabel.color}`} />
                    )}
                    <ChevronRight
                        className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </button>

            {/* Body */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4">
                    {/* Score + KPIs */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
                        <HealthGauge
                            score={hasData ? healthScore : 0}
                            label={healthLabel.label}
                            color={healthLabel.color}
                            isBeauty={isBeauty}
                        />
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-0.5">Ticket Médio</p>
                                <p className="text-base font-bold font-heading text-white">
                                    {hasData ? `R$ ${financialDoctor.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-0.5">Fidelidade</p>
                                <p className="text-base font-bold font-heading text-white">
                                    {hasData ? `${financialDoctor.repeatClientRate}%` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-0.5">Crescimento</p>
                                <div className={`flex items-center gap-1 text-sm font-bold font-heading ${weeklyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {weeklyGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    <span>{hasData ? `${weeklyGrowth >= 0 ? '+' : ''}${weeklyGrowth}%` : '—'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-0.5">Serviço Top</p>
                                <p className="text-sm font-bold font-heading text-white truncate">
                                    {(hasData && financialDoctor.topService) ? financialDoctor.topService : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Insights */}
                    {!hasData ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <Stethoscope className="w-8 h-8 text-text-secondary/30" />
                            <p className="text-sm text-text-secondary/60 max-w-xs">
                                O Doutor precisa de dados para te ajudar. Complete pelo menos 5 agendamentos para ativar os insights.
                            </p>
                        </div>
                    ) : insights.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <Trophy className="w-8 h-8 text-green-400/50" />
                            <p className="text-sm text-text-secondary/60">Tudo parece ótimo por aqui! Continue assim.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {insights.map((insight, index) => (
                                <InsightCard
                                    key={insight.id}
                                    insight={insight}
                                    index={index}
                                    onActionClick={onActionClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
