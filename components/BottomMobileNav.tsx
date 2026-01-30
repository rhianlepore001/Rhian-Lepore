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
                className={`md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-2 h-[80px] transition-all duration-300
                ${isBeauty
                        ? 'bg-beauty-dark/95 backdrop-blur-xl border-t border-white/5 shadow-soft'
                        : 'bg-white border-t-2 border-brutal-border shadow-heavy-sm'}`}
            >
                {/* 1. Agenda */}
                <button
                    onClick={() => navigate('/agenda')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/agenda') ? activeColor : inactiveColor}`}
                >
                    <Calendar className="w-6 h-6" strokeWidth={isActive('/agenda') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Agenda</span>
                </button>

                {/* 2. Clientes */}
                <button
                    onClick={() => navigate('/clientes')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/clientes') ? activeColor : inactiveColor}`}
                >
                    <Users className="w-6 h-6" strokeWidth={isActive('/clientes') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Clientes</span>
                </button>

                {/* 3. CENTER PLUS BUTTON */}
                <div className="relative -top-5 flex justify-center w-full">
                    <button
                        onClick={() => setShowQuickActions(true)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-95 ${isBeauty
                            ? 'bg-beauty-neon text-white shadow-beauty-neon/30'
                            : 'bg-black text-accent-gold shadow-black/30'
                            }`}
                    >
                        <Plus className="w-8 h-8" strokeWidth={2.5} />
                    </button>
                </div>

                {/* 4. Financeiro */}
                <button
                    onClick={() => navigate('/financeiro')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/financeiro') ? activeColor : inactiveColor}`}
                >
                    <DollarSign className="w-6 h-6" strokeWidth={isActive('/financeiro') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Financeiro</span>
                </button>

                {/* 5. Mais */}
                <button
                    onClick={() => setShowMoreMenu(true)}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${showMoreMenu ? activeColor : inactiveColor}`}
                >
                    <Menu className="w-6 h-6" strokeWidth={2} />
                    <span className="text-[10px] font-medium">Mais</span>
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
