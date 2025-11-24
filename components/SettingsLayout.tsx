import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NAVIGATION_ITEMS, SETTINGS_ITEMS } from '../constants';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
    const { userType } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const bgColor = isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main';

    const menuItems = SETTINGS_ITEMS;

    return (
        <div className={`h-screen relative ${bgColor}`}>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${bgColor} border-r ${isBeauty ? 'border-white/10' : 'border-neutral-800'} p-4 md:p-6
                fixed inset-y-0 left-0 z-50
                w-64
                transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-heading text-lg md:text-xl uppercase">
                        Configurações
                    </h2>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden text-neutral-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="space-y-1 md:space-y-2">
                    {menuItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all
                                ${isActive
                                    ? `bg-${accentColor}/10 text-${accentColor} border-l-4 border-${accentColor}`
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                }
                            `}
                        >
                            <item.icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                            <span className="font-mono text-xs md:text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-8 pt-8 border-t border-neutral-800">
                    <NavLink
                        to="/"
                        className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                    >
                        <span className="font-mono text-xs md:text-sm">← Voltar ao Dashboard</span>
                    </NavLink>
                </div>
            </aside>

            {/* Content */}
            <main className={`overflow-y-auto ${isBeauty ? 'bg-beauty-dark' : 'bg-neutral-950'} md:pl-64`}>
                {/* Mobile Header */}
                <div className="md:hidden sticky top-0 z-30 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-white hover:text-accent-gold"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-white font-heading text-lg uppercase">
                        Configurações
                    </h1>
                </div>

                {/* Content Area */}
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};