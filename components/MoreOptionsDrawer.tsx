import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Settings, LogOut, X, User, Users, Calendar, Package, BarChart3, DollarSign, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface MoreOptionsDrawerProps {
    onClose: () => void;
}

export const MoreOptionsDrawer: React.FC<MoreOptionsDrawerProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { logout, fullName, businessName, avatarUrl, role } = useAuth();
    const { setModalOpen } = useUI();
    const { colors, accent, classes, status } = useBrutalTheme();
    const isStaff = role === 'staff';

    useEffect(() => {
        setModalOpen(true);
        return () => setModalOpen(false);
    }, [setModalOpen]);

    const menuItems = [
        { name: 'Início', icon: LayoutDashboard, path: '/' },
        { name: 'Agenda', icon: Calendar, path: '/agenda' },
        { name: 'Clientes', icon: Users, path: '/clientes' },
        ...(isStaff
            ? [{ name: 'Meus Insights', icon: BarChart3, path: '/meus-insights' }]
            : [
                  { name: 'Financeiro', icon: DollarSign, path: '/financeiro' },
                  { name: 'Marketing', icon: MessageSquare, path: '/marketing' },
                  { name: 'Produtos', icon: Package, path: '/produtos' },
                  { name: 'Fila Digital', icon: Users, path: '/fila' },
                  { name: 'Ajustes', icon: Settings, path: '/configuracoes' },
              ]),
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
        <div className={`fixed inset-0 flex flex-col justify-end ${colors.overlay} backdrop-blur-md animate-in fade-in duration-200`} style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className={`relative w-full rounded-t-[32px] shadow-promax-depth overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] pb-8 backdrop-blur-3xl border-t-2
                ${colors.card} border-[var(--color-accent-border)]
            `}>
                {/* Header with User Info */}
                <div className={`p-6 border-b relative ${colors.divider} bg-[var(--color-surface)]`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 shadow-lg bg-[var(--color-card-hover)] ${colors.border}`}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User className={`w-7 h-7 ${colors.textMuted}`} />
                            )}
                        </div>
                        <div>
                            <h3 className={`font-heading text-lg leading-tight uppercase tracking-tight ${colors.text}`}>{businessName || 'Seu Negócio'}</h3>
                            <p className={`text-sm font-mono uppercase tracking-wider ${colors.textSecondary}`}>{fullName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg border transition-all active:scale-90
                            ${colors.textSecondary} ${colors.border} bg-[var(--color-card-hover)] hover:bg-[var(--color-divider)] hover:${colors.text}
                        `}
                        aria-label="Fechar menu"
                        title="Fechar"
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
                                ${colors.card} ${colors.border} hover:bg-[var(--color-card-hover)] hover:border-[var(--color-accent-border)]
                            `}
                        >
                            <div className={`p-3 rounded-xl mb-4 transition-all group-hover:scale-110 bg-[var(--color-accent-dim)] ${accent.text} group-hover:bg-[var(--color-accent-border)]`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className={`font-heading text-sm uppercase tracking-wide transition-colors ${colors.text}`}>{item.name}</span>
                        </button>
                    ))}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`flex flex-col items-start p-5 rounded-2xl border transition-all active:scale-95 col-span-2
                            ${classes.buttonDanger}
                        `}
                    >
                        <div className={`p-3 rounded-xl mb-4 bg-[var(--color-danger-bg)] ${status.danger}`}>
                            <LogOut className="w-6 h-6" />
                        </div>
                        <span className={`font-heading text-sm uppercase tracking-wide ${status.danger}`}>Sair da Conta</span>
                    </button>
                </div>

                <div className="p-6 pt-2 pb-8 flex justify-center">
                    <div className={`w-12 h-1 rounded-full bg-[var(--color-divider)]`} />
                </div>
            </div>
        </div>
    );

    return createPortal(drawerContent, document.body);
};
