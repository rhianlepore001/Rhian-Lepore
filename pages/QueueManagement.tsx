import { Card, Button } from '../components/ui';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';


import { Clock, User, Phone, Play, X, Check, Megaphone, Trash2, QrCode, Download, DollarSign, Calendar, Save, AlertTriangle } from 'lucide-react';
import { QueueEntry } from '../types';
import { formatPhone, formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';
import { useQueueEntries, useBusinessSlug, useQueueTeamMembers, useServiceById, useAddManualQueueEntry, useUpdateQueueStatus, useFinishQueueEntry } from '../hooks/useQueue';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal, useToast } from '@/components/ui';

export const QueueManagement: React.FC = () => {
    const { user, region } = useAuth();
    const { accent, isBeauty } = useBrutalTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const addManualMutation = useAddManualQueueEntry();
    const updateStatusMutation = useUpdateQueueStatus();
    const finishMutation = useFinishQueueEntry();
    const { data: rawEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQueueEntries(user?.id ?? '');
    const { data: businessSlug } = useBusinessSlug(user?.id ?? '');
    const { data: teamMembers = [] } = useQueueTeamMembers(user?.id ?? '');

    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedQrPro, setSelectedQrPro] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [addClientName, setAddClientName] = useState('');
    const [addClientPhone, setAddClientPhone] = useState('');
    const [addServiceName, setAddServiceName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [showFinishModal, setShowFinishModal] = useState(false);
    const [finishingEntry, setFinishingEntry] = useState<QueueEntry | null>(null);
    const [finishPrice, setFinishPrice] = useState('');
    const [finishService, setFinishService] = useState('');
    const [finishPro, setFinishPro] = useState('');
    const [isFinishing, setIsFinishing] = useState(false);
    const [finishServiceId, setFinishServiceId] = useState<string | null>(null);
    const { data: finishServiceData } = useServiceById(finishServiceId, user?.id ?? '');
    const [noShowTarget, setNoShowTarget] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    }, []);

    const entries = useMemo(() => rawEntries as QueueEntry[], [rawEntries]);

    const metrics = useMemo(() => ({
        waiting: entries.filter(e => e.status === 'waiting' || e.status === 'calling').length,
        serving: entries.filter(e => e.status === 'serving').length,
        completed: entries.filter(e => e.status === 'completed').length,
    }), [entries]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('queue_manage')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `business_id=eq.${user.id}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['queue', 'entries'] });
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [user, queryClient]);

const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !addClientName.trim()) return;
        setIsAdding(true);
        try {
            await addManualMutation.mutateAsync({
                businessId: user.id,
                clientName: addClientName,
                clientPhone: addClientPhone || '0000000000',
            });
            setShowAddModal(false);
            setAddClientName('');
            setAddClientPhone('');
            setAddServiceName('');
            await queryClient.invalidateQueries({ queryKey: ['queue', 'entries'] });
        } catch (err: any) {
            logger.error('Error adding to queue', err);
            showToast('Não foi possível adicionar à fila. Tente novamente.', 'error');
        } finally {
            setIsAdding(false);
        }
    };

const updateStatus = async (id: string, newStatus: QueueEntry['status']) => {
        if (!user) return;
        try {
            await updateStatusMutation.mutateAsync({
                entryId: id,
                businessId: user.id,
                status: newStatus,
            });

            if (newStatus === 'calling' && audioRef.current) {
                audioRef.current.play().catch(e => logger.warn('Audio play failed', { error: e }));
            }

        } catch (err) {
            logger.error('Error updating status', err);
            showToast('Não foi possível atualizar o status. Tente novamente.', 'error');
        }
    };

    // --- FINISH LOGIC ---
    const openFinishModal = (entry: QueueEntry) => {
        setFinishingEntry(entry);
        setFinishPro(entry.professional_id || (teamMembers.length > 0 ? teamMembers[0].id : ''));
        setFinishServiceId(entry.service_id ?? null);
        if (!entry.service_id) {
            setFinishPrice('0');
            setFinishService('Serviço');
        }
        setShowFinishModal(true);
    };

    useEffect(() => {
        if (finishServiceData) {
            setFinishPrice(finishServiceData.price.toString());
            setFinishService(finishServiceData.name);
        }
    }, [finishServiceData]);

const confirmFinish = async () => {
        if (!finishingEntry || !user) return;
        setIsFinishing(true);
        try {
            const priceVal = parseFloat(finishPrice);
            if (isNaN(priceVal)) throw new Error('Valor inválido');

            await finishMutation.mutateAsync({
                entryId: finishingEntry.id,
                serviceName: finishService,
                finalPrice: priceVal,
                professionalId: finishPro || null,
            });

            setShowFinishModal(false);
            setFinishServiceId(null);

            await queryClient.invalidateQueries({ queryKey: ['queue', 'entries'] });

            showToast('Atendimento finalizado e registrado!', 'success');

        } catch (e: any) {
            logger.error('Error finishing', e);
            showToast('Não foi possível finalizar o atendimento. Tente novamente.', 'error');
        } finally {
            setIsFinishing(false);
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'waiting': return 'border border-yellow-400/40 bg-yellow-400/5';
            case 'calling': return 'border border-green-500/40 bg-green-500/5 animate-pulse';
            case 'serving': return 'border border-blue-400/40 bg-blue-500/5';
            default: return 'border border-neutral-700';
        }
    };

    const getQrUrl = () => {
        if (!businessSlug) return '';
        const baseUrl = `${window.location.origin}/#/queue/${businessSlug}`;
        if (selectedQrPro) return `${baseUrl}?pro=${selectedQrPro}`;
        return baseUrl;
    };

    const downloadQr = async () => {
        try {
            const url = getQrUrl();
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}`;
            const response = await fetch(qrImageUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `fila-digital-${businessSlug}${selectedQrPro ? `-${selectedQrPro}` : ''}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            logger.error('Error downloading QR', error);
            showToast('Erro ao baixar QR Code.', 'error');
        }
    };

    if (loadingEntries) return <div className="p-8 text-white"><Clock className="animate-spin w-8 h-8" /></div>;

    const waitingList = entries.filter(e => e.status === 'waiting');
    const callingList = entries.filter(e => e.status === 'calling');
    const servingList = entries.filter(e => e.status === 'serving');
    const completedList = entries.filter(e => e.status === 'completed').sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()); // Newest first
    const actionableList = [...callingList, ...waitingList];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-center ${isBeauty ? 'bg-beauty-card/40 border-beauty-neon/20' : 'bg-white/[0.04] border-white/10'} p-4 md:p-6 rounded-2xl border backdrop-blur-xl sticky top-0 z-30 shadow-promax-glass`}>
                <div className="mb-4 md:mb-0">
                    <h1 className={`text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2`}>
                        <Clock className={`w-8 h-8 ${accent.text}`} />
                        Fila Digital
                    </h1>
                    <p className="text-neutral-400 text-sm font-mono">Gerencie atendimentos em tempo real</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowAddModal(true)} size="sm" variant="primary" icon={<User className="w-4 h-4" />} className="hidden md:flex">
                        Adicionar
                    </Button>
                    <Button onClick={() => setShowAddModal(true)} size="sm" variant="primary" className="md:hidden !min-w-0 !px-3.5 !rounded-full">
                        <User className="w-5 h-5" />
                    </Button>
                    <Button onClick={() => setShowQrModal(true)} size="sm" variant="secondary" icon={<QrCode className="w-4 h-4" />} className="hidden md:flex">
                        Gerar QR Code
                    </Button>
                    <Button onClick={() => setShowQrModal(true)} size="sm" variant="secondary" className="md:hidden !min-w-0 !px-3.5 !rounded-full">
                        <QrCode className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <Card className="p-4 border border-yellow-400/40">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Na Fila</div>
                    <div className="text-4xl font-heading text-yellow-400">{metrics.waiting}</div>
                </Card>
                <Card className="p-4 border border-blue-400/40">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Atendendo</div>
                    <div className="text-4xl font-heading text-blue-400">{metrics.serving}</div>
                </Card>
                <Card className="p-4 border border-green-500/40">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Finalizados</div>
                    <div className="text-4xl font-heading text-green-500">{metrics.completed}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Waiting / Next */}
                <div className="space-y-4">
                    <h2 className={`text-xl font-bold flex items-center gap-2 uppercase tracking-tight ${accent.text}`}>
                        <Clock className="w-5 h-5" />
                        Próximos
                    </h2>

                    {actionableList.length === 0 ? (
                        <div className={`p-10 border border-dashed ${isBeauty ? 'border-beauty-neon/20' : 'border-white/10'} bg-white/[0.02] rounded-2xl text-center text-neutral-500`}>
                            <p className="font-mono text-sm">A fila está vazia.</p>
                        </div>
                    ) : (
                        actionableList.map(entry => (
                            <div key={entry.id} className={`bg-white/[0.03] backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lite-glass`}>
                                <div>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        <span className="font-heading">{entry.client_name}</span>
                                        {entry.status === 'calling' && (
                                            <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded font-bold uppercase animate-pulse">Chamando</span>
                                        )}
                                    </h3>
                                    <div className="text-sm text-neutral-400 flex flex-col gap-1 mt-1 font-mono">
                                        <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {formatPhone(entry.client_phone)}</span>
                                        <span className="text-xs opacity-50">{new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {entry.status === 'waiting' && (
                                        <button
                                            onClick={() => updateStatus(entry.id, 'calling')}
                                            className="p-3 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500/20 border border-green-500/20 transition-all hover:scale-105"
                                            title="Chamar Cliente"
                                        >
                                            <Megaphone className="w-5 h-5" />
                                        </button>
                                    )}
                                    {entry.status === 'calling' && (
                                        <button
                                            onClick={() => updateStatus(entry.id, 'serving')}
                                            className="p-3 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500/20 border border-blue-500/20 transition-all hover:scale-105"
                                            title="Iniciar Atendimento"
                                        >
                                            <Play className="w-5 h-5 fill-current" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setNoShowTarget(entry.id)}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 border border-red-500/20 transition-all opacity-60 hover:opacity-100"
                                        title="Não Compareceu"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: In Service */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight text-blue-400">
                        <User className="w-5 h-5" />
                        Em Atendimento
                    </h2>

                    {servingList.length === 0 ? (
                        <div className={`p-10 border border-dashed ${isBeauty ? 'border-beauty-neon/20' : 'border-white/10'} bg-white/[0.02] rounded-2xl text-center text-neutral-500`}>
                            <p className="font-mono text-sm">Nenhum atendimento em andamento.</p>
                        </div>
                    ) : (
                        servingList.map(entry => (
                            <div key={entry.id} className={`bg-white/[0.03] backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lite-glass`}>
                                <div>
                                    <h3 className="font-bold text-white text-lg font-heading">{entry.client_name}</h3>
                                    <div className="text-sm text-neutral-400 flex flex-col gap-1 mt-1 font-mono">
                                        <span className="text-xs opacity-60">Iniciou às {new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> {/* In real app use updated_at or dedicated 'started_at' */}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openFinishModal(entry)}
                                        className="px-5 py-3 bg-neutral-100 text-black font-bold rounded-xl hover:bg-white hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] min-h-[48px]"
                                        title="Finalizar"
                                    >
                                        <Check className="w-5 h-5" />
                                        Finalizar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>



            {/* Completed History Section */}
            {
                completedList.length > 0 && (
                    <div className="mt-12 space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight text-neutral-500">
                            <Check className="w-5 h-5" />
                            Histórico de Atendimentos
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {completedList.map(entry => (
                                <div key={entry.id} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                    <div>
                                        <h3 className="font-bold text-neutral-300 text-base font-heading">{entry.client_name}</h3>
                                        <div className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
                                            <Check className="w-3 h-3 text-green-500" />
                                            Finalizado
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-neutral-500 block">Entrou às</span>
                                        <span className="text-sm font-mono text-neutral-400">{new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* MANUAL ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
                    <div className={`bg-white/[0.05] border ${isBeauty ? 'border-beauty-neon/30' : 'border-white/10'} backdrop-blur-2xl rounded-2xl p-5 sm:p-6 max-w-sm w-full relative shadow-promax-depth`}>
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6 font-heading uppercase flex items-center gap-2">
                            <User className={`w-5 h-5 ${accent.text}`} />
                            Adicionar na Fila
                        </h3>
                        <form onSubmit={handleManualAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Nome do Cliente *</label>
                                <input
                                    type="text"
                                    value={addClientName}
                                    onChange={e => setAddClientName(e.target.value)}
                                    required
                                    placeholder="Nome completo"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-white/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Telefone (opcional)</label>
                                <input
                                    type="text"
                                    value={addClientPhone}
                                    onChange={e => setAddClientPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-white/20 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Serviço (opcional)</label>
                                <input
                                    type="text"
                                    value={addServiceName}
                                    onChange={e => setAddServiceName(e.target.value)}
                                    placeholder="Ex: Corte de cabelo"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-white/20 transition-all"
                                />
                            </div>
                            <Button type="submit" variant="primary" fullWidth loading={isAdding}>
                                {isAdding ? 'Adicionando...' : 'Adicionar na Fila'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* FINISH MODAL */}
            {
                showFinishModal && finishingEntry && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in">
                        <div className={`bg-white/[0.05] border ${isBeauty ? 'border-beauty-neon/30' : 'border-white/10'} backdrop-blur-2xl rounded-2xl p-5 sm:p-6 max-w-sm w-full relative animate-in zoom-in-95 shadow-promax-depth`}>
                            <button onClick={() => setShowFinishModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 font-heading uppercase flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-500" />
                                Finalizar Atendimento
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/10">
                                    <p className="text-xs uppercase text-neutral-500 font-bold mb-1">Cliente</p>
                                    <p className="text-white font-bold text-lg">{finishingEntry.client_name}</p>
                                    <p className="text-neutral-400 text-sm font-mono">{formatPhone(finishingEntry.client_phone, region === 'PT' ? 'PT' : 'BR')}</p>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Serviço Realizado</label>
                                    <input
                                        type="text"
                                        value={finishService}
                                        onChange={e => setFinishService(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-white/20 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Valor Final ({region === 'PT' ? '€' : 'R$'})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={finishPrice}
                                        onChange={e => setFinishPrice(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white text-xl font-mono focus:outline-none focus:border-green-500/50 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Profissional</label>
                                    <select
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-white/20 transition-all"
                                        value={finishPro}
                                        onChange={e => setFinishPro(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {teamMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <Button
                                    onClick={confirmFinish}
                                    loading={isFinishing}
                                    className="w-full mt-4 bg-green-500 hover:bg-green-400 text-black border-none"
                                >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Confirmar e Receber
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* QR MODAL (Keep as is, just styled) */}
            {
                showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in">
                        <div className={`bg-white/[0.05] border ${isBeauty ? 'border-beauty-neon/30' : 'border-white/10'} backdrop-blur-2xl rounded-2xl p-5 sm:p-6 max-w-sm w-full relative animate-in zoom-in-95 shadow-promax-depth`}>
                            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-heading uppercase">
                                <QrCode className={`w-5 h-5 ${accent.text}`} />
                                QR Code da Fila
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-neutral-500 mb-2 block">Vincular a Profissional (Opcional)</label>
                                    <select
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-neutral-500"
                                        value={selectedQrPro || ''}
                                        onChange={(e) => setSelectedQrPro(e.target.value || null)}
                                    >
                                        <option value="">Geral da Barbearia</option>
                                        {teamMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-white p-4 rounded-2xl flex justify-center">
                                    {businessSlug ? (
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getQrUrl())}`}
                                            className="w-48 h-48"
                                            alt="QR Code"
                                        />
                                    ) : (
                                        <div className="w-48 h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                                            Carregando...
                                        </div>
                                    )}
                                </div>

                                <div className="text-center p-2.5 bg-white/[0.03] rounded-2xl border border-white/10">
                                    <p className="text-xs text-neutral-500 break-all font-mono opacity-60">
                                        {getQrUrl()}
                                    </p>
                                </div>

                                <Button onClick={downloadQr} className="w-full">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Imagem
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                open={!!noShowTarget}
                title="Não compareceu"
                message="Marcar como não compareceu?"
                confirmLabel="Confirmar"
                variant="danger"
                onCancel={() => setNoShowTarget(null)}
                onConfirm={() => {
                    if (noShowTarget) void updateStatus(noShowTarget, 'no_show');
                    setNoShowTarget(null);
                }}
            />
        </div>
    );
}
