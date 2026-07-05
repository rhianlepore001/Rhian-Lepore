import React, { useState, lazy, Suspense } from 'react';
import { Sparkles, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAIOSDiagnostic } from '../../hooks/useAIOSDiagnostic';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

const AIOSStrategyModal = lazy(() => import('./modals/AIOSStrategyModal').then(m => ({ default: m.AIOSStrategyModal })));

interface DashboardHeroProps {
    isBeauty: boolean;
    isStaff?: boolean;
}

export const DashboardHero = React.memo(({ isBeauty, isStaff = false }: DashboardHeroProps) => {
    const { fullName, avatarUrl, region } = useAuth();
    const { diagnostic, loading } = useAIOSDiagnostic();
    const navigate = useNavigate();
    const [isStrategyOpen, setIsStrategyOpen] = useState(false);
    const { accent, colors, classes } = useBrutalTheme();

    const firstName = fullName?.split(' ')[0] || 'Profissional';
    const hasOpportunity = !loading && diagnostic && diagnostic.recoverable_revenue > 0;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <>
            <div className={`flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 mb-6`}>
                {/* Esquerda: Avatar + linha de acento + saudação */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`relative w-10 h-10 rounded-full border-2 ${accent.borderDim} overflow-hidden ${colors.card} shrink-0 ring-2 ${accent.ring}`}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName || ''} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center font-heading ${colors.text} text-sm font-bold`}>
                                {firstName[0]}
                            </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[color:var(--color-bg)] bg-emerald-400`} />
                    </div>

                    {/* Linha de acento lateral */}
                    <div className={`w-1 h-8 rounded-full ${accent.bg} shrink-0 opacity-60`} aria-hidden="true" />

                    <div className="min-w-0">
                        <h1 className={`text-lg md:text-xl font-heading font-bold tracking-tight ${colors.text} leading-tight truncate`}>
                            {greeting},{' '}
                            <span className={accent.text}>{firstName}</span>
                        </h1>
                        <p className={`text-xs md:text-xs ${colors.textMuted} font-sans uppercase tracking-widest leading-tight`}>
                            {isStaff ? 'Agenda aberta' : 'Operação ativa'}
                        </p>
                    </div>
                </div>

                {/* Direita: ações rápidas — oculto para staff */}
                {!isStaff && (
                    <div className="flex items-center gap-2 shrink-0">
                        {!loading && hasOpportunity && (
                            <button
                                onClick={() => navigate('/clientes')}
                                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono ${classes.badgeSuccess} hover:brightness-110 transition-all`}
                            >
                                <TrendingUp size={12} />
                                {formatCurrency(diagnostic.recoverable_revenue, region)} recuperável
                            </button>
                        )}

                        <button
                            onClick={() => setIsStrategyOpen(true)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-medium ${colors.card} border ${colors.border} ${colors.textSecondary} hover:text-theme-text ${colors.surfaceHover} transition-all`}
                        >
                            <Sparkles size={13} className={accent.text} />
                            <span className="hidden sm:inline">Estratégia</span>
                        </button>

                        <button
                            onClick={() => navigate('/agenda')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-bold text-[var(--color-bg)] transition-all hover:brightness-110 active:scale-95 ${accent.bg}`}
                        >
                            <Clock size={13} />
                            <span className="hidden sm:inline">Agendar</span>
                        </button>
                    </div>
                )}
            </div>

            <Suspense fallback={null}>
                <AIOSStrategyModal
                    isOpen={isStrategyOpen}
                    onClose={() => setIsStrategyOpen(false)}
                    isBeauty={isBeauty}
                />
            </Suspense>
        </>
    );
});

DashboardHero.displayName = 'DashboardHero';
