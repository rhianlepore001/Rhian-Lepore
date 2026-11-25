import React, { useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SettingsItem, findActiveSettingsItem, isPathActive, settingsItemsForRole } from '../constants';
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
  const location = useLocation();
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
                  className={() => {
                    const isActive = isPathActive(location.pathname, item.path);
                    return `
                    relative flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all group shrink-0
                    active:animate-haptic-click
                    ${isActive
                      ? `${accent.bgDim} ${accent.text} font-bold`
                      : `${colors.textSecondary} hover:text-theme-text hover:bg-[var(--color-card-hover)] border border-transparent`
                    }
                  `;
                  }}
                >
                  {() => {
                    const isActive = isPathActive(location.pathname, item.path);
                    return (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-200 ${accent.bg} ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`}
                      />
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </>
                    );
                  }}
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
          <span className="text-sm font-medium">Voltar ao início</span>
        </NavLink>
      </div>
    </>
  );
};

const MobileSettingsMenu: React.FC<{
  menuItems: SettingsItem[];
  activePath?: string;
}> = ({ menuItems, activePath }) => {
  if (menuItems.length <= 1) return null;

  return (
    <details className="group px-4 pb-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-card px-3 text-sm font-semibold text-theme-accent [&::-webkit-details-marker]:hidden">
        Ver todas as configurações
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <nav aria-label="Seções de configurações" className="mt-1.5 max-h-[50dvh] overflow-y-auto overscroll-contain rounded-lg border border-theme-border bg-theme-card p-2">
        {GROUP_ORDER.map((group) => {
          const items = menuItems.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="border-t border-[var(--color-divider)] py-2 first:border-t-0 first:pt-0 last:pb-0">
              <p className="px-2 text-xs font-semibold text-theme-textSecondary">{group}</p>
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={item.path === activePath ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm ${item.path === activePath
                    ? 'bg-[var(--color-accent-dim)] font-semibold text-theme-accent'
                    : 'text-theme-text hover:bg-[var(--color-card-hover)]'}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
    </details>
  );
};

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const { role, isDev } = useAuth();
  const location = useLocation();
  useAppTour();
  const { accent, colors } = useBrutalTheme();

  const menuItems = settingsItemsForRole(role, isDev);

  const currentPage = findActiveSettingsItem(menuItems, location.pathname);
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

      <div className="flex-1 min-w-0 min-h-screen flex flex-col w-full max-w-[100vw]">
        <div className={`md:hidden sticky top-[calc(var(--header-top,0px)+3.5rem)] z-30 bg-theme-bg border-b ${colors.divider}`}>
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
          </div>
          <MobileSettingsMenu key={location.pathname} menuItems={menuItems} activePath={currentPage?.path} />
        </div>

        <div className="p-4 md:p-8 lg:px-10 flex-1 pb-28 md:pb-10 w-full">
          <div className="w-full max-w-6xl xl:max-w-7xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
