import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, DollarSign, Plus, Menu, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QuickActionsModal } from './QuickActionsModal';
import { MoreOptionsDrawer } from './MoreOptionsDrawer';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const BottomMobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAuth();
    const { accent, colors } = useBrutalTheme();
    const isStaff = role === 'staff';

    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    const navItemBase =
        'flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 transition-all active:animate-haptic-click';

    const secondaryPath = isStaff ? '/fila' : '/clientes';
    const secondaryActive = isActive(secondaryPath);

    return (
        <>
            {/* Scrim sólido sob a nav — evita texto da página “vazar” atrás do chrome */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 pointer-events-none bg-gradient-to-t from-[var(--color-bg)] from-70% via-[var(--color-bg)]/80 to-transparent"
                aria-hidden="true"
            />
            <nav
                aria-label="Navegação principal"
                className={`md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-end justify-between gap-0.5 px-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 h-[64px] transition-all duration-300 rounded-none rounded-t-2xl border-x-0 border-b-0 border-t ${colors.divider}
                bg-[var(--color-bg)]`}
            >
                {/* Owner: Agenda, Clientes, FAB, Financeiro, Mais.
                    Staff: Agenda, Fila, FAB, Insights, Mais — CRM é domínio do gestor. */}
                {/* 1. Agenda */}
                <button
                    type="button"
                    onClick={() => navigate('/agenda')}
                    aria-label="Agenda"
                    aria-current={isActive('/agenda') ? 'page' : undefined}
                    className={`${navItemBase} flex-1 min-w-0 h-full ${isActive('/agenda') ? accent.text : colors.textSecondary}`}
                >
                    <div className={`p-1.5 rounded-xl transition-all ${isActive('/agenda') ? 'bg-[var(--color-card-hover)]' : ''}`}>
                        <Calendar className="w-5 h-5" strokeWidth={isActive('/agenda') ? 2.5 : 2} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold tracking-tight truncate max-w-full">Agenda</span>
                </button>

                {/* 2. Clientes (dono) / Fila (colaborador) */}
                <button
                    type="button"
                    onClick={() => navigate(secondaryPath)}
                    aria-label={isStaff ? 'Fila' : 'Clientes'}
                    aria-current={secondaryActive ? 'page' : undefined}
                    className={`${navItemBase} flex-1 min-w-0 h-full ${secondaryActive ? accent.text : colors.textSecondary}`}
                >
                    <div className={`p-1.5 rounded-xl transition-all ${secondaryActive ? 'bg-[var(--color-card-hover)]' : ''}`}>
                        {isStaff ? (
                            <Clock className="w-5 h-5" strokeWidth={secondaryActive ? 2.5 : 2} aria-hidden="true" />
                        ) : (
                            <Users className="w-5 h-5" strokeWidth={secondaryActive ? 2.5 : 2} aria-hidden="true" />
                        )}
                    </div>
                    <span className="text-xs font-bold tracking-tight truncate max-w-full">{isStaff ? 'Fila' : 'Clientes'}</span>
                </button>

                {/* 3. CENTER PLUS — shrink-0 (nunca w-full: esmagava vizinhos) */}
                <div className="relative -top-3 flex justify-center shrink-0 basis-14 px-1">
                    <button
                        type="button"
                        onClick={() => setShowQuickActions(true)}
                        className={`w-12 h-12 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center shadow-[var(--shadow-btn-primary)] transform transition-all active:scale-95 group relative overflow-hidden
                        ${accent.bg} text-[var(--color-on-accent)]`}
                        aria-label="Ações rápidas"
                        title="Ações rápidas"
                    >
                        <div className="absolute inset-0 bg-[var(--color-card-hover)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Plus className="w-6 h-6 relative z-10" strokeWidth={2.75} aria-hidden="true" />
                    </button>
                </div>

                {/* 4. Financeiro / Insights */}
                {!isStaff ? (
                    <button
                        type="button"
                        onClick={() => navigate('/financeiro')}
                        aria-label="Financeiro"
                        aria-current={isActive('/financeiro') ? 'page' : undefined}
                        className={`${navItemBase} flex-1 min-w-0 h-full ${isActive('/financeiro') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${isActive('/financeiro') ? 'bg-[var(--color-card-hover)]' : ''}`}>
                            <DollarSign className="w-5 h-5" strokeWidth={isActive('/financeiro') ? 2.5 : 2} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-bold tracking-tight truncate max-w-full">Financeiro</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigate('/meus-insights')}
                        aria-label="Meus resultados"
                        aria-current={isActive('/meus-insights') ? 'page' : undefined}
                        className={`${navItemBase} flex-1 min-w-0 h-full ${isActive('/meus-insights') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${isActive('/meus-insights') ? 'bg-[var(--color-card-hover)]' : ''}`}>
                            <TrendingUp className="w-5 h-5" strokeWidth={isActive('/meus-insights') ? 2.5 : 2} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-bold tracking-tight truncate max-w-full">Resultados</span>
                    </button>
                )}

                {/* 5. Mais — visível para dono e staff (staff vê versão limitada) */}
                <button
                    type="button"
                    onClick={() => setShowMoreMenu(true)}
                    aria-label="Mais opções"
                    aria-expanded={showMoreMenu}
                    className={`${navItemBase} flex-1 min-w-0 h-full ${showMoreMenu ? accent.text : colors.textSecondary}`}
                >
                    <div className={`p-1.5 rounded-xl transition-all ${showMoreMenu ? 'bg-[var(--color-card-hover)]' : ''}`}>
                        <Menu className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold tracking-tight truncate max-w-full">Mais</span>
                </button>
            </nav>

            {showQuickActions && (
                <QuickActionsModal onClose={() => setShowQuickActions(false)} />
            )}

            {showMoreMenu && (
                <MoreOptionsDrawer onClose={() => setShowMoreMenu(false)} />
            )}
        </>
    );
};
