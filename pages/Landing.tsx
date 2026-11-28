import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, CalendarDays, Check, ChevronDown, Clock, LayoutDashboard, Menu, Scissors, Smartphone, Sparkles, Store, Users, Wallet, X } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import { metaTracker } from '../lib/metaTracking';
import {
  trackLandingCta,
  trackLandingDemoScreen,
  useMetaDemoBridge,
  useMetaLandingEngagement,
  useMetaSectionViews,
} from '../hooks/useMetaEngagement';
import '../styles/landing.css';

const questions = [
  { id: 'faq_card', question: 'Preciso colocar cartão para testar?', answer: 'Não. Você cria sua conta sem cadastrar cartão. O prazo e as condições do teste aparecem dentro da conta, conforme a oferta vigente. Depois, você decide se quer assinar um plano.' },
  { id: 'faq_solo_team', question: 'Funciona para quem trabalha sozinho ou só para quem tem equipe?', answer: 'Para os dois. Você pode começar usando só a sua agenda e o seu financeiro, ou cadastrar sua equipe com controle de horários e comissões por profissional.' },
  { id: 'faq_app', question: 'Meu cliente precisa baixar algum aplicativo?', answer: 'Não. Ele abre o seu link direto no navegador do celular, escolhe o serviço, o profissional e o horário. A confirmação segue as regras que você definir.' },
  { id: 'faq_mobile', question: 'Consigo usar tudo pelo celular na correria do dia?', answer: 'Sim. O AgendiX funciona direto no navegador do celular ou do computador, sem precisar instalar nada — feito para consultar entre um atendimento e outro.' },
  { id: 'faq_demo_data', question: 'Os dados que eu testar na demonstração ficam salvos?', answer: 'Não. Tudo o que você mexer na simulação fica apenas na memória do seu navegador e some ao recarregar. Nenhuma mensagem real é enviada.' },
] as const;

const PRESENCE_SITE = '/#/site/demo-studio-aurora';
const PRESENCE_POSTER = '/landing/phone-presence-studio-aurora.webp';

const demoViews = [
  { id: 'presence', label: 'Presença', icon: Store, route: '', section: 'feature_presenca', task: 'Abra o site do Studio Aurora, o salão fictício: a casa, o horário e o caminho para marcar.', benefit: 'Seu cliente chega pelo Google ou pelo Instagram e reconhece a casa antes de escolher o horário.' },
  { id: 'booking', label: 'Agendamento online', icon: Smartphone, route: 'book/simulacao', section: 'feature_booking', task: 'Veja como seu cliente escolhe o serviço, o profissional e pede um horário pelo link.', benefit: 'Mande seu link no Instagram ou WhatsApp. O cliente escolhe o horário sozinho, sem travar sua conversa.' },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, route: 'agenda', section: 'feature_agenda', task: 'Veja a agenda da equipe lado a lado, ache um horário livre e teste um encaixe.', benefit: 'Acompanhe cada profissional num só lugar e encaixe clientes sem perder o controle do dia.' },
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, route: '', section: null, task: 'Bata o olho no próximo atendimento, no faturamento do dia e na fila em andamento.', benefit: null },
  { id: 'finance', label: 'Financeiro', icon: Wallet, route: 'financeiro', section: 'feature_financeiro', task: 'Acompanhe receitas, despesas e o lucro real no movimento ilustrativo do período.', benefit: 'Veja o que entra, o que sai e o que realmente sobra — sem depender de caderno ou planilha.' },
  { id: 'clientes', label: 'Clientes', icon: Users, route: 'clientes?filter=Inativo', section: 'feature_clientes', task: 'Descubra quem não volta há mais de 35 dias e abra o histórico para puxar conversa.', benefit: 'Encontre clientes que sumiram há mais de 35 dias e chame de volta antes que esqueçam do seu espaço.' },
  { id: 'fila', label: 'Fila', icon: Clock, route: 'fila', section: null, task: 'Organize quem chega sem hora marcada e acompanhe os atendimentos em andamento.', benefit: null },
] as const;

const productViews = demoViews.filter(item => item.benefit);

