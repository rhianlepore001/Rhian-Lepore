import React from 'react';
import { Sparkles, Clock, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAIOSDiagnostic } from '../../hooks/useAIOSDiagnostic';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';

const AIOSStrategyModal = lazy(() => import('./modals/AIOSStrategyModal').then(m => ({ default: m.AIOSStrategyModal })));

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

    const firstName = fullName?.split(' ')[0] || 'Profissional';
    const hasOpportunity = !loading && diagnostic && diagnostic.recoverable_revenue > 0;

    return (
        <div className="relative px-0 mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className={`
                relative z-10 flex flex-col lg:flex-row items-center justify-between
                p-8 md:p-12 bg-white/[0.03] backdrop-blur-3xl 
                border border-white/10 rounded-[32px] overflow-hidden
                ${isBeauty ? 'shadow-promax-glass' : 'shadow-promax-depth'}
            `}>
                {/* Elementos decorativos de fundo */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
                <div className={`absolute -bottom-24 -left-24 w-64 h-64 blur-[120px] rounded-full opacity-10 pointer-events-none ${accentBg}`} />

                {/* Esquerda: Saudação e Identidade */}
                <div className="flex flex-col md:flex-row items-center gap-8 w-full lg:w-auto relative z-10">
                    <div className="relative shrink-0">
                        <div className={`absolute -inset-2 blur-xl opacity-30 rounded-full ${accentBg} animate-pulse`} />
                        <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 ${borderClass} overflow-hidden bg-black/50 shadow-2xl`}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={fullName || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-3xl font-heading text-white">
                                    {firstName[0]}
                                </div>
                            )}
                        </div>
                        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-neutral-900 ${accentBg} shadow-lg`} />
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <span className="text-[10px] md:text-xs font-mono text-white/40 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                            <Zap size={12} className={accentText} />
                            Status do Sistema: <span className="text-white/60">Ativo</span>
                        </span>
                        <h1 className="text-3xl md:text-5xl font-heading text-white tracking-tight leading-none mb-2">
                            Olá, <span className={`${accentText} drop-shadow-neon-glow`}>{firstName}</span>
                        </h1>
                        <p className="text-sm md:text-base text-text-secondary font-sans max-w-md">
                            Bem-vindo de volta. Sua operação está rendendo hoje.
                        </p>
                    </div>
                </div>

                {/* Direita: Insights e Ações */}
                <div className="mt-8 lg:mt-0 w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    {!loading && hasOpportunity && (
                        <div 
                            onClick={() => navigate('/crm')}
                            className="flex flex-col items-end mr-4 cursor-pointer group hidden xl:flex"
                        >
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Recuperável</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">
                                    {formatCurrency(diagnostic.recoverable_revenue, region)}
                                </span>
                                <ArrowRight size={14} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setIsStrategyOpen(true)}
                            className="px-6 py-4 rounded-2xl font-heading text-xs tracking-[0.2em] bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3 group"
                        >
                            <Sparkles size={16} className={`${accentText} group-hover:scale-110 transition-transform`} />
                            GUIA ESTRATÉGICO
                        </button>

                        <button
                            onClick={() => navigate('/agenda')}
                            className={`
                                relative overflow-hidden px-8 py-4 rounded-2xl font-heading text-xs text-black tracking-[0.2em] font-bold
                                transition-all duration-500 hover:scale-[1.05] active:scale-95 flex items-center justify-center gap-3
                                ${accentBg} ${isBeauty ? 'shadow-neon' : 'shadow-gold-strong'}
                            `}
                        >
                            <Clock size={18} />
                            AGENDAR AGORA
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                        </button>
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                <AIOSStrategyModal
                    isOpen={isStrategyOpen}
                    onClose={() => setIsStrategyOpen(false)}
                    isBeauty={isBeauty}
                />
            </Suspense>

            {/* Orbes decorativos - Apenas desktop */}
            <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-64 h-24 blur-[80px] rounded-full opacity-[0.05] pointer-events-none hidden md:block ${accentBg}`} />
        </div>
    );
});

DashboardHero.displayName = 'DashboardHero';
