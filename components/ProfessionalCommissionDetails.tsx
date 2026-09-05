import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Download, Loader2, Pencil, Check, TrendingUp, Percent, Package, Scissors } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal, useToast } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { mapError } from '../utils/mapError';

interface CommissionLine {
    id: string;
    sourceId: string;
    kind: 'service' | 'product';
    occurred_at: string;
    client_name: string;
    title: string;
    subtitle?: string;
    price: number;
    quantity: number;
    commission_amount: number;
    commission_rate: number;
    paid: boolean;
    finance_record_id: string | null;
}

interface ProfessionalCommissionDetailsProps {
    professionalId: string;
    professionalName: string;
    commissionRate: number;
    onClose: () => void;
    onRateUpdated?: (rate: number) => void;
    accentColor: string;
    currencySymbol: string;
}

function toDateInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function currentMonthRange(): { start: string; end: string } {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toDateInputValue(firstDay), end: toDateInputValue(lastDay) };
}

function previousMonthRange(): { start: string; end: string } {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toDateInputValue(firstDay), end: toDateInputValue(lastDay) };
}

function relationName(value: { name?: string } | { name?: string }[] | null | undefined): string | null {
    if (!value) return null;
    if (Array.isArray(value)) return value[0]?.name || null;
    return value.name || null;
}

