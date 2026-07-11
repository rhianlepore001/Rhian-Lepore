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
import { ConfirmModal, Modal, useToast } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';

export const QueueManagement: React.FC = () => {
    const { user, region } = useAuth();
    const { accent, isBeauty, classes, colors } = useBrutalTheme();
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

    const playCallSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            [0, 0.2].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.15);
            });
        } catch {
            // Sem áudio disponível — segue só com o feedback visual
        }
    };

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

            if (newStatus === 'calling') {
                playCallSound();
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
            case 'waiting': return 'border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]';
            case 'calling': return 'border border-[var(--color-success-border)] bg-[var(--color-success-bg)] animate-pulse';
            case 'serving': return 'border border-[var(--color-info-border)] bg-[var(--color-info-bg)]';
            default: return 'border border-theme-border';
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

    if (loadingEntries) {
        return (
            <div className="space-y-6 pb-20">
                <SkeletonCard className="min-h-[96px]" />
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <SkeletonCard className="min-h-[88px]" />
                    <SkeletonCard className="min-h-[88px]" />
                    <SkeletonCard className="min-h-[88px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SkeletonCard className="min-h-[160px]" />
                    <SkeletonCard className="min-h-[160px]" />
                </div>
            </div>
        );
    }

    const waitingList = entries.filter(e => e.status === 'waiting');
    const callingList = entries.filter(e => e.status === 'calling');
    const servingList = entries.filter(e => e.status === 'serving');
    const completedList = entries.filter(e => e.status === 'completed').sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()); // Newest first
    const actionableList = [...callingList, ...waitingList];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-center ${colors.card} ${colors.border} p-4 md:p-6 rounded-2xl border backdrop-blur-xl sticky top-0 z-30 shadow-[var(--shadow-card)]`}>
                <div className="mb-4 md:mb-0">
                    <h1 className={`text-2xl md:text-3xl font-heading font-bold ${colors.text} mb-1 flex items-center gap-2`}>
                        <Clock className={`w-8 h-8 ${accent.text}`} />
                        Fila Digital
                    </h1>
                    <p className={`${colors.textSecondary} text-sm font-mono`}>Gerencie atendimentos em tempo real</p>
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
                <Card className="p-4 border border-[var(--color-warning-border)]">
                    <div className={`text-xs uppercase ${colors.textMuted} font-bold mb-1 tracking-widest`}>Na Fila</div>
                    <div className="text-4xl font-heading text-[var(--color-warning)]">{metrics.waiting}</div>
                </Card>
                <Card className="p-4 border border-[var(--color-info-border)]">
                    <div className={`text-xs uppercase ${colors.textMuted} font-bold mb-1 tracking-widest`}>Atendendo</div>
                    <div className="text-4xl font-heading text-[var(--color-info)]">{metrics.serving}</div>
                </Card>
                <Card className="p-4 border border-[var(--color-success-border)]">
                    <div className={`text-xs uppercase ${colors.textMuted} font-bold mb-1 tracking-widest`}>Finalizados</div>
                    <div className="text-4xl font-heading text-[var(--color-success)]">{metrics.completed}</div>
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
                        <div className={`p-10 border border-dashed ${colors.border} ${colors.surface} rounded-2xl text-center ${colors.textMuted}`}>
                            <p className="font-mono text-sm">A fila está vazia.</p>
                        </div>
                    ) : (
                        actionableList.map(entry => (
                            <div key={entry.id} className={`${colors.card} backdrop-blur-lg border ${colors.border} p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lite-glass`}>
                                <div>
                                    <h3 className={`font-bold ${colors.text} text-lg flex items-center gap-2`}>
                                        <span className="font-heading">{entry.client_name}</span>
                                        {entry.status === 'calling' && (
                                            <span className="text-xs bg-[var(--color-success)] text-black px-2 py-0.5 rounded font-bold uppercase animate-pulse">Chamando</span>
                                        )}
                                    </h3>
                                    <div className={`text-sm ${colors.textSecondary} flex flex-col gap-1 mt-1 font-mono`}>
                                        <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {formatPhone(entry.client_phone)}</span>
                                        <span className="text-xs opacity-50">{new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {entry.status === 'waiting' && (
                                        <button
                                            onClick={() => updateStatus(entry.id, 'calling')}
                                            className="p-3 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-full hover:bg-[var(--color-success-bg)] border border-[var(--color-success-border)] transition-all hover:scale-105"
                                            title="Chamar Cliente"
                                        >
                                            <Megaphone className="w-5 h-5" />
                                        </button>
                                    )}
                                    {entry.status === 'calling' && (
                                        <button
                                            onClick={() => updateStatus(entry.id, 'serving')}
                                            className="p-3 bg-[var(--color-info-bg)] text-[var(--color-info)] rounded-full hover:bg-[var(--color-info-bg)] border border-[var(--color-info-border)] transition-all hover:scale-105"
                                            title="Iniciar Atendimento"
                                        >
                                            <Play className="w-5 h-5 fill-current" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setNoShowTarget(entry.id)}
                                        className="p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-full hover:bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] transition-all opacity-60 hover:opacity-100"
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
                    <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight text-[var(--color-info)]">
                        <User className="w-5 h-5" />
                        Em Atendimento
                    </h2>

                    {servingList.length === 0 ? (
                        <div className={`p-10 border border-dashed ${colors.border} ${colors.surface} rounded-2xl text-center ${colors.textMuted}`}>
                            <p className="font-mono text-sm">Nenhum atendimento em andamento.</p>
                        </div>
                    ) : (
                        servingList.map(entry => (
                            <div key={entry.id} className={`${colors.card} backdrop-blur-lg border ${colors.border} p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lite-glass`}>
                                <div>
                                    <h3 className={`font-bold ${colors.text} text-lg font-heading`}>{entry.client_name}</h3>
                                    <div className={`text-sm ${colors.textSecondary} flex flex-col gap-1 mt-1 font-mono`}>
                                        <span className="text-xs opacity-60">Iniciou às {new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> {/* In real app use updated_at or dedicated 'started_at' */}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openFinishModal(entry)}
                                        className="px-5 py-3 bg-theme-surface text-black font-bold rounded-xl hover:bg-white hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] min-h-[48px]"
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
                        <h2 className={`text-xl font-bold flex items-center gap-2 uppercase tracking-tight ${colors.textMuted}`}>
                            <Check className="w-5 h-5" />
                            Histórico de Atendimentos
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {completedList.map(entry => (
                                <div key={entry.id} className={`${colors.card} border ${colors.border} p-4 rounded-2xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity`}>
                                    <div>
                                        <h3 className={`font-bold ${colors.textSecondary} text-base font-heading`}>{entry.client_name}</h3>
                                        <div className={`text-xs ${colors.textMuted} flex items-center gap-2 mt-1`}>
                                            <Check className="w-3 h-3 text-[var(--color-success)]" />
                                            Finalizado
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs ${colors.textMuted} block`}>Entrou às</span>
                                        <span className={`text-sm font-mono ${colors.textSecondary}`}>{new Date(entry.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* MANUAL ADD MODAL */}
            <Modal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Adicionar na fila"
                size="sm"
            >
                <form onSubmit={handleManualAdd} className="space-y-4">
                    <div>
                        <label className={`block ${classes.label} mb-1 ml-1`}>Nome do cliente *</label>
                        <input
                            type="text"
                            value={addClientName}
                            onChange={e => setAddClientName(e.target.value)}
                            required
                            placeholder="Nome completo"
                            className={classes.input}
                        />
                    </div>
                    <div>
                        <label className={`block ${classes.label} mb-1 ml-1`}>Telefone (opcional)</label>
                        <input
                            type="text"
                            value={addClientPhone}
                            onChange={e => setAddClientPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className={`${classes.input} font-mono`}
                        />
                    </div>
                    <div>
                        <label className={`block ${classes.label} mb-1 ml-1`}>Serviço (opcional)</label>
                        <input
                            type="text"
                            value={addServiceName}
                            onChange={e => setAddServiceName(e.target.value)}
                            placeholder="Ex: Corte de cabelo"
                            className={classes.input}
                        />
                    </div>
                    <Button type="submit" variant="primary" fullWidth loading={isAdding}>
                        {isAdding ? 'Adicionando...' : 'Adicionar na fila'}
                    </Button>
                </form>
            </Modal>

            {/* FINISH MODAL */}
            <Modal
                open={showFinishModal && !!finishingEntry}
                onClose={() => setShowFinishModal(false)}
                title="Finalizar atendimento"
                size="sm"
                preventClose={isFinishing}
                footer={
                    <Button
                        onClick={confirmFinish}
                        loading={isFinishing}
                        variant="primary"
                        fullWidth
                    >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Confirmar e receber
                    </Button>
                }
            >
                {finishingEntry && (
                    <div className="space-y-4">
                        <div className={`p-4 ${colors.surface} rounded-2xl border ${colors.border}`}>
                            <p className={classes.label}>Cliente</p>
                            <p className={`${colors.text} font-bold text-lg`}>{finishingEntry.client_name}</p>
                            <p className={`${colors.textSecondary} text-sm font-mono`}>{formatPhone(finishingEntry.client_phone, region === 'PT' ? 'PT' : 'BR')}</p>
                        </div>

                        <div>
                            <label className={`block ${classes.label} mb-1 ml-1`}>Serviço realizado</label>
                            <input
                                type="text"
                                value={finishService}
                                onChange={e => setFinishService(e.target.value)}
                                className={classes.input}
                            />
                        </div>

                        <div>
                            <label className={`block ${classes.label} mb-1 ml-1`}>Valor final ({region === 'PT' ? '€' : 'R$'})</label>
                            <input
                                type="number"
                                step="0.01"
                                value={finishPrice}
                                onChange={e => setFinishPrice(e.target.value)}
                                className={`${classes.input} text-xl font-mono`}
                            />
                        </div>

                        <div>
                            <label className={`block ${classes.label} mb-1 ml-1`}>Profissional</label>
                            <select
                                className={classes.input}
                                value={finishPro}
                                onChange={e => setFinishPro(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {teamMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </Modal>

            {/* QR MODAL */}
            <Modal
                open={showQrModal}
                onClose={() => setShowQrModal(false)}
                title="QR Code da fila"
                size="sm"
                footer={
                    <Button onClick={downloadQr} fullWidth>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar imagem
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className={`block ${classes.label} mb-2`}>Vincular a profissional (opcional)</label>
                        <select
                            className={classes.input}
                            value={selectedQrPro || ''}
                            onChange={(e) => setSelectedQrPro(e.target.value || null)}
                        >
                            <option value="">Fila geral</option>
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
                            <div className="w-48 h-48 bg-theme-surface flex items-center justify-center text-theme-textSecondary text-xs">
                                Carregando...
                            </div>
                        )}
                    </div>

                    <div className={`text-center p-2.5 ${colors.surface} rounded-2xl border ${colors.border}`}>
                        <p className={`text-xs ${colors.textMuted} break-all font-mono`}>
                            {getQrUrl()}
                        </p>
                    </div>
                </div>
            </Modal>

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
