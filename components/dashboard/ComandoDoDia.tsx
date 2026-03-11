import React from 'react';
import { Sun, Moon, CloudSun, Calendar, TrendingUp, Users, Clock, ArrowRight, Target } from 'lucide-react';
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

function getGreeting(): { text: string; icon: React.ReactNode } {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', icon: <Sun className="w-5 h-5 text-yellow-400" /> };
    if (hour < 18) return { text: 'Boa tarde', icon: <CloudSun className="w-5 h-5 text-orange-400" /> };
    return { text: 'Boa noite', icon: <Moon className="w-5 h-5 text-blue-400" /> };
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
    isBeauty,
    currencyRegion,
    onNavigate
}) => {
    const greeting = getGreeting();
    const goalPercent = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;
    const message = getDayMessage(appointmentsToday, churnRiskCount, goalPercent);

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

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
                ${isBeauty ? 'border-beauty-neon/15 bg-gradient-to-br from-beauty-card/80 to-neutral-900/90' : 'border-white/8 bg-gradient-to-br from-neutral-900/80 to-black/90'}
                backdrop-blur-md p-5 md:p-6
            `}>
                {/* Greeting + Message */}
                <div className="flex items-start gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10'}`}>
                        {greeting.icon}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg md:text-xl font-heading text-white flex items-center gap-2">
                            {greeting.text}, <span className={accentText}>{firstName}</span>
                        </h2>
                        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Quick Stats Row */}
                {quickActions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {quickActions.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={item.action}
                                disabled={!item.action}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                    ${item.action ? 'cursor-pointer hover:bg-white/5 hover:border-white/15' : 'cursor-default'}
                                    ${isBeauty ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 bg-white/[0.02]'}
                                `}
                            >
                                <div className={`flex-shrink-0 ${accentText}`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white font-medium truncate">{item.label}</p>
                                    {item.detail && (
                                        <p className="text-[10px] text-text-secondary font-mono truncate">{item.detail}</p>
                                    )}
                                </div>
                                {item.action && (
                                    <ArrowRight className="w-3 h-3 text-text-secondary flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Subtle accent glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-[0.04] pointer-events-none ${accentBg}`} />
            </div>
        </div>
    );
};
