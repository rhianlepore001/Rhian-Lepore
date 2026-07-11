import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePublicClient } from '../contexts/PublicClientContext';
import { useBusinessProfileBySlug, useBusinessSettings } from '../hooks/usePublicBooking';
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
    allow_client_rescheduling?: boolean;
}

type Tab = 'upcoming' | 'history' | 'profile';

const ITEMS_PER_PAGE = 8;

export const ClientArea: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const {
        client,
        login,
        register,
        logout,
        loading: clientLoading,
        hydrateFromStorage,
    } = usePublicClient();

    const { data: businessProfile, isLoading: loadingProfile, isError: profileError } = useBusinessProfileBySlug(slug ?? '');
    const businessId = businessProfile?.id ?? null;
    const { data: businessSettings, isLoading: loadingSettings } = useBusinessSettings(businessId);

    const business = useMemo<BusinessProfile | null>(() => {
        if (!businessProfile) return null;
        const allowRescheduling = businessSettings?.enable_self_rescheduling ?? true;
        return {
            id: businessProfile.id,
            business_name: businessProfile.business_name,
            user_type: businessProfile.user_type,
            phone: businessProfile.phone ?? null,
            logo_url: businessProfile.logo_url ?? null,
            cover_photo_url: businessProfile.cover_photo_url ?? null,
            region: businessProfile.region,
            allow_client_rescheduling: allowRescheduling,
        };
    }, [businessProfile, businessSettings]);

    const businessLoading = loadingProfile || (!!businessId && loadingSettings);
    const businessError = profileError || !business;

    const sessionClient = useMemo(() => {
        if (!client || !business) return null;
        if (client.business_id !== business.id) return null;
        return client;
    }, [client, business]);

    useEffect(() => {
        if (business?.id && client?.business_id !== business.id) {
            hydrateFromStorage(business.id);
        }
    }, [business?.id, hydrateFromStorage]);

    // Auth gate
    const [phone, setPhone] = useState('');
    const [gateStep, setGateStep] = useState<'phone' | 'register'>('phone');
    const [gateName, setGateName] = useState('');
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

    // Tokens do DS: beauty = claro (silk), barber = escuro. O script anti-FOUC do
    // index.html remove data-mode nas rotas públicas; aqui restauramos assim que
    // o negócio carrega para os var(--color-*) resolverem certo.
    useEffect(() => {
        if (!business) return;
        const html = document.documentElement;
        html.setAttribute('data-theme', isBeauty ? 'beauty' : 'barber');
        html.setAttribute('data-mode', isBeauty ? 'light' : 'dark');
    }, [business, isBeauty]);

    const fetchBookings = useCallback(async () => {
        if (!sessionClient || !business) return;
        setBookingsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_client_bookings_history', {
                p_phone: sessionClient.phone,
                p_business_id: business.id,
            });
            if (error) throw error;
            setBookings((data as ClientBooking[]) ?? []);
        } catch {
            setBookings([]);
        } finally {
            setBookingsLoading(false);
        }
    }, [sessionClient, business]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (!sessionClient || !business) return;

        const channel = supabase
            .channel(`public_bookings_${sessionClient.phone}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'public_bookings',
                    filter: `customer_phone=eq.${sessionClient.phone}`,
                },
                (payload) => {
                    const updated = payload.new;
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
    }, [sessionClient, business]);

    const handleBookingCancelled = (id: string) => {
        setBookings(prev =>
            prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b)
        );
    };

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
            if (found) return;

            const { data: bookingRows } = await supabase.rpc('get_active_booking_by_phone', {
                p_phone: phone,
                p_business_id: business.id,
            });
            const activeBooking = bookingRows?.[0] as { customer_name?: string } | undefined;
            if (activeBooking?.customer_name) {
                const recovered = await register({
                    name: activeBooking.customer_name,
                    phone,
                    photo_url: null,
                    business_id: business.id,
                });
                if (recovered) return;
            }

            setGateStep('register');
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
        if (!gateName.trim()) {
            setGateError('Preencha seu nome');
            return;
        }
        setGateSubmitting(true);
        try {
            const newClient = await register({
                name: gateName.trim(),
                phone,
                photo_url: null,
                business_id: business.id,
            });
            if (!newClient) {
                setGateError('Não foi possível criar o cadastro. Tente novamente.');
            }
        } catch {
            setGateError('Erro ao cadastrar. Tente novamente.');
        } finally {
            setGateSubmitting(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!sessionClient) return;
        setProfileSaving(true);
        try {
            await register({
                name: editName,
                phone: sessionClient.phone,
                email: editEmail || null,
                photo_url: sessionClient.photo_url ?? null,
                business_id: sessionClient.business_id,
            });
            setEditingProfile(false);
        } catch {
            // silently fail
        } finally {
            setProfileSaving(false);
        }
    };

    const startEdit = () => {
        setEditName(sessionClient?.name ?? '');
        setEditEmail(sessionClient?.email ?? '');
        setEditingProfile(true);
    };

    const upcomingBookings = bookings.filter(b =>
        ['pending', 'confirmed'].includes(b.status) &&
        new Date(b.appointment_time) >= new Date()
    );
    const historyBookings = bookings.filter(b =>
        b.status === 'completed' ||
        (b.status !== 'cancelled' && new Date(b.appointment_time) < new Date())
    );
    const historySlice = historyBookings.slice(0, historyPage * ITEMS_PER_PAGE);

    if (businessLoading || clientLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isBeauty ? 'bg-theme-bg' : 'bg-theme-bg'}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
            </div>
        );
    }

    if (businessError || !business) {
        return (
            <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center gap-4 p-8">
                <CalendarX className="w-12 h-12 text-[var(--color-text-muted)]" />
                <p className="text-theme-textSecondary text-center">Estabelecimento não encontrado.</p>
                <Link to="/" className="text-xs text-[var(--color-text-muted)] underline">Voltar ao início</Link>
            </div>
        );
    }

    if (!sessionClient) {
        return (
            <div className={`min-h-screen flex flex-col ${isBeauty ? 'bg-theme-bg' : 'bg-theme-bg'}`}>
                <header className={`px-6 py-5 border-b ${isBeauty ? 'border-theme-border bg-theme-card backdrop-blur-sm' : 'border-theme-border bg-theme-card backdrop-blur-sm'}`}>
                    <Link
                        to={`/book/${slug}`}
                        className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${isBeauty ? 'text-theme-textSecondary hover:text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)] hover:text-theme-textSecondary'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar ao agendamento
                    </Link>
                </header>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm space-y-8">
                        <div className="text-center">
                            {business.logo_url
                                ? <img src={business.logo_url} alt={business.business_name} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
                                : (
                                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isBeauty ? 'bg-theme-surface' : 'bg-theme-surface'}`}>
                                        <Sparkles className={`w-7 h-7 ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]'}`} />
                                    </div>
                                )
                            }
                            <h1 className={`text-2xl font-bold ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                                {business.business_name}
                            </h1>
                            <p className={`text-sm mt-1 ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]'}`}>
                                Minha Área
                            </p>
                        </div>

                        <div className={`rounded-2xl p-6 ${isBeauty ? 'bg-theme-card shadow-lg border border-theme-border' : 'bg-theme-surface border border-theme-border'}`}>
                            {gateStep === 'phone' ? (
                                <form onSubmit={handlePhoneCheck} className="space-y-5">
                                    <div className="text-center mb-2">
                                        <Phone className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                        <h2 className={`font-bold text-lg ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                                            Acesse sua área
                                        </h2>
                                        <p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>
                                            Use o mesmo número do seu agendamento
                                        </p>
                                    </div>

                                    <div>
                                        <label className={`text-xs font-medium block mb-2 ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>
                                            Seu WhatsApp / Telefone
                                        </label>
                                        <PhoneInput
                                            value={phone}
                                            onChange={v => { setPhone(v); setGateError(''); }}
                                            placeholder="Telefone"
                                        />
                                    </div>

                                    {gateError && <p className="text-[var(--color-danger)] text-xs text-center">{gateError}</p>}

                                    <button
                                        type="submit"
                                        disabled={gateSubmitting || phone.replace(/\D/g, '').length < 10}
                                        className={`
                                            w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                                            disabled:opacity-40
                                            ${isBeauty
                                                ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]'
                                                : 'bg-theme-card text-black hover:bg-[var(--color-card-hover)]'
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
                                        <User className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                        <h2 className={`font-bold text-lg ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                                            Criar cadastro
                                        </h2>
                                        <p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>
                                            Primeira vez? Informe seu nome.
                                        </p>
                                    </div>

                                    <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${isBeauty ? 'bg-theme-surface text-[var(--color-text-muted)]' : 'bg-theme-surface text-theme-textSecondary'}`}>
                                        <span>{phone}</span>
                                        <button type="button" onClick={() => setGateStep('phone')} className="underline">Alterar</button>
                                    </div>

                                    <div className="relative">
                                        <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                        <input
                                            type="text"
                                            placeholder="Nome completo"
                                            value={gateName}
                                            onChange={e => setGateName(e.target.value)}
                                            required
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-colors ${isBeauty ? 'bg-theme-surface border border-theme-border text-theme-text focus:border-theme-border' : 'bg-theme-surface border border-theme-border text-theme-text focus:border-theme-border'}`}
                                        />
                                    </div>

                                    {gateError && <p className="text-[var(--color-danger)] text-xs text-center">{gateError}</p>}

                                    <button
                                        type="submit"
                                        disabled={gateSubmitting}
                                        className={`
                                            w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40
                                            ${isBeauty ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]' : 'bg-theme-card text-black hover:bg-[var(--color-card-hover)]'}
                                        `}
                                    >
                                        {gateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar minha área'}
                                    </button>
                                </form>
                            )}
                        </div>

                        <p className={`text-center text-xs ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>
                            Quer agendar?{' '}
                            <Link to={`/book/${slug}`} className={`font-semibold underline ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>
                                Ir para o agendamento
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col ${isBeauty ? 'bg-theme-bg' : 'bg-theme-bg'}`}>
            <header className={`sticky top-0 z-30 px-4 md:px-8 py-4 border-b ${isBeauty ? 'border-theme-border bg-theme-bg backdrop-blur-sm' : 'border-theme-border bg-theme-bg backdrop-blur-sm'}`}>
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link
                        to={`/book/${slug}`}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${isBeauty ? 'text-theme-textSecondary hover:text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)] hover:text-theme-textSecondary'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {business.business_name}
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                            {sessionClient.name.split(' ')[0]}
                        </span>
                        <button
                            onClick={() => logout(business.id)}
                            title="Sair"
                            className={`p-1.5 rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]`}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
                <div className={`relative overflow-hidden rounded-2xl p-6 ${isBeauty ? 'bg-theme-surface text-theme-text' : 'bg-theme-surface border border-theme-border'}`}>
                    <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 ${isBeauty ? 'bg-theme-card' : 'bg-theme-card'}`} />
                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div>
                            <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${isBeauty ? 'text-theme-text' : 'text-[var(--color-text-muted)]'}`}>
                                {business.business_name}
                            </p>
                            <h1 className="text-2xl font-bold text-theme-text">
                                Olá, {sessionClient.name.split(' ')[0]}!
                            </h1>
                            <p className={`text-xs mt-1 ${isBeauty ? 'text-theme-text' : 'text-theme-textSecondary'}`}>
                                {upcomingBookings.length > 0
                                    ? `Você tem ${upcomingBookings.length} agendamento${upcomingBookings.length > 1 ? 's' : ''} próximo${upcomingBookings.length > 1 ? 's' : ''}`
                                    : 'Nenhum agendamento futuro'}
                            </p>
                        </div>
                        <Link
                            to={`/book/${slug}`}
                            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 ${isBeauty ? 'bg-theme-card text-theme-text shadow-md' : 'bg-theme-card text-black'}`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Novo Agendamento
                        </Link>
                    </div>
                </div>

                <div className={`flex gap-1 p-1 rounded-xl ${isBeauty ? 'bg-theme-surface/60' : 'bg-theme-surface border border-theme-border'}`}>
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
                                        ? 'bg-theme-card text-theme-text shadow-sm'
                                        : 'bg-theme-surface text-theme-text'
                                    : isBeauty
                                        ? 'text-[var(--color-text-muted)] hover:text-theme-text'
                                        : 'text-[var(--color-text-muted)] hover:text-theme-text'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.id === 'upcoming' && upcomingBookings.length > 0 && (
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-black ${isBeauty ? 'bg-theme-surface text-theme-text' : 'bg-theme-card text-black'}`}>
                                    {upcomingBookings.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {bookingsLoading ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className={`w-6 h-6 animate-spin ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                    </div>
                ) : (
                    <>
                        {activeTab === 'upcoming' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {upcomingBookings.some(b => b.status === 'pending') && (
                                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning)]`}>
                                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold">Aguardando confirmação do estabelecimento</p>
                                            <p className={`text-xs mt-0.5 ${isBeauty ? 'text-[var(--color-warning)]' : 'text-[var(--color-warning)]/70'}`}>
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
                                            clientName={sessionClient.name}
                                            region={region}
                                            onCancelled={handleBookingCancelled}
                                            allowEdit={business?.allow_client_rescheduling ?? true}
                                        />
                                    ))
                                )}
                            </div>
                        )}

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
                                                clientName={sessionClient.name}
                                                region={region}
                                                onCancelled={handleBookingCancelled}
                                            />
                                        ))}
                                        {historySlice.length < historyBookings.length && (
                                            <button
                                                onClick={() => setHistoryPage(p => p + 1)}
                                                className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${isBeauty ? 'bg-theme-surface text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)]' : 'bg-theme-surface text-theme-textSecondary hover:bg-[var(--color-card-hover)] border border-theme-border'}`}
                                            >
                                                Carregar mais ({historyBookings.length - historySlice.length} restantes)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in duration-200">
                                <div className={`rounded-2xl p-6 space-y-5 ${isBeauty ? 'bg-theme-card border border-theme-border shadow-sm' : 'bg-theme-surface border border-theme-border'}`}>
                                    <div className="flex items-center justify-between">
                                        <h2 className={`font-bold text-base ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                                            Meus Dados
                                        </h2>
                                        {!editingProfile && (
                                            <button
                                                onClick={startEdit}
                                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isBeauty ? 'text-[var(--color-text-muted)] hover:text-theme-text hover:bg-[var(--color-card-hover)]' : 'text-[var(--color-text-muted)] hover:text-theme-text hover:bg-[var(--color-card-hover)]'}`}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {editingProfile ? (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder="Nome"
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none ${isBeauty ? 'bg-theme-surface border border-theme-border text-theme-text' : 'bg-theme-surface border border-theme-border text-theme-text'}`}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                                <input
                                                    type="email"
                                                    value={editEmail}
                                                    onChange={e => setEditEmail(e.target.value)}
                                                    placeholder="E-mail (opcional)"
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none ${isBeauty ? 'bg-theme-surface border border-theme-border text-theme-text' : 'bg-theme-surface border border-theme-border text-theme-text'}`}
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => setEditingProfile(false)}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isBeauty ? 'bg-theme-surface text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)]' : 'bg-theme-surface text-theme-textSecondary hover:bg-[var(--color-card-hover)]'}`}
                                                >
                                                    <X className="w-3.5 h-3.5" /> Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveProfile}
                                                    disabled={profileSaving}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${isBeauty ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]' : 'bg-theme-card text-black hover:bg-[var(--color-card-hover)]'}`}
                                                >
                                                    {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Salvar</>}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <ProfileRow icon={<User className="w-4 h-4" />} label="Nome" value={sessionClient.name} isBeauty={isBeauty} />
                                            <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={sessionClient.phone} isBeauty={isBeauty} />
                                            {sessionClient.email && <ProfileRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={sessionClient.email} isBeauty={isBeauty} />}
                                        </div>
                                    )}

                                    <div className={`pt-4 border-t ${isBeauty ? 'border-theme-border' : 'border-theme-border'}`}>
                                        <button
                                            onClick={() => logout(business.id)}
                                            className={`flex items-center gap-2 text-xs font-medium transition-colors ${isBeauty ? 'text-[var(--color-danger)] hover:text-[var(--color-danger)]' : 'text-[var(--color-danger)] hover:text-[var(--color-danger)]'}`}
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

            {business.phone && (
                <ClientWhatsAppFAB
                    phone={business.phone}
                    businessName={business.business_name}
                    clientName={sessionClient.name}
                    isBeauty={isBeauty}
                />
            )}
        </div>
    );
};

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    cta?: { label: string; to: string };
    isBeauty: boolean;
}
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, cta, isBeauty }) => (
    <div className={`py-16 flex flex-col items-center gap-4 rounded-2xl ${isBeauty ? 'bg-theme-card/60 border border-theme-border' : 'bg-theme-surface/60 border border-theme-border'}`}>
        <div className={isBeauty ? 'text-theme-text' : 'text-theme-text'}>{icon}</div>
        <div className="text-center">
            <p className={`font-semibold text-sm ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>{title}</p>
            <p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>{description}</p>
        </div>
        {cta && (
            <Link
                to={cta.to}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isBeauty ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]' : 'bg-theme-card text-black hover:bg-[var(--color-card-hover)]'}`}
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
        <div className={isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}>{icon}</div>
        <div>
            <p className={`text-xs uppercase tracking-wider font-medium ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>{label}</p>
            <p className={`text-sm font-semibold ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>{value}</p>
        </div>
    </div>
);
