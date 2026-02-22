import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Eye, EyeOff, Zap, Sparkles } from 'lucide-react';
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

    // Adaptive Theme State
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
            // Check onboarding status
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

    // GATEWAY SCREEN
    if (showGateway) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 md:p-8">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 animate-in fade-in zoom-in-95 duration-500">

                    {/* BARBER CARD */}
                    <button
                        onClick={() => handleSelectSegment('barber')}
                        className="group relative h-64 md:h-96 bg-brutal-card border-4 border-neutral-800 hover:border-accent-gold transition-all duration-300 overflow-hidden text-left shadow-heavy hover:shadow-accent-gold/20"
                    >
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80)' }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-10"></div>



                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <AgenXLogo size={64} isBeauty={false} showText={false} />
                            </div>
                            <h2 className="font-heading text-4xl text-white uppercase tracking-wider mb-2 group-hover:text-accent-gold transition-colors">Barbearia</h2>
                            <p className="font-mono text-sm text-neutral-400 uppercase tracking-widest border-l-2 border-accent-gold pl-3">Domine seu território</p>
                        </div>
                    </button>

                    {/* BEAUTY CARD */}
                    <button
                        onClick={() => handleSelectSegment('beauty')}
                        className="group relative h-64 md:h-96 bg-neutral-900 rounded-3xl border border-white/10 hover:border-beauty-neon/50 transition-all duration-500 overflow-hidden text-left shadow-2xl hover:shadow-soft"
                    >
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-500"
                            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80)' }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-beauty-dark via-beauty-dark/60 to-beauty-dark/20 z-10"></div>



                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <div className="mb-4 group-hover:rotate-12 transition-transform duration-500">
                                <AgenXLogo size={64} isBeauty={true} showText={false} />
                            </div>
                            <h2 className="font-heading text-4xl text-white mb-2 group-hover:text-beauty-neon transition-colors tracking-tight">Beauty & Spa</h2>
                            <p className="font-sans text-sm text-beauty-silver tracking-wide border-l border-beauty-neon pl-3">Revele sua essência</p>
                        </div>
                    </button>

                </div>
            </div>
        );
    }

    // LOGIN SCREEN (THEME SPECIFIC)
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-700
            ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}
        `}>
            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-700">
                {isBeauty ? (
                    <>
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-beauty-neon/10 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-beauty-neon/5 rounded-full blur-[120px]"></div>
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[120px]"></div>
                    </>
                )}
            </div>

            {/* Back to Gateway */}
            <button
                onClick={() => setShowGateway(true)}
                className={`absolute top-8 left-8 z-20 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all
                    ${isBeauty ? 'text-neutral-400 hover:text-white font-sans' : 'text-neutral-500 hover:text-accent-gold font-mono'}
                `}
            >
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {/* THEME SPECIFIC CARD */}
            <div className={`w-full max-w-md relative z-10 duration-500 transition-all
                ${isBeauty
                    ? 'bg-beauty-card/80 backdrop-blur-xl border border-white/10 shadow-soft rounded-2xl'
                    : 'bg-brutal-card border-4 border-black shadow-heavy'}
            `}>

                {/* Header */}
                <div className={`flex justify-center items-center transition-all duration-500
                    ${isBeauty
                        ? 'p-6 border-b border-white/5 bg-transparent'
                        : 'p-4 bg-black border-b-4 border-white/10'}
                `}>
                    <div className="flex items-center gap-2">
                        <AgenXLogo size={40} isBeauty={isBeauty} showText={true} />
                    </div>
                </div>

                <div className={`space-y-6 relative transition-all duration-500 ${isBeauty ? 'p-8' : 'p-8'}`}>
                    {/* Screws (Barber Only) */}
                    {!isBeauty && (
                        <>
                            <Screw className="top-[-10px] left-[-10px] text-neutral-800" />
                            <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
                        </>
                    )}

                    <div className="text-center mb-8">
                        <h2 className={`font-heading text-2xl text-white uppercase mb-2 ${isBeauty ? 'tracking-normal' : ''}`}>Acesso ao Painel</h2>
                        <p className={`text-sm ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Insira suas credenciais para continuar.</p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className={`p-3 text-xs text-center border ${isBeauty ? 'bg-red-500/10 border-red-500/20 text-red-200 rounded-lg' : 'bg-red-500/10 border-red-500 text-red-500 font-mono'}`}
                        >
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className={`text-xs uppercase ml-1 ${isBeauty ? 'text-neutral-400 font-sans font-bold' : 'text-neutral-500 font-mono'}`}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full p-4 text-white text-sm focus:outline-none transition-all
                                    ${isBeauty
                                        ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50 focus:bg-white/10 font-sans'
                                        : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                                `}
                                placeholder="seu.email@exemplo.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={`text-xs uppercase ml-1 ${isBeauty ? 'text-neutral-400 font-sans font-bold' : 'text-neutral-500 font-mono'}`}>Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full p-4 text-white text-sm focus:outline-none transition-all
                                        ${isBeauty
                                            ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50 focus:bg-white/10 font-sans'
                                            : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                                    `}
                                    placeholder="Sua senha secreta"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
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
                        className={`w-full h-14 font-heading text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed
                            ${isBeauty
                                ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover rounded-xl shadow-soft hover:shadow-neon'
                                : 'bg-accent-gold hover:bg-accent-goldHover text-black border-2 border-black shadow-heavy active:shadow-none active:translate-y-1'}
                        `}
                    >
                        {loading ? (
                            <span className="animate-pulse flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                CARREGANDO...
                            </span>
                        ) : (
                            <>
                                {isBeauty ? <Sparkles className="w-5 h-5" /> : <Zap className="w-5 h-5" fill="black" />}
                                ENTRAR
                            </>
                        )}
                    </button>

                    <div className="flex flex-col gap-4 text-center mt-6 pt-4 border-t border-white/5">
                        <Link to="/forgot-password" className={`text-xs font-bold uppercase transition-all
                            ${isBeauty
                                ? 'text-neutral-500 hover:text-white font-sans'
                                : 'text-neutral-500 hover:text-white font-mono'}
                        `}>
                            Esqueci minha senha
                        </Link>

                        <Link to={`/register?type=${loginTheme}`} className={`text-xs font-bold uppercase border-b border-transparent transition-all
                            ${isBeauty
                                ? 'text-beauty-neon hover:text-white hover:border-white font-sans'
                                : 'text-accent-gold hover:border-accent-gold font-mono'}
                        `}>
                            Não tem conta? Criar agora
                        </Link>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">
                AgenX Management Flow • v2.0
            </div>
        </div>
    );
};