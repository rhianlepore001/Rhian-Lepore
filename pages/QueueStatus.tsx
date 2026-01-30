import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BrutalButton } from '../components/BrutalButton';
import { Loader2, User, Clock, CheckCircle, AlertOctagon, AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { QueueEntry } from '../types';

export const QueueStatus: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [entry, setEntry] = useState<QueueEntry | null>(null);
    const [position, setPosition] = useState<number | null>(null);
    const [business, setBusiness] = useState<any>(null); // Store full business profile for styling
    const [loading, setLoading] = useState(true);

    // Countdown Logic (Moved to Top Level)
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // State declared here

    // Notification refs

    // Notification refs
    const hasNotified = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    }, []);

    // Countdown Effect (Moved to Top Level)
    useEffect(() => {
        if (!position || entry?.status !== 'waiting') {
            setTimeLeft(null);
            return;
        }

        // Calculate target time: NOW + (Position * 20 minutes)
        // Ideally this should be server-side or fixed start time, but for estimation:
        // We really want "Time until turn". Only relative to NOW makes sense if we don't have a specific slot.
        // But if I reload, it resets? 
        // Better: Calculate estimated completion time based on queue joining or just keep it simple as requested: "Countdown".
        // Let's assume the user wants to see 20min * pos counting down.
        // To avoid reset on refresh, we could store 'targetTime' in local storage or calculate from 'joined_at' + (pos * 20)? 
        // But pos changes.
        // Let's stick to a simple countdown from (Pos * 20) for now, reducing 1 sec every sec.
        // FIX: The user wants it to go negative.

        const seconds = position * 20 * 60;
        setTimeLeft(seconds);

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(timer);
    }, [position, entry?.status]);

    const fetchStatus = async () => {
        if (!id) return;
        try {
            // Get Entry
            const { data: entryData, error } = await supabase
                .from('queue_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setEntry(entryData);

            // Get Business Profile
            const { data: businessData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', entryData.business_id)
                .single();

            if (businessData) setBusiness(businessData);

            // Get Position (Try RPC first, fallback to client-side calc)
            if (entryData.status === 'waiting') {
                const { data: posData, error: rpcError } = await supabase.rpc('get_queue_position', {
                    p_queue_id: id,
                    p_business_id: entryData.business_id
                });

                if (!rpcError && posData !== null) {
                    setPosition(posData);
                } else {
                    // Fallback: Client-side calculation
                    // Count people ahead including self
                    const { count } = await supabase
                        .from('queue_entries')
                        .select('id', { count: 'exact', head: true })
                        .eq('business_id', entryData.business_id)
                        .eq('status', 'waiting')
                        .lte('joined_at', entryData.joined_at);

                    setPosition(count);
                }
            } else {
                setPosition(null);
            }

        } catch (err) {
            console.error('Error fetching status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Realtime subscription
        const channel = supabase.channel(`queue_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${id}` },
                payload => {
                    const newEntry = payload.new as QueueEntry;
                    setEntry(newEntry);
                    // If status changed to wait, fetch position again?
                    // Better to just re-fetch everything to be safe on rules
                    fetchStatus();
                })
            .subscribe();

        // Polling fallback
        const interval = setInterval(fetchStatus, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        }
    }, [id]);

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

    const getStatusDisplay = () => {
        switch (entry.status) {
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

    const statusUI = getStatusDisplay();
    // Remove static estimatedMinutes in favor of dynamic timeLeft

    return (
        <div className="min-h-screen bg-neutral-950 font-sans text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background blobs */}
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
                                    <span className="block text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Sua Posição</span>
                                    <div className="text-4xl font-black text-white">{position}º</div>
                                </div>
                                <div className="bg-neutral-900/50 rounded-2xl p-4 border border-white/5">
                                    <span className="block text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Tempo Est.</span>
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
                    <BrutalButton variant="outline" onClick={() => window.location.reload()} className="w-full">
                        Atualizar Status
                    </BrutalButton>

                    {['waiting', 'calling'].includes(entry.status) && (
                        <button className="text-sm font-medium text-red-500 opacity-60 hover:opacity-100 transition-opacity p-4 min-w-[120px]">
                            Sair da Fila
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
