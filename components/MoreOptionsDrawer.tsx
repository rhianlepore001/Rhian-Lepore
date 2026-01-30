import React from 'react';
import { LayoutDashboard, TrendingUp, FileText, Settings, LogOut, X, User, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface MoreOptionsDrawerProps {
    onClose: () => void;
}

export const MoreOptionsDrawer: React.FC<MoreOptionsDrawerProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { userType, logout, fullName, businessName, avatarUrl } = useAuth();
    const isBeauty = userType === 'beauty';

    const menuItems = [
        { name: 'Início', icon: LayoutDashboard, path: '/' },
        { name: 'Marketing', icon: TrendingUp, path: '/marketing' },
        { name: 'Insights', icon: BarChart3, path: '/insights' },
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

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className={`relative w-full rounded-t-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[85vh]
          ${isBeauty ? 'bg-beauty-card border-t border-white/10' : 'bg-white border-t-4 border-brutal-border'}
      `}>
                {/* Header with User Info */}
                <div className={`p-6 border-b relative ${isBeauty ? 'border-white/10 bg-white/5' : 'border-brutal-border/20 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-sm ${isBeauty ? 'bg-white/10 border-white/20' : 'bg-neutral-200 border-white'}`}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User className={`w-6 h-6 ${isBeauty ? 'text-white/60' : 'text-gray-500'}`} />
                            )}
                        </div>
                        <div>
                            <h3 className={`font-bold leading-tight ${isBeauty ? 'text-white' : 'text-gray-900'}`}>{businessName || 'Seu Negócio'}</h3>
                            <p className={`text-sm ${isBeauty ? 'text-white/60' : 'text-gray-500'}`}>{fullName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`absolute top-4 right-4 p-2 rounded-full shadow-sm border transition-colors
                ${isBeauty
                                ? 'bg-white/10 border-white/10 text-white/60 hover:text-white hover:bg-white/20'
                                : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'}
            `}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Menu Grid */}
                <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={`flex flex-col items-start p-4 rounded-xl border shadow-sm hover:shadow-md transition-all active:scale-95 group
                ${isBeauty
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                    : 'bg-white border-gray-100 hover:border-black'}
              `}
                        >
                            <div className={`p-2.5 rounded-lg mb-3 transition-colors ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon group-hover:bg-beauty-neon/20' : 'bg-gray-100 text-gray-800 group-hover:bg-accent-gold/20 group-hover:text-black'}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className={`font-semibold ${isBeauty ? 'text-white' : 'text-gray-800'}`}>{item.name}</span>
                        </button>
                    ))}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`flex flex-col items-start p-4 rounded-xl border shadow-sm hover:shadow-md transition-all active:scale-95 col-span-2 sm:col-span-1
                ${isBeauty
                                ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                : 'bg-red-50 border-red-100 hover:bg-red-100'}
              `}
                    >
                        <div className={`p-2.5 rounded-lg mb-3 ${isBeauty ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                            <LogOut className="w-6 h-6" />
                        </div>
                        <span className={`font-semibold ${isBeauty ? 'text-red-400' : 'text-red-700'}`}>Sair</span>
                    </button>
                </div>

                <div className="p-6 pt-2 pb-8 flex justify-center">
                    <div className={`w-12 h-1 rounded-full ${isBeauty ? 'bg-white/10' : 'bg-gray-200'}`} />
                </div>
            </div>
        </div>
    );
};
