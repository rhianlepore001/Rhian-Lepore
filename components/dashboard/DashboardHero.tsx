import React from 'react';
import { Sparkles, Clock, TrendingUp, ArrowRight, Zap, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAIOSDiagnostic } from '../../hooks/useAIOSDiagnostic';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { AIOSStrategyModal } from './AIOSStrategyModal';
import { useState } from 'react';

interface DashboardHeroProps {
    isBeauty: boolean;
}

export const DashboardHero = React.memo(({ isBeauty }: DashboardHeroProps) => {
    const { fullName, avatarUrl, region } = useAuth();
    const { diagnostic, loading } = useAIOSDiagnostic();
    const navigate = useNavigate();
    const [isStrategyOpen, setIsStrategyOpen] = useState(false);

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const borderClass = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';

    // Primeiro nome do profissional
    const firstName = fullName?.split(' ')[0] || 'Profissional';

    // Oportunidade detectada pelo AIOS
    const hasOpportunity = !loading && diagnostic && diagnostic.recoverable_revenue > 0;

    return (
        <div className="relative px-4 mb-8 animate-in fade-in slide-in-from-top-2 duration-700">
            {/* 
          ELITE GLASS COMMAND STRIP 
          - Bordas arredondadas (rounded-2xl)
          - Transparência total com desfoque profundo (backdrop-blur-3xl)
          - Barra flutuante (não toca as laterais do viewport por causa do px-4 no pai)
      */}
            <div className={`
        relative z-10 flex flex-col md:flex-row items-center justify-between
        py-4 px-6 md:px-10 bg-white/[0.03] backdrop-blur-sm md:backdrop-blur-3xl 
        border border-white/10 rounded-3xl overflow-hidden
        ${isBeauty ? 'shadow-lite-glass md:shadow-promax-glass' : 'shadow-lite-gold md:shadow-promax-depth'}
      `}>

                {/* Left Side: Avatar & Greeting & Personal Name */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="relative shrink-0">
                        <div className={`absolute -inset-1.5 blur-md opacity-20 rounded-full ${accentBg} animate-pulse`} />
                        <div className={`relative w-12 h-12 rounded-full border-2 ${borderClass} overflow-hidden bg-black/50 flex items-center justify-center`}>
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={fullName || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white font-heading text-xl">{firstName[0]}</span>
                            )}
                        </div>
                        {/* Status Dot */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${accentBg}`} />
                    </div>

                    <div className="flex flex-col">
                        <h1 className="text-xl md:text-2xl font-heading text-white tracking-tight flex items-center gap-2">
                            Olá, <span className={`${accentText} drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>{firstName}</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <Zap size={10} className={accentText} />
                                AIOS Command
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: AIOS Live Feed (Compacto) */}
                <div className="flex-1 flex justify-center py-5 md:py-0">
                    {loading ? (
                        <div className="flex items-center gap-2 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-white/20" />
                            <div className="h-2 w-32 bg-white/10 rounded-full" />
                        </div>
                    ) : hasOpportunity ? (
                        <div className={`
              flex items-center gap-3 px-5 py-2 rounded-full bg-white/[0.05] border border-white/5
              cursor-pointer group/opt transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]
            `} onClick={() => navigate('/crm')}>
                            <TrendingUp className={`w-4 h-4 ${accentText}`} />
                            <p className="text-xs text-white/80 font-mono">
                                Recuperáveis: <span className="text-white font-bold">{formatCurrency(diagnostic.recoverable_revenue, region)}</span>
                            </p>
                            <ArrowRight className="w-3 h-3 text-white/30 group-hover/opt:translate-x-1 transition-transform" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${accentBg} opacity-50 shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                            <span className="text-[9px] font-mono text-white/40 tracking-widest uppercase">System Operational</span>
                        </div>
                    )}
                </div>

                {/* Right Side: Quick Action (Premium Slim) */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={() => setIsStrategyOpen(true)}
                        className={`
                            px-4 py-3 rounded-xl font-heading text-[10px] tracking-[0.15em]
                            bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300
                            flex items-center gap-2 group/strat
                        `}
                    >
                        <Sparkles size={14} className={`${accentText} group-hover/strat:animate-pulse`} />
                        GUIA ESTRATÉGICO
                    </button>

                    <button
                        onClick={() => navigate('/agenda')}
                        className={`
                            relative overflow-hidden group/btn
                            px-8 py-3 rounded-xl font-heading text-xs text-black tracking-[0.1em]
                            transition-all duration-500 hover:scale-[1.02] active:scale-95
                            ${accentBg} ${isBeauty ? 'shadow-neon' : 'shadow-gold-strong'}
                        `}
                    >
                        <div className="relative z-10 flex items-center gap-2">
                            <Clock size={16} />
                            AGENDAR AGORA
                        </div>
                        {/* Glow sweep effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:animate-shine" />
                    </button>
                </div>
            </div>

            <AIOSStrategyModal
                isOpen={isStrategyOpen}
                onClose={() => setIsStrategyOpen(false)}
                isBeauty={isBeauty}
            />

            {/* Decorative Blur Orbs - Disabled on mobile for performance */}
            <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-64 h-24 blur-[80px] rounded-full opacity-[0.05] pointer-events-none hidden md:block ${accentBg}`} />
        </div>
    );
});

DashboardHero.displayName = 'DashboardHero';
