
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TrialBanner } from './TrialBanner';
import { PaywallModal } from './PaywallModal';
import { BottomMobileNav } from './BottomMobileNav';
import { BrutalBackground } from './BrutalBackground';
import { UIProvider, useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { isTrial, isExpired } = useSubscription();
  const isSettingsRoute = pathname.startsWith('/configuracoes');
  const isBillingRoute = pathname === '/configuracoes/assinatura';

  const showBanner = !isBillingRoute && (isTrial || isExpired);
  const headerTop = showBanner ? '40px' : '0px';
  const paddingTop = showBanner ? 'pt-[104px] md:pt-[120px]' : 'pt-16 md:pt-20';

  const { isSidebarOpen, isModalOpen } = useUI();

  return (
    <div
      className="h-screen overflow-y-auto bg-brutal-main text-text-primary font-sans selection:bg-accent-gold selection:text-black font-medium relative"
      style={{ '--header-top': headerTop } as React.CSSProperties}
    >
      {/* Brutal Background - Only for Barber Theme */}
      <BrutalBackground />

      <div className="fixed top-0 left-0 right-0 z-50">
        <TrialBanner />
      </div>
      {!isBillingRoute && <PaywallModal />}
      {!isSettingsRoute && <Sidebar />}
      <Header />

      <main className={`${!isSettingsRoute ? 'md:pl-64' : ''} ${paddingTop} min-h-screen transition-all duration-300 pb-24 md:pb-8 relative z-10`}>
        <div className={`${!isSettingsRoute ? 'p-3 md:p-8 max-w-7xl mx-auto' : ''} space-y-4 md:space-y-8 animate-in fade-in duration-500`}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Agora sempre renderizado para manter o estado interno */}
      {!isSettingsRoute && !isBillingRoute && !new URLSearchParams(useLocation().search).get('new') && <BottomMobileNav />}
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
