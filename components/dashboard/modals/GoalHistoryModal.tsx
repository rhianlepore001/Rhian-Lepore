import React from 'react';
import { Trophy, Target, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { formatCurrency } from '../../../utils/formatters';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';
import { EmptyState } from '../../EmptyState';

interface GoalHistoryItem {
    month: string;
    year: number;
    goal: number;
    achieved: number;
    percentage: number;
    success: boolean;
}

interface GoalHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: GoalHistoryItem[];
    isBeauty?: boolean;
    currencyRegion: 'BR' | 'PT';
}

export const GoalHistoryModal: React.FC<GoalHistoryModalProps> = ({
    isOpen,
    onClose,
    history,
    isBeauty = false,
    currencyRegion
}) => {
    const { accent, colors, classes } = useBrutalTheme();

    const successCount = history.filter(h => h.success).length;
    const successRate = history.length > 0 ? Math.round((successCount / history.length) * 100) : 0;
    const avgPerformance = history.length > 0
        ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length)
        : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Histórico de Metas"
            size="lg"
            footer={
                <div className="w-full flex justify-end">
                    <BrutalButton variant="ghost" onClick={onClose}>Fechar</BrutalButton>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Resumo de desempenho */}
                <div className="grid grid-cols-3 gap-3">
                    <div className={`p-4 rounded-xl ${colors.card} ${colors.border} text-center`}>
                        <p className={`text-xs font-mono ${colors.textSecondary} uppercase tracking-wider mb-1`}>Taxa de Sucesso</p>
                        <p className={`text-2xl font-bold font-heading ${accent.text}`}>{successRate}%</p>
                        <p className={`text-xs ${colors.textSecondary} font-mono`}>{successCount}/{history.length} meses</p>
                    </div>
                    <div className={`p-4 rounded-xl ${colors.card} ${colors.border} text-center`}>
                        <p className={`text-xs font-mono ${colors.textSecondary} uppercase tracking-wider mb-1`}>Média Mensal</p>
                        <p className={`text-2xl font-bold font-heading ${avgPerformance >= 100 ? accent.text : colors.textMuted}`}>{avgPerformance}%</p>
                        <p className={`text-xs ${colors.textSecondary} font-mono`}>da meta</p>
                    </div>
                    <div className={`p-4 rounded-xl ${colors.card} ${colors.border} text-center`}>
                        <p className={`text-xs font-mono ${colors.textSecondary} uppercase tracking-wider mb-1`}>Metas Batidas</p>
                        <p className={`text-2xl font-bold font-heading ${classes.badgeSuccess.split(' ').find(c => c.startsWith('text-'))}`}>{successCount}</p>
                        <p className={`text-xs ${colors.textSecondary} font-mono`}>em {history.length} meses</p>
                    </div>
                </div>

                {/* Lista detalhada */}
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
                    {history.length === 0 ? (
                        <EmptyState
                            icon={Trophy}
                            message="Nenhum histórico de metas encontrado."
                        />
                    ) : (
                        history.map((item, idx) => {
                            const prevItem = history[idx + 1];
                            const trend = prevItem ? item.percentage - prevItem.percentage : null;

                            return (
                                <div
                                    key={`${item.month}-${item.year}`}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${idx === 0
                                        ? `${colors.card} ${colors.border} ring-1 ring-white/20`
                                        : item.success
                                            ? `${classes.badgeSuccess.replace(/px-2 py-0\.5 text-xs font-bold uppercase /, '')}`
                                            : `${classes.badgeDanger.replace(/px-2 py-0\.5 text-xs font-bold uppercase /, '')}`
                                        }`}
                                >
                                    {/* Badge de status */}
                                    <div className="flex-shrink-0">
                                        {item.success ? (
                                            <CheckCircle2 className={`w-6 h-6 ${classes.badgeSuccess.split(' ').find(c => c.startsWith('text-'))}`} />
                                        ) : (
                                            <XCircle className={`w-6 h-6 ${classes.badgeDanger.split(' ').find(c => c.startsWith('text-'))}`} />
                                        )}
                                    </div>

                                    {/* Info do mês */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-heading ${colors.text}`}>
                                                {item.month} <span className={`${colors.textSecondary} font-mono`}>{item.year}</span>
                                            </p>
                                            {idx === 0 && (
                                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded uppercase ${accent.bg} text-[var(--color-bg)]`}>
                                                    Atual
                                                </span>
                                            )}
                                            {item.success ? (
                                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded uppercase ${classes.badgeSuccess}`}>
                                                    Batida
                                                </span>
                                            ) : (
                                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded uppercase ${classes.badgeDanger}`}>
                                                    Não batida
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs ${colors.textSecondary} font-mono mt-0.5`}>
                                            Atingido: {formatCurrency(item.achieved, currencyRegion)} de {formatCurrency(item.goal, currencyRegion)}
                                        </p>
                                    </div>

                                    {/* % e tendência */}
                                    <div className="flex-shrink-0 flex items-center gap-3">
                                        {trend !== null && (
                                            <div className={`flex items-center gap-0.5 text-xs font-mono ${trend > 0 ? classes.badgeSuccess.split(' ').find(c => c.startsWith('text-')) : trend < 0 ? classes.badgeDanger.split(' ').find(c => c.startsWith('text-')) : colors.textSecondary}`}>
                                                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                                {trend !== 0 && <span>{trend > 0 ? '+' : ''}{trend}pp</span>}
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className={`text-xl font-bold font-heading ${item.success ? accent.text : classes.badgeDanger.split(' ').find(c => c.startsWith('text-'))}`}>
                                                {item.percentage}%
                                            </p>
                                            <p className={`text-xs ${colors.textSecondary} font-mono`}>da meta</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Legenda */}
                <div className={`flex items-center gap-4 text-xs font-mono ${colors.textMuted} border-t ${colors.divider} pt-3`}>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3 h-3 ${classes.badgeSuccess.split(' ').find(c => c.startsWith('text-'))}`} />
                        <span>Meta atingida (≥100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <XCircle className={`w-3 h-3 ${classes.badgeDanger.split(' ').find(c => c.startsWith('text-'))}`} />
                        <span>Meta não atingida</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3" />
                        <span>pp = pontos percentuais vs mês anterior</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
