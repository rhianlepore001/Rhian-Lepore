import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { Send, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { ActionItem } from '../../types';
import { InfoButton } from '../HelpButtons';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

interface ActionCenterProps {
    actions: ActionItem[];
    onActionClick: (action: ActionItem) => void;
    isBeauty: boolean;
}

export const ActionCenter = React.memo(({
    actions,
    onActionClick,
    isBeauty: _isBeauty
}: ActionCenterProps) => {
    const { accent, colors, status } = useBrutalTheme();

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
            case 'recovery': return `border-l-[3px] ${status.dangerBorder}`;
            case 'gap': return `border-l-[3px] ${status.warningBorder}`;
            case 'upsell': return `border-l-[3px] ${status.successBorder}`;
            default: return `border-l-[3px] ${colors.border}`;
        }
    };

    return (
        <BrutalCard
            className="h-full"
            title={
                <div className="flex items-center gap-2">
                    <span className="text-sm md:text-base font-bold">Oportunidades do Dia</span>
                    <InfoButton text="Nossa IA analisou sua agenda e sugere estas 3 ações práticas para aumentar seu faturamento hoje!" />
                </div>
            }
            noPadding
        >
            <div className={`divide-y ${colors.divider}`}>
                {actions.length === 0 ? (
                    <div className="p-8 md:p-12 text-center">
                        <TrendingUp className={`w-10 h-10 ${colors.textMuted} mx-auto mb-4 opacity-20`} />
                        <p className={`text-sm ${colors.textSecondary} font-bold mb-1`}>Operação Otimizada</p>
                        <p className={`text-xs ${colors.textMuted} leading-relaxed max-w-[200px] mx-auto`}>Novas oportunidades surgirão conforme a agenda se movimentar.</p>
                    </div>
                ) : (
                    actions.map((action, idx) => (
                        <div
                            key={action.id}
                            className={`p-5 md:p-6 hover:bg-white/[0.03] transition-all duration-200 ${getColorClass(action.type)} group cursor-pointer`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold tracking-[0.15em] ${
                                            action.type === 'recovery' ? status.dangerBg + ' ' + status.danger :
                                            action.type === 'gap' ? status.warningBg + ' ' + status.warning :
                                            action.type === 'upsell' ? status.successBg + ' ' + status.success :
                                            colors.card + ' ' + colors.text
                                        }`}>
                                            {getLabel(action.type)}
                                        </span>
                                        {action.time && (
                                            <span className={`text-xs ${colors.textMuted} font-mono tracking-tighter`}>{action.time}</span>
                                        )}
                                    </div>
                                    <h4 className={`text-sm md:text-base font-semibold ${colors.text} mb-1.5 leading-tight transition-colors`}>{action.title}</h4>
                                    <p className={`text-xs md:text-sm ${colors.textMuted} leading-relaxed font-sans`}>{action.description}</p>
                                </div>
                                <BrutalButton
                                    size="sm"
                                    variant="secondary"
                                    className="shrink-0 h-10 w-10 md:h-auto md:w-auto p-0 md:px-4 flex items-center justify-center"
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
            <div className={`p-4 ${colors.surface} border-t ${colors.divider} flex items-center justify-center`}>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${accent.bg} animate-pulse shadow-[0_0_8px_currentColor]`} />
                    <p className={`text-xs uppercase tracking-[0.3em] ${accent.text} font-mono font-bold`}>
                        {actions.length} {actions.length === 1 ? 'Oportunidade Ativa' : 'Oportunidades Ativas'}
                    </p>
                </div>
            </div>
        </BrutalCard>
    );
});

ActionCenter.displayName = 'ActionCenter';
