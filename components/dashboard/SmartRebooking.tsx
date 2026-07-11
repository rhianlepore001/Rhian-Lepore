import React, { useState } from 'react';
import { RefreshCw, MessageCircle, ChevronRight, User } from 'lucide-react';
import { useSmartRebooking, RebookingSuggestion } from '../../hooks/useSmartRebooking';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme, type BrutalThemeTokens } from '../../hooks/useBrutalTheme';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';

interface SmartRebookingProps {
    /** @deprecated tema vem do useBrutalTheme; mantido por compat de API */
    isBeauty?: boolean;
    limit?: number;
}

function getUrgencyConfig(urgency: RebookingSuggestion['urgency'], status: BrutalThemeTokens['status']) {
    switch (urgency) {
        case 'now':
            return {
                label: 'Chamar agora',
                bg: `${status.dangerBg} ${status.dangerBorder}`,
                badge: `${status.dangerBg} ${status.danger} ${status.dangerBorder} border`
            };
        case 'soon':
            return {
                label: 'Esta semana',
                bg: `${status.warningBg} ${status.warningBorder}`,
                badge: `${status.warningBg} ${status.warning} ${status.warningBorder} border`
            };
        case 'upcoming':
            return {
                label: 'Em breve',
                bg: `${status.infoBg} ${status.infoBorder}`,
                badge: `${status.infoBg} ${status.info} ${status.infoBorder} border`
            };
    }
}

function getCadenceLabel(days: number): string {
    if (days <= 7) return 'semanal';
    if (days <= 14) return 'quinzenal';
    if (days <= 30) return 'mensal';
    if (days <= 45) return `a cada ${days} dias`;
    return `a cada ${Math.round(days / 7)} semanas`;
}

export const SmartRebooking: React.FC<SmartRebookingProps> = ({ limit = 5 }) => {
    const { suggestions, loading } = useSmartRebooking();
    const { region } = useAuth();
    const { colors, accent, radius, status } = useBrutalTheme();
    const [expanded, setExpanded] = useState(true);

    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    if (loading) return null;
    if (suggestions.length === 0) return null;

    const visible = suggestions.slice(0, limit);
    const nowCount = suggestions.filter(s => s.urgency === 'now').length;

    return (
        <div className={`${radius.card} border ${colors.border} ${colors.card} overflow-hidden`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className={`w-full flex items-center justify-between px-5 py-4 ${colors.surfaceHover} transition-colors`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${accent.bgDim} flex items-center justify-center flex-shrink-0`}>
                        <RefreshCw className={`w-4 h-4 ${accent.text}`} />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold font-heading ${colors.text}`}>Clientes para chamar de volta</h3>
                            <InfoButton text="Baseado na frequência de visitas de cada cliente, calculamos quando é hora de entrar em contato para agendar o próximo atendimento." />
                        </div>
                        <p className={`text-xs ${colors.textSecondary} font-mono`}>
                            {nowCount > 0 ? `${nowCount} urgente${nowCount > 1 ? 's' : ''}` : `${suggestions.length} sugestões`} • Cadência preditiva
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {nowCount > 0 && (
                        <span className={`w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse`} />
                    )}
                    <ChevronRight
                        className={`w-4 h-4 ${colors.textSecondary} transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </button>

            {/* Body */}
            {expanded && (
                <div className="px-5 pb-5 space-y-2">
                    {visible.map((suggestion) => {
                        const config = getUrgencyConfig(suggestion.urgency, status);
                        const waPhone = suggestion.clientPhone.replace(/\D/g, '');

                        return (
                            <div
                                key={suggestion.clientId}
                                className={`flex items-center gap-3 p-3 ${radius.input} border transition-all ${config.bg}`}
                            >
                                {/* Avatar */}
                                <div className={`w-9 h-9 rounded-full ${colors.surface} flex items-center justify-center flex-shrink-0`}>
                                    <User className={`w-4 h-4 ${colors.textSecondary}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className={`text-sm font-semibold ${colors.text} truncate`}>{suggestion.clientName}</p>
                                        <span className={`text-xs font-mono px-1.5 py-0.5 ${radius.badge} whitespace-nowrap ${config.badge}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${colors.textSecondary}`}>
                                        Vem {getCadenceLabel(suggestion.avgCadenceDays)} • Última visita há {suggestion.daysSinceLastVisit} dias • ~{formatCurrency(suggestion.avgTicket, currencyRegion as any)}/visita
                                    </p>
                                </div>

                                {/* WhatsApp Button */}
                                {waPhone && (
                                    <a
                                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                            `Oi ${suggestion.clientName.split(' ')[0]}! Faz um tempo que não nos vemos. Que tal agendar um horário esta semana?`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex-shrink-0 p-2 ${radius.button} ${status.successBg} ${status.success} border ${status.successBorder} hover:brightness-110 transition-all`}
                                        title="Enviar WhatsApp"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        );
                    })}

                    {suggestions.length > limit && (
                        <p className={`text-center text-xs ${colors.textSecondary} font-mono pt-1`}>
                            +{suggestions.length - limit} clientes para acompanhar
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
