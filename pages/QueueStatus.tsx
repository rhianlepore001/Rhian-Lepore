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
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    }, []);

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
            void audioRef.current?.play().catch(() => undefined);
        }
        prevStatusRef.current = entry?.status ?? null;
    }, [entry?.status]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    if (!entry) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Entrada não encontrada</div>;

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
                    color: 'text-green-400',
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    title: 'É a sua vez!',
                    desc: 'Dirija-se à cadeira do profissional.',
                    icon: <AlertOctagon className="w-12 h-12 text-green-400 mb-4 animate-bounce" />
                };
            case 'serving':
                return {
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    title: 'Em Atendimento',
                    desc: 'Tenha um ótimo serviço!',
                    icon: <User className="w-12 h-12 text-blue-400 mb-4" />
                };
            case 'completed':
                return {
                    color: 'text-neutral-400',
                    bg: 'bg-neutral-800',
                    border: 'border-neutral-700',
                    title: 'Finalizado',
                    desc: 'Obrigado pela preferência!',
                    icon: <CheckCircle className="w-12 h-12 text-neutral-400 mb-4" />
                };
            default:
                return {
                    color: 'text-red-400',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    title: 'Cancelado',
                    desc: 'Esta entrada foi cancelada.',
                    icon: <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                };
        }
    };

    const statusUI = getStatusDisplay(entry);

    return (
        <div className="min-h-screen bg-neutral-950 font-sans text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {isBeauty ? (
                <>
                    <div className={`absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-green-500/20' : 'bg-beauty-acid/20'} blur-[100px] pointer-events-none`}></div>
                    <div className={`absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-green-500/20' : 'bg-blue-600/10'} blur-[100px] pointer-events-none`}></div>
                </>
            ) : (
                <>
                    <div className={`absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-green-500/20' : 'bg-accent-gold/10'} blur-[100px] pointer-events-none`}></div>
                    <div className={`absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full ${entry.status === 'calling' ? 'bg-green-500/20' : 'bg-blue-500/10'} blur-[100px] pointer-events-none`}></div>
                </>
            )}

            <div className="relative z-10 w-full max-w-sm text-center">
                <h1 className="text-xl font-bold mb-8 text-neutral-400 uppercase tracking-widest">{business?.business_name}</h1>

                <div className={`rounded-3xl p-8 ${statusUI.bg} border-2 ${statusUI.border} backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-500`}>
                    {entry.status === 'waiting' && position && (
                        <div className="absolute top-0 left-0 w-full h-2 bg-neutral-800">
                            <div className={`h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} animate-pulse w-full`}></div>
                        </div>
                    )}

                    <div className="flex flex-col items-center">
                        {statusUI.icon}
                        <h2 className={`text-3xl font-bold ${statusUI.color} mb-2 uppercase tracking-tight`}>{statusUI.title}</h2>
                        <p className="text-neutral-400 text-sm mb-6">{statusUI.desc}</p>

                        {entry.status === 'waiting' && position ? (
                            <div className="grid grid-cols-2 gap-3 w-full mb-6">
                                <div className="bg-neutral-900/50 rounded-2xl p-4 border border-white/5">
                                    <span className="block text-neutral-500 text-xs uppercase font-bold tracking-widest mb-1">Sua Posição</span>
                                    <div className="text-4xl font-black text-white">{position}º</div>
                                </div>
                                <div className="bg-neutral-900/50 rounded-2xl p-4 border border-white/5">
                                    <span className="block text-neutral-500 text-xs uppercase font-bold tracking-widest mb-1">Tempo Est.</span>
                                    <div className={`text-2xl font-black ${timeLeft !== null && timeLeft < 0 ? 'text-red-400' : 'text-white'} mt-2 flex items-center justify-center gap-1 font-mono`}>
                                        {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                            ID: {entry.id.substring(0, 8)}
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                        Atualizar Status
                    </Button>

                    {['waiting', 'calling'].includes(entry.status) && (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="text-sm font-medium text-red-500 opacity-60 hover:opacity-100 transition-opacity p-4 min-w-[120px]"
                        >
                            Sair da Fila
                        </button>
                    )}
                    {leaveError && (
                        <p className="text-xs text-red-400">Não foi possível sair da fila. Tente novamente ou avise no balcão.</p>
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
