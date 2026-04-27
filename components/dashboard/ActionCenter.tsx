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

export const ActionCenter = React.memo(({
    actions,
    onActionClick,
    isBeauty
}: ActionCenterProps) => {
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
            case 'recovery': return 'border-l-red-500/50';
            case 'gap': return 'border-l-yellow-500/50';
            case 'upsell': return 'border-l-green-500/50';
            default: return 'border-l-neutral-500/50';
        }
    };

    return (
        <BrutalCard
            className="h-full brutal-card-enhanced"
            title={
                <div className="flex items-center gap-2">
                    <span className="text-sm md:text-base font-bold">Oportunidades do Dia</span>
                    <InfoButton text="Nossa IA analisou sua agenda e sugere estas 3 ações práticas para aumentar seu faturamento hoje!" />
                </div>
            }
            noPadding
        >
            <div className="divide-y divide-white/5">
                {actions.length === 0 ? (
                    <div className="p-8 md:p-12 text-center">
                        <TrendingUp className="w-10 h-10 text-text-secondary/10 mx-auto mb-4" />
                        <p className="text-sm text-text-secondary font-bold mb-1">Operação Otimizada</p>
                        <p className="text-xs text-text-secondary/40 leading-relaxed max-w-[200px] mx-auto">Novas oportunidades surgirão conforme a agenda se movimentar.</p>
                    </div>
                ) : (
                    actions.map((action) => (
                        <div key={action.id} className={`p-6 md:p-8 hover:bg-white/[0.03] transition-all duration-200 border-l-[3px] ${getColorClass(action.type)} group cursor-pointer`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.04] text-white font-bold tracking-[0.15em]`}>
                                            {getLabel(action.type)}
                                        </span>
                                        {action.time && (
                                            <span className="text-xs text-neutral-500 font-mono tracking-tighter">{action.time}</span>
                                        )}
                                    </div>
                                    <h4 className="text-sm md:text-base font-semibold text-white mb-1 leading-tight group-hover:text-white transition-colors">{action.title}</h4>
                                    <p className="text-xs md:text-sm text-neutral-500 leading-relaxed font-sans">{action.description}</p>
                                </div>
                                <BrutalButton
                                    size="sm"
                                    variant="secondary"
                                    className="shrink-0 h-10 w-10 md:h-auto md:w-auto p-0 md:px-4 flex items-center justify-center bg-white/5 border-white/5 hover:bg-white/10"
                                    icon={getIcon(action.type)}
                                    onClick={() => onActionClick(action)}
                                >
                                    <span className="hidden md:inline ml-2 font-bold text-xs uppercase tracking-widest">Executar</span>
                                </BrutalButton>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                    <p className={`text-xs uppercase tracking-[0.3em] ${accentText} font-mono font-bold`}>
                        {actions.length} {actions.length === 1 ? 'Oportunidade Ativa' : 'Oportunidades Ativas'}
                    </p>
                </div>
            </div>
        </BrutalCard>
    );
});

ActionCenter.displayName = 'ActionCenter';
