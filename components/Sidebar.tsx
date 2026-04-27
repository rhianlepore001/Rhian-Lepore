
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../constants';
import { TrendingUp, X, LogOut } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useUI();
  const { logout, userType, role } = useAuth();

  const isBeauty = userType === 'beauty';
  const isStaff = role === 'staff';
  const themeColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

  // Filtra itens de navegação com base no role do usuário
  const visibleItems = NAVIGATION_ITEMS.filter(item => !item.ownerOnly || !isStaff);

  const renderLink = (path: string, Icon: React.ElementType, label: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    if (isBeauty) {
      return (
        <Link
          key={path}
          to={path}
          onClick={closeSidebar}
          className={`
              group relative flex items-center px-4 py-3 font-sans font-medium text-sm transition-all duration-200 rounded-xl
              ${isActive
              ? 'bg-beauty-neon/10 text-beauty-neon before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-beauty-neon'
              : 'text-text-secondary hover:text-white hover:bg-white/5'}
            `}
        >
          <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-beauty-neon' : 'text-neutral-500 group-hover:text-white'}`} />
          {label}
        </Link>
      );
    }

    return (
      <Link
        key={path}
        to={path}
        onClick={closeSidebar}
        className={`
          group relative flex items-center px-4 py-3 font-sans font-medium text-sm tracking-wide transition-all duration-200 rounded-xl border
          ${isActive
            ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/20 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-accent-gold'
            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04] hover:border-white/5'}
        `}
      >
        <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-accent-gold' : `${themeColor} group-hover:text-white`}`} />
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-[4px] animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      <aside
        id="sidebar-container"
        className={`
          fixed left-0 z-50 w-64 hidden md:flex flex-col
          transition-transform duration-300 ease-in-out md:shadow-none
          md:translate-x-0
          ${isBeauty
            ? 'bg-beauty-dark/95 md:backdrop-blur-xl border-r border-white/5'
            : 'bg-brutal-main border-r border-white/5'}
        `}
        style={{ top: 'var(--header-top, 0)', bottom: 0 }}
      >
        {/* Header mobile */}
        <div className={`h-16 flex items-center justify-between px-6 md:hidden ${isBeauty ? 'border-b border-white/5 bg-transparent' : 'border-b border-white/5 bg-brutal-card'}`}>
          <div className="relative group">
            <div className={`absolute -inset-2 ${isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20'} blur-xl rounded-full opacity-60`} />
            <div className="relative">
              <img
                src="/logo icon.png"
                alt="AgendiX"
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
          <button onClick={closeSidebar} className="text-text-secondary hover:text-white transition-colors" aria-label="Fechar menu" title="Fechar menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop: Header do menu com Logo */}
        <div className={`hidden md:flex h-20 items-center justify-center border-b ${isBeauty ? 'border-white/5' : 'border-white/5'}`}>
          <Link to="/" onClick={closeSidebar} className="relative flex items-center hover:opacity-80 transition-opacity group">
            <div className={`absolute -inset-3 ${isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/30'} blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative">
              <img
                src="/logo icon.png"
                alt="AgendiX"
                style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto space-y-1 px-3">
          {visibleItems.map((item) => renderLink(item.path, item.icon, item.name))}

          {/* Links extras somente para staff */}
          {isStaff && renderLink('/meus-insights', TrendingUp, 'Meus Insights')}

          {/* Separador */}
          <div className="border-t border-white/5 pt-3 mt-3" />

          {/* Botão de Logout — neutro em repouso, vermelho no hover */}
          <button
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className="w-full group flex items-center px-4 py-3 text-sm font-sans font-medium text-neutral-600 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3 transition-colors text-neutral-600 group-hover:text-red-400" />
            Sair
          </button>
        </nav>
      </aside>
    </>
  );
};
