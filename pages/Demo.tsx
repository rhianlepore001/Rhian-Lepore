import { DemoNavigation } from '../components/DemoNavigation';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '../contexts/UIContext';
import { getDemoNiche } from '../lib/demo/mode';
import '../styles/demo.css';

const Agenda = lazy(() => import('./Agenda').then(m => ({ default: m.Agenda })));
const Finance = lazy(() => import('./Finance').then(m => ({ default: m.Finance })));
const Performance = lazy(() => import('./StaffPerformance').then(m => ({ default: m.StaffPerformance })));
const Booking = lazy(() => import('./PublicBooking').then(m => ({ default: m.PublicBooking })));
const Queue = lazy(() => import('./QueueManagement').then(m => ({ default: m.QueueManagement })));
const Team = lazy(() => import('./settings/TeamSettings').then(m => ({ default: m.TeamSettings })));

const screens = [
  { path: 'agenda', label: 'Agenda', title: 'Uma agenda para o seu dia.', text: 'Toque em um atendimento para ver os detalhes ou em Novo atendimento para experimentar. Suas alterações ficam só nesta simulação.' },
  { path: 'book/simulacao', label: 'Agendamento online', title: 'Agora, o lado do cliente.', text: 'Escolha um serviço e um horário. Este é o mesmo agendamento público do AgendiX, com dados fictícios.' },
  { path: 'financeiro', label: 'Financeiro', title: 'Veja o que entrou e o que sobrou.', text: 'Explore o fluxo de caixa e os lançamentos. Os valores são ilustrativos, calculados a partir dos atendimentos da simulação.' },
  { path: 'financeiro/performance', label: 'Hora de cadeira', title: 'Entenda o tempo da sua equipe.', text: 'Compare atendimentos, comissões e faturamento por hora. Dados ilustrativos, sem informações de negócios reais.' },
  { path: 'fila', label: 'Fila', title: 'Organize quem chega sem marcar.', text: 'Acompanhe a espera e o atendimento. Esta demonstração não envia mensagens aos clientes.' },
  { path: 'configuracoes/equipe', label: 'Equipe', title: 'Cada profissional no seu lugar.', text: 'Conheça a gestão da equipe e das comissões. Convites e integrações externas ficam indisponíveis na simulação.' },
];

export const Demo = () => {
  const niche = getDemoNiche();
  const base = `/demo/${niche}`;
  const location = useLocation();
  const navigate = useNavigate();
  const [tour, setTour] = useState<number | null>(null);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  useEffect(() => {
    const root = document.documentElement;
    const previous = { theme: root.getAttribute('data-theme'), mode: root.getAttribute('data-mode') };
    root.setAttribute('data-theme', niche);
    root.setAttribute('data-mode', 'light');
    return () => {
      for (const [key, value] of Object.entries(previous)) {
        if (value) root.setAttribute(`data-${key}`, value); else root.removeAttribute(`data-${key}`);
      }
    };
  }, [niche]);
  const goTour = (step: number) => {
    setTour(step);
    navigate(`${base}/${screens[step].path}`);
  };
  return <QueryClientProvider client={client}><UIProvider>
    <div className="demo-shell">
      <header className="demo-header">
        <Link className="demo-brand" to="/">AgendiX</Link>
        <div className="demo-niches" aria-label="Tipo de negócio">
          <Link aria-current={niche === 'barber' ? 'page' : undefined} to="/demo/barber/agenda">Barbearia</Link>
          <Link aria-current={niche === 'beauty' ? 'page' : undefined} to="/demo/beauty/agenda">Salão</Link>
        </div>
        <a className="demo-signup" href={niche === 'beauty' ? '/#/register?type=beauty' : '/#/register'}>Crie sua conta grátis</a>
      </header>
      <div className="demo-toolbar">
        <div><strong>{niche === 'beauty' ? 'Studio Aurora' : 'Barbearia Corte Fino'}</strong><span className="demo-badge">Simulação</span><span>Dados fictícios · reinicia ao recarregar</span></div>
        <button onClick={() => goTour(0)}>Fazer tour guiado</button>
      </div>
      <div className="demo-nav-wrap"><nav className="demo-nav" aria-label="Telas da simulação">{screens.map(screen => <Link key={screen.path} to={`${base}/${screen.path}`} aria-current={location.pathname === `${base}/${screen.path}` ? 'page' : undefined}>{screen.label}</Link>)}</nav></div>
      {tour !== null && <aside className="demo-tour" aria-label="Tour guiado" aria-live="polite">
        <div><span>Passo {tour + 1} de {screens.length}</span><h2>{screens[tour].title}</h2><p>{screens[tour].text}</p></div>
        <div className="demo-tour-actions">{tour > 0 && <button onClick={() => goTour(tour - 1)}>Anterior</button>}<button onClick={() => tour < screens.length - 1 ? goTour(tour + 1) : setTour(null)}>{tour < screens.length - 1 ? 'Próximo passo' : 'Concluir tour'}</button><button onClick={() => setTour(null)}>Fechar tour</button></div>
      </aside>}
      <DemoNavigation><main className="demo-content" key={niche} onClickCapture={event => {
        const anchor = (event.target as HTMLElement).closest('a');
        if (anchor && /wa\.me|whatsapp|mailto:/.test(anchor.href)) { event.preventDefault(); event.stopPropagation(); }
      }}>
        <Suspense fallback={<p className="demo-loading" role="status">Preparando a simulação…</p>}>
          <Routes>
            <Route path="beauty" element={<Agenda />} />
            <Route path="barber" element={<Agenda />} />
            <Route path=":niche/agenda" element={<Agenda />} />
            <Route path=":niche/financeiro" element={<Finance />} />
            <Route path=":niche/financeiro/performance" element={<Performance />} />
            <Route path=":niche/book/:slug" element={<Booking />} />
            <Route path=":niche/fila" element={<Queue />} />
            <Route path=":niche/configuracoes/equipe" element={<Team />} />
            <Route index element={<Agenda />} />
            <Route path="*" element={<p>Esta tela não está disponível. <Link to={`${base}/agenda`}>Voltar à agenda</Link></p>} />
          </Routes>
        </Suspense>
      </main></DemoNavigation>
    </div>
  </UIProvider></QueryClientProvider>;
};
