import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../constants';
import { TrendingUp, X, LogOut } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useTheme } from '../contexts/ThemeContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useUI();
  const { logout, userType, role } = useAuth();

  const isStaff = role === 'staff';
  const { accent, colors, classes } = useBrutalTheme();
  const { mode } = useTheme();
  const isLight = mode === 'light';

  // Filtra itens de navegação com base no role do usuário
  const visibleItems = NAVIGATION_ITEMS.filter(item => !item.ownerOnly || !isStaff);

  const renderLink = (path: string, Icon: React.ElementType, label: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    return (
      <Link
        key={path}
        to={path}
        onClick={closeSidebar}
        className={`
          ${classes.sidebarItem}
          ${isActive ? classes.sidebarItemActive : classes.sidebarItemInactive}
          ${isActive ? '' : colors.border}
        `}
      >
        <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? accent.text : `${accent.text} group-hover:text-theme-text`}`} />
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className={`fixed inset-0 ${colors.overlay} z-40 md:hidden backdrop-blur-[4px] animate-in fade-in duration-200`}
          onClick={closeSidebar}
        />
      )}

      <aside
        id="sidebar-container"
        className={`
          fixed left-0 z-50 w-64 hidden md:flex flex-col
          transition-transform duration-300 ease-in-out md:shadow-none
          md:translate-x-0
          ${classes.sidebar}
        `}
        style={{ top: 'var(--header-top, 0)', bottom: 0 }}
      >
        {/* Header mobile */}
        <div className={`h-16 flex items-center justify-between px-6 md:hidden border-b ${colors.divider} ${colors.card}`}>
          <div className="relative group">
            <div className={`absolute -inset-2 ${accent.bgDim} blur-xl rounded-full opacity-60`} />
            <div className="relative flex items-center gap-2.5">
              <img
                src={isLight ? "/logo-agendix-light.png" : "/logo-agendix-icon.png"}
                alt="AgendiX Logo"
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
              <span className={`text-xl font-heading font-black uppercase tracking-tighter leading-none ${colors.text}`}>AgendiX</span>
            </div>
          </div>
          <button onClick={closeSidebar} className={`${colors.textSecondary} hover:text-theme-text transition-colors`} aria-label="Fechar menu" title="Fechar menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop: Header do menu com Logo */}
        <div className={`hidden md:flex h-20 items-center justify-center border-b ${colors.divider}`}>
          <Link to="/" onClick={closeSidebar} className="relative flex items-center hover:opacity-80 transition-opacity group">
            <div className={`absolute -inset-3 ${accent.bgDim} blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative flex items-center gap-3">
              <img
                src={isLight ? "/logo-agendix-light.png" : "/logo-agendix-icon.png"}
                alt="AgendiX Logo"
                style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
              <span className={`text-2xl font-heading font-black uppercase tracking-tighter leading-none ${colors.text}`}>AgendiX</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto space-y-1 px-3">
          {visibleItems.map((item) => renderLink(item.path, item.icon, item.name))}

          {/* Links extras somente para staff */}
          {isStaff && renderLink('/meus-insights', TrendingUp, 'Meus Insights')}

          {/* Separador */}
          <div className={`border-t ${colors.divider} pt-3 mt-3`} />

          {/* Botão de Logout — neutro em repouso, vermelho no hover */}
          <button
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className={`w-full group flex items-center px-4 py-3 text-sm font-sans font-medium ${colors.textMuted} hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-transparent hover:border-red-500/20 transition-all duration-200`}
          >
            <LogOut className={`w-5 h-5 mr-3 transition-colors ${colors.textMuted} group-hover:text-red-400`} />
            Sair
          </button>
        </nav>
      </aside>
    </>
  );
};
