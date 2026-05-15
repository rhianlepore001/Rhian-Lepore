import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { Skeleton } from '../../SkeletonLoader';
import { formatCurrency } from '../../../utils/formatters';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/Logger';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';
import { EmptyState } from '../../EmptyState';

interface MonthlyProfitItem {
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
    growth: number;
}

interface MonthlyProfitModalProps {
    isOpen: boolean;
    onClose: () => void;
    isBeauty?: boolean;
    currencyRegion: 'BR' | 'PT';
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlyProfitModal: React.FC<MonthlyProfitModalProps> = ({
    isOpen,
    onClose,
    isBeauty = false,
    currencyRegion
}) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<MonthlyProfitItem[]>([]);
    const [loading, setLoading] = useState(true);

    const { accent, colors, classes } = useBrutalTheme();

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Busca os últimos 12 meses
                const items: MonthlyProfitItem[] = [];
                const now = new Date();

                const promises = Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const startDate = d.toISOString().split('T')[0];
                    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                    return supabase.rpc('get_finance_stats', {
                        p_user_id: user.id,
                        p_start_date: startDate,
                        p_end_date: endDate
                    }).then(res => ({ res, month: d.getMonth(), year: d.getFullYear() }));
                });

                const results = await Promise.all(promises);

                for (let i = 0; i < results.length; i++) {
                    const { res, month, year } = results[i];
                    if (res.error) continue;
                    const d = res.data;
                    const prevRevenue = results[i + 1]?.res?.data?.revenue || 0;
                    const revenue = d?.revenue || 0;
                    const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

                    items.push({
                        month: MONTH_NAMES[month],
                        year,
                        revenue,
                        expenses: d?.expenses || 0,
                        profit: d?.profit || 0,
                        growth: Math.round(growth)
                    });
                }

                setHistory(items);
            } catch (err) {
                logger.error('Erro ao buscar histórico de lucro:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, user]);

    const totalAccumulated = history.reduce((sum, h) => sum + h.profit, 0);
    const bestMonth = history.length > 0
        ? history.reduce((best, h) => h.profit > best.profit ? h : best, history[0])
        : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Histórico de Lucro Mensal"
            size="lg"
            footer={
                <div className="w-full flex justify-end">
                    <BrutalButton variant="ghost" onClick={onClose}>Fechar</BrutalButton>
                </div>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Resumo acumulado */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-xl ${colors.card} ${colors.border}`}>
                            <p className={`text-[10px] font-mono ${colors.textSecondary} uppercase tracking-wider mb-1`}>Lucro Acumulado (12m)</p>
                            <p className={`text-2xl font-bold font-heading ${accent.text}`}>
                                {formatCurrency(totalAccumulated, currencyRegion)}
                            </p>
                        </div>
                        <div className={`p-4 rounded-xl ${colors.card} ${colors.border}`}>
                            <p className={`text-[10px] font-mono ${colors.textSecondary} uppercase tracking-wider mb-1`}>Melhor Mês</p>
                            <p className={`text-lg font-bold font-heading ${colors.text}`}>
                                {bestMonth?.month ? `${bestMonth.month.substring(0, 3)} ${bestMonth.year}` : '—'}
                            </p>
                            <p className={`text-xs font-mono ${accent.text}`}>
                                {bestMonth?.profit ? formatCurrency(bestMonth.profit, currencyRegion) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Tabela de histórico */}
                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
                        {history.map((item, idx) => (
                            <div
                                key={`${item.month}-${item.year}`}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${idx === 0 ? `${colors.card} ${colors.border} ring-1 ring-white/20` : `${colors.inputBg} ${colors.border} hover:bg-white/5`}`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-heading ${colors.text}`}>
                                            {item.month} <span className={`${colors.textSecondary} font-mono`}>{item.year}</span>
                                        </p>
                                        {idx === 0 && (
                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${accent.bg} text-black`}>
                                                Atual
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs ${colors.textSecondary} font-mono mt-0.5`}>
                                        Receita: {formatCurrency(item.revenue, currencyRegion)} · Despesas: {formatCurrency(item.expenses, currencyRegion)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                    {/* Crescimento vs mês anterior */}
                                    {item.growth !== 0 && (
                                        <div className={`flex items-center gap-1 text-xs font-mono ${item.growth > 0 ? classes.badgeSuccess.split(' ').find(c => c.startsWith('text-')) : classes.badgeDanger.split(' ').find(c => c.startsWith('text-'))}`}>
                                            {item.growth > 0
                                                ? <TrendingUp className="w-3 h-3" />
                                                : <TrendingDown className="w-3 h-3" />}
                                            <span>{item.growth > 0 ? '+' : ''}{item.growth}%</span>
                                        </div>
                                    )}

                                    <div className="text-right">
                                        <p className={`text-[10px] font-mono ${colors.textSecondary} uppercase`}>Lucro</p>
                                        <p className={`text-base font-bold font-heading ${item.profit >= 0 ? accent.text : classes.badgeDanger.split(' ').find(c => c.startsWith('text-'))}`}>
                                            {formatCurrency(item.profit, currencyRegion)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {history.length === 0 && (
                            <EmptyState
                                icon={BarChart2}
                                message="Nenhum dado financeiro encontrado."
                            />
                        )}
                    </div>

                    {/* Legenda */}
                    <div className={`flex items-center gap-2 text-[10px] font-mono ${colors.textMuted} border-t ${colors.divider} pt-3`}>
                        <DollarSign className="w-3 h-3" />
                        <span>Lucro = Receita − Despesas pagas no período.</span>
                    </div>
                </div>
            )}
        </Modal>
    );
};
