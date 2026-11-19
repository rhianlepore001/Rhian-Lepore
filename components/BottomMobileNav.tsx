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
        'flex flex-col items-center justify-center gap-0.5 min-h-12 rounded-xl motion-safe:active:scale-[0.98]';

    const secondaryPath = isStaff ? '/fila' : '/clientes';
    const secondaryActive = isActive(secondaryPath);

    return (
        <>
            <nav
                aria-label="Navegação principal"
                className={`md:hidden fixed bottom-0 left-0 right-0 z-40 grid ${isStaff ? 'grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.8fr)_minmax(0,1fr)]' : 'grid-cols-5'} items-stretch gap-0.5 px-1.5 pb-[calc(0.25rem+var(--safe-bottom))] pt-1 min-h-[calc(66px+var(--safe-bottom))] border-t ${colors.divider} ${colors.card}`}
            >
                {/* Owner: Agenda, Clientes, FAB, Financeiro, Mais.
                    Staff: Agenda, Fila, FAB, Insights, Mais — CRM é domínio do gestor. */}
                {/* 1. Agenda */}
                <button
                    type="button"
                    onClick={() => navigate('/agenda')}
                    aria-label="Agenda"
                    aria-current={isActive('/agenda') ? 'page' : undefined}
                    className={`${navItemBase} min-w-0 ${isActive('/agenda') ? accent.text : colors.textSecondary}`}
                >
                    <div className={`min-w-9 h-7 flex items-center justify-center rounded-lg transition-colors ${isActive('/agenda') ? accent.bgDim : ''}`}>
                        <Calendar className="w-5 h-5" strokeWidth={isActive('/agenda') ? 2.5 : 2} aria-hidden="true" />
                    </div>
                    <span className="text-[0.6875rem] font-semibold leading-tight px-0.5 max-w-full text-center">Agenda</span>
                </button>

                {/* 2. Clientes (dono) / Fila (colaborador) */}
                <button
                    type="button"
                    onClick={() => navigate(secondaryPath)}
                    aria-label={isStaff ? 'Fila' : 'Clientes'}
                    aria-current={secondaryActive ? 'page' : undefined}
                    className={`${navItemBase} min-w-0 ${secondaryActive ? accent.text : colors.textSecondary}`}
                >
                    <div className={`min-w-9 h-7 flex items-center justify-center rounded-lg transition-colors ${secondaryActive ? accent.bgDim : ''}`}>
                        {isStaff ? (
                            <Clock className="w-5 h-5" strokeWidth={secondaryActive ? 2.5 : 2} aria-hidden="true" />
                        ) : (
                            <Users className="w-5 h-5" strokeWidth={secondaryActive ? 2.5 : 2} aria-hidden="true" />
                        )}
                    </div>
                    <span className="text-[0.6875rem] font-semibold leading-tight px-0.5 max-w-full text-center">{isStaff ? 'Fila' : 'Clientes'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setShowQuickActions(true)}
                    aria-label="Ações rápidas"
                    aria-expanded={showQuickActions}
                    className={`${navItemBase} min-w-0 ${accent.text}`}
                >
                    <span className={`flex h-9 w-10 items-center justify-center rounded-xl ${accent.bg} text-[var(--color-on-accent)]`}>
                        <Plus className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="text-[0.6875rem] font-semibold leading-tight">Ações</span>
                </button>

                {/* 4. Financeiro / Insights */}
                {!isStaff ? (
                    <button
                        type="button"
                        onClick={() => navigate('/financeiro')}
                        aria-label="Financeiro"
                        aria-current={isActive('/financeiro') ? 'page' : undefined}
                        className={`${navItemBase} min-w-0 ${isActive('/financeiro') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`min-w-9 h-7 flex items-center justify-center rounded-lg transition-colors ${isActive('/financeiro') ? accent.bgDim : ''}`}>
                            <DollarSign className="w-5 h-5" strokeWidth={isActive('/financeiro') ? 2.5 : 2} aria-hidden="true" />
                        </div>
                        <span className="text-[0.6875rem] font-semibold leading-tight px-0.5 max-w-full text-center">Financeiro</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigate('/meus-insights')}
                        aria-label="Meus resultados"
                        aria-current={isActive('/meus-insights') ? 'page' : undefined}
                        className={`${navItemBase} min-w-0 ${isActive('/meus-insights') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`min-w-9 h-7 flex items-center justify-center rounded-lg transition-colors ${isActive('/meus-insights') ? accent.bgDim : ''}`}>
                            <TrendingUp className="w-5 h-5" strokeWidth={isActive('/meus-insights') ? 2.5 : 2} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-semibold leading-tight tracking-tight whitespace-nowrap text-center max-w-full">Meus resultados</span>
                    </button>
                )}

                {/* 5. Mais — visível para dono e staff (staff vê versão limitada) */}
                <button
                    type="button"
                    onClick={() => setShowMoreMenu(true)}
                    aria-label="Mais opções"
                    aria-expanded={showMoreMenu}
                    className={`${navItemBase} min-w-0 ${showMoreMenu ? accent.text : colors.textSecondary}`}
                >
                    <div className={`min-w-9 h-7 flex items-center justify-center rounded-lg transition-colors ${showMoreMenu ? accent.bgDim : ''}`}>
                        <Menu className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <span className="text-[0.6875rem] font-semibold leading-tight px-0.5 max-w-full text-center">Mais</span>
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
