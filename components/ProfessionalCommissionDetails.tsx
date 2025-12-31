import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Download, Loader2, Pencil, Check, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

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
    finance_record_id: string; // To support editing
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
    const [services, setServices] = useState<ServiceDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

    // Edit State
    const [editingService, setEditingService] = useState<ServiceDetail | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editRate, setEditRate] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Set default dates (current month)
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
            // Fetch appointments with commission records
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
        // Create CSV content
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

        // Download CSV
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
            // Support both dot and comma for decimal values
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
                // AUTO-REPAIR: Create the missing finance record
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

            // Success
            setEditingService(null);
            fetchServiceDetails(); // Refresh data
        } catch (error: any) {
            console.error('Error updating commission:', error);
            alert(`Erro ao atualizar comissão: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 md:p-4 backdrop-blur-md">
            <div className="bg-neutral-900 border-0 md:border-2 border-neutral-800 md:rounded-3xl w-full max-w-5xl h-full md:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-8 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center bg-neutral-800 border border-neutral-700 shadow-inner`}>
                                <TrendingUp className={`w-5 h-5 md:w-6 md:h-6 ${accentColor}`} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-heading text-white uppercase tracking-tight leading-none md:leading-normal">Serviços e Comissões</h2>
                                <p className="text-neutral-500 text-[10px] md:text-sm mt-0.5">
                                    <span className="text-white font-bold">{professionalName}</span> • Taxa: <span className={accentColor}>{commissionRate}%</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-500 hover:text-white transition-all p-2 hover:bg-neutral-800 rounded-xl border border-transparent hover:border-neutral-700 active:scale-95"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {/* Quick Stats - Enhanced Responsiveness */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                        <div className="bg-black/40 border border-neutral-800 md:rounded-2xl rounded-xl p-2.5 md:p-4">
                            <p className="text-[9px] md:text-[10px] text-neutral-600 uppercase font-mono mb-0.5 md:mb-1">Serviços</p>
                            <p className="text-white text-sm md:text-lg font-bold">{filteredServices.length}</p>
                        </div>
                        <div className="bg-black/40 border border-neutral-800 md:rounded-2xl rounded-xl p-2.5 md:p-4">
                            <p className="text-[9px] md:text-[10px] text-neutral-600 uppercase font-mono mb-0.5 md:mb-1">Faturamento</p>
                            <p className="text-white text-sm md:text-lg font-mono font-bold leading-none">{currencySymbol} {totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="bg-black/40 border border-neutral-800 md:rounded-2xl rounded-xl p-2.5 md:p-4">
                            <p className="text-[9px] md:text-[10px] text-neutral-600 uppercase font-mono mb-0.5 md:mb-1">Comissões</p>
                            <p className={`text-sm md:text-lg font-mono font-bold leading-none ${accentColor}`}>{currencySymbol} {totalCommission.toFixed(2)}</p>
                        </div>
                        <div className="bg-black/40 border border-neutral-800 md:rounded-2xl rounded-xl p-2.5 md:p-4">
                            <p className="text-[9px] md:text-[10px] text-neutral-600 uppercase font-mono mb-0.5 md:mb-1">Ticket Médio</p>
                            <p className="text-white text-sm md:text-lg font-mono font-bold leading-none">
                                {currencySymbol} {filteredServices.length > 0 ? (totalRevenue / filteredServices.length).toFixed(2) : '0.00'}
                            </p>
                        </div>
                    </div>

                    {/* Filters - Improved for Mobile */}
                    <div className="flex flex-col gap-3 bg-neutral-800/20 p-3 md:p-4 rounded-2xl border border-neutral-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-neutral-500 text-[9px] md:text-[10px] uppercase font-mono block px-1">📅 Período de Atendimentos</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full p-2 md:p-2.5 bg-black border border-neutral-700 md:rounded-xl rounded-lg text-white text-[11px] md:text-xs focus:border-neutral-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full p-2 md:p-2.5 bg-black border border-neutral-700 md:rounded-xl rounded-lg text-white text-[11px] md:text-xs focus:border-neutral-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-neutral-500 text-[9px] md:text-[10px] uppercase font-mono block px-1">Atalhos e Filtros</label>
                                <div className="flex flex-wrap md:flex-nowrap gap-2">
                                    <div className="flex bg-black p-1 rounded-xl border border-neutral-700 flex-1 min-w-[140px]">
                                        <button
                                            onClick={() => {
                                                const today = new Date();
                                                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                                setStartDate(firstDay.toISOString().split('T')[0]);
                                                setEndDate(lastDay.toISOString().split('T')[0]);
                                            }}
                                            className="flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase hover:bg-neutral-900 transition-all text-neutral-400 hover:text-white"
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
                                            className="flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase hover:bg-neutral-900 transition-all text-neutral-400 hover:text-white border-l border-neutral-800"
                                        >
                                            Mês Passado
                                        </button>
                                    </div>
                                    <div className="flex bg-black p-1 rounded-xl border border-neutral-700 flex-1 min-w-[160px]">
                                        {(['all', 'pending', 'paid'] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setStatusFilter(s)}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all ${statusFilter === s ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
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

                {/* Content - Optimized List for Mobile */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-neutral-900/40">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className={`w-10 h-10 animate-spin ${accentColor}`} />
                            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Sincronizando serviços...</p>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-800/10 rounded-[32px] border-2 border-dashed border-neutral-800/50">
                            <Calendar className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                            <p className="text-neutral-500 font-medium">Nenhum serviço encontrado.</p>
                            <p className="text-neutral-600 text-[11px] mt-1 uppercase font-mono">Ajuste os filtros de data acima</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredServices.map((service) => (
                                <div
                                    key={service.id}
                                    className="group bg-neutral-950/50 border border-neutral-800/80 rounded-2xl p-4 md:p-5 hover:border-neutral-700 transition-all duration-300"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3 md:gap-4">
                                            <div className="hidden md:flex flex-col items-center justify-center min-w-[60px] py-2 bg-neutral-900 rounded-xl border border-neutral-800">
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">{new Date(service.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase leading-none mt-0.5">{new Date(service.appointment_time).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="md:hidden text-[10px] font-mono font-bold text-neutral-500 bg-black/50 px-1.5 py-0.5 rounded border border-neutral-800">
                                                        {new Date(service.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {new Date(service.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="hidden md:block text-[10px] font-mono font-bold text-neutral-600 uppercase">
                                                        {new Date(service.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {service.paid ? (
                                                        <span className="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">PAGO</span>
                                                    ) : (
                                                        <span className="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">PENDENTE</span>
                                                    )}
                                                </div>
                                                <h4 className="text-white font-bold text-base md:text-lg mb-0.5 uppercase tracking-tight leading-tight">{service.client_name}</h4>
                                                <p className="text-neutral-500 text-xs flex items-center gap-1.5 italic">
                                                    <span className="not-italic text-xs grayscale opacity-50">✂️</span> {service.service}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-800/50">
                                            <div className="text-left md:text-right">
                                                <p className="text-[9px] text-neutral-600 uppercase font-mono font-bold mb-0.5">Preço</p>
                                                <p className="text-white text-xs md:text-sm font-mono font-bold">{currencySymbol} {service.price.toFixed(2)}</p>
                                            </div>
                                            <div className="h-6 md:h-8 w-px bg-neutral-800"></div>
                                            <div className="text-right bg-neutral-900/80 md:px-4 px-3 py-2 rounded-xl border border-neutral-800 group-hover:border-neutral-700 transition-colors relative md:min-w-[120px] min-w-[100px]">
                                                <p className="text-[8px] md:text-[9px] text-neutral-500 uppercase font-mono font-bold mb-0.5">Comissão ({service.commission_rate}%)</p>
                                                <p className={`font-mono font-bold text-sm md:text-lg ${accentColor} leading-none`}>
                                                    {currencySymbol} {service.commission_amount.toFixed(2)}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setEditingService(service);
                                                        setEditValue(service.commission_amount.toFixed(2));
                                                        setEditRate(service.commission_rate.toString());
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center shadow-lg border border-neutral-700 transition-transform hover:scale-110 active:scale-95"
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

                {/* Footer - Stacks on Mobile */}
                <div className="p-4 md:p-8 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-md rounded-b-3xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
                            <div className="hidden md:block">
                                <BrutalButton
                                    variant="secondary"
                                    icon={<Download className="w-4 h-4" />}
                                    onClick={handleExport}
                                    className="h-11 px-6 rounded-2xl"
                                    disabled={filteredServices.length === 0}
                                >
                                    Relatório CSV
                                </BrutalButton>
                            </div>
                            <div className="h-10 w-px bg-neutral-800 hidden md:block"></div>
                            <div className="text-center md:text-right w-full md:w-auto">
                                <p className="text-neutral-500 text-[9px] md:text-[10px] uppercase font-mono font-bold mb-1 tracking-widest leading-none">Total Comissões do Período</p>
                                <p className={`font-mono font-bold text-2xl md:text-4xl ${accentColor} leading-none`}>
                                    {currencySymbol} {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="md:hidden flex-1">
                                <BrutalButton
                                    variant="secondary"
                                    onClick={handleExport}
                                    className="w-full h-11 rounded-2xl text-[10px]"
                                    disabled={filteredServices.length === 0}
                                >
                                    CSV
                                </BrutalButton>
                            </div>
                            <BrutalButton
                                variant="primary"
                                onClick={onClose}
                                className="flex-[2] md:flex-none md:px-12 h-11 rounded-2xl md:text-sm text-xs font-bold whitespace-nowrap"
                            >
                                Fechar Painel
                            </BrutalButton>
                        </div>
                    </div>
                </div>
                {/* Edit Commission Modal */}
                {/* We reuse the modal structure or create a small inline modal/popover */}
            </div>

            {/* Edit Commission Dialog - Simple Overlay */}
            {
                editingService && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                        <div className="bg-neutral-900 border-2 border-neutral-700 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    ⚙️ Editar Comissão
                                </h3>
                                <button
                                    onClick={() => setEditingService(null)}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-4 text-sm text-neutral-400">
                                <p>Serviço: <span className="text-white font-medium">{editingService.service}</span></p>
                                <p>Valor do Serviço: <span className="text-white font-medium">{currencySymbol} {editingService.price.toFixed(2)}</span></p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-neutral-400 text-xs uppercase font-mono mb-1 block">
                                        Nova Taxa (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={editRate}
                                        onChange={(e) => {
                                            const rate = parseFloat(e.target.value);
                                            setEditRate(e.target.value);
                                            // Auto-calculate value
                                            if (!isNaN(rate)) {
                                                const newVal = (editingService.price * rate) / 100;
                                                setEditValue(newVal.toFixed(2));
                                            }
                                        }}
                                        className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white font-mono"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                    <span className="text-xs text-neutral-600 font-mono">OU VALOR FIXO</span>
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                </div>

                                <div>
                                    <label className="text-neutral-400 text-xs uppercase font-mono mb-1 block">
                                        Novo Valor ({currencySymbol})
                                    </label>
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => {
                                            setEditValue(e.target.value);
                                            // We don't backward calculate rate perfectly to avoid decimal weirdness, 
                                            // but we could if needed. Ideally user sets one or the other.
                                        }}
                                        className={`w-full p-2 bg-black border border-neutral-700 rounded-lg text-white font-mono font-bold text-lg focus:border-${accentColor} focus:outline-none`}
                                    />
                                </div>

                                {editingService.paid && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                                        <p className="text-yellow-500 text-xs">
                                            ⚠️ Atenção: Esta comissão já consta como PAGA. Alterar o valor pode gerar inconsistências no caixa.
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <BrutalButton
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => setEditingService(null)}
                                    >
                                        Cancelar
                                    </BrutalButton>
                                    <BrutalButton
                                        variant="primary"
                                        className="flex-1"
                                        onClick={handleUpdateCommission}
                                        disabled={saving}
                                        icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    >
                                        {saving ? 'Salvando...' : 'Salvar'}
                                    </BrutalButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
