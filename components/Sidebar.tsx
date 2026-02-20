
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../constants';
import { Scissors, X, LogOut, Sparkles } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useUI();
  const { logout, userType } = useAuth();

  const isBeauty = userType === 'beauty';
  const themeColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const themeBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const hoverText = isBeauty ? 'group-hover:text-beauty-neon' : 'group-hover:text-accent-gold';

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      <aside
        id="sidebar-container"
        className={`
          fixed left-0 z-50 w-64 flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          ${isBeauty
            ? 'bg-beauty-dark/95 backdrop-blur-xl border-r border-white/5'
            : 'bg-brutal-main border-r-4 border-brutal-border'}
        `}
        style={{ top: 'var(--header-top, 0)', bottom: 0 }}
      >
        {/* Logo Area */}
        {/* Logo Area - Simplified for Sidebar */}
        <div className={`h-20 flex items-center justify-between px-6 md:hidden ${isBeauty ? 'border-b border-white/5 bg-transparent' : 'border-b-4 border-brutal-border bg-brutal-card'}`}>
          <div className="flex items-center justify-center">
            <span className={`font-heading text-xl ${themeColor} uppercase tracking-tighter`}>Menu</span>
          </div>
          <button onClick={closeSidebar} className="text-text-secondary hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 overflow-y-auto space-y-2 px-4">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const itemId = `sidebar-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`;

            // Beauty Theme Active State
            if (isBeauty) {
              return (
                <Link
                  id={itemId}
                  key={item.name}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`
                      group flex items-center px-4 py-3 font-sans font-medium text-sm transition-all rounded-xl
                      ${isActive
                      ? 'bg-beauty-neon/10 text-beauty-neon'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'}
                    `}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-beauty-neon' : 'text-neutral-500 group-hover:text-white'}`} />
                  {item.name}
                </Link>
              );
            }

            // Barber Theme Active State (Original)
            return (
              <Link
                id={itemId}
                key={item.name}
                to={item.path}
                onClick={closeSidebar}
                className={`
                  group flex items-center px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide transition-all border-2
                  ${isActive
                    ? `${themeBg} border-black text-black shadow-heavy-sm translate-x-1`
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-neutral-900 hover:border-neutral-800'}
                `}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-black' : `${themeColor} group-hover:text-white`}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className={`w-full group flex items-center px-4 py-3 text-sm transition-all mt-8
                ${isBeauty
                ? 'font-sans font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-xl'
                : 'font-mono font-bold uppercase tracking-wide border-2 border-transparent hover:text-red-500 hover:bg-red-900/10 hover:border-red-900/50'}
            `}
          >
            <LogOut className={`w-5 h-5 mr-3 transition-colors ${isBeauty ? 'text-neutral-500 group-hover:text-red-400' : 'text-neutral-600 group-hover:text-red-500'}`} />
            Sair
          </button>
        </nav>

        {/* Bottom Status */}

      </aside>
    </>
  );
};

