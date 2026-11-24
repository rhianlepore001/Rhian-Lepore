
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { initAutoBugCapture } from './lib/autoBugCapture';
import { queryClient } from './lib/queryClient';
import { captureFirstTouch } from './lib/signupAttribution';
import './styles/establishment-entry.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ErrorBoundary } from './components/ErrorBoundary';

const root = ReactDOM.createRoot(rootElement);
const isSiteEntry = () => /^#\/site(?:\/|-demo\/|-preview(?:$|\?))/.test(window.location.hash) || (window.location.pathname.startsWith('/s/') && !window.location.hash);
const isEstablishmentEntry = isSiteEntry();
if (isEstablishmentEntry) {
  document.documentElement.dataset.establishment = 'dark';
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(link => {
    if (/tokens\.css|fonts\.googleapis|fonts\.gstatic/.test(link.href)) link.disabled = true;
  });
}
const ProductApp = React.lazy(async () => {
  await Promise.all([import('./design-system/tokens.css'), import('./styles/tailwind.css')]);
  return import('./App');
});
const PublicSiteApp = React.lazy(() => import('./PublicSiteApp'));
function Entry() {
  const [site, setSite] = React.useState(isSiteEntry);
  React.useEffect(() => {
    const sync = () => setSite(isSiteEntry());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return site ? <PublicSiteApp /> : <ErrorBoundary><ProductApp /></ErrorBoundary>;
}

class EntryBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main style={{ padding: 32 }}><h1>Não foi possível abrir esta página.</h1><button onClick={() => window.location.reload()}>Tentar novamente</button></main>;
    return this.props.children;
  }
}

// Captura automática de erros de runtime → bug_reports (anti-spam embutido).
if (!isEstablishmentEntry) initAutoBugCapture();

// Origem do cadastro: guarda de onde a pessoa veio na primeira visita (não altera a URL nem o consentimento).
if (!isEstablishmentEntry) captureFirstTouch();

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <EntryBoundary>
        <React.Suspense fallback={<div role="status">Carregando…</div>}><Entry /></React.Suspense>
      </EntryBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
