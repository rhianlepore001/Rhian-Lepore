import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, CalendarDays, Check, ChevronDown, Clock, LayoutDashboard, Menu, Scissors, Smartphone, Sparkles, Users, Wallet, X } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import '../styles/landing.css';

const questions = [
  ['Como funciona o período de teste?', 'Você cria a conta sem cadastrar um cartão. O prazo e as condições do teste aparecem na sua conta, de acordo com a oferta disponível. Ao final, você escolhe um plano se quiser continuar.'],
  ['Posso usar o AgendiX sozinho ou com uma equipe?', 'Sim. Você pode usar só a sua agenda ou cadastrar uma equipe. Cada profissional acessa o mesmo negócio com as permissões que você definir.'],
  ['Meu cliente precisa baixar um aplicativo?', 'Não. Ele abre seu link no navegador, escolhe um serviço, um profissional e um horário. A confirmação segue as configurações do seu negócio.'],
  ['Preciso instalar o AgendiX para usar no celular?', 'Não. Acesse pelo navegador do celular ou do computador com conexão à internet.'],
  ['O que acontece com os dados que eu inserir na simulação?', 'As alterações ficam na memória do navegador e se perdem ao recarregar a simulação. Nenhuma mensagem é enviada.'],
] as const;

const demoViews = [
  { id: 'booking', label: 'Agendamento online', icon: Smartphone, route: 'book/simulacao', task: 'Veja a página que seu cliente abre, escolha um serviço e peça um horário.', benefit: 'Compartilhe seu link no Instagram ou pelo WhatsApp. O cliente vê os horários e envia o pedido pelo navegador.' },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, route: 'agenda', task: 'Encontre um horário livre e experimente criar um atendimento.', benefit: 'Veja os horários de cada profissional e encontre espaço para um encaixe.' },
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, route: '', task: 'Veja o próximo atendimento, a receita do dia e a fila no painel inicial.', benefit: null },
  { id: 'finance', label: 'Financeiro', icon: Wallet, route: 'financeiro', task: 'Confira as entradas, as despesas e o movimento ilustrativo do período.', benefit: 'Consulte entradas e despesas para entender o movimento do caixa.' },
  { id: 'clientes', label: 'Clientes', icon: Users, route: 'clientes?filter=Inativo', task: 'Confira o histórico de visitas de quem está sem voltar há mais de 35 dias.', benefit: 'Encontre quem não voltou há mais de 35 dias e consulte o histórico antes de retomar o contato.' },
  { id: 'fila', label: 'Fila', icon: Clock, route: 'fila', task: 'Organize quem chega sem marcar e acompanhe os atendimentos em andamento.', benefit: null },
] as const;

const productViews = demoViews.filter(item => item.benefit);

const teamViews = [
  { label: 'Comissões', route: 'financeiro?tab=commissions', benefit: 'Acompanhe as comissões da equipe por ciclo.' },
  { label: 'Fila de espera', route: 'fila', benefit: 'Organize quem chega sem agendamento.' },
  { label: 'Resultados por hora', route: 'resultados-por-hora', benefit: 'Veja quanto rende cada hora aberta e a sobra estimada após os custos registrados.' },
] as const;

const setupSteps = [
  { title: 'Crie sua conta', text: 'Escolha o segmento e cadastre seu negócio.' },
  { title: 'Prepare a agenda', text: 'Cadastre os serviços e defina os horários de atendimento.' },
  { title: 'Compartilhe seu link', text: 'Envie o link aos clientes para receber pedidos de agendamento.' },
] as const;

const supportHref = buildWhatsAppLink('+351 927 688 674', 'PT');
const trialTerms = 'Teste sem cartão. Depois, você decide se quer assinar.';

type Niche = 'barber' | 'beauty';
type ProductView = (typeof demoViews)[number]['id'];

const businesses = { barber: 'Barbearia Corte Fino', beauty: 'Studio Aurora' } as const;

const demoLink = (niche: Niche, route = '') => route ? `/#/demo/${niche}/${route}` : `/#/demo/${niche}`;

const BusinessSelector = ({ niche, label, onChange }: { niche: Niche; label: string; onChange: (niche: Niche) => void }) => (
  <div className="landing-business-selector" role="group" aria-label={label}>
    <button type="button" aria-pressed={niche === 'barber'} onClick={() => onChange('barber')}><Scissors size={16} aria-hidden="true" /> Barbearia</button>
    <button type="button" aria-pressed={niche === 'beauty'} onClick={() => onChange('beauty')}><Sparkles size={16} aria-hidden="true" /> Salão de beleza</button>
  </div>
);

