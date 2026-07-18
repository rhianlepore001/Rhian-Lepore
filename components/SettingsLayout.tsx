import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
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
    onClose?: () => void;
    accent: ReturnType<typeof useBrutalTheme>['accent'];
    colors: ReturnType<typeof useBrutalTheme>['colors'];
}

const SidebarContent: React.FC<SidebarContentProps> = ({ menuItems, onNavigate, onClose, accent, colors }) => {
    const grouped = useMemo(() => {
        return GROUP_ORDER
            .map(group => ({ group, items: menuItems.filter(item => item.group === group) }))
            .filter(entry => entry.items.length > 0);
    }, [menuItems]);
    const showGroupHeaders = grouped.length > 1;

    return (
        <>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                <h2 className={`font-heading text-lg uppercase tracking-wider ${colors.text}`}>
                    Configurações
                </h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="Fechar menu de configurações"
                        className="md:hidden p-2 text-theme-textSecondary hover:text-theme-text rounded-full hover:bg-[var(--color-card-hover)] active:animate-haptic-click"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
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
                            {items.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={onNavigate}
                                    className={({ isActive }) => `
                                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group shrink-0
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

            <div className={`px-5 py-4 border-t ${colors.divider} flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]`}>
                <NavLink
                    to="/dashboard"
                    onClick={onNavigate}
                    className={`flex items-center gap-2 ${colors.textSecondary} hover:text-theme-text transition-colors active:animate-haptic-click`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Voltar ao Dashboard</span>
                </NavLink>
            </div>
        </>
    );
};

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
    const { role, isDev } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    useAppTour();
    const { accent, colors } = useBrutalTheme();

    // Staff vê apenas o item "Serviços"; contas non-dev não veem itens devOnly
    const menuItems = role === 'staff'
        ? SETTINGS_ITEMS.filter(item => item.path === '/configuracoes/servicos')
        : SETTINGS_ITEMS.filter(item => isDev || !item.devOnly);

    // Get current page title for mobile header
    const currentPage = menuItems.find(item => item.path === location.pathname);
    const currentPageTitle = currentPage?.label || 'Configurações';

    const closeSidebar = () => setIsSidebarOpen(false);

    useEffect(() => {
        if (!isSidebarOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsSidebarOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.documentElement.style.overflow = '';
        };
    }, [isSidebarOpen]);

    return (
        <div className={`min-h-screen flex items-start relative w-full overflow-x-clip ${colors.bg}`}>

            {/* Sidebar (Desktop) — sticky no fluxo: imune a transform/will-change de ancestors */}
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

            {/* Drawer (Mobile) — portal no body: escapa de ancestors com transform/will-change */}
            {createPortal(
                <>
                    <div
                        className={`fixed inset-0 z-[60] md:hidden ${colors.overlay} backdrop-blur-md transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={closeSidebar}
                    />
                    <aside
                        className={`
                            fixed inset-y-0 left-0 z-[70] md:hidden w-72 max-w-[85vw] flex flex-col
                            bg-[var(--color-bg)] border-r ${colors.divider} shadow-promax-glass
                            transform transition-transform duration-300 ease-in-out
                            pt-[env(safe-area-inset-top)]
                            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        `}
                        aria-hidden={!isSidebarOpen}
                    >
                        <SidebarContent menuItems={menuItems} onNavigate={closeSidebar} onClose={closeSidebar} accent={accent} colors={colors} />
                    </aside>
                </>,
                document.body
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0 min-h-screen flex flex-col w-full max-w-[100vw]">

                {/* Mobile Header + Sticky Nav - PRO MAX REVITALIZATION */}
                <div className={`md:hidden sticky top-16 z-30 border-b bg-[var(--color-bg)] ${colors.divider}`}>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
aria-label="Abrir menu de configurações"
                                className={`p-2 -ml-2 rounded-xl transition-all active:animate-haptic-click bg-[var(--color-card-hover)] ${colors.text}`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex flex-col">
                                <span className={`text-xs uppercase tracking-widest ${colors.textSecondary} font-bold`}>Ajustes</span>
                                <h1 className={`text-lg font-black ${colors.text} uppercase tracking-tight leading-none`}>
                                    {currentPageTitle}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Nav (Mobile Only) - PRO MAX STYLE */}
                    <div className="relative">
                        <div className="px-4 pb-4 overflow-x-auto hide-scrollbar">
                            <div className="flex gap-3 min-w-max px-2">
                                {menuItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => `
                                            flex items-center gap-2 px-4 py-2 rounded-full transition-all active:animate-haptic-click border
                                            ${isActive
? `${accent.bgDim} ${accent.text} ${accent.border} shadow-promax-glass`
                                                : `bg-[var(--color-card-hover)] ${colors.border} ${colors.textSecondary} opacity-80`
                                            }
                                        `}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wide">
                                            {item.label.split(' ')[0]}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                        {/* Gradient fade right */}
                        <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent md:hidden`} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 md:p-8 flex-1 overflow-y-auto pb-24 md:pb-8 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
