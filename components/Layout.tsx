
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UIProvider } from '../contexts/UIContext';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen overflow-y-auto bg-brutal-main text-text-primary font-sans selection:bg-accent-gold selection:text-black">
      <Sidebar />
      <Header />

      <main className="md:pl-64 pt-16 md:pt-20 min-h-screen transition-all duration-300">
        <div className="p-3 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <UIProvider>
      <LayoutContent>{children}</LayoutContent>
    </UIProvider>
  );
};