const teamViews = [
  { label: 'Comissões', route: 'financeiro?tab=commissions', section: 'feature_comissoes', benefit: 'Calcule e acompanhe o que pagar para cada profissional, sem erro nem conta no papel.' },
  { label: 'Fila de espera', route: 'fila', section: 'feature_fila', benefit: 'Organize quem chega sem marcar direto no celular, sem bagunçar a recepção.' },
  { label: 'Resultados por hora', route: 'resultados-por-hora', section: 'feature_hora', benefit: 'Descubra quanto rende cada hora trabalhada e quanto sobra de verdade depois dos custos.' },
] as const;

const setupSteps = [
  { title: 'Crie sua conta em minutos', text: 'Escolha barbearia ou salão e cadastre seu negócio direto do celular, sem cartão.' },
  { title: 'Monte sua agenda e seus serviços', text: 'Coloque seus horários, preços e equipe. Seus atendimentos já alimentam o financeiro.' },
  { title: 'Compartilhe o link e acompanhe o resultado', text: 'Envie seu link no WhatsApp e no Instagram. A cada atendimento, você enxerga o que entra e o que sobra.' },
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
  <img src={view === 'presence' ? PRESENCE_POSTER : `/landing/phone-${niche}-${view}.webp`} alt={alt} width="780" height={view === 'presence' ? 1560 : 1588}
    decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} />
);

