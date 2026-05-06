import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SETTINGS_ITEMS } from '../constants';
import { useAppTour } from '../hooks/useAppTour';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

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

    return (
        <div
            className={`min-h-screen flex relative overflow-x-hidden w-full ${colors.bg}`}
        >

            {/* Sidebar (Desktop) / Drawer (Mobile) */}
            <aside
                className={`
                fixed bottom-0 left-0 z-50 w-64
                transform transition-transform duration-300 ease-in-out md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                p-6 flex flex-col
                ${colors.bg}/95 border-r ${colors.divider} shadow-promax-glass
                md:backdrop-blur-3xl
            `}
                style={{ top: 'calc(var(--header-top, 0px) + 5rem)' }}
            >
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <h2 className={`font-heading text-xl uppercase tracking-wider ${colors.text}`}>
                        Configurações
                    </h2>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 active:animate-haptic-click"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {menuItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all group shrink-0
                                active:animate-haptic-click
                                ${isActive
                                    ? `${accent.bgDim} ${accent.text} ${accent.shadowStrong} font-bold`
                                    : `${colors.textSecondary} hover:${colors.text} hover:bg-white/5 border border-transparent`
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className={`pt-6 border-t ${colors.divider} mt-auto flex-shrink-0`}>
                    <NavLink
                        to="/dashboard"
                        className={`flex items-center gap-2 ${colors.textSecondary} hover:${colors.text} transition-colors px-2 active:animate-haptic-click`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Voltar ao Dashboard</span>
                    </NavLink>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className={`fixed inset-0 ${colors.overlay} z-40 md:hidden backdrop-blur-md transition-opacity`}
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen flex flex-col w-full max-w-[100vw]">

                {/* Mobile Header + Sticky Nav - PRO MAX REVITALIZATION */}
                <div className={`md:hidden sticky top-0 z-30 border-b ${colors.bg}/70 ${colors.divider} backdrop-blur-xl`}>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-xl transition-all active:animate-haptic-click bg-white/5 ${colors.text}`}
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
                                                : `bg-white/5 ${colors.border} ${colors.textSecondary} opacity-80`
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
                        <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-neutral-900 to-transparent md:hidden`} />
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