export const ProfessionalCommissionDetails: React.FC<ProfessionalCommissionDetailsProps> = ({
    professionalId,
    professionalName,
    commissionRate,
    onClose,
    onRateUpdated,
    accentColor,
    currencySymbol
}) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const [lines, setLines] = useState<CommissionLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [kindFilter, setKindFilter] = useState<'all' | 'service' | 'product'>('all');

    const [editingService, setEditingService] = useState<CommissionLine | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editRate, setEditRate] = useState('');
    const [saving, setSaving] = useState(false);

    const [defaultRate, setDefaultRate] = useState(String(commissionRate || 0));
    const [savingDefaultRate, setSavingDefaultRate] = useState(false);
    const [showRateEditor, setShowRateEditor] = useState((commissionRate || 0) === 0);

    useEffect(() => {
        const range = currentMonthRange();
        setStartDate(range.start);
        setEndDate(range.end);
    }, []);

    useEffect(() => {
        setDefaultRate(String(commissionRate || 0));
        setShowRateEditor((commissionRate || 0) === 0);
    }, [commissionRate, professionalId]);

    useEffect(() => {
        if (startDate && endDate && user) {
            void fetchCommissionLines();
        }
    }, [professionalId, startDate, endDate, user]);

    const fetchCommissionLines = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [{ data: productSales, error: productError }, { data: appointments, error: aptError }] = await Promise.all([
                supabase
                    .from('product_sales')
                    .select(`
                        id,
                        created_at,
                        quantity,
                        unit_sale_price,
                        total_revenue,
                        commission_percent,
                        commission_value,
                        finance_record_id,
                        products (name),
                        clients:client_id (name),
                        finance_records:finance_record_id (commission_paid, commission_rate, commission_value)
                    `)
                    .eq('professional_id', professionalId)
                    .eq('company_id', user.id)
                    .gte('created_at', `${startDate}T00:00:00`)
                    .lte('created_at', `${endDate}T23:59:59`)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('appointments')
                    .select(`
                        id,
                        appointment_time,
                        service,
                        price,
                        clients (name),
                        finance_records (
                            id,
                            commission_value,
                            commission_rate,
                            commission_paid,
                            type
                        )
                    `)
                    .eq('professional_id', professionalId)
                    .eq('user_id', user.id)
                    .eq('status', 'Completed')
                    .gte('appointment_time', `${startDate}T00:00:00`)
                    .lte('appointment_time', `${endDate}T23:59:59`)
                    .order('appointment_time', { ascending: false }),
            ]);

            if (productError) throw productError;
            if (aptError) throw aptError;

            const productFinanceIds = new Set(
                (productSales || [])
                    .map((row: { finance_record_id?: string | null }) => row.finance_record_id)
                    .filter((id): id is string => Boolean(id))
            );

            const serviceLines: CommissionLine[] = (appointments || []).map((apt: {
                id: string;
                appointment_time: string;
                service: string;
                price: number;
                clients?: { name?: string } | { name?: string }[] | null;
                finance_records?: Array<{
                    id: string;
                    commission_value: number | null;
                    commission_rate: number | null;
                    commission_paid: boolean | null;
                    type: string | null;
                }> | null;
            }) => {
                const serviceRecord = (apt.finance_records || []).find(
                    (fr) => fr.type === 'revenue' && !productFinanceIds.has(fr.id)
                ) ?? null;
                const storedRate = Number(serviceRecord?.commission_rate);
                const storedValue = Number(serviceRecord?.commission_value);

                return {
                    id: `service-${apt.id}`,
                    sourceId: apt.id,
                    kind: 'service' as const,
                    occurred_at: apt.appointment_time,
                    client_name: relationName(apt.clients) || 'Cliente Desconhecido',
                    title: apt.service,
                    price: Number(apt.price) || 0,
                    quantity: 1,
                    commission_amount: Number.isFinite(storedValue) ? storedValue : 0,
                    commission_rate: Number.isFinite(storedRate) ? storedRate : 0,
                    paid: Boolean(serviceRecord?.commission_paid),
                    finance_record_id: serviceRecord?.id ?? null,
                };
            });

            const productLines: CommissionLine[] = (productSales || []).map((sale: {
                id: string;
                created_at: string;
                quantity: number;
                unit_sale_price: number;
                total_revenue: number;
                commission_percent: number | null;
                commission_value: number | null;
                finance_record_id: string | null;
                products?: { name?: string } | { name?: string }[] | null;
                clients?: { name?: string } | { name?: string }[] | null;
                finance_records?: {
                    commission_paid?: boolean | null;
                    commission_rate?: number | null;
                    commission_value?: number | null;
                } | {
                    commission_paid?: boolean | null;
                    commission_rate?: number | null;
                    commission_value?: number | null;
                }[] | null;
            }) => {
                const qty = Number(sale.quantity) || 0;
                const fr = Array.isArray(sale.finance_records) ? sale.finance_records[0] : sale.finance_records;
                const rate = Number(fr?.commission_rate ?? sale.commission_percent) || 0;
                const value = Number(fr?.commission_value ?? sale.commission_value) || 0;

                return {
                    id: `product-${sale.id}`,
                    sourceId: sale.id,
                    kind: 'product' as const,
                    occurred_at: sale.created_at,
                    client_name: relationName(sale.clients) || 'Venda avulsa',
                    title: relationName(sale.products) || 'Produto',
                    subtitle: `${qty} un.`,
                    price: Number(sale.total_revenue) || (Number(sale.unit_sale_price) || 0) * qty,
                    quantity: qty,
                    commission_amount: value,
                    commission_rate: rate,
                    paid: Boolean(fr?.commission_paid),
                    finance_record_id: sale.finance_record_id,
                };
            });

            setLines(
                [...serviceLines, ...productLines].sort(
                    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
                )
            );
        } catch (error) {
            console.error('Error fetching commission lines:', error);
            showToast('Não foi possível carregar serviços e produtos deste colaborador.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredLines = lines.filter((line) => {
        if (kindFilter !== 'all' && line.kind !== kindFilter) return false;
        if (statusFilter === 'paid') return line.paid;
        if (statusFilter === 'pending') return !line.paid;
        return true;
    });

    const serviceCount = filteredLines.filter((l) => l.kind === 'service').length;
    const productUnits = filteredLines
        .filter((l) => l.kind === 'product')
        .reduce((sum, l) => sum + l.quantity, 0);
    const totalCommission = filteredLines.reduce((sum, s) => sum + s.commission_amount, 0);
    const totalRevenue = filteredLines.reduce((sum, s) => sum + s.price, 0);

    const handleExport = () => {
        const headers = ['Tipo', 'Data', 'Cliente', 'Descrição', 'Qtd', 'Valor', 'Taxa %', 'Comissão', 'Status'];
        const rows = filteredLines.map((s) => [
            s.kind === 'service' ? 'Serviço' : 'Produto',
            new Date(s.occurred_at).toLocaleDateString('pt-BR'),
            s.client_name,
            s.title,
            String(s.quantity),
            `${currencySymbol} ${s.price.toFixed(2)}`,
            String(s.commission_rate),
            `${currencySymbol} ${s.commission_amount.toFixed(2)}`,
            s.paid ? 'Pago' : 'Pendente',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `comissoes_${professionalName.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`;
        link.click();
    };

    const handleSaveDefaultRate = async () => {
        if (!user) return;
        const rate = parseFloat(defaultRate.replace(',', '.'));
        if (isNaN(rate) || rate < 0 || rate > 100) {
            showToast('Informe uma taxa entre 0 e 100.', 'error');
            return;
        }

        setSavingDefaultRate(true);
        try {
            const { error } = await supabase
                .from('team_members')
                .update({
                    commission_rate: rate,
                    commission_percent: rate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', professionalId)
                .eq('user_id', user.id);

            if (error) throw error;

            const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                p_professional_id: professionalId,
                p_new_rate: rate
            });

            if (recalculateError) throw recalculateError;

            showToast(`Taxa padrão atualizada para ${rate}%. Pendentes recalculadas.`, 'success');
            setShowRateEditor(false);
            onRateUpdated?.(rate);
            await fetchCommissionLines();
        } catch (error) {
            console.error('Error saving default commission rate:', error);
            showToast('Não foi possível salvar a taxa de comissão.', 'error');
        } finally {
            setSavingDefaultRate(false);
        }
    };

    const handleUpdateCommission = async () => {
        if (!editingService || !user || editingService.kind !== 'service') return;

        setSaving(true);
        try {
            const newValue = parseFloat(editValue.toString().replace(',', '.'));
            const newRate = parseFloat(editRate.toString().replace(',', '.'));

            if (isNaN(newValue) || isNaN(newRate) || newRate < 0 || newRate > 100 || newValue < 0) {
                showToast('Informe taxa e valor válidos.', 'error');
                setSaving(false);
                return;
            }

            if (!editingService.finance_record_id) {
                const { error: insertError } = await supabase
                    .from('finance_records')
                    .insert({
                        appointment_id: editingService.sourceId,
                        user_id: user.id,
                        professional_id: professionalId,
                        barber_name: professionalName,
                        client_name: editingService.client_name,
                        service_name: editingService.title,
                        revenue: editingService.price,
                        commission_rate: newRate,
                        commission_value: newValue,
                        type: 'revenue',
                        commission_paid: false,
                        created_at: editingService.occurred_at
                    });

                if (insertError) throw insertError;
            } else {
                const { error } = await supabase.rpc('update_commission_record', {
                    p_record_id: editingService.finance_record_id,
                    p_new_value: newValue,
                    p_new_rate: newRate
                });

                if (error) throw error;
            }

            setEditingService(null);
            showToast('Comissão atualizada.', 'success');
            onRateUpdated?.(commissionRate);
            await fetchCommissionLines();
        } catch (error: unknown) {
            console.error('Error updating commission:', error);
            showToast(mapError(error, 'Erro ao atualizar comissão.').message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const dateInputClass = `w-full p-2 md:p-2.5 ${colors.inputBg} ${colors.inputBorder} border md:rounded-xl rounded-lg ${colors.text} text-xs md:text-xs focus:border-[var(--color-input-focus)] outline-none transition-colors`;

    return (
        <>
            <Modal open size="full" onClose={onClose} showCloseButton={false}>
                <div className="-m-5 flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden md:-m-6">
                    <div className={`p-4 md:p-8 border-b ${colors.divider} ${colors.card} backdrop-blur-md sticky top-0 z-20`}>
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${colors.surface} ${colors.border} border shadow-inner`}>
                                    <TrendingUp className={`w-5 h-5 md:w-6 md:h-6 ${accent.text}`} />
                                </div>
                                <div>
                                    <h2 className={`text-lg md:text-2xl ${font.heading} ${colors.text} uppercase tracking-tight leading-none md:leading-normal`}>
                                        Serviços, Produtos e Comissões
                                    </h2>
                                    <p className={`${colors.textMuted} text-xs md:text-sm mt-0.5`}>
                                        <span className={`${colors.text} font-bold`}>{professionalName}</span>
                                        {' • '}
                                        Taxa padrão serviços:{' '}
                                        <span className={accent.text}>{commissionRate}%</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className={`${colors.textMuted} hover:text-theme-text transition-all p-2 hover:bg-theme-surface rounded-xl border border-transparent hover:border-theme-border active:scale-95`}
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className={`${colors.surface} ${colors.border} border rounded-2xl p-3 md:p-4 mb-4 md:mb-6`}>
                            <div className="flex flex-col md:flex-row md:items-end gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <label className={`${colors.textMuted} text-xs uppercase ${font.mono} flex items-center gap-1.5`}>
                                            <Percent className="w-3.5 h-3.5" />
                                            Taxa de comissão de serviços
                                        </label>
                                        {!showRateEditor && (
                                            <button
                                                type="button"
                                                onClick={() => setShowRateEditor(true)}
                                                className={`text-xs font-bold uppercase ${accent.text} hover:underline`}
                                            >
                                                Alterar taxa
                                            </button>
                                        )}
                                    </div>
                                    {showRateEditor ? (
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={defaultRate}
                                                onChange={(e) => setDefaultRate(e.target.value)}
                                                className={`${dateInputClass} sm:max-w-[140px] ${font.mono} font-bold`}
                                                placeholder="Ex: 30"
                                            />
                                            <div className="flex gap-2 flex-1">
                                                <Button
                                                    variant="primary"
                                                    onClick={handleSaveDefaultRate}
                                                    loading={savingDefaultRate}
                                                    disabled={savingDefaultRate}
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    Salvar e recalcular pendentes
                                                </Button>
                                                {(commissionRate || 0) > 0 && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setDefaultRate(String(commissionRate || 0));
                                                            setShowRateEditor(false);
                                                        }}
                                                        disabled={savingDefaultRate}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className={`text-sm ${colors.textSecondary}`}>
                                            Novos atendimentos usam <span className={`${colors.text} font-bold`}>{commissionRate}%</span>.
                                            Comissão de produto vem do % cadastrado em cada produto.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1 flex items-center gap-1`}>
                                    <Scissors className="w-3 h-3" /> Serviços
                                </p>
                                <p className={`${colors.text} text-sm md:text-lg font-bold`}>{serviceCount}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1 flex items-center gap-1`}>
                                    <Package className="w-3 h-3" /> Produtos
                                </p>
                                <p className={`${colors.text} text-sm md:text-lg font-bold`}>{productUnits}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Faturamento</p>
                                <p className={`${colors.text} text-sm md:text-lg ${font.mono} font-bold leading-none`}>{currencySymbol} {totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Comissões</p>
                                <p className={`text-sm md:text-lg ${font.mono} font-bold leading-none ${accent.text}`}>{currencySymbol} {totalCommission.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className={`flex flex-col gap-3 ${colors.surface} p-3 md:p-4 rounded-2xl ${colors.border} border`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={`${colors.textMuted} text-xs uppercase ${font.mono} block px-1`}>Período</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={dateInputClass} />
                                        </div>
                                        <div className="flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={dateInputClass} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col space-y-2">
                                    <label className={`${colors.textMuted} text-xs uppercase ${font.mono} block px-1`}>Atalhos e Filtros</label>
                                    <div className="flex flex-wrap gap-2">
                                        <div className={`flex ${colors.inputBg} p-1 rounded-xl ${colors.border} border flex-1 min-w-[140px]`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const range = currentMonthRange();
                                                    setStartDate(range.start);
                                                    setEndDate(range.end);
                                                }}
                                                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold uppercase hover:bg-theme-card transition-all ${colors.textSecondary} hover:text-theme-text`}
                                            >
                                                Este Mês
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const range = previousMonthRange();
                                                    setStartDate(range.start);
                                                    setEndDate(range.end);
                                                }}
                                                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold uppercase hover:bg-theme-card transition-all ${colors.textSecondary} hover:text-theme-text border-l ${colors.divider}`}
                                            >
                                                Mês Passado
                                            </button>
                                        </div>
                                        <div className={`flex ${colors.inputBg} p-1 rounded-xl ${colors.border} border flex-1 min-w-[180px]`}>
                                            {([
                                                { id: 'all', label: 'Tudo' },
                                                { id: 'service', label: 'Serviços' },
                                                { id: 'product', label: 'Produtos' },
                                            ] as const).map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => setKindFilter(s.id)}
                                                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold uppercase transition-all ${kindFilter === s.id ? `${colors.card} ${colors.text} shadow-[var(--elevation-1)]` : `${colors.textMuted} hover:text-theme-textSecondary`}`}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={`flex ${colors.inputBg} p-1 rounded-xl ${colors.border} border flex-1 min-w-[160px]`}>
                                            {(['all', 'pending', 'paid'] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setStatusFilter(s)}
                                                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold uppercase transition-all ${statusFilter === s ? `${colors.card} ${colors.text} shadow-[var(--elevation-1)]` : `${colors.textMuted} hover:text-theme-textSecondary`}`}
                                                >
                                                    {s === 'all' ? 'Status' : s === 'pending' ? 'Pendente' : 'Pago'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar ${colors.surface}`}>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                <Loader2 className={`w-10 h-10 animate-spin ${accent.text}`} />
                                <p className={`${colors.textMuted} ${font.mono} text-xs uppercase tracking-widest`}>Sincronizando...</p>
                            </div>
                        ) : filteredLines.length === 0 ? (
                            <div className={`text-center py-20 ${colors.surface} rounded-[32px] border-2 border-dashed ${colors.border}`}>
                                <Calendar className={`w-12 h-12 ${colors.textMuted} mx-auto mb-4`} />
                                <p className={`${colors.textSecondary} font-medium`}>Nenhum lançamento encontrado.</p>
                                <p className={`${colors.textMuted} text-xs mt-1 uppercase ${font.mono}`}>Ajuste os filtros acima</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredLines.map((line) => (
                                    <div
                                        key={line.id}
                                        className={`group ${colors.card} ${colors.border} border rounded-2xl p-4 md:p-5 hover:border-theme-border transition-all duration-300`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className={`hidden md:flex flex-col items-center justify-center min-w-[60px] py-2 ${colors.card} rounded-xl ${colors.border} border`}>
                                                    <span className={`text-xs font-bold ${colors.textMuted} uppercase`}>{new Date(line.occurred_at).toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                                    <span className={`text-xs font-bold ${colors.textSecondary} uppercase leading-none mt-0.5`}>{new Date(line.occurred_at).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`md:hidden text-xs ${font.mono} font-bold ${colors.textMuted} ${colors.inputBg} px-1.5 py-0.5 rounded ${colors.border} border`}>
                                                            {new Date(line.occurred_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {new Date(line.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className={`hidden md:block text-xs ${font.mono} font-bold ${colors.textMuted} uppercase`}>
                                                            {new Date(line.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${colors.surface} ${colors.textSecondary} ${colors.border} border inline-flex items-center gap-1`}>
                                                            {line.kind === 'service' ? <Scissors className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                            {line.kind === 'service' ? 'Serviço' : 'Produto'}
                                                        </span>
                                                        {line.paid ? (
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${status.successBg} ${status.success} ${status.successBorder} border`}>PAGO</span>
                                                        ) : (
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${status.warningBg} ${status.warning} ${status.warningBorder} border`}>PENDENTE</span>
                                                        )}
                                                    </div>
                                                    <h4 className={`${colors.text} font-bold text-base md:text-lg mb-0.5 uppercase tracking-tight leading-tight`}>{line.client_name}</h4>
                                                    <p className={`${colors.textMuted} text-xs`}>
                                                        {line.title}
                                                        {line.subtitle ? ` · ${line.subtitle}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-3 md:pt-0 border-t md:border-t-0 ${colors.divider}`}>
                                                <div className="text-left md:text-right">
                                                    <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} font-bold mb-0.5`}>Valor</p>
                                                    <p className={`${colors.text} text-xs md:text-sm ${font.mono} font-bold`}>{currencySymbol} {line.price.toFixed(2)}</p>
                                                </div>
                                                <div className={`h-6 md:h-8 w-px ${colors.divider}`}></div>
                                                <div className={`text-right ${colors.card} md:px-4 px-3 py-2 rounded-xl ${colors.border} border relative md:min-w-[120px] min-w-[100px]`}>
                                                    <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} font-bold mb-0.5`}>
                                                        Comissão ({line.commission_rate}%)
                                                    </p>
                                                    <p className={`${font.mono} font-bold text-sm md:text-lg ${accent.text} leading-none`}>
                                                        {currencySymbol} {line.commission_amount.toFixed(2)}
                                                    </p>
                                                    {line.kind === 'service' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingService(line);
                                                                const rate = line.commission_rate > 0 ? line.commission_rate : commissionRate;
                                                                const amount = line.commission_amount > 0
                                                                    ? line.commission_amount
                                                                    : (line.price * (rate || 0)) / 100;
                                                                setEditValue(amount.toFixed(2));
                                                                setEditRate(String(rate || 0));
                                                            }}
                                                            className={`absolute -top-1.5 -right-1.5 w-6 h-6 ${colors.surface} ${colors.surfaceHover} ${colors.text} rounded-lg flex items-center justify-center shadow-[var(--elevation-1)] ${colors.border} border transition-transform hover:scale-110 active:scale-95`}
                                                            aria-label="Editar comissão deste serviço"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`p-4 md:p-8 border-t ${colors.divider} ${colors.card} backdrop-blur-md rounded-b-3xl`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
                                <div className="hidden md:block">
                                    <Button
                                        variant="secondary"
                                        icon={<Download className="w-4 h-4" />}
                                        onClick={handleExport}
                                        className="h-11 px-6"
                                        disabled={filteredLines.length === 0}
                                    >
                                        Relatório CSV
                                    </Button>
                                </div>
                                <div className={`h-10 w-px ${colors.divider} hidden md:block`}></div>
                                <div className="text-center md:text-right w-full md:w-auto">
                                    <p className={`${colors.textMuted} text-xs uppercase ${font.mono} font-bold mb-1 tracking-wide leading-none`}>Total do período</p>
                                    <p className={`${font.mono} font-bold text-2xl md:text-4xl ${accent.text} leading-none whitespace-nowrap tabular-nums`}>
                                        {currencySymbol} {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="md:hidden flex-1">
                                    <Button
                                        variant="secondary"
                                        onClick={handleExport}
                                        className="w-full h-11 text-xs"
                                        disabled={filteredLines.length === 0}
                                    >
                                        CSV
                                    </Button>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={onClose}
                                    className="flex-[2] md:flex-none md:px-12"
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                open={!!editingService}
                onClose={() => setEditingService(null)}
                title="Editar Comissão do Serviço"
                size="sm"
            >
                {editingService && (
                    <div className="space-y-4">
                        <div className={`text-sm ${colors.textSecondary}`}>
                            <p>Serviço: <span className={`${colors.text} font-medium`}>{editingService.title}</span></p>
                            <p>Valor do Serviço: <span className={`${colors.text} font-medium`}>{currencySymbol} {editingService.price.toFixed(2)}</span></p>
                        </div>

                        <div>
                            <label className={`${colors.textSecondary} text-xs uppercase ${font.mono} mb-1 block`}>
                                Taxa deste atendimento (%)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={editRate}
                                onChange={(e) => {
                                    const rate = parseFloat(e.target.value);
                                    setEditRate(e.target.value);
                                    if (!isNaN(rate)) {
                                        setEditValue(((editingService.price * rate) / 100).toFixed(2));
                                    }
                                }}
                                className={`w-full p-2 ${colors.inputBg} ${colors.inputBorder} border rounded-lg ${colors.text} ${font.mono}`}
                            />
                        </div>

                        <div className={`flex items-center gap-3`}>
                            <div className={`h-px ${colors.divider} flex-1`}></div>
                            <span className={`text-xs ${colors.textMuted} ${font.mono}`}>OU VALOR FIXO</span>
                            <div className={`h-px ${colors.divider} flex-1`}></div>
                        </div>

                        <div>
                            <label className={`${colors.textSecondary} text-xs uppercase ${font.mono} mb-1 block`}>
                                Valor da comissão ({currencySymbol})
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className={`w-full p-2 ${colors.inputBg} ${colors.inputBorder} border rounded-lg ${colors.text} ${font.mono} font-bold text-lg focus:border-[var(--color-input-focus)] focus:outline-none`}
                            />
                        </div>

                        {editingService.paid && (
                            <div className={`${status.warningBg} ${status.warningBorder} border rounded p-3`}>
                                <p className={`${status.warning} text-xs`}>
                                    Atenção: Esta comissão já consta como PAGA. Alterar o valor pode gerar inconsistências no caixa.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" fullWidth onClick={() => setEditingService(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={handleUpdateCommission}
                                disabled={saving}
                                loading={saving}
                                icon={!saving ? <Check className="w-4 h-4" /> : undefined}
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};
