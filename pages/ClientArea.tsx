import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePublicClient } from '../contexts/PublicClientContext';
import { ClientBookingCard, ClientBooking } from '../components/ClientBookingCard';
import { ClientWhatsAppFAB } from '../components/ClientWhatsAppFAB';
import { PhoneInput } from '../components/PhoneInput';
import {
    Calendar, History, User, LogOut, ArrowRight,
    Loader2, CalendarX, Sparkles, Mail, Phone,
    Edit2, Check, X, ChevronLeft, Clock
} from 'lucide-react';

interface BusinessProfile {
    id: string;
    business_name: string;
    user_type: string;
    phone: string | null;
    logo_url: string | null;
    cover_photo_url: string | null;
    region?: string;
}

type Tab = 'upcoming' | 'history' | 'profile';

const ITEMS_PER_PAGE = 8;

export const ClientArea: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { client, login, register, logout, loading: clientLoading } = usePublicClient();

    // Business
    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [businessLoading, setBusinessLoading] = useState(true);
    const [businessError, setBusinessError] = useState(false);

    // Auth gate
    const [phone, setPhone] = useState('');
    const [gateStep, setGateStep] = useState<'phone' | 'register'>('phone');
    const [gateName, setGateName] = useState('');
    const [gateEmail, setGateEmail] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateSubmitting, setGateSubmitting] = useState(false);

    // Bookings
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    // UI
    const [activeTab, setActiveTab] = useState<Tab>('upcoming');
    const [historyPage, setHistoryPage] = useState(1);

    // Profile edit
    const [editingProfile, setEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    const isBeauty = business?.user_type === 'beauty';
    const region = (business?.region as 'BR' | 'PT') ?? 'BR';

    // Fetch business
    useEffect(() => {
        if (!slug) return;
        const fetchBusiness = async () => {
            setBusinessLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, business_name, user_type, phone, logo_url, cover_photo_url, region')
                .eq('business_slug', slug)
                .single();

            if (error || !data) {
                setBusinessError(true);
            } else {
                setBusiness(data);
            }
            setBusinessLoading(false);
        };
        fetchBusiness();
    }, [slug]);

    // Fetch bookings when client authenticated
    const fetchBookings = useCallback(async () => {
        if (!client || !business) return;
        setBookingsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_client_bookings_history', {
                p_phone: client.phone,
                p_business_id: business.id,
            });
            if (error) throw error;
            setBookings((data as ClientBooking[]) ?? []);
        } catch {
            setBookings([]);
        } finally {
            setBookingsLoading(false);
        }
    }, [client, business]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Realtime subscriptions for status updates
    useEffect(() => {
        if (!client || !business) return;

        const channel = supabase
            .channel(`public_bookings_${client.phone}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'public_bookings',
                    filter: `customer_phone=eq.${client.phone}`,
                },
                (payload) => {
                    const updated = payload.new;
                    // Because public_bookings doesn't have the rich joined data, we just update what matters:
                    // status, appointment_time, etc.
                    setBookings(prev =>
                        prev.map(b => b.id === updated.id 
                            ? { ...b, status: updated.status, appointment_time: updated.appointment_time } 
                            : b
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [client, business]);

    // Handle booking cancelled in-page
    const handleBookingCancelled = (id: string) => {
        setBookings(prev =>
            prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b)
        );
    };

    // Auth gate handlers
    const handlePhoneCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;
        setGateError('');
        const clean = phone.replace(/\D/g, '');
        if (clean.length < 10) {
            setGateError('Digite um telefone válido');
            return;
        }
        setGateSubmitting(true);
        try {
            const found = await login(phone, business.id);
            if (!found) setGateStep('register');
        } catch {
            setGateError('Erro ao verificar. Tente novamente.');
        } finally {
            setGateSubmitting(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;
        setGateError('');
        if (!gateName || !gateEmail) {
            setGateError('Preencha nome e email');
            return;
        }
        setGateSubmitting(true);
        try {
            await register({
                name: gateName,
                email: gateEmail,
                phone,
                photo_url: null,
                business_id: business.id,
            });
        } catch {
            setGateError('Erro ao cadastrar. Tente novamente.');
        } finally {
            setGateSubmitting(false);
        }
    };

    // Profile update
    const handleSaveProfile = async () => {
        if (!client) return;
        setProfileSaving(true);
        try {
            const { error } = await supabase
                .from('public_clients')
                .update({ name: editName, email: editEmail })
                .eq('id', client.id);
            if (error) throw error;
            setEditingProfile(false);
        } catch {
            // silently fail
        } finally {
            setProfileSaving(false);
        }
    };

    const startEdit = () => {
        setEditName(client?.name ?? '');
        setEditEmail(client?.email ?? '');
        setEditingProfile(true);
    };

    // Derived data
    const upcomingBookings = bookings.filter(b =>
        ['pending', 'confirmed'].includes(b.status) &&
        new Date(b.appointment_time) >= new Date()
    );
    const historyBookings = bookings.filter(b =>
        b.status === 'completed' ||
        (b.status !== 'cancelled' && new Date(b.appointment_time) < new Date())
    );
    const historySlice = historyBookings.slice(0, historyPage * ITEMS_PER_PAGE);

    // ─── Loading / Error states ───────────────────────────────────────────────

    if (businessLoading || clientLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isBeauty ? 'bg-[#E2E1DA]' : 'bg-[#050505]'}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
            </div>
        );
    }

    if (businessError || !business) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 p-8">
                <CalendarX className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400 text-center">Estabelecimento não encontrado.</p>
                <Link to="/" className="text-xs text-zinc-600 underline">Voltar ao início</Link>
            </div>
        );
    }

    // ─── Auth gate ────────────────────────────────────────────────────────────

    if (!client) {
        return (
            <div className={`min-h-screen flex flex-col ${isBeauty ? 'bg-[#E2E1DA]' : 'bg-[#050505]'}`}>
                {/* Header */}
                <header className={`px-6 py-5 border-b ${isBeauty ? 'border-stone-200 bg-white/60 backdrop-blur-sm' : 'border-zinc-900 bg-black/40 backdrop-blur-sm'}`}>
                    <Link
                        to={`/book/${slug}`}
                        className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${isBeauty ? 'text-stone-400 hover:text-stone-600' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar ao agendamento
                    </Link>
                </header>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm space-y-8">
                        {/* Logo / Business name */}
                        <div className="text-center">
                            {business.logo_url
                                ? <img src={business.logo_url} alt={business.business_name} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
                                : (
                                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isBeauty ? 'bg-stone-200' : 'bg-zinc-800'}`}>
                                        <Sparkles className={`w-7 h-7 ${isBeauty ? 'text-stone-500' : 'text-zinc-500'}`} />
                                    </div>
                                )
                            }
                            <h1 className={`text-2xl font-bold ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                {business.business_name}
                            </h1>
                            <p className={`text-sm mt-1 ${isBeauty ? 'text-stone-500' : 'text-zinc-500'}`}>
                                Minha Área
                            </p>
                        </div>

                        {/* Gate card */}
                        <div className={`rounded-2xl p-6 ${isBeauty ? 'bg-white shadow-lg border border-stone-100' : 'bg-zinc-900 border border-zinc-800'}`}>
                            {gateStep === 'phone' ? (
                                <form onSubmit={handlePhoneCheck} className="space-y-5">
                                    <div className="text-center mb-2">
                                        <Phone className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                        <h2 className={`font-bold text-lg ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                            Acesse sua área
                                        </h2>
                                        <p className={`text-xs mt-1 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`}>
                                            Use o mesmo número do seu agendamento
                                        </p>
                                    </div>

                                    <div>
                                        <label className={`text-xs font-medium block mb-2 ${isBeauty ? 'text-stone-500' : 'text-zinc-400'}`}>
                                            Seu WhatsApp / Telefone
                                        </label>
                                        <PhoneInput
                                            value={phone}
                                            onChange={v => { setPhone(v); setGateError(''); }}
                                            placeholder="Telefone"
                                        />
                                    </div>

                                    {gateError && <p className="text-red-400 text-xs text-center">{gateError}</p>}

                                    <button
                                        type="submit"
                                        disabled={gateSubmitting || phone.replace(/\D/g, '').length < 10}
                                        className={`
                                            w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                                            disabled:opacity-40
                                            ${isBeauty
                                                ? 'bg-stone-800 text-white hover:bg-stone-700'
                                                : 'bg-white text-black hover:bg-zinc-200'
                                            }
                                        `}
                                    >
                                        {gateSubmitting
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <><span>Continuar</span><ArrowRight className="w-4 h-4" /></>
                                        }
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-2">
                                        <User className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                        <h2 className={`font-bold text-lg ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                            Criar cadastro
                                        </h2>
                                        <p className={`text-xs mt-1 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`}>
                                            Primeira vez? Precisamos de alguns dados.
                                        </p>
                                    </div>

                                    <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${isBeauty ? 'bg-stone-50 text-stone-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                        <span>{phone}</span>
                                        <button type="button" onClick={() => setGateStep('phone')} className="underline">Alterar</button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                            <input
                                                type="text"
                                                placeholder="Nome completo"
                                                value={gateName}
                                                onChange={e => setGateName(e.target.value)}
                                                required
                                                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-colors ${isBeauty ? 'bg-stone-50 border border-stone-200 text-stone-800 focus:border-stone-400' : 'bg-zinc-800 border border-zinc-700 text-white focus:border-zinc-500'}`}
                                            />
                                        </div>
                                        <div className="relative">
                                            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                value={gateEmail}
                                                onChange={e => setGateEmail(e.target.value)}
                                                required
                                                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-colors ${isBeauty ? 'bg-stone-50 border border-stone-200 text-stone-800 focus:border-stone-400' : 'bg-zinc-800 border border-zinc-700 text-white focus:border-zinc-500'}`}
                                            />
                                        </div>
                                    </div>

                                    {gateError && <p className="text-red-400 text-xs text-center">{gateError}</p>}

                                    <button
                                        type="submit"
                                        disabled={gateSubmitting}
                                        className={`
                                            w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40
                                            ${isBeauty ? 'bg-stone-800 text-white hover:bg-stone-700' : 'bg-white text-black hover:bg-zinc-200'}
                                        `}
                                    >
                                        {gateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar minha área'}
                                    </button>
                                </form>
                            )}
                        </div>

                        <p className={`text-center text-xs ${isBeauty ? 'text-stone-400' : 'text-zinc-600'}`}>
                            Quer agendar?{' '}
                            <Link to={`/book/${slug}`} className={`font-semibold underline ${isBeauty ? 'text-stone-600' : 'text-zinc-400'}`}>
                                Ir para o agendamento
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Authenticated: client area ───────────────────────────────────────────

    return (
        <div className={`min-h-screen flex flex-col ${isBeauty ? 'bg-[#E2E1DA]' : 'bg-[#050505]'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-30 px-4 md:px-8 py-4 border-b ${isBeauty ? 'border-stone-200 bg-[#E2E1DA]/90 backdrop-blur-sm' : 'border-zinc-900 bg-[#050505]/90 backdrop-blur-sm'}`}>
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link
                        to={`/book/${slug}`}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${isBeauty ? 'text-stone-400 hover:text-stone-600' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {business.business_name}
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${isBeauty ? 'text-stone-700' : 'text-zinc-300'}`}>
                            {client.name.split(' ')[0]}
                        </span>
                        <button
                            onClick={logout}
                            title="Sair"
                            className={`p-1.5 rounded-lg transition-colors ${isBeauty ? 'text-stone-400 hover:text-red-400 hover:bg-red-50' : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}`}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
                {/* Welcome hero */}
                <div className={`relative overflow-hidden rounded-2xl p-6 ${isBeauty ? 'bg-stone-800 text-white' : 'bg-zinc-900 border border-zinc-800'}`}>
                    {/* Subtle decorative circle */}
                    <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 ${isBeauty ? 'bg-white' : 'bg-white'}`} />
                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div>
                            <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${isBeauty ? 'text-stone-300' : 'text-zinc-500'}`}>
                                {business.business_name}
                            </p>
                            <h1 className="text-2xl font-bold text-white">
                                Olá, {client.name.split(' ')[0]}!
                            </h1>
                            <p className={`text-xs mt-1 ${isBeauty ? 'text-stone-300' : 'text-zinc-400'}`}>
                                {upcomingBookings.length > 0
                                    ? `Você tem ${upcomingBookings.length} agendamento${upcomingBookings.length > 1 ? 's' : ''} próximo${upcomingBookings.length > 1 ? 's' : ''}`
                                    : 'Nenhum agendamento futuro'}
                            </p>
                        </div>
                        <Link
                            to={`/book/${slug}`}
                            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 ${isBeauty ? 'bg-white text-stone-800 shadow-md' : 'bg-white text-black'}`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Novo Agendamento
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 p-1 rounded-xl ${isBeauty ? 'bg-stone-200/60' : 'bg-zinc-900 border border-zinc-800'}`}>
                    {([
                        { id: 'upcoming', label: 'Próximos', icon: <Calendar className="w-3.5 h-3.5" /> },
                        { id: 'history', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
                        { id: 'profile', label: 'Perfil', icon: <User className="w-3.5 h-3.5" /> },
                    ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all
                                ${activeTab === tab.id
                                    ? isBeauty
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'bg-zinc-700 text-white'
                                    : isBeauty
                                        ? 'text-stone-500 hover:text-stone-700'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.id === 'upcoming' && upcomingBookings.length > 0 && (
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${isBeauty ? 'bg-stone-800 text-white' : 'bg-white text-black'}`}>
                                    {upcomingBookings.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {bookingsLoading ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className={`w-6 h-6 animate-spin ${isBeauty ? 'text-stone-400' : 'text-zinc-600'}`} />
                    </div>
                ) : (
                    <>
                        {/* Upcoming */}
                        {activeTab === 'upcoming' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Pending analysis info banner */}
                                {upcomingBookings.some(b => b.status === 'pending') && (
                                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${isBeauty ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'}`}>
                                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold">Aguardando confirmação do estabelecimento</p>
                                            <p className={`text-xs mt-0.5 ${isBeauty ? 'text-amber-600' : 'text-yellow-400/70'}`}>
                                                Seu agendamento está em análise. Use o botão de WhatsApp para agilizar a confirmação.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {upcomingBookings.length === 0 ? (
                                    <EmptyState
                                        icon={<Calendar className="w-10 h-10" />}
                                        title="Sem agendamentos futuros"
                                        description="Que tal marcar um horário agora?"
                                        cta={{ label: 'Agendar', to: `/book/${slug}` }}
                                        isBeauty={isBeauty}
                                    />
                                ) : (
                                    upcomingBookings.map(b => (
                                        <ClientBookingCard
                                            key={b.id}
                                            booking={b}
                                            isBeauty={isBeauty}
                                            businessPhone={business.phone}
                                            businessSlug={slug ?? ''}
                                            clientName={client.name}
                                            region={region}
                                            onCancelled={handleBookingCancelled}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* History */}
                        {activeTab === 'history' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {historyBookings.length === 0 ? (
                                    <EmptyState
                                        icon={<History className="w-10 h-10" />}
                                        title="Histórico vazio"
                                        description="Seus serviços realizados aparecerão aqui."
                                        cta={{ label: 'Fazer primeiro agendamento', to: `/book/${slug}` }}
                                        isBeauty={isBeauty}
                                    />
                                ) : (
                                    <>
                                        {historySlice.map(b => (
                                            <ClientBookingCard
                                                key={b.id}
                                                booking={b}
                                                isBeauty={isBeauty}
                                                businessPhone={business.phone}
                                                businessSlug={slug ?? ''}
                                                clientName={client.name}
                                                region={region}
                                                onCancelled={handleBookingCancelled}
                                            />
                                        ))}
                                        {historySlice.length < historyBookings.length && (
                                            <button
                                                onClick={() => setHistoryPage(p => p + 1)}
                                                className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${isBeauty ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}
                                            >
                                                Carregar mais ({historyBookings.length - historySlice.length} restantes)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Profile */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in duration-200">
                                <div className={`rounded-2xl p-6 space-y-5 ${isBeauty ? 'bg-white border border-stone-100 shadow-sm' : 'bg-zinc-900 border border-zinc-800'}`}>
                                    <div className="flex items-center justify-between">
                                        <h2 className={`font-bold text-base ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                            Meus Dados
                                        </h2>
                                        {!editingProfile && (
                                            <button
                                                onClick={startEdit}
                                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isBeauty ? 'text-stone-500 hover:text-stone-700 hover:bg-stone-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {editingProfile ? (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder="Nome"
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none ${isBeauty ? 'bg-stone-50 border border-stone-200 text-stone-800' : 'bg-zinc-800 border border-zinc-700 text-white'}`}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                                <input
                                                    type="email"
                                                    value={editEmail}
                                                    onChange={e => setEditEmail(e.target.value)}
                                                    placeholder="Email"
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none ${isBeauty ? 'bg-stone-50 border border-stone-200 text-stone-800' : 'bg-zinc-800 border border-zinc-700 text-white'}`}
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => setEditingProfile(false)}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isBeauty ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                                >
                                                    <X className="w-3.5 h-3.5" /> Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveProfile}
                                                    disabled={profileSaving}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${isBeauty ? 'bg-stone-800 text-white hover:bg-stone-700' : 'bg-white text-black hover:bg-zinc-200'}`}
                                                >
                                                    {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Salvar</>}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <ProfileRow icon={<User className="w-4 h-4" />} label="Nome" value={client.name} isBeauty={isBeauty} />
                                            <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={client.phone} isBeauty={isBeauty} />
                                            {client.email && <ProfileRow icon={<Mail className="w-4 h-4" />} label="Email" value={client.email} isBeauty={isBeauty} />}
                                        </div>
                                    )}

                                    <div className={`pt-4 border-t ${isBeauty ? 'border-stone-100' : 'border-zinc-800'}`}>
                                        <button
                                            onClick={logout}
                                            className={`flex items-center gap-2 text-xs font-medium transition-colors ${isBeauty ? 'text-red-400 hover:text-red-500' : 'text-red-400 hover:text-red-300'}`}
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            Sair da minha área
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Floating WhatsApp */}
            {business.phone && (
                <ClientWhatsAppFAB
                    phone={business.phone}
                    businessName={business.business_name}
                    clientName={client.name}
                    isBeauty={isBeauty}
                />
            )}
        </div>
    );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    cta?: { label: string; to: string };
    isBeauty: boolean;
}
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, cta, isBeauty }) => (
    <div className={`py-16 flex flex-col items-center gap-4 rounded-2xl ${isBeauty ? 'bg-white/60 border border-stone-100' : 'bg-zinc-900/60 border border-zinc-800'}`}>
        <div className={isBeauty ? 'text-stone-300' : 'text-zinc-700'}>{icon}</div>
        <div className="text-center">
            <p className={`font-semibold text-sm ${isBeauty ? 'text-stone-600' : 'text-zinc-400'}`}>{title}</p>
            <p className={`text-xs mt-1 ${isBeauty ? 'text-stone-400' : 'text-zinc-600'}`}>{description}</p>
        </div>
        {cta && (
            <Link
                to={cta.to}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isBeauty ? 'bg-stone-800 text-white hover:bg-stone-700' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
                {cta.label}
            </Link>
        )}
    </div>
);

interface ProfileRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    isBeauty: boolean;
}
const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value, isBeauty }) => (
    <div className="flex items-center gap-3">
        <div className={isBeauty ? 'text-stone-400' : 'text-zinc-500'}>{icon}</div>
        <div>
            <p className={`text-[10px] uppercase tracking-wider font-medium ${isBeauty ? 'text-stone-400' : 'text-zinc-600'}`}>{label}</p>
            <p className={`text-sm font-semibold ${isBeauty ? 'text-stone-700' : 'text-zinc-200'}`}>{value}</p>
        </div>
    </div>
);
