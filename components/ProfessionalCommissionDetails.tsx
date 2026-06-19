import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Download, Loader2, Pencil, Check, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

interface ServiceDetail {
    id: string;
    appointment_time: string;
    client_name: string;
    service: string;
    price: number;
    commission_amount: number;
    commission_rate: number;
    paid: boolean;
    paid_at: string | null;
    finance_record_id: string;
}

interface ProfessionalCommissionDetailsProps {
    professionalId: string;
    professionalName: string;
    commissionRate: number;
    onClose: () => void;
    accentColor: string;
    currencySymbol: string;
}

export const ProfessionalCommissionDetails: React.FC<ProfessionalCommissionDetailsProps> = ({
    professionalId,
    professionalName,
    commissionRate,
    onClose,
    accentColor,
    currencySymbol
}) => {
    const { user } = useAuth();
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const [services, setServices] = useState<ServiceDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

    const [editingService, setEditingService] = useState<ServiceDetail | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editRate, setEditRate] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchServiceDetails();
        }
    }, [professionalId, startDate, endDate]);

    const fetchServiceDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
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
                        commission_paid
                    )
                `)
                .eq('professional_id', professionalId)
                .eq('status', 'Completed')
                .gte('appointment_time', new Date(startDate).toISOString())
                .lte('appointment_time', new Date(endDate + 'T23:59:59').toISOString())
                .order('appointment_time', { ascending: false });

            if (error) throw error;

            const formattedData: ServiceDetail[] = (data || []).map((apt: any) => {
                const financeRecord = apt.finance_records?.[0];
                return {
                    id: apt.id,
                    appointment_time: apt.appointment_time,
                    client_name: apt.clients?.name || 'Cliente Desconhecido',
                    service: apt.service,
                    price: apt.price,
                    commission_amount: financeRecord?.commission_value || 0,
                    commission_rate: financeRecord?.commission_rate || commissionRate,
                    paid: financeRecord?.commission_paid || false,
                    paid_at: null,
                    finance_record_id: financeRecord?.id
                };
            });

            setServices(formattedData);
        } catch (error) {
            console.error('Error fetching service details:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(service => {
        if (statusFilter === 'paid') return service.paid;
        if (statusFilter === 'pending') return !service.paid;
        return true;
    });

    const totalCommission = filteredServices.reduce((sum, s) => sum + s.commission_amount, 0);
    const totalRevenue = filteredServices.reduce((sum, s) => sum + s.price, 0);

    const handleExport = () => {
        const headers = ['Data', 'Cliente', 'Serviço', 'Valor', 'Comissão', 'Status'];
        const rows = filteredServices.map(s => [
            new Date(s.appointment_time).toLocaleDateString('pt-BR'),
            s.client_name,
            s.service,
            `${currencySymbol} ${s.price.toFixed(2)}`,
            `${currencySymbol} ${s.commission_amount.toFixed(2)}`,
            s.paid ? 'Pago' : 'Pendente'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `comissoes_${professionalName.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`;
        link.click();
    };

    const handleUpdateCommission = async () => {
        if (!editingService || !user) return;

        setSaving(true);
        try {
            const valStr = editValue.toString().replace(',', '.');
            const rateStr = editRate.toString().replace(',', '.');

            const newValue = parseFloat(valStr);
            const newRate = parseFloat(rateStr);

            if (isNaN(newValue) || isNaN(newRate)) {
                alert('Por favor, insira valores válidos.');
                setSaving(false);
                return;
            }

            if (!editingService.finance_record_id) {
                const { error: insertError } = await supabase
                    .from('finance_records')
                    .insert({
                        appointment_id: editingService.id,
                        user_id: user.id,
                        professional_id: professionalId,
                        barber_name: professionalName,
                        client_name: editingService.client_name,
                        service_name: editingService.service,
                        revenue: editingService.price,
                        commission_rate: newRate,
                        commission_value: newValue,
                        type: 'revenue',
                        created_at: editingService.appointment_time
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
            fetchServiceDetails();
        } catch (error: any) {
            console.error('Error updating commission:', error);
            alert(`Erro ao atualizar comissão: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    const dateInputClass = `w-full p-2 md:p-2.5 ${colors.inputBg} ${colors.inputBorder} border md:rounded-xl rounded-lg ${colors.text} text-[11px] md:text-xs focus:border-[var(--color-input-focus)] outline-none transition-colors`;

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
                                    <h2 className={`text-lg md:text-2xl ${font.heading} ${colors.text} uppercase tracking-tight leading-none md:leading-normal`}>Serviços e Comissões</h2>
                                    <p className={`${colors.textMuted} text-[10px] md:text-sm mt-0.5`}>
                                        <span className={`${colors.text} font-bold`}>{professionalName}</span> • Taxa: <span className={accent.text}>{commissionRate}%</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className={`${colors.textMuted} hover:${colors.text} transition-all p-2 hover:${colors.surface} rounded-xl border border-transparent hover:${colors.border} active:scale-95`}
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-[9px] md:text-[10px] ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Serviços</p>
                                <p className={`${colors.text} text-sm md:text-lg font-bold`}>{filteredServices.length}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-[9px] md:text-[10px] ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Faturamento</p>
                                <p className={`${colors.text} text-sm md:text-lg ${font.mono} font-bold leading-none`}>{currencySymbol} {totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-[9px] md:text-[10px] ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Comissões</p>
                                <p className={`text-sm md:text-lg ${font.mono} font-bold leading-none ${accent.text}`}>{currencySymbol} {totalCommission.toFixed(2)}</p>
                            </div>
                            <div className={`${colors.surface} ${colors.border} border md:rounded-2xl rounded-xl p-2.5 md:p-4`}>
                                <p className={`text-[9px] md:text-[10px] ${colors.textMuted} uppercase ${font.mono} mb-0.5 md:mb-1`}>Média por serviço</p>
                                <p className={`${colors.text} text-sm md:text-lg ${font.mono} font-bold leading-none`}>
                                    {currencySymbol} {filteredServices.length > 0 ? (totalRevenue / filteredServices.length).toFixed(2) : '0.00'}
                                </p>
                            </div>
                        </div>

                        <div className={`flex flex-col gap-3 ${colors.surface} p-3 md:p-4 rounded-2xl ${colors.border} border opacity-80`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} block px-1`}>Período de Atendimentos</label>
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
                                    <label className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} block px-1`}>Atalhos e Filtros</label>
                                    <div className="flex flex-wrap md:flex-nowrap gap-2">
                                        <div className={`flex ${colors.inputBg} p-1 rounded-xl ${colors.border} border flex-1 min-w-[140px]`}>
                                            <button
                                                onClick={() => {
                                                    const today = new Date();
                                                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                                    setStartDate(firstDay.toISOString().split('T')[0]);
                                                    setEndDate(lastDay.toISOString().split('T')[0]);
                                                }}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase hover:${colors.card} transition-all ${colors.textSecondary} hover:${colors.text}`}
                                            >
                                                Este Mês
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const today = new Date();
                                                    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                                    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                                                    setStartDate(firstDay.toISOString().split('T')[0]);
                                                    setEndDate(lastDay.toISOString().split('T')[0]);
                                                }}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase hover:${colors.card} transition-all ${colors.textSecondary} hover:${colors.text} border-l ${colors.divider}`}
                                            >
                                                Mês Passado
                                            </button>
                                        </div>
                                        <div className={`flex ${colors.inputBg} p-1 rounded-xl ${colors.border} border flex-1 min-w-[160px]`}>
                                            {(['all', 'pending', 'paid'] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatusFilter(s)}
                                                    className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all ${statusFilter === s ? `${colors.card} ${colors.text} shadow-lg` : `${colors.textMuted} hover:${colors.textSecondary}`}`}
                                                >
                                                    {s === 'all' ? 'Tudo' : s === 'pending' ? 'Pendente' : 'Pago'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar ${colors.surface} opacity-40`}>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                <Loader2 className={`w-10 h-10 animate-spin ${accent.text}`} />
                                <p className={`${colors.textMuted} ${font.mono} text-[10px] uppercase tracking-widest`}>Sincronizando serviços...</p>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <div className={`text-center py-20 ${colors.surface} rounded-[32px] border-2 border-dashed ${colors.border}`}>
                                <Calendar className={`w-12 h-12 ${colors.textMuted} mx-auto mb-4 opacity-50`} />
                                <p className={`${colors.textSecondary} font-medium`}>Nenhum serviço encontrado.</p>
                                <p className={`${colors.textMuted} text-[11px] mt-1 uppercase ${font.mono}`}>Ajuste os filtros de data acima</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredServices.map((service) => (
                                    <div
                                        key={service.id}
                                        className={`group ${colors.card} ${colors.border} border rounded-2xl p-4 md:p-5 hover:${colors.border} transition-all duration-300`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className={`hidden md:flex flex-col items-center justify-center min-w-[60px] py-2 ${colors.card} rounded-xl ${colors.border} border`}>
                                                    <span className={`text-[10px] font-bold ${colors.textMuted} uppercase`}>{new Date(service.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                                    <span className={`text-[10px] font-bold ${colors.textSecondary} uppercase leading-none mt-0.5`}>{new Date(service.appointment_time).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`md:hidden text-[10px] ${font.mono} font-bold ${colors.textMuted} ${colors.inputBg} px-1.5 py-0.5 rounded ${colors.border} border`}>
                                                            {new Date(service.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {new Date(service.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className={`hidden md:block text-[10px] ${font.mono} font-bold ${colors.textMuted} uppercase`}>
                                                            {new Date(service.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {service.paid ? (
                                                            <span className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md ${status.successBg} ${status.success} ${status.successBorder} border`}>PAGO</span>
                                                        ) : (
                                                            <span className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md ${status.warningBg} ${status.warning} ${status.warningBorder} border`}>PENDENTE</span>
                                                        )}
                                                    </div>
                                                    <h4 className={`${colors.text} font-bold text-base md:text-lg mb-0.5 uppercase tracking-tight leading-tight`}>{service.client_name}</h4>
                                                    <p className={`${colors.textMuted} text-xs flex items-center gap-1.5 italic`}>
                                                        <span className={`not-italic text-xs grayscale opacity-50`}>✂️</span> {service.service}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-3 md:pt-0 border-t md:border-t-0 ${colors.divider}`}>
                                                <div className="text-left md:text-right">
                                                    <p className={`text-[9px] ${colors.textMuted} uppercase ${font.mono} font-bold mb-0.5`}>Preço</p>
                                                    <p className={`${colors.text} text-xs md:text-sm ${font.mono} font-bold`}>{currencySymbol} {service.price.toFixed(2)}</p>
                                                </div>
                                                <div className={`h-6 md:h-8 w-px ${colors.divider}`}></div>
                                                <div className={`text-right ${colors.card} opacity-80 md:px-4 px-3 py-2 rounded-xl ${colors.border} border group-hover:${colors.border} transition-colors relative md:min-w-[120px] min-w-[100px]`}>
                                                    <p className={`text-[8px] md:text-[9px] ${colors.textMuted} uppercase ${font.mono} font-bold mb-0.5`}>Comissão ({service.commission_rate}%)</p>
                                                    <p className={`${font.mono} font-bold text-sm md:text-lg ${accent.text} leading-none`}>
                                                        {currencySymbol} {service.commission_amount.toFixed(2)}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setEditingService(service);
                                                            setEditValue(service.commission_amount.toFixed(2));
                                                            setEditRate(service.commission_rate.toString());
                                                        }}
                                                        className={`absolute -top-1.5 -right-1.5 w-6 h-6 ${colors.surface} hover:${colors.surfaceHover} ${colors.text} rounded-lg flex items-center justify-center shadow-lg ${colors.border} border transition-transform hover:scale-110 active:scale-95`}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
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
                                        disabled={filteredServices.length === 0}
                                    >
                                        Relatório CSV
                                    </Button>
                                </div>
                                <div className={`h-10 w-px ${colors.divider} hidden md:block`}></div>
                                <div className="text-center md:text-right w-full md:w-auto">
                                    <p className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} font-bold mb-1 tracking-widest leading-none`}>Total Comissões do Período</p>
                                    <p className={`${font.mono} font-bold text-2xl md:text-4xl ${accent.text} leading-none`}>
                                        {currencySymbol} {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="md:hidden flex-1">
                                    <Button
                                        variant="secondary"
                                        onClick={handleExport}
                                        className="w-full h-11 text-[10px]"
                                        disabled={filteredServices.length === 0}
                                    >
                                        CSV
                                    </Button>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={onClose}
                                    className="flex-[2] md:flex-none md:px-12 whitespace-nowrap"
                                >
                                    Fechar Painel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                open={!!editingService}
                onClose={() => setEditingService(null)}
                title="Editar Comissão"
                size="sm"
            >
                {editingService && (
                    <div className="space-y-4">
                        <div className={`text-sm ${colors.textSecondary}`}>
                            <p>Serviço: <span className={`${colors.text} font-medium`}>{editingService.service}</span></p>
                            <p>Valor do Serviço: <span className={`${colors.text} font-medium`}>{currencySymbol} {editingService.price.toFixed(2)}</span></p>
                        </div>

                        <div>
                            <label className={`${colors.textSecondary} text-xs uppercase ${font.mono} mb-1 block`}>
                                Nova Taxa (%)
                            </label>
                            <input
                                type="number"
                                value={editRate}
                                onChange={(e) => {
                                    const rate = parseFloat(e.target.value);
                                    setEditRate(e.target.value);
                                    if (!isNaN(rate)) {
                                        const newVal = (editingService.price * rate) / 100;
                                        setEditValue(newVal.toFixed(2));
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
                                Novo Valor ({currencySymbol})
                            </label>
                            <input
                                type="number"
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
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => setEditingService(null)}
                            >
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
