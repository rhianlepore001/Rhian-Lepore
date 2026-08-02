
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TrialBanner } from './TrialBanner';
import { PaywallModal } from './PaywallModal';
import { BottomMobileNav } from './BottomMobileNav';
import { BrutalBackground } from './BrutalBackground';
import { UIProvider } from '../contexts/UIContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLocation } from 'react-router-dom';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, search } = useLocation();
  const { isTrial, isExpired } = useSubscription();
  const isSettingsRoute = pathname.startsWith('/configuracoes');
  const isBillingRoute = pathname === '/configuracoes/assinatura';
  const { colors, density } = useBrutalTheme();

  const showBanner = !isBillingRoute && (isTrial || isExpired);
  const headerTop = showBanner ? '40px' : '0px';
  // Header mobile pode crescer (nome em 2 linhas) — folga extra evita overlap
  const paddingTop = showBanner ? 'pt-[120px] md:pt-[120px]' : 'pt-20 md:pt-20';
  const hideMobileNavForNewFlow = Boolean(new URLSearchParams(search).get('new'));
  const showBottomMobileNav = !isSettingsRoute && !isBillingRoute && !hideMobileNavForNewFlow;

  return (
    <div
      className={`h-[100dvh] overflow-y-auto ${colors.bg} text-theme-text font-sans selection:bg-theme-accent selection:text-[var(--color-on-accent)] font-medium relative transition-colors duration-300`}
      style={{ '--header-top': headerTop } as React.CSSProperties}
    >
      {/* Background layer — now handled by CSS variables in index.html */}
      <BrutalBackground />

      <div className="fixed top-0 left-0 right-0 z-50">
        <TrialBanner />
      </div>
      {!isBillingRoute && <PaywallModal />}
      {!isSettingsRoute && <Sidebar />}
      <Header />

      {/* sem willChange:transform — cria containing block e já foi associado a
          conteúdo “preso” na navegação SPA (URL muda, main não troca). */}
      <main className={`${!isSettingsRoute ? 'md:pl-64' : ''} ${paddingTop} min-h-screen pb-32 md:pb-8 relative z-10`}>
        <div className={`${!isSettingsRoute ? `${density.pagePadding} max-w-7xl mx-auto` : ''} ${density.sectionGap}`}>
          {children}
        </div>
      </main>

      {showBottomMobileNav && <BottomMobileNav />}
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
