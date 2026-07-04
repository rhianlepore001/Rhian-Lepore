import React from 'react';
import { Sun, Moon, CloudSun, Calendar, TrendingUp, Users, Target, ArrowRight } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { formatCurrency, Region } from '../../utils/formatters';

interface ComandoDoDiaProps {
    firstName: string;
    appointmentsToday: number;
    expectedRevenue: number;
    monthlyGoal: number;
    currentMonthRevenue: number;
    churnRiskCount: number;
    isBeauty: boolean;
    currencyRegion: Region;
    onNavigate: (path: string) => void;
}

function getGreeting(accentText: string): { text: string; icon: React.ReactNode } {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', icon: <Sun className={`w-5 h-5 ${accentText}`} /> };
    if (hour < 18) return { text: 'Boa tarde', icon: <CloudSun className={`w-5 h-5 ${accentText}`} /> };
    return { text: 'Boa noite', icon: <Moon className={`w-5 h-5 ${accentText}`} /> };
}

function getDayMessage(appointmentsToday: number, churnRiskCount: number, goalPercent: number): string {
    if (appointmentsToday === 0 && churnRiskCount > 0) {
        return `Dia tranquilo na agenda. Que tal chamar ${churnRiskCount > 3 ? 'alguns' : churnRiskCount} clientes que sumiram?`;
    }
    if (appointmentsToday === 0) {
        return 'Agenda livre hoje. Bom momento para organizar serviços ou compartilhar seu link de agendamento.';
    }
    if (appointmentsToday >= 8) {
        return 'Dia cheio! Foco total nos atendimentos. Você está mandando bem.';
    }
    if (goalPercent >= 90) {
        return `Quase lá! Falta pouco para bater a meta do mês. Hoje conta muito.`;
    }
    if (churnRiskCount > 5) {
        return `Você tem ${churnRiskCount} clientes para reconquistar. Entre um atendimento e outro, mande uma mensagem.`;
    }
    return `Você tem ${appointmentsToday} atendimento${appointmentsToday > 1 ? 's' : ''} hoje. Vamos faturar!`;
}

export const ComandoDoDia: React.FC<ComandoDoDiaProps> = ({
    firstName,
    appointmentsToday,
    expectedRevenue,
    monthlyGoal,
    currentMonthRevenue,
    churnRiskCount,
    isBeauty: _isBeauty,
    currencyRegion,
    onNavigate
}) => {
    const { accent, colors } = useBrutalTheme();
    const greeting = getGreeting(accent.text);
    const goalPercent = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;
    const message = getDayMessage(appointmentsToday, churnRiskCount, goalPercent);

    const quickActions = [
        appointmentsToday > 0 && {
            icon: <Calendar className="w-4 h-4" />,
            label: `${appointmentsToday} atendimento${appointmentsToday > 1 ? 's' : ''} hoje`,
            detail: expectedRevenue > 0 ? `~${formatCurrency(expectedRevenue, currencyRegion)}` : undefined,
            action: () => onNavigate('/agenda')
        },
        churnRiskCount > 0 && {
            icon: <Users className="w-4 h-4" />,
            label: `${churnRiskCount} clientes para reconquistar`,
            action: () => onNavigate('/marketing')
        },
        monthlyGoal > 0 && {
            icon: <Target className="w-4 h-4" />,
            label: `Meta: ${goalPercent}% atingida`,
            detail: formatCurrency(monthlyGoal - currentMonthRevenue, currencyRegion) + ' restante',
            action: undefined
        }
    ].filter(Boolean) as { icon: React.ReactNode; label: string; detail?: string; action?: () => void }[];

    return (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`
                relative overflow-hidden rounded-2xl border
                ${accent.borderDim} ${colors.card}
                backdrop-blur-md p-5 md:p-6
            `}>
                {/* Craft layers */}
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none" />

                {/* Greeting + Message */}
                <div className="relative flex items-start gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${accent.bgDim}`}>
                        {greeting.icon}
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-lg md:text-xl font-heading ${colors.text} flex items-center gap-2`}>
                            {greeting.text}, <span className={accent.text}>{firstName}</span>
                        </h2>
                        <p className={`text-sm ${colors.textSecondary} mt-1 leading-relaxed`}>
                            {message}
                        </p>
                    </div>
                </div>

                {/* Quick Stats Row */}
                {quickActions.length > 0 && (
                    <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {quickActions.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={item.action}
                                disabled={!item.action}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                    ${item.action ? `cursor-pointer ${colors.surfaceHover} hover:border-white/15` : 'cursor-default'}
                                    ${colors.border}
                                `}
                            >
                                <div className={`flex-shrink-0 ${accent.text}`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs ${colors.text} font-medium truncate`}>{item.label}</p>
                                    {item.detail && (
                                        <p className={`text-xs ${colors.textMuted} font-mono truncate`}>{item.detail}</p>
                                    )}
                                </div>
                                {item.action && (
                                    <ArrowRight className={`w-3 h-3 ${colors.textMuted} flex-shrink-0`} />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Subtle accent glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-[0.04] pointer-events-none ${accent.bg}`} />
            </div>
        </div>
    );
};
