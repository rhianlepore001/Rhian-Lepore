import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, TrendingUp, FileText, Settings, LogOut, X, User, BarChart3, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

interface MoreOptionsDrawerProps {
    onClose: () => void;
}

export const MoreOptionsDrawer: React.FC<MoreOptionsDrawerProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { userType, logout, fullName, businessName, avatarUrl } = useAuth();
    const { setModalOpen } = useUI();
    const isBeauty = userType === 'beauty';

    useEffect(() => {
        setModalOpen(true);
        return () => setModalOpen(false);
    }, [setModalOpen]);

    const menuItems = [
        { name: 'Início', icon: LayoutDashboard, path: '/' },
        { name: 'Marketing', icon: TrendingUp, path: '/marketing' },
        { name: 'Relatórios', icon: BarChart3, path: '/insights' },
        { name: 'Fila Digital', icon: Users, path: '/fila' },
        { name: 'Ajustes', icon: Settings, path: '/configuracoes' },
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const drawerContent = (
        <div className="fixed inset-0 z-[999] flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className={`relative w-full rounded-t-[32px] shadow-promax-depth overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] pb-8 backdrop-blur-3xl
          ${isBeauty ? 'bg-beauty-dark/80 border-t border-white/10' : 'bg-brutal-main/90 border-t-2 border-accent-gold/30'}
      `}>
                {/* Header with User Info */}
                <div className={`p-6 border-b relative ${isBeauty ? 'border-white/10 bg-white/5' : 'border-neutral-800 bg-black/20'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 shadow-lg ${isBeauty ? 'bg-white/10 border-white/20' : 'bg-neutral-800 border-neutral-700'}`}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User className={`w-7 h-7 ${isBeauty ? 'text-white/60' : 'text-neutral-500'}`} />
                            )}
                        </div>
                        <div>
                            <h3 className={`font-heading text-lg leading-tight uppercase tracking-tight ${isBeauty ? 'text-white' : 'text-white'}`}>{businessName || 'Seu Negócio'}</h3>
                            <p className={`text-sm font-mono uppercase tracking-wider ${isBeauty ? 'text-white/60' : 'text-neutral-500'}`}>{fullName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg border transition-all active:scale-90
                ${isBeauty
                                ? 'bg-white/10 border-white/10 text-white/60 hover:text-white hover:bg-white/20'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'}
            `}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Menu Grid */}
                <div className="p-6 grid grid-cols-2 gap-3 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={`flex flex-col items-start p-5 rounded-2xl border transition-all active:scale-95 group
                ${isBeauty
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                    : 'bg-black/40 border-neutral-800 hover:border-accent-gold/50'}
              `}
                        >
                            <div className={`p-3 rounded-xl mb-4 transition-all group-hover:scale-110 ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon group-hover:bg-beauty-neon/20' : 'bg-neutral-800 text-accent-gold group-hover:bg-accent-gold/20 group-hover:text-white'}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className={`font-heading text-sm uppercase tracking-wide transition-colors ${isBeauty ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{item.name}</span>
                        </button>
                    ))}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`flex flex-col items-start p-5 rounded-2xl border transition-all active:scale-95 col-span-2
                ${isBeauty
                                ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                : 'bg-red-950/20 border-red-900/30 hover:bg-red-900/40'}
              `}
                    >
                        <div className={`p-3 rounded-xl mb-4 ${isBeauty ? 'bg-red-500/20 text-red-400' : 'bg-red-900/40 text-red-500'}`}>
                            <LogOut className="w-6 h-6" />
                        </div>
                        <span className={`font-heading text-sm uppercase tracking-wide ${isBeauty ? 'text-red-400' : 'text-red-500'}`}>Sair da Conta</span>
                    </button>
                </div>

                <div className="p-6 pt-2 pb-8 flex justify-center">
                    <div className={`w-12 h-1 rounded-full ${isBeauty ? 'bg-white/10' : 'bg-gray-200'}`} />
                </div>
            </div>
        </div>
    );

    return createPortal(drawerContent, document.body);
};
