import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Download, Loader2, Check } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

interface ServiceDetail {
    id: string; // commission_record id
    appointment_time: string;
    client_name: string;
    service_name: string;
    service_price: number;
    commission_amount: number;
    commission_rate: number;
    paid: boolean;
    paid_at: string | null;
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
    const [services, setServices] = useState<ServiceDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('pending');

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
    }, [professionalId, startDate, endDate, statusFilter]);

    const fetchServiceDetails = async () => {
        setLoading(true);
        try {
            // Fetch commission records directly, joining appointments and clients
            let query = supabase
                .from('commission_records')
                .select(`
                    id,
                    commission_amount,
                    commission_rate,
                    paid,
                    paid_at,
                    appointments (
                        appointment_time,
                        service,
                        price,
                        clients (name)
                    )
                `)
                .eq('professional_id', professionalId)
                .gte('created_at', new Date(startDate).toISOString())
                .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
                .order('created_at', { ascending: false });

            if (statusFilter === 'paid') {
                query = query.eq('paid', true);
            } else if (statusFilter === 'pending') {
                query = query.eq('paid', false);
            }

            const { data, error } = await query;

            if (error) throw error;

            const formattedData: ServiceDetail[] = (data || []).map((record: any) => {
                const appointment = record.appointments;
                const clientName = appointment?.clients?.name || 'Cliente Desconhecido';

                return {
                    id: record.id,
                    appointment_time: appointment?.appointment_time || 'N/A',
                    client_name: clientName,
                    service_name: appointment?.service || 'Serviço Desconhecido',
                    service_price: appointment?.price || 0,
                    commission_amount: record.commission_amount || 0,
                    commission_rate: record.commission_rate || commissionRate,
                    paid: record.paid,
                    paid_at: record.paid_at
                };
            });

            setServices(formattedData);
        } catch (error) {
            console.error('Error fetching service details:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalCommission = services.reduce((sum, s) => sum + s.commission_amount, 0);
    const totalRevenue = services.reduce((sum, s) => sum + s.service_price, 0);

    const handleExport = () => {
        // Create CSV content
        const headers = ['Data', 'Cliente', 'Serviço', 'Valor Serviço', 'Comissão', 'Taxa (%)', 'Status'];
        const rows = services.map(s => [
            new Date(s.appointment_time).toLocaleDateString('pt-BR'),
            s.client_name,
            s.service_name,
            `${currencySymbol} ${s.service_price.toFixed(2)}`,
            `${currencySymbol} ${s.commission_amount.toFixed(2)}`,
            `${s.commission_rate}%`,
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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-heading text-white uppercase">Detalhes de Comissões</h2>
                            <p className="text-neutral-400 mt-1">
                                {professionalName} • {commissionRate}% de comissão
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-neutral-400 text-xs uppercase font-mono mb-2 block">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Data Inicial (Serviço Realizado)
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-neutral-400 text-xs uppercase font-mono mb-2 block">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Data Final (Serviço Realizado)
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-neutral-400 text-xs uppercase font-mono mb-2 block">Status de Pagamento</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
                                className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-sm"
                            >
                                <option value="pending">Pendente (A Pagar)</option>
                                <option value="paid">Pago (Histórico)</option>
                                <option value="all">Todos</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                        </div>
                    ) : services.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <p>Nenhum serviço encontrado no período selecionado com status "{statusFilter === 'pending' ? 'Pendente' : statusFilter === 'paid' ? 'Pago' : 'Todos'}".</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className={`border-2 rounded-lg p-4 transition-colors ${service.paid
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono text-neutral-500">
                                                    {new Date(service.appointment_time).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${service.paid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {service.paid ? 'PAGO' : 'PENDENTE'}
                                                </span>
                                            </div>
                                            <p className="text-white font-bold mb-1">{service.client_name}</p>
                                            <p className="text-neutral-400 text-sm">{service.service_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-neutral-500 text-xs mb-1">Valor do Serviço</p>
                                            <p className="text-white font-mono font-bold mb-2">
                                                {currencySymbol} {service.service_price.toFixed(2)}
                                            </p>
                                            <p className="text-neutral-500 text-xs mb-1">Comissão ({service.commission_rate}%)</p>
                                            <p className={`font-mono font-bold text-lg ${accentColor}`}>
                                                {currencySymbol} {service.commission_amount.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 bg-neutral-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Total de Serviços</p>
                                <p className="text-white font-bold text-xl">{services.length}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Receita Total</p>
                                <p className="text-white font-mono font-bold text-xl">
                                    {currencySymbol} {totalRevenue.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Total Comissões</p>
                                <p className={`font-mono font-bold text-2xl ${accentColor}`}>
                                    {currencySymbol} {totalCommission.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <BrutalButton
                            variant="secondary"
                            icon={<Download />}
                            onClick={handleExport}
                            className="flex-1"
                            disabled={services.length === 0}
                        >
                            Exportar CSV
                        </BrutalButton>
                        <BrutalButton
                            variant="primary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Fechar
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};