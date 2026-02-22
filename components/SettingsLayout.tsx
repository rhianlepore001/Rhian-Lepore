import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SETTINGS_ITEMS } from '../constants';
import { useAppTour } from '../hooks/useAppTour';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
    const { userType } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    useAppTour(); // Instancia para detectar continuação do tour

    const isBeauty = userType === 'beauty';
    const bgColor = isBeauty ? 'bg-beauty-dark' : 'bg-neutral-950';

    const menuItems = SETTINGS_ITEMS;

    // Get current page title for mobile header
    const currentPage = menuItems.find(item => item.path === location.pathname);
    const currentPageTitle = currentPage?.label || 'Configurações';

    return (
        <div className={`min-h-screen flex relative ${bgColor} overflow-x-hidden w-full`}>

            {/* Sidebar (Desktop) / Drawer (Mobile) */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 
                transform transition-transform duration-300 ease-in-out md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                p-6 flex flex-col h-full
                ${isBeauty
                    ? 'bg-beauty-dark/95 border-r border-white/5 shadow-promax-glass'
                    : 'bg-brutal-main/95 border-r border-white/5 shadow-promax-depth'}
                md:backdrop-blur-3xl
            `}>
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <h2 className={`font-heading text-xl uppercase tracking-wider text-white`}>
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
                                ${isBeauty
                                    ? (isActive
                                        ? 'bg-beauty-neon/20 text-beauty-neon shadow-[0_0_15px_rgba(167,139,250,0.2)]'
                                        : 'text-neutral-400 hover:text-white hover:bg-white/5')
                                    : (isActive
                                        ? 'bg-accent-gold text-black font-bold shadow-promax-depth'
                                        : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent')
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/10 mt-auto flex-shrink-0">
                    <NavLink
                        to="/dashboard"
                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors px-2 active:animate-haptic-click"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Voltar ao Dashboard</span>
                    </NavLink>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-md transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen flex flex-col w-full max-w-[100vw]">

                {/* Mobile Header + Sticky Nav - PRO MAX REVITALIZATION */}
                <div className={`md:hidden sticky top-0 z-30 border-b ${isBeauty ? 'bg-beauty-dark border-white/5' : 'bg-neutral-900 border-white/5'} backdrop-blur-md`}>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-xl transition-all active:animate-haptic-click ${isBeauty ? 'bg-white/5 text-white' : 'bg-white/5 text-white shadow-sm'}`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Ajustes</span>
                                <h1 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                                    {currentPageTitle}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Nav (Mobile Only) - PRO MAX STYLE */}
                    <div className="px-4 pb-4 overflow-x-auto hide-scrollbar">
                        <div className="flex gap-3 min-w-max px-2">
                            {menuItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `
                                        flex items-center gap-2 px-4 py-2 rounded-full transition-all active:animate-haptic-click border
                                        ${isActive
                                            ? (isBeauty
                                                ? 'bg-beauty-neon/20 border-beauty-neon/50 text-white shadow-[0_0_15px_rgba(167,139,250,0.3)]'
                                                : 'bg-accent-gold text-black border-accent-gold shadow-promax-depth')
                                            : 'bg-white/5 border-white/5 text-neutral-400 opacity-60'
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
                </div>

                {/* Content Area */}
                <div className="p-4 md:p-8 flex-1 overflow-y-auto pb-24 md:pb-8 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
