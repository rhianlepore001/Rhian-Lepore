import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, DollarSign, Plus, Menu, TrendingUp } from 'lucide-react'; // Icons
import { useAuth } from '../contexts/AuthContext';
import { QuickActionsModal } from './QuickActionsModal';
import { MoreOptionsDrawer } from './MoreOptionsDrawer';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const BottomMobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAuth();
    const { accent, colors, font } = useBrutalTheme();
    const isStaff = role === 'staff';

    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    return (
        <>
            <div
                className={`md:hidden fixed bottom-6 left-6 right-6 z-40 flex items-center justify-between px-3 pb-[env(safe-area-inset-bottom)] pt-3 h-[76px] transition-all duration-300 rounded-[28px] border ${colors.divider} shadow-promax-glass backdrop-blur-2xl
                ${colors.bg}/40`}
            >
                {/* 1. Agenda */}
                <button
                    onClick={() => navigate('/agenda')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/agenda') ? accent.text : colors.textSecondary}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${isActive('/agenda') ? 'bg-white/5' : ''}`}>
                        <Calendar className="w-6 h-6" strokeWidth={isActive('/agenda') ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Agenda</span>
                </button>

                {/* 2. Clientes */}
                <button
                    onClick={() => navigate('/clientes')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/clientes') ? accent.text : colors.textSecondary}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${isActive('/clientes') ? 'bg-white/5' : ''}`}>
                        <Users className="w-6 h-6" strokeWidth={isActive('/clientes') ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Clientes</span>
                </button>

                {/* 3. CENTER PLUS BUTTON */}
                <div className="relative -top-10 flex justify-center w-full">
                    <button
                        onClick={() => setShowQuickActions(true)}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-promax-depth transform transition-all active:scale-95 group relative overflow-hidden
                        ${accent.bg} ${font.body === 'font-sans' ? 'text-white' : 'text-black'}`}
                        aria-label="Ações rápidas"
                        title="Ações rápidas"
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Plus className="w-10 h-10 relative z-10" strokeWidth={3} />
                    </button>
                    {/* Ring Glow */}
                    <div className={`absolute -top-1 w-18 h-18 rounded-3xl blur-xl opacity-20 -z-10 ${accent.bg}`}></div>
                </div>

                {/* 4. Financeiro / Insights */}
                {!isStaff ? (
                    <button
                        onClick={() => navigate('/financeiro')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/financeiro') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${isActive('/financeiro') ? 'bg-white/5' : ''}`}>
                            <DollarSign className="w-6 h-6" strokeWidth={isActive('/financeiro') ? 2.5 : 2} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Financeiro</span>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/meus-insights')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/meus-insights') ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${isActive('/meus-insights') ? 'bg-white/5' : ''}`}>
                            <TrendingUp className="w-6 h-6" strokeWidth={isActive('/meus-insights') ? 2.5 : 2} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Insights</span>
                    </button>
                )}

                {/* 5. Mais — visível somente para o dono */}
                {!isStaff && (
                    <button
                        onClick={() => setShowMoreMenu(true)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${showMoreMenu ? accent.text : colors.textSecondary}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${showMoreMenu ? 'bg-white/5' : ''}`}>
                            <Menu className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Mais</span>
                    </button>
                )}
            </div>

            {showQuickActions && (
                <QuickActionsModal onClose={() => setShowQuickActions(false)} />
            )}

            {showMoreMenu && (
                <MoreOptionsDrawer onClose={() => setShowMoreMenu(false)} />
            )}
        </>
    );
};