const PhoneFrame = ({ niche, children }: { niche: Niche; children: React.ReactNode }) => (
  <div className="landing-phone" data-niche={niche}>
    <span className="landing-phone-btn-mute" aria-hidden="true" />
    <span className="landing-phone-btn-vol-up" aria-hidden="true" />
    <span className="landing-phone-btn-vol-down" aria-hidden="true" />
    <span className="landing-phone-btn-power" aria-hidden="true" />
    <div className="landing-phone-screen">
      <div className="landing-phone-statusbar" aria-hidden="true">
        <span className="landing-phone-time">9:41</span>
        <span className="landing-phone-island"><span className="landing-phone-lens" /></span>
        <span className="landing-phone-indicators">
          <span className="landing-phone-signal"><i /><i /><i /><i /></span>
          <span className="landing-phone-battery"><i /></span>
        </span>
      </div>
      <div className="landing-phone-viewport">{children}</div>
      <div className="landing-phone-homebar" aria-hidden="true" />
    </div>
  </div>
);

const PhoneImage = ({ niche, view, alt, eager }: { niche: Niche; view: ProductView; alt: string; eager?: boolean }) => (
  <img src={`/landing/phone-${niche}-${view}.webp`} alt={alt} width="780" height="1588"
    decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} />
);

export const Landing = () => {
  const [menu, setMenu] = useState(false);
  const [params, setParams] = useSearchParams();
  const selectedNiche = params.get('tipo');
  const niche: Niche = selectedNiche === 'beauty' ? 'beauty' : 'barber';
  const nicheChosen = selectedNiche === 'barber' || selectedNiche === 'beauty';
  const returningFromDemo = params.get('origem') === 'demo';
  const [interactive, setInteractive] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const activeView = demoViews.find(item => item.id === params.get('tela')) ?? demoViews[0];
  const view = activeView.id;
  const signupHref = nicheChosen ? `/#/register?type=${niche}` : '/#/register';
  const demoHref = demoLink(niche, activeView.route);

  useEffect(() => {
    const root = document.documentElement;
    const previousSurface = root.dataset.surface;
    const previousTitle = document.title;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const previousColor = themeColor?.getAttribute('content');
    themeColor?.setAttribute('content', '#202833');
    root.dataset.surface = 'marketing';
    const viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    document.title = 'AgendiX — Agenda e gestão para barbearias e salões';
    return () => {
      if (previousSurface) root.dataset.surface = previousSurface;
      else delete root.dataset.surface;
      if (viewport && previous !== null && previous !== undefined) viewport.setAttribute('content', previous);
      else viewport?.removeAttribute('content');
      if (previousColor != null) themeColor?.setAttribute('content', previousColor);
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        menuTrigger.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    navigation.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menu]);

  const scrollTo = (id: string) => {
    setMenu(false);
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    target?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!returningFromDemo) return;
    const target = document.getElementById('demonstracao');
    target?.scrollIntoView({ behavior: 'instant' });
    target?.focus({ preventScroll: true });
  }, [returningFromDemo]);

  const updateChoice = (key: 'tipo' | 'tela', value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };
  const chooseNiche = (next: Niche) => updateChoice('tipo', next);
  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-main" onClick={event => { event.preventDefault(); scrollTo('landing-main'); }}>Pular para o conteúdo</a>
      <header className="landing-nav" ref={header}>
        <div className="landing-wrap wrap landing-nav-row">
          <a href="/#/landing" className="landing-brand" aria-label="AgendiX, início" onClick={() => window.scrollTo(0, 0)}>
            <img src="/landing/agendix-logo-header.webp" width="640" height="215" alt="AgendiX" decoding="async" />
          </a>
          <nav id="landing-navigation" ref={navigation} className={menu ? 'landing-links is-open' : 'landing-links'} aria-label="Navegação principal">
            <button type="button" onClick={() => scrollTo('demonstracao')}>Demonstração</button>
            <button type="button" onClick={() => scrollTo('produto')}>Recursos</button>
            <button type="button" onClick={() => scrollTo('historia')}>Nossa história</button>
            <a className="landing-salon-link" href="/#/register?type=beauty">Criar conta para salão</a>
          </nav>
          <div className="landing-nav-actions">
            <a href="/#/login">Entrar</a>
            <a className="landing-button landing-button-light" href={signupHref}>Criar conta <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <button type="button" ref={menuTrigger} className="landing-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-controls="landing-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-wrap wrap landing-hero-layout">
            <div className="landing-hero-copy">
              <h1 id="landing-title">Agenda em dia. <span>Caixa à vista.</span></h1>
              <p>Seus clientes escolhem um horário pelo seu link. Você acompanha a agenda da equipe e o caixa da sua barbearia ou salão pelo celular.</p>
              <div className="landing-hero-actions">
                <a href={signupHref} className="landing-button" aria-describedby="landing-trial-terms">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
                <button type="button" className="landing-text-link landing-demo-jump" onClick={() => scrollTo('demonstracao')}>Ver demonstração <ArrowDown size={16} aria-hidden="true" /></button>
                <span className="landing-no-card" id="landing-trial-terms"><Check size={15} aria-hidden="true" /> {trialTerms}</span>
              </div>
            </div>
            <div className="landing-hero-product" data-niche={niche}>
              <BusinessSelector niche={niche} label="Seu tipo de negócio" onChange={chooseNiche} />
              <a href={demoLink(niche)} className="landing-product-stage" aria-description="Abre o painel inicial na demonstração do AgendiX.">
                <div className="landing-hero-device">
                  <PhoneFrame niche={niche}><PhoneImage niche={niche} view="dashboard" eager alt="" /></PhoneFrame>
                </div>
                <div className="landing-hero-screen-label">
                  <span>{businesses[niche]} · Dados fictícios</span>
                  <span>Abrir painel <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </a>
            </div>
          </div>
        </section>

        <section id="demonstracao" className="landing-demo-section" aria-labelledby="landing-demo-title" tabIndex={-1}>
          <div className="landing-wrap wrap">
            <div className="landing-demo-stage">
              <div className="landing-demo-controls">
                <h2 id="landing-demo-title">Experimente o AgendiX.</h2>
                <p>Use uma barbearia ou um salão de exemplo. A simulação abre sem cadastro e usa dados fictícios.</p>
                <BusinessSelector niche={niche} label="Negócio da demonstração" onChange={chooseNiche} />
                <div className="landing-demo-view-tabs" role="group" aria-label="Tela da demonstração">
                  {demoViews.map(({ id, label, icon: Icon }) => (
                    <button type="button" key={id} aria-pressed={view === id} onClick={() => updateChoice('tela', id)}>
                      <Icon size={17} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
                <p className="landing-demo-task" aria-live="polite">{activeView.task}</p>
                <div className="landing-demo-start">
                  <button type="button" className="landing-button landing-button-light landing-demo-embed-action" aria-expanded={interactive} aria-controls="landing-demo-screen" onClick={() => setInteractive(!interactive)}>
                    {interactive ? 'Fechar a simulação' : 'Explorar a simulação'} {interactive ? <X size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                  <a className="landing-button landing-button-light landing-demo-mobile-action" href={demoHref}>Explorar a simulação <ArrowRight size={18} aria-hidden="true" /></a>
                  <a className="landing-text-link landing-demo-fullscreen" href={demoHref}>Abrir em tela cheia <ArrowRight size={16} aria-hidden="true" /></a>
                </div>
              </div>
              <figure className="landing-demo-preview" id="landing-demo-screen">
                <div className="landing-demo-frame" data-view={view} data-interactive={interactive}>
                  <div className="landing-demo-poster">
                    <PhoneImage niche={niche} view={view} alt={`${activeView.label} do AgendiX com dados fictícios de ${businesses[niche]}`} />
                  </div>
                  {interactive && (
                    <iframe key={demoHref} title={`Simulação interativa ${niche === 'barber' ? 'da barbearia' : 'do salão'}: ${activeView.label}`} src={`/demo-preview${demoHref.slice(1)}`} sandbox="allow-scripts allow-same-origin allow-forms" />
                  )}
                </div>
                <figcaption>{activeView.label} · {businesses[niche]}</figcaption>
              </figure>
            </div>
            <div className="landing-demo-conversion">
              <p>Use seus serviços e horários durante o teste.</p>
              <a className="landing-text-link" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section id="produto" className="landing-product" aria-labelledby="landing-product-title" tabIndex={-1}>
          <div className="landing-wrap wrap">
            <div className="landing-product-grid">
              <div>
                <h2 id="landing-product-title">Do agendamento ao caixa.</h2>
                <p className="landing-product-intro">Escolha um recurso para abrir na demonstração.</p>
                <ul className="landing-product-list">
                  {productViews.map(({ id, label, route, benefit }) => (
                    <li key={id}>
                      <a href={demoLink(niche, route)}>
                        <div><h3>{label}</h3><p>{benefit}</p></div>
                        <ArrowRight size={20} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <img className="landing-team-photo" src="/landing/team-salon-800.webp" srcSet="/landing/team-salon-800.webp 800w, /landing/team-salon-1448.webp 1448w" sizes="(max-width: 760px) 100vw, 40vw" loading="lazy" width="1448" height="1086" alt="Duas profissionais de salão organizam o dia com um tablet." />
            </div>
            <div className="landing-team">
              <h3>Para a rotina da equipe</h3>
              <ul className="landing-product-list landing-team-list">
                {teamViews.map(({ label, route, benefit }) => (
                  <li key={route}>
                    <a href={demoLink(niche, route)}>
                      <div><h4>{label}</h4><p>{benefit}</p></div>
                      <ArrowRight size={18} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="historia" className="landing-story" aria-labelledby="landing-story-title" tabIndex={-1}>
          <div className="landing-wrap wrap landing-story-grid">
            <figure className="landing-story-photo">
              <img src="/landing/story-barbershop-800.webp" srcSet="/landing/story-barbershop-800.webp 800w, /landing/story-barbershop-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 46vw" width="1536" height="1024" loading="lazy" alt="Um profissional confere o tablet no balcão de uma barbearia." />
              <figcaption>Imagem ilustrativa</figcaption>
            </figure>
            <div className="landing-story-copy">
              <h2 id="landing-story-title">Por que o AgendiX nasceu</h2>
              <p>Rhian Lepore cresceu entre barbearias e salões. Acompanhando a rotina da família, viu como era difícil atender os clientes e cuidar das contas ao mesmo tempo.</p>
              <blockquote className="landing-story-quote">
                <p>“Vi meus pais trabalhando para o negócio, sem que o negócio também trabalhasse para eles. Percebi que ter clientes e dinheiro entrando não era suficiente. Era preciso entender os custos, organizar as contas e saber o que realmente sobrava. Foi por isso que criei o AgendiX.”</p>
                <footer>Rhian Lepore, criador do AgendiX</footer>
              </blockquote>
              <p className="landing-story-slogan">Você cresce. O AgendiX acompanha você e ajuda seu negócio a ir além.</p>
            </div>
          </div>
        </section>

        <section className="landing-onboarding" aria-labelledby="landing-setup-title">
          <div className="landing-wrap wrap landing-onboarding-grid">
            <h2 id="landing-setup-title">Como começar</h2>
            <ol className="landing-steps">
              {setupSteps.map(({ title, text }) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-faq" aria-labelledby="landing-faq-title">
          <div className="landing-wrap wrap landing-faq-grid">
            <div>
              <h2 id="landing-faq-title">Perguntas frequentes</h2>
              <a className="landing-text-link" href={supportHref} target="_blank" rel="noopener noreferrer">Falar com o suporte <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <div className="landing-questions">
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-close" aria-labelledby="landing-close-title">
          <div className="landing-wrap wrap">
            <h2 id="landing-close-title">Coloque sua agenda online.</h2>
            <div className="landing-close-action">
              <a className="landing-button landing-button-light" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
              <span className="landing-no-card"><Check size={15} aria-hidden="true" /> {trialTerms}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap wrap landing-footer-row">
          <a className="landing-brand" href="/#/landing" aria-label="AgendiX, voltar ao início" onClick={() => window.scrollTo(0, 0)}><img src="/landing/agendix-logo-header.webp" width="640" height="215" alt="" loading="lazy" decoding="async" /></a>
          <nav aria-label="Links legais"><a href="/#/termos">Termos de uso</a><a href="/#/privacidade">Privacidade</a></nav>
          <a href={supportHref} target="_blank" rel="noopener noreferrer">Suporte no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a>
          <small>© {new Date().getFullYear()} AgendiX</small>
          <small>Fotos da demonstração · Pexels</small>
        </div>
      </footer>
    </div>
  );
};
