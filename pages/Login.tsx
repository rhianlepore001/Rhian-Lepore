import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Screw } from '../components/Screw';
import { AgenXLogo } from '../components/AgenXLogo';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [loginTheme, setLoginTheme] = useState<'barber' | 'beauty'>('barber');
    const [showGateway, setShowGateway] = useState(true);
    const isBeauty = loginTheme === 'beauty';

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await login(email, password);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: settings } = await supabase
                    .from('business_settings')
                    .select('onboarding_completed')
                    .eq('user_id', user.id)
                    .single();

                if (settings && !settings.onboarding_completed) {
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
    };

    // ─── GATEWAY ─────────────────────────────────────────────────────────────
    if (showGateway) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 md:p-12">

                <div className="mb-12 md:mb-16 flex items-center gap-3 opacity-60">
                    <AgenXLogo size={28} isBeauty={false} showText={true} />
                </div>

                <div className="text-center mb-10 md:mb-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-4">
                        O sistema que trabalha enquanto você atende.
                    </p>
                    <h1 className="font-heading text-4xl md:text-6xl text-white uppercase leading-none tracking-tight">
                        Escolha o seu<br />
                        <span className="text-neutral-500">negócio</span>
                    </h1>
                </div>

                <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-900">

                    {/* BARBEARIAS */}
                    <button
                        data-testid="category-barber"
                        aria-label="Barbearia"
                        onClick={() => handleSelectSegment('barber')}
                        className="group relative h-64 md:h-80 overflow-hidden cursor-pointer"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-35 group-hover:opacity-55 transition-opacity duration-500"
                            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80)' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/50" />
                        <div className="absolute top-0 left-0 w-px h-full bg-accent-gold/0 group-hover:bg-accent-gold/60 transition-all duration-300" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-accent-gold/0 group-hover:bg-accent-gold/30 transition-all duration-300" />
                        {/* Conteúdo centralizado */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <h2 className="font-heading text-4xl md:text-5xl text-white uppercase tracking-tight text-center mb-4 group-hover:text-accent-gold transition-colors duration-200">
                                Barbearias
                            </h2>
                            <div className="w-8 h-px bg-accent-gold/25 group-hover:w-14 group-hover:bg-accent-gold/70 transition-all duration-300 ease-out mb-4" />
                            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-600 group-hover:text-accent-gold transition-colors duration-200">
                                <span className="uppercase tracking-widest">Entrar</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                            </div>
                        </div>
                    </button>

                    {/* STUDIOS */}
                    <button
                        data-testid="category-beauty"
                        aria-label="Salão de Beleza"
                        onClick={() => handleSelectSegment('beauty')}
                        className="group relative h-64 md:h-80 overflow-hidden cursor-pointer"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-50 transition-transform transition-opacity duration-500 scale-[1.06] transform"
                            style={{ backgroundImage: 'url(/studio-experience-bg.png)' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-beauty-dark/60 via-beauty-dark/30 to-beauty-dark/70" />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-0 left-0 w-px h-full bg-beauty-neon/0 group-hover:bg-beauty-neon/50 transition-all duration-300" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-beauty-neon/0 group-hover:bg-beauty-neon/25 transition-all duration-300" />
                        {/* Conteúdo centralizado */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <h2 className="font-heading text-4xl md:text-5xl text-white uppercase tracking-tight text-center mb-4 group-hover:text-beauty-neon transition-colors duration-200">
                                Studios
                            </h2>
                            <div className="w-8 h-px bg-beauty-neon/20 group-hover:w-14 group-hover:bg-beauty-neon/60 transition-all duration-300 ease-out mb-4" />
                            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-600 group-hover:text-beauty-neon transition-colors duration-200">
                                <span className="uppercase tracking-widest">Entrar</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                            </div>
                        </div>
                    </button>

                </div>

                <div className="mt-10 w-full max-w-2xl">
                    <div className="border-t border-neutral-900 pt-8 flex flex-col items-center gap-4">
                        <p className="font-mono text-xs text-neutral-600 uppercase tracking-[0.2em]">
                            Primeira vez por aqui?
                        </p>
                        <Link
                            to="/register"
                            className="w-full flex items-center justify-center py-4 border border-neutral-700 hover:border-neutral-500 text-white text-sm font-mono uppercase tracking-widest transition-all duration-200 hover:bg-white/[0.03]"
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
                        <AgenXLogo size={32} isBeauty={isBeauty} showText={true} />
                    </div>

                    <div>
                        <p className={`font-mono text-xs uppercase tracking-[0.2em] mb-3
                            ${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}
                        `}>
                            {isBeauty ? 'Studios & Spas' : 'Barber Shop'}
                        </p>
                        <h2 className="font-heading text-4xl text-white uppercase leading-none tracking-tight mb-4">
                            {isBeauty ? 'Seu salão,\nseu ritmo.' : 'Seu corte,\nsua regra.'}
                        </h2>
                        <p className={`text-xs leading-relaxed
                            ${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-neutral-600 font-mono'}
                        `}>
                            Gestão inteligente para profissionais sérios.
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
                            <AgenXLogo size={28} isBeauty={isBeauty} showText={true} />
                        </div>

                        <div className="mb-8">
                            <h2 className="font-heading text-3xl text-white uppercase tracking-tight mb-1">
                                Entrar
                            </h2>
                            <p className={`text-xs uppercase tracking-widest
                                ${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-neutral-600 font-mono'}
                            `}>
                                Acesse sua conta
                            </p>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className={`mb-5 p-3.5 text-xs rounded-xl border
                                    ${isBeauty
                                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                        : 'bg-red-500/8 border-red-500/30 text-red-400 font-mono'}
                                `}
                            >
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="login-email"
                                    className={`text-xs font-semibold uppercase tracking-wider
                                        ${isBeauty ? 'text-neutral-400' : 'text-neutral-500 font-mono'}
                                    `}
                                >
                                    Email
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all
                                        ${isBeauty
                                            ? 'bg-white/5 border border-white/10 focus:border-beauty-neon/50 focus:bg-white/8 font-sans'
                                            : 'bg-black/30 border border-neutral-700/60 font-mono focus:border-accent-gold/60 focus:bg-black/50'}
                                    `}
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="login-password"
                                    className={`text-xs font-semibold uppercase tracking-wider
                                        ${isBeauty ? 'text-neutral-400' : 'text-neutral-500 font-mono'}
                                    `}
                                >
                                    Senha
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all
                                            ${isBeauty
                                                ? 'bg-white/5 border border-white/10 focus:border-beauty-neon/50 font-sans'
                                                : 'bg-black/30 border border-neutral-700/60 font-mono focus:border-accent-gold/60 focus:bg-black/50'}
                                        `}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            aria-busy={loading}
                            className={`w-full mt-6 h-12 rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]
                                ${isBeauty
                                    ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover shadow-[0_4px_20px_rgba(167,139,250,0.3)] hover:shadow-[0_6px_24px_rgba(167,139,250,0.45)]'
                                    : 'bg-accent-gold text-black hover:bg-accent-goldHover shadow-[0_4px_20px_rgba(194,155,64,0.25)] hover:shadow-[0_6px_24px_rgba(194,155,64,0.4)]'}
                            `}
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : 'Entrar na conta'
                            }
                        </button>

                        <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-2.5 text-center">
                            <Link
                                to="/forgot-password"
                                className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-neutral-300 transition-colors"
                            >
                                Esqueci minha senha
                            </Link>
                            <Link
                                to={`/register?type=${loginTheme}`}
                                className={`font-mono text-xs uppercase tracking-wider font-bold transition-colors
                                    ${isBeauty ? 'text-beauty-neon/60 hover:text-beauty-neon' : 'text-accent-gold/60 hover:text-accent-gold'}
                                `}
                            >
                                Não tem conta? Criar agora
                            </Link>
                        </div>
                    </div>
                </div>

            </div>

            <div className="absolute bottom-5 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">
                AgendiX • v2.0
            </div>
        </div>
    );
};
