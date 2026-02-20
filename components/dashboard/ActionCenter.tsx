import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { Send, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { ActionItem } from '../../types';
import { InfoButton } from '../HelpButtons';

interface ActionCenterProps {
    actions: ActionItem[];
    onActionClick: (action: ActionItem) => void;
    isBeauty: boolean;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
    actions,
    onActionClick,
    isBeauty
}) => {
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const getIcon = (type: ActionItem['type']) => {
        switch (type) {
            case 'recovery': return <Send className="w-4 h-4" />;
            case 'gap': return <Calendar className="w-4 h-4" />;
            case 'upsell': return <TrendingUp className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getLabel = (type: ActionItem['type']) => {
        switch (type) {
            case 'recovery': return 'Recuperar Cliente';
            case 'gap': return 'Ocupar Horário';
            case 'upsell': return 'Oportunidade';
            default: return 'Ação';
        }
    };

    const getColorClass = (type: ActionItem['type']) => {
        switch (type) {
            case 'recovery': return 'border-l-red-500';
            case 'gap': return 'border-l-yellow-500';
            case 'upsell': return 'border-l-green-500';
            default: return 'border-l-neutral-500';
        }
    };

    return (
        <BrutalCard
            className="h-full brutal-card-enhanced"
            title={
                <div className="flex items-center gap-2">
                    <span className="text-sm md:text-base">Oportunidades do Dia</span>
                    <InfoButton text="Nossa IA analisou sua agenda e comportamento dos clientes para sugerir estas 3 ações práticas que podem aumentar seu faturamento ainda hoje!" />
                </div>
            }
            noPadding
        >
            <div className="divide-y divide-neutral-800">
                {actions.length === 0 ? (
                    <div className="p-4 md:p-6 text-center text-text-secondary">
                        <p className="text-xs md:text-sm">Nenhuma ação pendente hoje. Bom trabalho! 🎉</p>
                    </div>
                ) : (
                    actions.map((action) => (
                        <div key={action.id} className={`p-4 md:p-5 hover:bg-white/5 transition-colors border-l-4 ${getColorClass(action.type)}`}>
                            <div className="flex justify-between items-start gap-2 md:gap-3">
                                <div className="flex-1 min-w-0"> {/* min-w-0 forces truncation if needed */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] md:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-white shrink-0`}>
                                            {getLabel(action.type)}
                                        </span>
                                        {action.time && (
                                            <span className="text-[10px] md:text-xs text-text-secondary font-mono truncate">{action.time}</span>
                                        )}
                                    </div>
                                    <h4 className="text-sm md:text-base font-bold text-white mb-0.5 leading-tight">{action.title}</h4>
                                    <p className="text-xs md:text-sm text-text-secondary leading-snug">{action.description}</p>
                                </div>
                                <BrutalButton
                                    size="sm"
                                    variant="secondary"
                                    className="shrink-0 h-11 w-11 md:h-auto md:w-auto p-0 md:px-3 flex items-center justify-center"
                                    icon={getIcon(action.type)}
                                    onClick={() => onActionClick(action)}
                                >
                                    <span className="hidden md:inline ml-2">Executar</span>
                                </BrutalButton>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-2 md:p-3 bg-neutral-900/50 border-t border-neutral-800 text-center">
                <p className={`text-[9px] md:text-[10px] uppercase tracking-widest ${accentText} font-mono animate-pulse`}>
                    {actions.length} Oportunidades
                </p>
            </div>
        </BrutalCard>
    );
};
