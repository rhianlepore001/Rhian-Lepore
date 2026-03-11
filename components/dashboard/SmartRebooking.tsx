import React, { useState } from 'react';
import { BrutalCard } from '../BrutalCard';
import { RefreshCw, MessageCircle, Clock, ChevronRight, AlertCircle, Calendar, User } from 'lucide-react';
import { useSmartRebooking, RebookingSuggestion } from '../../hooks/useSmartRebooking';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';

interface SmartRebookingProps {
    isBeauty: boolean;
    limit?: number;
}

function getUrgencyConfig(urgency: RebookingSuggestion['urgency']) {
    switch (urgency) {
        case 'now':
            return {
                label: 'Chamar agora',
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20',
                badgeBg: 'bg-red-900/40 text-red-300'
            };
        case 'soon':
            return {
                label: 'Esta semana',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                badgeBg: 'bg-yellow-900/40 text-yellow-300'
            };
        case 'upcoming':
            return {
                label: 'Em breve',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
                badgeBg: 'bg-blue-900/40 text-blue-300'
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

export const SmartRebooking: React.FC<SmartRebookingProps> = ({ isBeauty, limit = 5 }) => {
    const { suggestions, loading } = useSmartRebooking();
    const { region } = useAuth();
    const [expanded, setExpanded] = useState(true);

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    if (loading) return null;
    if (suggestions.length === 0) return null;

    const visible = suggestions.slice(0, limit);
    const nowCount = suggestions.filter(s => s.urgency === 'now').length;

    return (
        <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className={`w-4 h-4 ${accentText}`} />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold font-heading text-white">Clientes para chamar de volta</h3>
                            <InfoButton text="Baseado na frequência de visitas de cada cliente, calculamos quando é hora de entrar em contato para agendar o próximo atendimento." />
                        </div>
                        <p className="text-[11px] text-text-secondary font-mono">
                            {nowCount > 0 ? `${nowCount} urgente${nowCount > 1 ? 's' : ''}` : `${suggestions.length} sugestões`} • Cadência preditiva
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {nowCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    )}
                    <ChevronRight
                        className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </button>

            {/* Body */}
            {expanded && (
                <div className="px-5 pb-5 space-y-2">
                    {visible.map((suggestion) => {
                        const config = getUrgencyConfig(suggestion.urgency);
                        const waPhone = suggestion.clientPhone.replace(/\D/g, '');

                        return (
                            <div
                                key={suggestion.clientId}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${config.bg}`}
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-text-secondary" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-semibold text-white truncate">{suggestion.clientName}</p>
                                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${config.badgeBg}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-text-secondary">
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
                                        className="flex-shrink-0 p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        );
                    })}

                    {suggestions.length > limit && (
                        <p className="text-center text-[10px] text-text-secondary font-mono pt-1">
                            +{suggestions.length - limit} clientes para acompanhar
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
