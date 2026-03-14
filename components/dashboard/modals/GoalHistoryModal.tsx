import React from 'react';
import { Trophy, Target, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { formatCurrency } from '../../../utils/formatters';

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
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

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
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">Taxa de Sucesso</p>
                        <p className={`text-2xl font-bold font-heading ${accentText}`}>{successRate}%</p>
                        <p className="text-xs text-text-secondary font-mono">{successCount}/{history.length} meses</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">Média Mensal</p>
                        <p className={`text-2xl font-bold font-heading ${avgPerformance >= 100 ? accentText : 'text-neutral-400'}`}>{avgPerformance}%</p>
                        <p className="text-xs text-text-secondary font-mono">da meta</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">Metas Batidas</p>
                        <p className="text-2xl font-bold font-heading text-green-400">{successCount}</p>
                        <p className="text-xs text-text-secondary font-mono">em {history.length} meses</p>
                    </div>
                </div>

                {/* Lista detalhada */}
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-10">
                            <Trophy className="w-12 h-12 text-neutral-600 mx-auto mb-3 opacity-50" />
                            <p className="text-text-secondary font-mono text-sm">Nenhum histórico de metas encontrado.</p>
                            <p className="text-text-secondary/50 font-mono text-xs mt-1">Defina uma meta para começar a acompanhar.</p>
                        </div>
                    ) : (
                        history.map((item, idx) => {
                            const prevItem = history[idx + 1];
                            const trend = prevItem ? item.percentage - prevItem.percentage : null;

                            return (
                                <div
                                    key={`${item.month}-${item.year}`}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${idx === 0
                                        ? 'bg-white/8 border-white/20 ring-1 ring-white/20'
                                        : item.success
                                            ? 'bg-green-900/10 border-green-500/20 hover:bg-green-900/15'
                                            : 'bg-red-900/10 border-red-500/20 hover:bg-red-900/15'
                                        }`}
                                >
                                    {/* Badge de status */}
                                    <div className="flex-shrink-0">
                                        {item.success ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-400" />
                                        )}
                                    </div>

                                    {/* Info do mês */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-heading text-white">
                                                {item.month} <span className="text-text-secondary font-mono">{item.year}</span>
                                            </p>
                                            {idx === 0 && (
                                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'}`}>
                                                    Atual
                                                </span>
                                            )}
                                            {item.success ? (
                                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-green-900/40 text-green-400 border border-green-500/20">
                                                    ✅ Batida
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-red-900/40 text-red-400 border border-red-500/20">
                                                    ❌ Não batida
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-text-secondary font-mono mt-0.5">
                                            Atingido: {formatCurrency(item.achieved, currencyRegion)} de {formatCurrency(item.goal, currencyRegion)}
                                        </p>
                                    </div>

                                    {/* % e tendência */}
                                    <div className="flex-shrink-0 flex items-center gap-3">
                                        {trend !== null && (
                                            <div className={`flex items-center gap-0.5 text-xs font-mono ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                                                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                                {trend !== 0 && <span>{trend > 0 ? '+' : ''}{trend}pp</span>}
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className={`text-xl font-bold font-heading ${item.success ? accentText : 'text-red-400'}`}>
                                                {item.percentage}%
                                            </p>
                                            <p className="text-[10px] text-text-secondary font-mono">da meta</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 text-[10px] font-mono text-text-secondary/60 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>Meta atingida (≥100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <XCircle className="w-3 h-3 text-red-400" />
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
