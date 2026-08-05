import React, { useEffect, useMemo, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SETTINGS_ITEMS, SettingsItem } from '../constants';
import { useAppTour } from '../hooks/useAppTour';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const GROUP_ORDER: SettingsItem['group'][] = ['Negócio', 'Financeiro', 'Conta', 'Sistema'];

interface SidebarContentProps {
  menuItems: SettingsItem[];
  onNavigate?: () => void;
  accent: ReturnType<typeof useBrutalTheme>['accent'];
  colors: ReturnType<typeof useBrutalTheme>['colors'];
}

const SidebarContent: React.FC<SidebarContentProps> = ({ menuItems, onNavigate, accent, colors }) => {
  const grouped = useMemo(() => {
    return GROUP_ORDER
      .map((group) => ({ group, items: menuItems.filter((item) => item.group === group) }))
      .filter((entry) => entry.items.length > 0);
  }, [menuItems]);
  const showGroupHeaders = grouped.length > 1;

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
        <h2 className={`font-heading text-lg uppercase tracking-wider ${colors.text}`}>
          Configurações
        </h2>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 space-y-5 custom-scrollbar">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            {showGroupHeaders && (
              <p className={`px-3 mb-1.5 text-xs font-bold uppercase tracking-widest ${colors.textSecondary} opacity-70`}>
                {group}
              </p>
            )}
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) => `
                    relative flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all group shrink-0
                    active:animate-haptic-click
                    ${isActive
                      ? `${accent.bgDim} ${accent.text} font-bold`
                      : `${colors.textSecondary} hover:text-theme-text hover:bg-[var(--color-card-hover)] border border-transparent`
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-200 ${accent.bg} ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`}
                      />
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={`px-5 py-4 border-t ${colors.divider} flex-shrink-0`}>
        <NavLink
          to="/"
          onClick={onNavigate}
          className={`flex items-center gap-2 min-h-[44px] ${colors.textSecondary} hover:text-theme-text transition-colors active:animate-haptic-click`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar ao Dashboard</span>
        </NavLink>
      </div>
    </>
  );
};

const MobileSettingsRail: React.FC<{
  menuItems: SettingsItem[];
  accent: ReturnType<typeof useBrutalTheme>['accent'];
  colors: ReturnType<typeof useBrutalTheme>['colors'];
}> = ({ menuItems, accent, colors }) => {
  const location = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const el = activeRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    const left = el.offsetLeft - scroller.clientWidth / 2 + el.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [location.pathname]);

  if (menuItems.length <= 1) return null;

  return (
    <div className="relative border-b border-[var(--color-divider)]">
      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Seções de configurações — deslize para ver mais"
      >
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              ref={isActive ? activeRef : undefined}
              role="tab"
              aria-selected={isActive}
              className={`
                snap-start inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 min-h-[44px] rounded-full
                text-xs font-semibold tracking-wide whitespace-nowrap transition-colors active:animate-haptic-click
                border
                ${isActive
                  ? `${accent.bgDim} ${accent.text} ${accent.border}`
                  : `${colors.card} ${colors.border} ${colors.textSecondary}`
                }
              `}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[9.5rem]">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--color-bg)] to-transparent opacity-80"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent opacity-90"
        aria-hidden="true"
      />
    </div>
  );
};

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const { role, isDev } = useAuth();
  const location = useLocation();
  useAppTour();
  const { accent, colors } = useBrutalTheme();

  const menuItems = role === 'staff'
    ? SETTINGS_ITEMS.filter((item) => item.path === '/configuracoes/servicos')
    : SETTINGS_ITEMS.filter((item) => isDev || !item.devOnly);

  const currentPage = menuItems.find((item) => item.path === location.pathname);
  const currentPageTitle = currentPage?.label || 'Configurações';
  const currentGroup = currentPage?.group;

  return (
    <div className={`min-h-screen flex items-start relative w-full overflow-x-clip ${colors.bg}`}>
      <aside
        className={`
          hidden md:flex flex-col w-64 shrink-0 self-start
          sticky top-[calc(var(--header-top,0px)+5rem)]
          h-[calc(100dvh-var(--header-top,0px)-5rem)]
          bg-[var(--color-bg)] border-r ${colors.divider}
        `}
      >
        <SidebarContent menuItems={menuItems} accent={accent} colors={colors} />
      </aside>

      <main className="flex-1 min-w-0 min-h-screen flex flex-col w-full max-w-[100vw]">
        <div className={`md:hidden sticky top-16 z-30 bg-[var(--color-bg)]/95 backdrop-blur-md border-b ${colors.divider}`}>
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <div className="min-w-0">
              {currentGroup && (
                <p className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted}`}>
                  {currentGroup}
                </p>
              )}
              <h1 className={`text-lg font-bold ${colors.text} tracking-tight truncate`}>
                {currentPageTitle}
              </h1>
            </div>
            <NavLink
              to="/"
              className={`shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg ${colors.textSecondary} hover:text-theme-text hover:bg-[var(--color-card-hover)] active:animate-haptic-click`}
              aria-label="Voltar ao Dashboard"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </NavLink>
          </div>
          <MobileSettingsRail menuItems={menuItems} accent={accent} colors={colors} />
        </div>

        <div className="p-4 md:p-8 lg:px-10 flex-1 overflow-y-auto pb-28 md:pb-10 w-full">
          <div className="w-full max-w-6xl xl:max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
