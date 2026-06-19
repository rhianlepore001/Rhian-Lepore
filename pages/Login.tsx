import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getOnboardingProgress } from '../services/onboarding';
import { mapError, formatUserFacingError } from '../utils/mapError';
import { Screw } from '../components/Screw';
import { AgendiXLogo } from '../components/AgendiXLogo';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const errorRef = useRef<HTMLDivElement>(null);

    const [loginTheme, setLoginTheme] = useState<'barber' | 'beauty'>('barber');
    const [showGateway, setShowGateway] = useState(true);
    const isBeauty = loginTheme === 'beauty';
    const { colors, accent, font, radius } = useBrutalTheme({ override: loginTheme });

    useEffect(() => {
        if (!error) return;

        requestAnimationFrame(() => {
            errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorRef.current?.focus({ preventScroll: true });
        });
    }, [error]);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await login(email, password);
        if (error) {
            setError(formatUserFacingError(mapError(error, 'Não foi possível entrar. Verifique seus dados e tente de novo.')));
            setLoading(false);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, company_id, tutorial_completed')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'staff' && !profile.tutorial_completed) {
                    navigate('/staff-onboarding');
                    return;
                }

                const companyId = profile?.company_id || user.id;
                const progress = await getOnboardingProgress(companyId);

                if (!progress?.is_completed) {
                    navigate('/onboarding');
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        }
    };

    const handleSelectSegment = (theme: 'barber' | 'beauty') => {
        setLoginTheme(theme);
        setShowGateway(false);
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-mode', 'dark');
    };

    // ─── GATEWAY ─────────────────────────────────────────────────────────────
    if (showGateway) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 md:p-12">

                <div className="mb-10 md:mb-14 flex items-center gap-3">
                    <AgendiXLogo size={32} isBeauty={false} showText={true} />
                </div>

                <div className="text-center mb-10 md:mb-14 max-w-xl">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 mb-4">
                        O sistema que trabalha enquanto você atende.
                    </p>
                    <h1 className="font-heading text-4xl md:text-6xl text-white uppercase leading-[0.95] tracking-tight">
                        Escolha o seu<br />
                        <span className="text-neutral-400">negócio</span>
                    </h1>
                </div>

                <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

                    {/* BARBEARIAS */}
                    <button
                        data-testid="category-barber"
                        aria-label="Acessar painel para barbearias"
                        onClick={() => handleSelectSegment('barber')}
                        className="group relative h-72 md:h-96 rounded-2xl md:rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                    >
                        <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl">
                            <div
                                className="absolute -inset-[2px] bg-black bg-cover bg-center opacity-60 group-hover:opacity-80 transition-all duration-700 ease-out scale-110 group-hover:scale-100"
                                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80)' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
                            <div className="absolute inset-0 bg-accent-gold/0 group-hover:bg-accent-gold/[0.03] transition-colors duration-500" />
                        </div>

                        {/* Corner accent — risco querendo fechar um quadrado */}
                        <div className="absolute top-5 left-5 w-10 h-10 border-l border-t border-white/[0.06] group-hover:border-accent-gold/60 transition-all duration-500 z-10" />
                        <div className="absolute bottom-5 right-5 w-10 h-10 border-r border-b border-white/[0.06] group-hover:border-accent-gold/60 transition-all duration-500 z-10" />

                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 md:pb-12 z-10 px-6 text-center">
                            <h2 className="font-heading text-3xl md:text-4xl text-white uppercase tracking-tight mb-3 group-hover:text-accent-gold transition-colors duration-300">
                                Barbearias
                            </h2>
                            {/* Traço horizontal com animação de crescer */}
                            <div className="w-0 h-[1px] bg-accent-gold/60 group-hover:w-16 transition-all duration-500 mb-5" />
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 group-hover:border-accent-gold/40 group-hover:bg-accent-gold/10 transition-all duration-300">
                                <span className="font-mono text-xs text-white/90 uppercase tracking-widest">Entrar</span>
                                <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all duration-300" />
                            </div>
                        </div>
                    </button>

                    {/* STUDIOS */}
                    <button
                        data-testid="category-beauty"
                        aria-label="Acessar painel para salões e spas"
                        onClick={() => handleSelectSegment('beauty')}
                        className="group relative h-72 md:h-96 rounded-2xl md:rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-beauty-neon focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                    >
                        <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl">
                            <div
                                className="absolute -inset-[2px] bg-black bg-cover bg-center opacity-60 group-hover:opacity-80 transition-all duration-700 ease-out scale-110 group-hover:scale-100"
                                style={{ backgroundImage: 'url("/mulher-studio.png")' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
                            <div className="absolute inset-0 bg-beauty-neon/0 group-hover:bg-beauty-neon/[0.03] transition-colors duration-500" />
                        </div>

                        {/* Corner accent — risco querendo fechar um quadrado */}
                        <div className="absolute top-5 left-5 w-10 h-10 border-l border-t border-white/[0.06] group-hover:border-beauty-neon/60 transition-all duration-500 z-10" />
                        <div className="absolute bottom-5 right-5 w-10 h-10 border-r border-b border-white/[0.06] group-hover:border-beauty-neon/60 transition-all duration-500 z-10" />

                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 md:pb-12 z-10 px-6 text-center">
                            <h2 className="font-heading text-3xl md:text-4xl text-white uppercase tracking-tight mb-3 group-hover:text-beauty-neon transition-colors duration-300">
                                Studios
                            </h2>
                            {/* Traço horizontal com animação de crescer */}
                            <div className="w-0 h-[1px] bg-beauty-neon/60 group-hover:w-16 transition-all duration-500 mb-5" />
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 group-hover:border-beauty-neon/40 group-hover:bg-beauty-neon/10 transition-all duration-300">
                                <span className="font-mono text-xs text-white/90 uppercase tracking-widest">Entrar</span>
                                <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:text-beauty-neon group-hover:translate-x-0.5 transition-all duration-300" />
                            </div>
                        </div>
                    </button>

                </div>

                <div className="mt-10 md:mt-14 w-full max-w-md">
                    <div className="border-t border-neutral-800 pt-8 flex flex-col items-center gap-4">
                        <p className="font-mono text-xs text-white/40 uppercase tracking-[0.1em]">
                            Primeira vez por aqui?
                        </p>
                        <Link
                            to="/register"
                            className="w-full flex items-center justify-center py-3.5 rounded-xl border border-white/15 hover:border-white/25 text-white text-sm font-mono uppercase tracking-widest transition-all duration-200 bg-white/[0.04] hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                        >
                            Criar conta — 14 dias grátis
                        </Link>
                    </div>
                </div>

            </div>
        );
    }

    // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden
            ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}
        `}>
            {isBeauty
                ? <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-beauty-neon/[0.05] rounded-full blur-[120px] pointer-events-none" />
                : <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/[0.04] rounded-full blur-[120px] pointer-events-none" />
            }

            {/* Voltar */}
            <button
                onClick={() => setShowGateway(true)}
                className="absolute top-6 left-6 z-20 font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-white transition-colors flex items-center gap-1.5"
            >
                ← Voltar
            </button>

            {/* Card split */}
            <div className={`w-full max-w-3xl relative z-10 flex overflow-hidden
                ${isBeauty
                    ? 'rounded-3xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]'
                    : 'rounded-2xl border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)]'}
            `}>

                {/* Painel esquerdo — decorativo (só desktop) */}
                <div className={`hidden md:flex flex-col justify-between w-2/5 p-8 relative overflow-hidden flex-shrink-0
                    ${isBeauty ? 'bg-[#1A162A]' : 'bg-[#111111]'}
                `}>
                    {/* Accent top line */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />

                    <div>
                        <AgendiXLogo size={32} isBeauty={isBeauty} showText={true} />
                    </div>

                    <div>
                        <p className={`font-mono text-xs uppercase tracking-[0.2em] mb-3
                            ${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}
                        `}>
                            {isBeauty ? 'Salões & Studios' : 'Barbearia'}
                        </p>
                        <h2 className="font-heading text-4xl text-white uppercase leading-none tracking-tight mb-4">
                            {isBeauty ? 'Seu salão,\nseu ritmo.' : 'Seu corte,\nsua regra.'}
                        </h2>
                        <p className={`text-xs leading-relaxed
                            ${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-neutral-600 font-mono'}
                        `}>
                            Tudo o que o seu negócio precisa, em um só lugar.
                        </p>
                    </div>

                    {/* Decoração geométrica */}
                    <div className={`absolute bottom-0 right-0 w-32 h-32 opacity-5
                        ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}
                    `} style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                </div>

                {/* Painel direito — formulário */}
                <div className={`flex-1 relative
                    ${isBeauty
                        ? 'bg-beauty-card/90 backdrop-blur-xl'
                        : 'bg-[#1C1C1C]'}
                `}>
                    {/* Screws (Barber Only) */}
                    {!isBeauty && (
                        <>
                            <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
                            <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />
                        </>
                    )}

                    <div className="p-8 md:p-10">
                        {/* Logo mobile */}
                        <div className="md:hidden mb-8 flex items-center gap-2">
                            <AgendiXLogo size={28} isBeauty={isBeauty} showText={true} />
                        </div>

                        <div className="mb-8">
                            <h2 className="font-heading text-3xl text-white uppercase tracking-tight mb-1">
                                Entrar
                            </h2>
                            <p className={`text-xs uppercase tracking-widest
                                ${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-neutral-600 font-mono'}
                            `}>
                                Bom te ver de novo
                            </p>
                        </div>

                        {error && (
                            <div
                                ref={errorRef}
                                role="alert"
                                tabIndex={-1}
                                className={`mb-5 p-3.5 text-xs ${radius.input} border
                                    ${isBeauty
                                        ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger)]'
                                        : 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger)] font-mono'}
                                `}
                            >
                                {error}
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                            <Input
                                id="login-email"
                                type="email"
                                label="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                autoComplete="email"
                                forceTheme={loginTheme}
                                required
                            />

                            <Input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                label="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                forceTheme={loginTheme}
                                required
                                iconRight={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        className={`pointer-events-auto ${colors.textMuted} hover:${colors.text} transition-colors`}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                }
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    fullWidth
                                    loading={loading}
                                    forceTheme={loginTheme}
                                >
                                    Entrar
                                </Button>
                            </div>

                            <div className={`mt-6 pt-5 border-t ${colors.divider} flex flex-col gap-2.5 text-center`}>
                                <Link
                                    to="/forgot-password"
                                    className={`text-xs ${colors.textSecondary} hover:${colors.text} transition-colors min-h-[44px] inline-flex items-center justify-center font-mono uppercase tracking-wider`}
                                >
                                    Esqueci minha senha
                                </Link>
                                <Link
                                    to={`/register?type=${loginTheme}`}
                                    className={`text-xs font-bold font-mono uppercase tracking-wider ${accent.text} hover:opacity-80 transition-opacity min-h-[44px] inline-flex items-center justify-center`}
                                >
                                    Não tem conta? Criar agora
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>

            </div>

            <div className="absolute bottom-5 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">
AgendiX
            </div>
        </div>
    );
};
