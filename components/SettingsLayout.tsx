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
                    ? 'bg-beauty-dark/95 backdrop-blur-xl border-r border-white/5'
                    : 'bg-brutal-main border-r-4 border-brutal-border'}
            `}>
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <h2 className={`font-heading text-xl uppercase tracking-wider ${isBeauty ? 'text-white' : 'text-white'}`}>
                        Configurações
                    </h2>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-lg transition-all group shrink-0
                                ${isBeauty
                                    ? (isActive
                                        ? 'bg-beauty-neon/10 text-beauty-neon'
                                        : 'text-neutral-400 hover:text-white hover:bg-white/5')
                                    : (isActive
                                        ? 'bg-accent-gold text-black font-bold shadow-lg border-2 border-black'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-2 border-transparent')
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/10 mt-auto flex-shrink-0">
                    <NavLink
                        to="/dashboard"
                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors px-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Voltar ao Dashboard</span>
                    </NavLink>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen flex flex-col w-full max-w-[100vw]">

                {/* Mobile Header + Sticky Nav */}
                <div className={`md:hidden sticky top-0 z-30 border-b ${isBeauty ? 'bg-beauty-dark/95 border-white/10' : 'bg-neutral-900 border-neutral-800'} backdrop-blur-md`}>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-lg transition-colors ${isBeauty ? 'text-white hover:bg-white/10' : 'text-white hover:bg-neutral-800'}`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <h1 className="text-base font-bold text-white uppercase tracking-tight">
                                {currentPageTitle}
                            </h1>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Nav (Mobile Only) */}
                    <div className="px-4 pb-0 overflow-x-auto hide-scrollbar border-b border-white/5">
                        <div className="flex gap-4 pb-3 min-w-max">
                            {menuItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `
                                        flex flex-col items-center gap-1 min-w-[64px] transition-opacity
                                        ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
                                    `}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all
                                                ${isActive
                                                    ? `${isBeauty ? 'bg-beauty-neon text-black shadow-[0_0_10px_rgba(167,139,250,0.5)]' : 'bg-accent-gold text-black shadow-lg'}`
                                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}
                                            `}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold tracking-wide ${isActive ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-neutral-500'}`}>
                                                {item.label.split(' ')[0]}
                                            </span>
                                        </>
                                    )}
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