export const Landing = () => {
  const [menu, setMenu] = useState(false);
  const [params, setParams] = useSearchParams();
  const selectedNiche = params.get('tipo');
  const niche: Niche = selectedNiche === 'beauty' ? 'beauty' : 'barber';
  const nicheChosen = selectedNiche === 'barber' || selectedNiche === 'beauty';
  // Nicho sempre barber|beauty (default visual); ViewContent/engajamento usam o valor exibido.
  const trackingNiche = niche;
  const returningFromDemo = params.get('origem') === 'demo';
  const [interactive, setInteractive] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const activeView = demoViews.find(item => item.id === params.get('tela')) ?? demoViews[0];
  const view = activeView.id;
  const signupHref = nicheChosen ? `/#/register?type=${niche}` : '/#/register';
  const presence = activeView.id === 'presence';
  const demoHref = presence ? PRESENCE_SITE : demoLink(niche, activeView.route);
  const embedSrc = presence ? `${PRESENCE_SITE}?embed=1` : `/demo-preview${demoHref.slice(1)}`;

  useMetaLandingEngagement(trackingNiche);
  useMetaSectionViews(trackingNiche);
  useMetaDemoBridge(trackingNiche, interactive);

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
    document.title = 'AgendiX — Crescimento, agenda e financeiro para barbearias e salões';
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
  const chooseNiche = (next: Niche) => {
    if (next !== niche || !nicheChosen) metaTracker.nichoSwitch(next);
    updateChoice('tipo', next);
  };
  // Só abre o iframe: DemoStart/ScreenView vêm da 1ª interação real dentro da demo.
  const startEmbeddedDemo = () => { setInteractive(true); };
  const onDemoTab = (id: (typeof demoViews)[number]['id']) => {
    metaTracker.demoStart(trackingNiche);
    trackLandingDemoScreen(id, trackingNiche);
    updateChoice('tela', id);
  };
  const onWhatsApp = () => { metaTracker.whatsAppClick(trackingNiche); };
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
            <a className="landing-salon-link" href="/#/register?type=beauty" onClick={() => trackLandingCta('free_trial_salon', 'beauty', 'header')}>Criar conta para salão</a>
          </nav>
          <div className="landing-nav-actions">
            <a href="/#/login">Entrar</a>
            <a className="landing-button landing-button-light" href={signupHref} onClick={() => trackLandingCta('free_trial_header', trackingNiche, 'header')}>Criar conta <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <button type="button" ref={menuTrigger} className="landing-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-controls="landing-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero" data-meta-section="hero" aria-labelledby="landing-title">
          <div className="landing-wrap wrap landing-hero-layout">
            <div className="landing-hero-copy">
              <h1 id="landing-title">Mais que agenda. <span>Cresça com clareza.</span></h1>
              <p>Receba agendamentos e acompanhe quanto entrou, quanto saiu e quanto sobrou. Veja quais clientes deixaram de voltar.</p>
              <div className="landing-hero-actions">
                <a href={signupHref} className="landing-button" aria-describedby="landing-trial-terms" onClick={() => trackLandingCta('free_trial_hero', trackingNiche, 'hero')}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
                <button type="button" className="landing-text-link landing-demo-jump" onClick={() => scrollTo('demonstracao')}>Testar demonstração <ArrowDown size={16} aria-hidden="true" /></button>
                <span className="landing-no-card" id="landing-trial-terms"><Check size={15} aria-hidden="true" /> {trialTerms}</span>
              </div>
            </div>
            <div className="landing-hero-product" data-niche={niche}>
              <BusinessSelector niche={niche} label="Seu tipo de negócio" onChange={chooseNiche} />
              <a href={demoLink(niche)} className="landing-product-stage" aria-description="Abre o painel inicial na demonstração do AgendiX." onClick={() => { metaTracker.demoStart(trackingNiche); trackLandingDemoScreen('dashboard', trackingNiche); }}>
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

        <section id="demonstracao" className="landing-demo-section" data-meta-section="demo" aria-labelledby="landing-demo-title" tabIndex={-1}>
          <div className="landing-wrap wrap">
            <div className="landing-demo-stage">
              <div className="landing-demo-controls">
                <h2 id="landing-demo-title">Teste sem criar conta.</h2>
                <p>Escolha barbearia ou salão e navegue pelas telas reais com dados de exemplo. Sem cadastro e sem compromisso.</p>
                <BusinessSelector niche={niche} label="Negócio da demonstração" onChange={chooseNiche} />
                <div className="landing-demo-view-tabs" role="group" aria-label="Tela da demonstração">
                  {demoViews.map(({ id, label, icon: Icon }) => (
                    <button type="button" key={id} aria-pressed={view === id} onClick={() => onDemoTab(id)}>
                      <Icon size={17} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
                <p className="landing-demo-task" aria-live="polite">{activeView.task}</p>
                <div className="landing-demo-start">
                  <button type="button" className="landing-button landing-button-light landing-demo-embed-action" aria-expanded={interactive} aria-controls="landing-demo-screen" onClick={() => (interactive ? setInteractive(false) : startEmbeddedDemo())}>
                    {interactive ? 'Fechar a simulação' : (presence ? 'Ver o site' : 'Explorar a simulação')} {interactive ? <X size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                  <a className="landing-button landing-button-light landing-demo-mobile-action" href={demoHref} onClick={() => { metaTracker.demoStart(trackingNiche); trackLandingDemoScreen(view, trackingNiche); }}>{presence ? 'Ver o site' : 'Explorar a simulação'} <ArrowRight size={18} aria-hidden="true" /></a>
                  <a className="landing-text-link landing-demo-fullscreen" href={demoHref} onClick={() => { metaTracker.demoStart(trackingNiche); trackLandingDemoScreen(view, trackingNiche); }}>Abrir em tela cheia <ArrowRight size={16} aria-hidden="true" /></a>
                </div>
              </div>
              <figure className="landing-demo-preview" id="landing-demo-screen">
                <div className="landing-demo-frame" data-view={view} data-interactive={interactive}>
                  <div className="landing-demo-poster">
                    <PhoneImage niche={niche} view={view} alt={presence ? 'Site do Studio Aurora, salão fictício' : `${activeView.label} do AgendiX com dados fictícios de ${businesses[niche]}`} />
                  </div>
                  {interactive && (
                    <iframe key={embedSrc} title={presence ? 'Site do Studio Aurora, salão fictício do Presença' : `Simulação interativa ${niche === 'barber' ? 'da barbearia' : 'do salão'}: ${activeView.label}`} src={embedSrc} sandbox={presence ? 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox' : 'allow-scripts allow-same-origin allow-forms'} />
                  )}
                </div>
                <figcaption>{activeView.label} · {presence ? 'Studio Aurora' : businesses[niche]}</figcaption>
              </figure>
            </div>
            <div className="landing-demo-conversion">
              <p>Curtiu? Coloque seus serviços, horários e números reais em poucos minutos.</p>
              <a className="landing-text-link" href={signupHref} onClick={() => trackLandingCta('free_trial_demo', trackingNiche, 'demo')}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section id="produto" className="landing-product" aria-labelledby="landing-product-title" tabIndex={-1}>
          <div className="landing-wrap wrap">
            <div className="landing-product-grid">
              <div>
                <h2 id="landing-product-title">Mais do que marcar horários.</h2>
                <p className="landing-product-intro">A agenda organiza o dia, mas o crescimento vem de enxergar o negócio inteiro. Clique em qualquer tela para testar na demo.</p>
                <ul className="landing-product-list">
                  {productViews.map(({ id, label, route, benefit, section }) => (
                    <li key={id} data-meta-section={section ?? undefined}>
                      <a href={id === 'presence' ? PRESENCE_SITE : demoLink(niche, route)} onClick={() => { metaTracker.demoStart(trackingNiche); trackLandingDemoScreen(id === 'presence' ? 'presence' : (route.startsWith('/') ? route : '/' + route.split('?')[0]), trackingNiche, route.includes('?') ? route.slice(route.indexOf('?')) : ''); }}>
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
              <h3>Equipe, fila e o valor da sua hora</h3>
              <ul className="landing-product-list landing-team-list">
                {teamViews.map(({ label, route, benefit, section }) => (
                  <li key={route} data-meta-section={section}>
                    <a href={demoLink(niche, route)} onClick={() => {
                      const [path, query] = route.split('?');
                      metaTracker.demoStart(trackingNiche);
                      trackLandingDemoScreen('/' + path, trackingNiche, query ? '?' + query : '');
                    }}>
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
              <p>Rhian Lepore cresceu entre barbearias e salões. Viu de perto o que acontece quando o dono passa o dia inteiro atendendo: a agenda gira, o dinheiro entra, mas falta tempo — e clareza — para olhar os números.</p>
              <blockquote className="landing-story-quote">
                <p>“Vi meus pais trabalhando para o negócio, sem que o negócio trabalhasse para eles. Ter clientes e dinheiro entrando não bastava. Era preciso entender os custos, organizar as contas e saber o que realmente sobrava. Foi por isso que criei o AgendiX.”</p>
                <footer>Rhian Lepore, criador do AgendiX</footer>
              </blockquote>
              <p className="landing-story-slogan">Você cresce. O AgendiX acompanha você e ajuda seu negócio a ir além.</p>
            </div>
          </div>
        </section>

        <section className="landing-onboarding" data-meta-section="offer" aria-labelledby="landing-setup-title">
          <div className="landing-wrap wrap landing-onboarding-grid">
            <h2 id="landing-setup-title">Comece sem travar o seu dia</h2>
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

        <section className="landing-faq" data-meta-section="faq" aria-labelledby="landing-faq-title">
          <div className="landing-wrap wrap landing-faq-grid">
            <div>
              <h2 id="landing-faq-title">Perguntas frequentes</h2>
              <a className="landing-text-link" href={supportHref} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp}>Tirar dúvida no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <div className="landing-questions">
              {questions.map(({ id, question, answer }) => (
                <details key={id} onToggle={event => {
                  if ((event.currentTarget as HTMLDetailsElement).open) metaTracker.faqOpen(id, trackingNiche);
                }}>
                  <summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-close" data-meta-section="cta_final" aria-labelledby="landing-close-title">
          <div className="landing-wrap wrap">
            <h2 id="landing-close-title">Faça o negócio trabalhar para você.</h2>
            <div className="landing-close-action">
              <a className="landing-button landing-button-light" href={signupHref} onClick={() => trackLandingCta('free_trial_final', trackingNiche, 'final')}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
              <span className="landing-no-card"><Check size={15} aria-hidden="true" /> {trialTerms}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap wrap landing-footer-row">
          <a className="landing-brand" href="/#/landing" aria-label="AgendiX, voltar ao início" onClick={() => window.scrollTo(0, 0)}><img src="/landing/agendix-logo-header.webp" width="640" height="215" alt="" loading="lazy" decoding="async" /></a>
          <nav aria-label="Links legais"><a href="/#/termos">Termos de uso</a><a href="/#/privacidade">Privacidade</a></nav>
          <a href={supportHref} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp}>Suporte no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a>
          <small>© {new Date().getFullYear()} AgendiX</small>
          <small>Fotos da demonstração · Pexels</small>
        </div>
      </footer>
    </div>
  );
};
