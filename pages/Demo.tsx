import React, { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Moon, Scissors, Sparkles, Sun } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { DemoNavigation } from '../components/DemoNavigation';
import { getDemoColorMode, getDemoNiche, isDemoPreview, setDemoColorMode } from '../lib/demo/mode';
import '../styles/demo.css';

const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const Agenda = lazy(() => import('./Agenda').then(m => ({ default: m.Agenda })));
const Finance = lazy(() => import('./Finance').then(m => ({ default: m.Finance })));
const Performance = lazy(() => import('./StaffPerformance').then(m => ({ default: m.StaffPerformance })));
const Booking = lazy(() => import('./PublicBooking').then(m => ({ default: m.PublicBooking })));
const Queue = lazy(() => import('./QueueManagement').then(m => ({ default: m.QueueManagement })));
const Clients = lazy(() => import('./Clients').then(m => ({ default: m.Clients })));
const Team = lazy(() => import('./settings/TeamSettings').then(m => ({ default: m.TeamSettings })));

export const DEMO_BUSINESS = { barber: 'Barbearia Corte Fino', beauty: 'Studio Aurora' } as const;

const Unavailable = () => <section className="demo-unavailable" aria-labelledby="demo-unavailable-title">
  <h2 id="demo-unavailable-title">Esta tela não faz parte da simulação.</h2>
  <p>Na sua conta, ela fica disponível com os dados do seu negócio.</p>
  <div><Link to="/">Voltar ao início</Link><a href={getDemoNiche() === 'beauty' ? '/#/register?type=beauty' : '/#/register'}>Crie sua conta grátis <ArrowRight size={16} aria-hidden="true" /></a></div>
</section>;

const Screens = () => <Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/agenda" element={<Agenda />} />
  <Route path="/fila" element={<Queue />} />
  <Route path="/clientes" element={<Clients />} />
  <Route path="/financeiro" element={<Finance />} />
  <Route path="/financeiro/performance" element={<Performance />} />
  <Route path="/configuracoes/equipe" element={<Team />} />
  <Route path="*" element={<Unavailable />} />
</Routes>;

export const Demo = () => {
  const niche = getDemoNiche();
  const base = `/demo/${niche}`;
  const embedded = isDemoPreview();
  const location = useLocation();
  const inner = location.pathname.startsWith(`${base}/`) ? location.pathname.slice(base.length) : '/';
  const isBooking = inner.startsWith('/book/');
  const [colorMode, setColorModeState] = useState<'light' | 'dark'>(() => getDemoColorMode());
  const setColorMode = (next: 'light' | 'dark' | ((prev: 'light' | 'dark') => 'light' | 'dark')) => {
    setColorModeState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      setDemoColorMode(value);
      return value;
    });
  };
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = { theme: root.getAttribute('data-theme'), mode: root.getAttribute('data-mode') };
    return () => {
      for (const [key, value] of Object.entries(previous)) {
        if (value) root.setAttribute(`data-${key}`, value); else root.removeAttribute(`data-${key}`);
      }
    };
  }, []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', niche);
    root.setAttribute('data-mode', colorMode);
  }, [niche, colorMode]);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const domMode = root.getAttribute('data-mode');
      if (domMode === 'light' || domMode === 'dark') {
        setColorMode(prev => (prev === domMode ? prev : domMode));
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-mode'] });
    return () => observer.disconnect();
  }, []);
  const fallback = <p className="demo-loading" role="status">Preparando a simulação…</p>;
  return <QueryClientProvider client={client}>
    <div className="demo-shell" data-embedded={embedded || undefined} style={{ '--safe-top': embedded ? '0px' : 'var(--demo-bar-height)' } as React.CSSProperties}>
      {!embedded && <header className="demo-bar">
        <Link className="demo-bar-back" to="/landing" aria-label="Voltar ao site do AgendiX"><ArrowLeft size={16} aria-hidden="true" /><span>AgendiX</span></Link>
        <div className="demo-bar-center">
          <span className="demo-badge">Simulação</span>
          <nav className="demo-niches" aria-label="Tipo de negócio">
            <Link aria-current={niche === 'barber' ? 'page' : undefined} to={`/demo/barber${inner}`}><Scissors size={14} aria-hidden="true" /> Barbearia</Link>
            <Link aria-current={niche === 'beauty' ? 'page' : undefined} to={`/demo/beauty${inner}`}><Sparkles size={14} aria-hidden="true" /> Salão</Link>
          </nav>
          <span className="demo-bar-note">{DEMO_BUSINESS[niche]} · dados fictícios</span>
        </div>
        <button
          type="button"
          className="demo-mode-toggle"
          onClick={() => setColorMode(mode => (mode === 'light' ? 'dark' : 'light'))}
          aria-pressed={colorMode === 'dark'}
          aria-label={colorMode === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
        >
          {colorMode === 'light' ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
          <span>{colorMode === 'light' ? 'Escuro' : 'Claro'}</span>
        </button>
        <a className="demo-signup" href={niche === 'beauty' ? '/#/register?type=beauty' : '/#/register'}>Crie sua conta grátis</a>
      </header>}
      <div className="demo-product" key={niche} onClickCapture={event => {
        const anchor = (event.target as HTMLElement).closest('a');
        if (anchor && /wa\.me|whatsapp|mailto:/.test(anchor.href)) { event.preventDefault(); event.stopPropagation(); }
      }}>
        <DemoNavigation pathname={inner}>
          {isBooking
            ? <main className="demo-booking"><Suspense fallback={fallback}><Routes><Route path="/book/:slug" element={<Booking />} /></Routes></Suspense></main>
            : <Layout><Suspense fallback={fallback}><Screens /></Suspense></Layout>}
        </DemoNavigation>
      </div>
    </div>
  </QueryClientProvider>;
};
