import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  User,
  Users,
  Package,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface MoreOptionsDrawerProps {
  onClose: () => void;
}

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path: string;
  ownerOnly?: boolean;
}

export const MoreOptionsDrawer: React.FC<MoreOptionsDrawerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, fullName, businessName, avatarUrl, role } = useAuth();
  const { setModalOpen } = useUI();
  const { colors, accent, classes } = useBrutalTheme();
  const isStaff = role === 'staff';

  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setModalOpen(true);
    const raf = requestAnimationFrame(() => setIsVisible(true));

    return () => {
      cancelAnimationFrame(raf);
      setModalOpen(false);
    };
  }, [setModalOpen]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setIsRendered(false);
      onClose();
    }, 350);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !panelRef.current) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - touchStartX.current;
    if (delta > 0) {
      panelRef.current.style.transform = `translateX(${delta}px)`;
      panelRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !panelRef.current) return;
    const currentX = e.changedTouches[0].clientX;
    const delta = currentX - touchStartX.current;
    panelRef.current.style.transition = '';
    panelRef.current.style.transform = '';

    if (delta > 80) {
      handleClose();
    }
    touchStartX.current = null;
  };

  const menuItems: MenuItem[] = [
    { name: 'Início', icon: LayoutDashboard, path: '/' },
    { name: 'Agenda', icon: Clock, path: '/agenda' },
    { name: 'Clientes', icon: Users, path: '/clientes' },
    { name: 'Financeiro', icon: DollarSign, path: '/financeiro', ownerOnly: true },
    { name: 'Produtos', icon: Package, path: '/produtos', ownerOnly: true },
    { name: 'Fila Digital', icon: Users, path: '/fila', ownerOnly: true },
    { name: 'Insights', icon: TrendingUp, path: '/insights', ownerOnly: true },
    { name: 'Ajustes', icon: Settings, path: '/configuracoes', ownerOnly: true },
  ];

  const visibleItems = menuItems.filter((item) => !item.ownerOnly || !isStaff);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  if (!isRendered) return null;

  const drawerContent = (
    <div
      className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="Menu de navegação"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative h-full w-[85vw] max-w-[320px] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${colors.bg} border-l ${colors.divider}`}
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          willChange: 'transform',
        }}
      >
        <div className={`h-1.5 w-12 rounded-full bg-[var(--color-divider)] mx-auto mt-3 md:hidden`} />

        <div className={`flex items-center justify-between p-5 border-b ${colors.divider}`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border-2 shrink-0 ${colors.border} bg-[var(--color-surface)]`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Usuário" className="w-full h-full object-cover" />
              ) : (
                <User className={`w-6 h-6 ${colors.textMuted}`} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className={`font-heading text-base uppercase tracking-tight truncate ${colors.text}`}>
                {businessName || 'Seu Negócio'}
              </h3>
              <p className={`text-xs font-mono uppercase tracking-wider truncate ${colors.textSecondary}`}>
                {fullName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2.5 rounded-full border transition-all active:scale-90 shrink-0 ${colors.border} ${colors.textSecondary} ${colors.card} hover:${colors.text} hover:border-[var(--color-accent-border)]`}
            aria-label="Fechar menu"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all duration-200 group ${
                      active
                        ? `${accent.bgDim} ${accent.text} ${accent.border} font-bold`
                        : `${colors.card} ${colors.border} ${colors.text} hover:bg-[var(--color-card-hover)] hover:border-[var(--color-accent-border)]`
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg transition-all ${
                        active ? 'bg-[var(--color-accent-border)]' : 'bg-[var(--color-surface)] group-hover:bg-[var(--color-accent-dim)]'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium tracking-wide">{item.name}</span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        active ? `${accent.text}` : `${colors.textMuted} group-hover:translate-x-0.5`
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`p-4 border-t ${colors.divider}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all active:scale-95 ${classes.buttonDanger}`}
          >
            <div className="p-2 rounded-lg bg-[var(--color-danger-bg)]">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium tracking-wide">Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
