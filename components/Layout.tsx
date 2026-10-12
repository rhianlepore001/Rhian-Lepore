
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PaywallModal } from './PaywallModal';
import { BottomMobileNav } from './BottomMobileNav';
import { BrutalBackground } from './BrutalBackground';
import { UIProvider } from '../contexts/UIContext';
import { useLocation } from 'react-router-dom';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, search } = useLocation();
  const isSettingsRoute = pathname.startsWith('/configuracoes');
  const isBillingRoute = pathname === '/configuracoes/assinatura';
  const { colors, density } = useBrutalTheme();

  // Status do período de teste fica no menu lateral / sidebar (sem banner fixo no topo).
  // --header-top inclui a status bar do iOS (PWA instalado); 0px em Android/desktop.
  const headerTop = 'var(--safe-top)';
  // Header mobile é h-14 (56px), 1 linha
  const paddingTop = 'pt-[calc(var(--safe-top)+3.5rem)] md:pt-[calc(var(--safe-top)+5rem)]';
  const hideMobileNavForNewFlow = Boolean(new URLSearchParams(search).get('new'));
  const showBottomMobileNav = !isSettingsRoute && !isBillingRoute && !hideMobileNavForNewFlow;

  return (
    <div
      data-app-scroll
      className={`h-[100dvh] overflow-y-auto overflow-x-hidden ${colors.bg} text-theme-text font-sans selection:bg-theme-accent selection:text-[var(--color-on-accent)] font-medium relative transition-colors duration-300`}
      style={{ '--header-top': headerTop } as React.CSSProperties}
    >
      {/* Background layer — now handled by CSS variables in index.html */}
      <BrutalBackground />

      {/* pt = faixa da status bar do iOS (fundo sólido para o conteúdo não aparecer por trás) */}
      <div className={`fixed top-0 left-0 right-0 z-50 pt-[var(--safe-top)] ${colors.bg}`} />
      {!isBillingRoute && <PaywallModal />}
      {!isSettingsRoute && <Sidebar />}
      <Header />

      {/* sem willChange:transform — cria containing block e já foi associado a
          conteúdo “preso” na navegação SPA (URL muda, main não troca). */}
      {/* Folga inferior no celular: barra (64) + o "+" que sobressai (~28) + 16 = 7rem,
          para o último item da lista nunca ficar sob o FAB. */}
      <main
        className={`${!isSettingsRoute ? 'md:pl-64' : ''} ${paddingTop} relative z-10 flex flex-col min-h-screen ${
          showBottomMobileNav ? 'pb-[calc(7rem+var(--safe-bottom))]' : 'pb-[calc(2rem+var(--safe-bottom))]'
        } md:pb-8`}
      >
        <div
          className={`${!isSettingsRoute ? `${density.pagePadding} max-w-7xl mx-auto w-full min-w-0` : ''} ${density.sectionGap}`}
        >
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
