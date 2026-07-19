import { Button } from '../components/ui';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { Loader2, User, Clock, CheckCircle, AlertOctagon, AlertTriangle } from 'lucide-react';
import { useQueueStatusSnapshot } from '../hooks/useQueueStatus';
import { cancelQueueEntryPublic, readQueuePhoneProof } from '../services/queue';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { QueueRecord } from '@/types/queue';

export const QueueStatus: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: snapshot, isLoading: loading, refetch } = useQueueStatusSnapshot(id);
    const entry = snapshot?.entry ?? null;
    const business = snapshot?.business ?? null;
    const position = snapshot?.position ?? null;

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [leaveError, setLeaveError] = useState(false);

    const handleLeaveQueue = async () => {
        if (!id) return;
        const phone = readQueuePhoneProof(id);
        if (!phone) {
            setLeaveError(true);
            setShowLeaveConfirm(false);
            return;
        }
        setLeaving(true);
        setLeaveError(false);
        try {
            await cancelQueueEntryPublic(id, phone);
            await refetch();
            setShowLeaveConfirm(false);
        } catch {
            setLeaveError(true);
        } finally {
            setLeaving(false);
        }
    };

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
            // Sem áudio disponível — segue só com o alerta visual
        }
    };

    useEffect(() => {
        if (!position || entry?.status !== 'waiting') {
            setTimeLeft(null);
            return;
        }

        const seconds = position * 20 * 60;
        setTimeLeft(seconds);

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(timer);
    }, [position, entry?.status]);

    useEffect(() => {
        if (!id) return;

        const channel = supabase.channel(`queue_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${id}` },
                () => {
                    void refetch();
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, refetch]);

    const prevStatusRef = useRef<string | null>(null);
    useEffect(() => {
        if (entry?.status === 'calling' && prevStatusRef.current !== 'calling') {
            playCallSound();
        }
        prevStatusRef.current = entry?.status ?? null;
    }, [entry?.status]);

    if (loading) return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text)]"><Loader2 className="animate-spin" /></div>;
    if (!entry) return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text)]">Não encontramos você na fila. O link pode ter expirado — entre na fila de novo pelo balcão ou QR code.</div>;

    const formatTime = (seconds: number) => {
        const isNegative = seconds < 0;
        const absSeconds = Math.abs(seconds);
        const h = Math.floor(absSeconds / 3600);
        const m = Math.floor((absSeconds % 3600) / 60);
        const s = absSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        const timeStr = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
        return isNegative ? `-${timeStr}` : timeStr;
    };

    const isBeauty = business?.user_type === 'beauty';

    const getStatusDisplay = (queueEntry: QueueRecord) => {
        switch (queueEntry.status) {
            case 'waiting':
                return {
                    color: isBeauty ? 'text-beauty-neon' : 'text-accent-gold',
                    bg: isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10',
                    border: isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20',
                    title: 'Na Fila de Espera',
                    desc: 'Aguarde, em breve será sua vez!',
                    icon: <Clock className={`w-12 h-12 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} mb-4`} />
                };
            case 'calling':
                return {
                    color: 'text-[var(--color-success)]',
                    bg: 'bg-[var(--color-success-bg)]',
                    border: 'border-[var(--color-success-border)]',
                    title: 'É a sua vez!',
                    desc: 'Dirija-se à cadeira do profissional.',
                    icon: <AlertOctagon className="w-12 h-12 text-[var(--color-success)] mb-4 animate-bounce" />
                };
            case 'serving':
                return {
                    color: 'text-[var(--color-info)]',
                    bg: 'bg-[var(--color-info-bg)]',
                    border: 'border-[var(--color-info-border)]',
                    title: 'Em Atendimento',
                    desc: 'Tenha um ótimo serviço!',
                    icon: <User className="w-12 h-12 text-[var(--color-info)] mb-4" />
                };
            case 'completed':
                return {
                    color: 'text-[var(--color-text-muted)]',
                    bg: 'bg-[var(--color-card)]',
                    border: 'border-[var(--color-border)]',
                    title: 'Finalizado',
                    desc: 'Obrigado pela preferência!',
                    icon: <CheckCircle className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
                };
            default:
                return {
                    color: 'text-[var(--color-danger)]',
                    bg: 'bg-[var(--color-danger-bg)]',
                    border: 'border-[var(--color-danger-border)]/20',
                    title: 'Cancelado',
                    desc: 'Esta entrada foi cancelada.',
                    icon: <AlertTriangle className="w-12 h-12 text-[var(--color-danger)] mb-4" />
                };
        }
    };

    const statusUI = getStatusDisplay(entry);

    return (
        <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text)] p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {isBeauty ? (
                <>
                    <div className={`absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-[var(--color-success-bg)]' : 'bg-beauty-acid/20'} blur-[100px] pointer-events-none`}></div>
                    <div className={`absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-[var(--color-success-bg)]' : 'bg-blue-600/10'} blur-[100px] pointer-events-none`}></div>
                </>
            ) : (
                <>
                    <div className={`absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-[var(--color-success-bg)]' : 'bg-accent-gold/10'} blur-[100px] pointer-events-none`}></div>
                    <div className={`absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-[var(--color-success-bg)]' : 'bg-[var(--color-info-bg)]'} blur-[100px] pointer-events-none`}></div>
                </>
            )}

            <div className="relative z-10 w-full max-w-sm text-center">
                <h1 className="text-xl font-bold mb-8 text-[var(--color-text-muted)] uppercase tracking-widest">{business?.business_name}</h1>

                <div className={`rounded-3xl p-8 ${statusUI.bg} border-2 ${statusUI.border} backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-500`}>
                    {entry.status === 'waiting' && position && (
                        <div className="absolute top-0 left-0 w-full h-2 bg-[var(--color-card)]">
                            <div className={`h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} animate-pulse w-full`}></div>
                        </div>
                    )}

                    <div className="flex flex-col items-center">
                        {statusUI.icon}
                        <h2 className={`text-3xl font-bold ${statusUI.color} mb-2 uppercase tracking-tight`}>{statusUI.title}</h2>
                        <p className="text-[var(--color-text-muted)] text-sm mb-6">{statusUI.desc}</p>

                        {entry.status === 'waiting' && position ? (
                            <div className="grid grid-cols-2 gap-3 w-full mb-6">
                                <div className="bg-[var(--color-card)]/50 rounded-2xl p-4 border border-[var(--color-border)]">
                                    <span className="block text-[var(--color-text-muted)] text-xs uppercase font-bold tracking-widest mb-1">Sua Posição</span>
                                    <div className="text-4xl font-black text-[var(--color-text)]">{position}º</div>
                                </div>
                                <div className="bg-[var(--color-card)]/50 rounded-2xl p-4 border border-[var(--color-border)]">
                                    <span className="block text-[var(--color-text-muted)] text-xs uppercase font-bold tracking-widest mb-1">Tempo Est.</span>
                                    <div className={`text-2xl font-black text-[var(--color-text)] mt-2 flex items-center justify-center gap-1 font-mono`}>
                                        {timeLeft === null ? '--:--' : timeLeft <= 0 ? 'Agora' : formatTime(timeLeft)}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-bg)]/20 px-3 py-1 rounded-full border border-[var(--color-border)]">
                            ID: {entry.id.substring(0, 8)}
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    <Button variant="outline" onClick={() => void refetch()} className="w-full">
                        Atualizar status
                    </Button>

                    {['waiting', 'calling'].includes(entry.status) && (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="text-sm font-medium text-[var(--color-danger)] opacity-60 hover:opacity-100 transition-opacity p-4 min-w-[120px]"
                        >
                            Sair da Fila
                        </button>
                    )}
                    {leaveError && (
                        <p className="text-xs text-[var(--color-danger)]">Não foi possível sair da fila. Tente novamente ou avise no balcão.</p>
                    )}
                </div>

                <ConfirmModal
                    open={showLeaveConfirm}
                    title="Sair da fila"
                    message="Você vai perder sua posição e precisará entrar de novo se mudar de ideia. Quer sair mesmo?"
                    confirmLabel="Sair da fila"
                    cancelLabel="Ficar"
                    variant="danger"
                    loading={leaving}
                    onConfirm={handleLeaveQueue}
                    onCancel={() => setShowLeaveConfirm(false)}
                />
            </div>
        </div>
    );
};
