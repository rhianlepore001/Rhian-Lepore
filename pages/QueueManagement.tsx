import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Clock, User, Phone, Play, X, Check, Megaphone, Trash2, QrCode, Download, DollarSign, Calendar, Save, AlertTriangle } from 'lucide-react';
import { QueueEntry } from '../types';
import { formatPhone, formatCurrency } from '../utils/formatters';

export const QueueManagement: React.FC = () => {
    const { user, userType, region } = useAuth();
    const [entries, setEntries] = useState<QueueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({ waiting: 0, serving: 0, completed: 0 });

    // QR Code State
    const [showQrModal, setShowQrModal] = useState(false);
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<{ id: string, name: string, commission_rate?: number }[]>([]);
    const [selectedQrPro, setSelectedQrPro] = useState<string | null>(null);

    // Finish Modal State
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [finishingEntry, setFinishingEntry] = useState<QueueEntry | null>(null);
    const [finishPrice, setFinishPrice] = useState('');
    const [finishService, setFinishService] = useState('');
    const [finishPro, setFinishPro] = useState('');
    const [isFinishing, setIsFinishing] = useState(false);

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    }, []);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const bgAccent = isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10';
    const borderAccent = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';

    const fetchQueue = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('queue_entries')
                .select('*')
                .eq('business_id', user.id)
                .in('status', ['waiting', 'calling', 'serving', 'completed'])
                .gte('joined_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
                .order('joined_at', { ascending: true });

            if (error) throw error;
            setEntries(data || []);

            setMetrics({
                waiting: data?.filter(e => e.status === 'waiting' || e.status === 'calling').length || 0,
                serving: data?.filter(e => e.status === 'serving').length || 0,
                completed: data?.filter(e => e.status === 'completed').length || 0
            });

            // Fetch extra info
            if (!businessSlug) {
                const { data: profile } = await supabase.from('profiles').select('business_slug').eq('id', user.id).single();
                if (profile) setBusinessSlug(profile.business_slug);
            }
            if (teamMembers.length === 0) {
                const { data: team } = await supabase.from('team_members').select('id, name, commission_rate').eq('user_id', user.id).eq('active', true);
                if (team) setTeamMembers(team);
            }

        } catch (err) {
            console.error('Error fetching queue:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        if (!user) return;

        const channel = supabase.channel('queue_manage')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `business_id=eq.${user.id}` },
                () => {
                    fetchQueue();
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [user]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('queue_entries')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setEntries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as any } : e).filter(e =>
                ['waiting', 'calling', 'serving'].includes(newStatus)
            ));

            if (newStatus === 'calling' && audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play failed', e));
            }

        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status');
        }
    };

    // --- FINISH LOGIC ---
    const openFinishModal = async (entry: QueueEntry) => {
        setFinishingEntry(entry);
        setFinishPro(entry.professional_id || (teamMembers.length > 0 ? teamMembers[0].id : ''));

        // Fetch service price/name
        let price = '0';
        let serviceName = 'Serviço';

        if (entry.service_id) {
            const { data: service } = await supabase.from('services').select('price, name').eq('id', entry.service_id).single();
            if (service) {
                price = service.price.toString();
                serviceName = service.name;
            }
        }
        setFinishPrice(price);
        setFinishService(serviceName);
        setShowFinishModal(true);
    };

    const confirmFinish = async () => {
        if (!finishingEntry || !user) return;
        setIsFinishing(true);
        try {
            const priceVal = parseFloat(finishPrice);
            if (isNaN(priceVal)) throw new Error('Valor inválido');

            // 1. Identify or Create Client
            let clientId = finishingEntry.client_id;

            // Search by phone if no ID (though queue normally has no client_id initially unless logged in? 
            // Actually our QueueJoin doesn't link to 'clients' table, it just stores name/phone in queue_entries.
            // So we ALWAYS need to search/create here.)

            if (!clientId) {
                const rawPhone = finishingEntry.client_phone;
                // Try to find client by phone
                const { data: existingClient } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', user.id)
                    .or(`phone.eq.${rawPhone},phone.eq.${formatPhone(rawPhone, 'BR')},phone.eq.${formatPhone(rawPhone, 'PT')}`) // Try exact and formatted
                    .maybeSingle();

                if (existingClient) {
                    clientId = existingClient.id;
                } else {
                    // Create new
                    const { data: newClient, error: clientError } = await supabase
                        .from('clients')
                        .insert({
                            user_id: user.id,
                            name: finishingEntry.client_name,
                            phone: finishingEntry.client_phone,
                            // We don't have email/photo easily unless we want to ask? Let's keep it simple.
                        })
                        .select()
                        .single();
                    if (clientError) throw clientError;
                    clientId = newClient.id;
                }
            }

            // 2. Insert Appointment (for history)
            // Need service name
            const { data: aptData, error: aptError } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: clientId,
                    professional_id: finishPro || null, // Default to null if no pro
                    service: finishService,
                    appointment_time: new Date().toISOString(), // Now
                    price: priceVal,
                    status: 'Completed',
                    duration_minutes: 30 // Approx
                })
                .select()
                .single();

            if (aptError) throw aptError;

            // 3. Create Finance Record
            let commissionRate = 0;
            let professionalName = 'Profissional';
            if (finishPro) {
                const pro = teamMembers.find(m => m.id === finishPro);
                if (pro) {
                    commissionRate = pro.commission_rate || 0;
                    professionalName = pro.name;
                }
            }

            const commissionValue = (priceVal * commissionRate) / 100;

            const { error: financeError } = await supabase
                .from('finance_records')
                .insert({
                    user_id: user.id,
                    appointment_id: aptData.id,
                    professional_id: finishPro || null,
                    barber_name: professionalName,
                    revenue: priceVal,
                    commission_rate: commissionRate,
                    commission_value: commissionValue,
                    created_at: new Date().toISOString(),

                    type: 'revenue', // Ensure we mark it as revenue
                    client_name: finishingEntry.client_name, // Pass client name for Finance display
                    service_name: finishService // Ideally pass service name too
                });

            if (financeError) throw financeError;

            // 4. Update Queue Entry
            const { error: updateError } = await supabase
                .from('queue_entries')
                .update({ status: 'completed' })
                .eq('id', finishingEntry.id);

            if (updateError) {
                console.error('Error updating queue status:', updateError);
                throw updateError;
            }

            setShowFinishModal(false);


            // Optimistic update: Move to completed
            setEntries(prev => prev.map(e => e.id === finishingEntry.id ? { ...e, status: 'completed' as const } : e));

            // Update metrics immediately
            setMetrics(prev => ({
                ...prev,
                serving: Math.max(0, prev.serving - 1),
                completed: prev.completed + 1
            }));


            alert('Atendimento finalizado e registrado!');

            // Refresh after a small delay to ensure state is updated
            setTimeout(() => fetchQueue(), 100);

        } catch (e: any) {
            console.error('Error finishing:', e);
            alert('Erro ao finalizar atendimento: ' + e.message);
        } finally {
            setIsFinishing(false);
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'waiting': return 'border-l-4 border-yellow-400';
            case 'calling': return 'border-l-4 border-green-500 bg-green-500/5 animate-pulse';
            case 'serving': return 'border-l-4 border-blue-400 bg-blue-500/5';
            default: return 'border-l-4 border-neutral-700';
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
            console.error('Error downloading QR:', error);
            alert('Erro ao baixar QR Code.');
        }
    };

    if (loading) return <div className="p-8 text-white"><Clock className="animate-spin w-8 h-8" /></div>;

    const waitingList = entries.filter(e => e.status === 'waiting');
    const callingList = entries.filter(e => e.status === 'calling');
    const servingList = entries.filter(e => e.status === 'serving');
    const completedList = entries.filter(e => e.status === 'completed').sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()); // Newest first
    const actionableList = [...callingList, ...waitingList];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-center ${isBeauty ? 'bg-beauty-card/50 border-beauty-neon/20' : 'bg-black/20 border-white/5'} p-6 rounded-2xl border backdrop-blur-sm sticky top-0 z-30 shadow-xl`}>
                <div className="mb-4 md:mb-0">
                    <h1 className={`text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2`}>
                        <Clock className={`w-8 h-8 ${accentColor}`} />
                        Fila Digital
                    </h1>
                    <p className="text-neutral-400 text-sm font-mono">Gerencie atendimentos em tempo real</p>
                </div>
                <BrutalButton onClick={() => setShowQrModal(true)} size="sm" className="hidden md:flex">
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code
                </BrutalButton>
                <button onClick={() => setShowQrModal(true)} className="md:hidden p-3 bg-neutral-800 rounded-xl text-white shadow-lg">
                    <QrCode className="w-6 h-6" />
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <BrutalCard className="p-4 border-l-4 border-yellow-400">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Na Fila</div>
                    <div className="text-4xl font-heading text-yellow-400">{metrics.waiting}</div>
                </BrutalCard>
                <BrutalCard className="p-4 border-l-4 border-blue-400">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Atendendo</div>
                    <div className="text-4xl font-heading text-blue-400">{metrics.serving}</div>
                </BrutalCard>
                <BrutalCard className="p-4 border-l-4 border-green-500">
                    <div className="text-xs uppercase text-neutral-500 font-bold mb-1 tracking-widest">Finalizados</div>
                    <div className="text-4xl font-heading text-green-500">{metrics.completed}</div>
                </BrutalCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Waiting / Next */}
                <div className="space-y-4">
                    <h2 className={`text-xl font-bold flex items-center gap-2 uppercase tracking-tight ${accentColor}`}>
                        <Clock className="w-5 h-5" />
                        Próximos
                    </h2>

                    {actionableList.length === 0 ? (
                        <div className={`p-12 border-2 border-dashed ${isBeauty ? 'border-beauty-neon/20' : 'border-neutral-800'} rounded-2xl text-center text-neutral-500`}>
                            <p className="font-mono text-sm">A fila está vazia.</p>
                        </div>
                    ) : (
                        actionableList.map(entry => (
                            <div key={entry.id} className={`bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lg`}>
                                <div>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        <span className="font-heading">{entry.client_name}</span>
                                        {entry.status === 'calling' && (
                                            <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded font-bold uppercase animate-pulse">Chamando</span>
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
                                            className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500/20 border border-green-500/20 transition-all hover:scale-105"
                                            title="Chamar Cliente"
                                        >
                                            <Megaphone className="w-5 h-5" />
                                        </button>
                                    )}
                                    {entry.status === 'calling' && (
                                        <button
                                            onClick={() => updateStatus(entry.id, 'serving')}
                                            className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 border border-blue-500/20 transition-all hover:scale-105"
                                            title="Iniciar Atendimento"
                                        >
                                            <Play className="w-5 h-5 fill-current" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm('Marcar como não compareceu?')) updateStatus(entry.id, 'no_show');
                                        }}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-all opacity-60 hover:opacity-100"
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
                        <div className={`p-12 border-2 border-dashed ${isBeauty ? 'border-beauty-neon/20' : 'border-neutral-800'} rounded-2xl text-center text-neutral-500`}>
                            <p className="font-mono text-sm">Nenhum atendimento em andamento.</p>
                        </div>
                    ) : (
                        servingList.map(entry => (
                            <div key={entry.id} className={`bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex justify-between items-center transition-all hover:scale-[1.01] ${getStatusColor(entry.status)} shadow-lg`}>
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
                                <div key={entry.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-xl flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
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

            {/* FINISH MODAL */}
            {
                showFinishModal && finishingEntry && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`bg-neutral-900 border ${isBeauty ? 'border-beauty-neon/30' : 'border-neutral-700'} rounded-3xl p-6 max-w-sm w-full relative animate-in zoom-in-95 shadow-2xl`}>
                            <button onClick={() => setShowFinishModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 font-heading uppercase flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-500" />
                                Finalizar Atendimento
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
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
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-white/20 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Valor Final ({region === 'PT' ? '€' : 'R$'})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={finishPrice}
                                        onChange={e => setFinishPrice(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xl font-mono focus:outline-none focus:border-green-500/50 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 ml-1">Profissional</label>
                                    <select
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-white/20 transition-all"
                                        value={finishPro}
                                        onChange={e => setFinishPro(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {teamMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <BrutalButton
                                    onClick={confirmFinish}
                                    loading={isFinishing}
                                    className="w-full mt-4 bg-green-500 hover:bg-green-400 text-black border-none"
                                >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Confirmar e Receber
                                </BrutalButton>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* QR MODAL (Keep as is, just styled) */}
            {
                showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`bg-neutral-900 border ${isBeauty ? 'border-beauty-neon/30' : 'border-neutral-700'} rounded-3xl p-6 max-w-sm w-full relative animate-in zoom-in-95 shadow-2xl`}>
                            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-heading uppercase">
                                <QrCode className={`w-5 h-5 ${accentColor}`} />
                                QR Code da Fila
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-neutral-500 mb-2 block">Vincular a Profissional (Opcional)</label>
                                    <select
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-neutral-500"
                                        value={selectedQrPro || ''}
                                        onChange={(e) => setSelectedQrPro(e.target.value || null)}
                                    >
                                        <option value="">Geral da Barbearia</option>
                                        {teamMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-white p-4 rounded-xl flex justify-center">
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

                                <div className="text-center p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                                    <p className="text-[10px] text-neutral-500 break-all font-mono opacity-60">
                                        {getQrUrl()}
                                    </p>
                                </div>

                                <BrutalButton onClick={downloadQr} className="w-full">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Imagem
                                </BrutalButton>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
