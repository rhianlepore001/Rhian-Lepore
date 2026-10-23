import React, { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isMetaRoute, metaTracker, setMetaScope } from '../lib/metaTracking';
import { readConsent, saveConsent, subscribeConsent, type ConsentChoice } from '../lib/marketingConsent';

export const MarketingConsent: React.FC = () => {
  const { pathname, search } = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const [editing, setEditing] = useState(false);
  const eligible = !loading && isMetaRoute(pathname, search, isAuthenticated);
  const legal = pathname === '/privacidade' || pathname === '/termos';

  useLayoutEffect(() => {
    setMetaScope(eligible && consent === 'accepted');
    metaTracker.pageView(pathname, search, isAuthenticated || loading);
  }, [pathname, search, isAuthenticated, loading, consent, eligible]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.dispatchEvent(new Event('storage'));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    if (choice === 'rejected') setMetaScope(false);
    setEditing(false);
  };

  if (!eligible && !legal) return null;

  if (consent && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="fixed bottom-3 left-3 z-[var(--z-toast)] min-h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-xs text-[var(--color-text-secondary)] shadow-[var(--elevation-1)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
      >
        Preferências de cookies
      </button>
    );
  }

  return (
    <section
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      aria-label="Preferências de cookies"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-toast)] max-h-[85dvh] overflow-y-auto border-t border-[var(--color-border)] bg-[var(--color-card)] px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[var(--color-text)] shadow-[var(--elevation-3)] md:bottom-5 md:left-5 md:right-5 md:mx-auto md:max-w-5xl md:rounded-2xl md:border md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 flex-1">
          <h2 id="cookie-consent-title" className="font-heading text-lg font-bold tracking-tight">
            Cookies e privacidade
          </h2>
          <p id="cookie-consent-description" className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Usamos cookies para o site funcionar e, com a sua permissão, para entender como você chegou até nós e melhorar nossa comunicação. Você pode recusar sem perder nenhuma função.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Altere quando quiser em Preferências de cookies.{' '}
            <Link to="/privacidade" className="underline underline-offset-4">Política de Privacidade</Link>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-64">
          <button type="button" onClick={() => choose('rejected')} className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-hover)] px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
            Recusar
          </button>
          <button type="button" onClick={() => choose('accepted')} className="min-h-11 rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-4 py-3 text-sm font-semibold text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
            Aceitar
          </button>
        </div>
      </div>
    </section>
  );
};
