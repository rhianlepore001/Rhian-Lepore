import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, DollarSign, Plus, Menu } from 'lucide-react'; // Icons
import { useAuth } from '../contexts/AuthContext';
import { QuickActionsModal } from './QuickActionsModal';
import { MoreOptionsDrawer } from './MoreOptionsDrawer';

export const BottomMobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';

    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Theme colors
    const activeColor = isBeauty ? 'text-beauty-neon' : 'text-black';
    const inactiveColor = isBeauty ? 'text-white/40' : 'text-neutral-400';
    const activeBg = isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/20';

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    const navItems = [
        { name: 'Agenda', icon: Calendar, path: '/agenda' },
        { name: 'Clientes', icon: Users, path: '/clientes' },
        // Middle item is special (+)
        { name: 'Financeiro', icon: DollarSign, path: '/financeiro' },
        // Last item is 'Mais'
    ];

    return (
        <>
            <div
                className={`md:hidden fixed bottom-6 left-6 right-6 z-40 flex items-center justify-between px-3 pb-[env(safe-area-inset-bottom)] pt-3 h-[76px] transition-all duration-300 rounded-[28px] border border-white/10 shadow-promax-glass backdrop-blur-2xl
                ${isBeauty
                        ? 'bg-beauty-dark/40 shadow-beauty-neon/5'
                        : 'bg-brutal-main/40 shadow-black/40 text-black'}`}
            >
                {/* 1. Agenda */}
                <button
                    onClick={() => navigate('/agenda')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/agenda') ? activeColor : inactiveColor}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${isActive('/agenda') ? 'bg-white/5' : ''}`}>
                        <Calendar className="w-6 h-6" strokeWidth={isActive('/agenda') ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Agenda</span>
                </button>

                {/* 2. Clientes */}
                <button
                    onClick={() => navigate('/clientes')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/clientes') ? activeColor : inactiveColor}`}
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
                        ${isBeauty
                                ? 'bg-beauty-neon text-white'
                                : 'bg-accent-gold text-black'
                            }`}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Plus className="w-10 h-10 relative z-10" strokeWidth={3} />
                    </button>
                    {/* Ring Glow */}
                    <div className={`absolute -top-1 w-18 h-18 rounded-3xl blur-xl opacity-20 -z-10 ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`}></div>
                </div>

                {/* 4. Financeiro */}
                <button
                    onClick={() => navigate('/financeiro')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${isActive('/financeiro') ? activeColor : inactiveColor}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${isActive('/financeiro') ? 'bg-white/5' : ''}`}>
                        <DollarSign className="w-6 h-6" strokeWidth={isActive('/financeiro') ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Financeiro</span>
                </button>

                {/* 5. Mais */}
                <button
                    onClick={() => setShowMoreMenu(true)}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:animate-haptic-click ${showMoreMenu ? activeColor : inactiveColor}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${showMoreMenu ? 'bg-white/5' : ''}`}>
                        <Menu className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Mais</span>
                </button>
            </div>

            {/* Convert to simple boolean flags so we don't need prop drilling for now if complex, 
          but actually we will just render them here conditionally */}



            {showQuickActions && (
                <QuickActionsModal onClose={() => setShowQuickActions(false)} />
            )}

            {showMoreMenu && (
                <MoreOptionsDrawer onClose={() => setShowMoreMenu(false)} />
            )}
        </>
    );
};
