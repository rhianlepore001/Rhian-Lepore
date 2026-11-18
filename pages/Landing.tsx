import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CalendarDays, Check, Clock, CreditCard, LayoutDashboard, Menu, Scissors, Smartphone, Sparkles, Users, Wallet, X } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import '../styles/landing.css';

const features = [
  { title: 'Uma agenda que acompanha o seu dia.', text: 'Veja os horários, os serviços e quem vai atender. Do primeiro cliente ao último encaixe, tenha o dia inteiro em uma só visão.', image: 'agenda', route: 'agenda', alt: 'Agenda real do AgendiX com horários organizados por profissional', label: 'A rotina, em ordem', action: 'Explorar a agenda' },
  { title: 'Seu cliente escolhe. Você acompanha.', text: 'Coloque seu link na bio ou compartilhe pelo WhatsApp. O cliente consulta serviços e horários, escolhe o profissional e envia o pedido de agendamento.', image: 'booking', route: 'book/simulacao', alt: 'Agendamento público do AgendiX com seleção de serviços e horários', label: 'Um link para o próximo atendimento', action: 'Explorar o agendamento' },
  { title: 'Saiba o que entra. Entenda o que fica.', text: 'Acompanhe entradas e despesas sem juntar anotações de lugares diferentes. Consulte as comissões e o movimento do caixa para decidir com mais clareza.', image: 'finance', route: 'financeiro', alt: 'Financeiro real do AgendiX com fluxo de caixa e lançamentos ilustrativos', label: 'Clareza para gerir', action: 'Explorar o financeiro' },
  { title: 'Chame de volta quem sumiu há mais de 35 dias.', text: 'O filtro de clientes inativos mostra quem não volta há mais de 35 dias, com histórico de visitas e atalho direto para retomar o contato.', image: 'clientes', route: 'clientes?filter=Inativo', alt: 'Lista de clientes do AgendiX filtrada por inativos há mais de 35 dias', label: 'Retenção sem planilha', action: 'Explorar clientes inativos' },
] as const;

const questions = [
  ['O AgendiX é para barbearias ou salões?', 'Para os dois. A agenda, os serviços e a linguagem acompanham o seu tipo de negócio. Experimente a barbearia e o salão na simulação antes de criar sua conta.'],
  ['Preciso de cartão para criar minha conta?', 'Não. Você cria sua conta sem cadastrar um cartão e conhece o produto durante o período de teste. Depois, escolhe o plano adequado ao seu negócio.'],
  ['Como funciona o período de teste?', 'Crie sua conta grátis para conhecer o produto. O prazo e as condições do período de teste aparecem na sua conta e podem variar conforme a oferta disponível. Ao final, você escolhe um plano para continuar usando.'],
  ['Posso usar pelo celular e com minha equipe?', 'Sim. Você acessa o AgendiX pelo navegador do celular ou do computador, com conexão à internet. Para negócios com equipe, cada profissional acessa o mesmo negócio com as permissões definidas para ele.'],
  ['Meu cliente precisa instalar um aplicativo?', 'Não. O cliente abre o seu link no navegador, consulta os serviços e envia o pedido de agendamento. A confirmação segue as configurações do seu negócio.'],
  ['A simulação usa dados de clientes reais?', 'Não. Os nomes, atendimentos e valores são fictícios. As alterações ficam na memória do navegador e reiniciam ao recarregar. Nenhuma mensagem é enviada pela simulação.'],
  ['Como falo com o suporte?', 'Fale com o suporte pelo WhatsApp +351 927 688 674. O link está no rodapé desta página.'],
];

const demoViews = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, route: '', task: 'Acompanhe o próximo atendimento, a receita do dia e a fila em um só painel.' },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, route: 'agenda', task: 'Encontre um horário livre e experimente criar um atendimento.' },
  { id: 'booking', label: 'Agendamento online', icon: Smartphone, route: 'book/simulacao', task: 'Escolha um serviço e veja como seu cliente pede um horário pelo seu link.' },
  { id: 'fila', label: 'Fila', icon: Clock, route: 'fila', task: 'Organize quem chega sem marcar e acompanhe quem está em atendimento.' },
  { id: 'finance', label: 'Financeiro', icon: Wallet, route: 'financeiro', task: 'Confira as entradas, as despesas e o movimento ilustrativo do período.' },
  { id: 'clientes', label: 'Clientes', icon: Users, route: 'clientes?filter=Inativo', task: 'Filtre clientes inativos há mais de 35 dias e veja o histórico de visitas.' },
] as const;

const teamViews = [
  { id: 'fila', label: 'Fila', route: 'fila', action: 'Experimentar a fila digital', alt: 'Fila de espera e próximos atendimentos no AgendiX' },
  { id: 'commissions', label: 'Comissões', route: 'financeiro?tab=commissions', action: 'Experimentar o acerto de comissões', alt: 'Gestão de comissões da equipe por ciclo no AgendiX' },
  { id: 'performance', label: 'Hora de cadeira', route: 'financeiro/performance', action: 'Experimentar a visão de hora de cadeira', alt: 'Indicadores de faturamento por hora e ocupação no AgendiX' },
] as const;

type Niche = 'barber' | 'beauty';
type ProductView = (typeof demoViews)[number]['id'] | (typeof teamViews)[number]['id'];

const businesses = { barber: 'Barbearia Corte Fino', beauty: 'Studio Aurora' } as const;

const BusinessSelector = ({ niche, label, onChange }: { niche: Niche; label: string; onChange: (niche: Niche) => void }) => (
  <div className="landing-business-selector" role="group" aria-label={label}>
    <button aria-pressed={niche === 'barber'} onClick={() => onChange('barber')}><Scissors size={16} aria-hidden="true" /> Barbearia</button>
    <button aria-pressed={niche === 'beauty'} onClick={() => onChange('beauty')}><Sparkles size={16} aria-hidden="true" /> Salão de beleza</button>
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
  const [niche, setNiche] = useState<Niche>('barber');
  const [nicheChosen, setNicheChosen] = useState(false);
  const [operation, setOperation] = useState<(typeof teamViews)[number]['id']>('fila');
  const [view, setView] = useState<(typeof demoViews)[number]['id']>('dashboard');
  const [interactive, setInteractive] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const activeView = demoViews.find(item => item.id === view)!;
  const signupHref = nicheChosen ? `/#/register?type=${niche}` : '/#/register';
  const demoHref = activeView.route ? `/#/demo/${niche}/${activeView.route}` : `/#/demo/${niche}`;
  const activeOperation = teamViews.find(item => item.id === operation)!;

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
  const chooseNiche = (next: Niche) => {
    setNiche(next);
    setNicheChosen(true);
  };
  const feature = (item: (typeof features)[number], index: number) => (
    <article className={`landing-feature feature-${index}`} key={item.title}>
      <div className="landing-feature-copy">
        <span className="landing-eyebrow">{item.label}</span>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        {index === 1 && <span className="landing-feature-assurance"><Check size={15} aria-hidden="true" /> Sem aplicativo para o cliente instalar</span>}
        <a className="landing-text-link" href={`/#/demo/${niche}/${item.route}`}>{item.action} <ArrowRight size={18} aria-hidden="true" /></a>
      </div>
      <figure className="landing-phone-stage landing-feature-shot">
        <PhoneFrame niche={niche}><PhoneImage niche={niche} view={item.image} alt={item.alt} /></PhoneFrame>
        <figcaption>Dados fictícios</figcaption>
      </figure>
    </article>
  );

  return <div className="landing">
    <a className="landing-skip" href="#landing-main" onClick={event => { event.preventDefault(); document.getElementById('landing-main')?.focus(); }}>Pular para o conteúdo</a>
    <header className="landing-nav" ref={header}>
      <div className="landing-wrap wrap landing-nav-row">
        <a href="/#/landing" className="landing-brand" aria-label="AgendiX, início"><img src="/landing/agendix-logo-header.webp" width="640" height="215" alt="AgendiX" decoding="async" /></a>
        <nav id="landing-navigation" ref={navigation} className={menu ? 'landing-links is-open' : 'landing-links'} aria-label="Navegação principal">
          <button onClick={() => scrollTo('produto')}>O produto</button>
          <button onClick={() => scrollTo('historia')}>Nossa história</button>
          <button onClick={() => scrollTo('demonstracao')}>Experimentar</button>
          <a className="landing-salon-link" href="/#/register?type=beauty">Criar conta para salão</a>
        </nav>
        <div className="landing-nav-actions"><a href="/#/login">Entrar</a><a className="landing-button" href={signupHref}>Criar conta <ArrowRight size={15} aria-hidden="true" /></a></div>
        <button ref={menuTrigger} className="landing-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-controls="landing-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="landing-hero">
        <div className="landing-wrap wrap landing-hero-layout">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow"><Smartphone size={16} aria-hidden="true" /> Gestão pelo celular</span>
            <h1>Seu talento cuida dos clientes. <span>O AgendiX cuida do seu negócio.</span></h1>
            <p>Agenda, pedidos e caixa no celular, para barbearias e salões de beleza.</p>
            <div className="landing-hero-actions">
              <a href={signupHref} className="landing-button">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a>
              <button className="landing-text-link" onClick={() => scrollTo('demonstracao')}>Ver demonstração <ArrowDown size={16} aria-hidden="true" /></button>
              <span className="landing-no-card"><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span>
            </div>
          </div>
          <div className="landing-phone-stage landing-hero-product">
            <BusinessSelector niche={niche} label="Seu tipo de negócio" onChange={chooseNiche} />
            <a href={`/#/demo/${niche}`} className="landing-product-stage" aria-label={`Experimentar o painel de início do AgendiX: ${businesses[niche]}`}>
              <PhoneFrame niche={niche}><PhoneImage niche={niche} view="dashboard" eager alt={`Painel de início do AgendiX em um celular, com dados fictícios de ${businesses[niche]}`} /></PhoneFrame>
              <span className="landing-hero-screen-label">Painel de início · Dados fictícios <ArrowRight size={15} aria-hidden="true" /></span>
            </a>
          </div>
        </div>
      </section>

      <section id="demonstracao" className="landing-demo-section" tabIndex={-1}>
        <div className="landing-wrap wrap">
          <div className="landing-demo-stage">
            <div className="landing-demo-controls">
              <h2>Experimente o AgendiX.</h2>
              <p>Escolha o seu tipo de negócio e explore as telas reais do produto com dados fictícios, sem cadastro.</p>
              <BusinessSelector niche={niche} label="Negócio da demonstração" onChange={chooseNiche} />
              <div className="landing-demo-view-tabs" role="group" aria-label="Tela da demonstração">
                {demoViews.map(({ id, label, icon: Icon }) => (
                  <button key={id} aria-pressed={view === id} onClick={() => setView(id)}><Icon size={17} aria-hidden="true" /> {label}</button>
                ))}
              </div>
              <p className="landing-demo-task" aria-live="polite">{activeView.task}</p>
              <div className="landing-demo-start">
                <button className="landing-button landing-demo-embed-action" aria-expanded={interactive} aria-controls="landing-demo-screen" onClick={() => setInteractive(!interactive)}>
                  {interactive ? 'Fechar a simulação' : 'Explorar a simulação'} {interactive ? <X size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                </button>
                <a className="landing-button landing-demo-mobile-action" href={demoHref}>Explorar a simulação <ArrowRight size={18} aria-hidden="true" /></a>
                <a className="landing-text-link landing-demo-fullscreen" href={demoHref}>Abrir em tela cheia <ArrowRight size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <figure className="landing-demo-preview" id="landing-demo-screen">
              <div className="landing-demo-frame" data-interactive={interactive}>
                <PhoneFrame niche={niche}>
                  <div className="landing-demo-poster"><PhoneImage niche={niche} view={view} alt={`${activeView.label} do AgendiX, no tema ${niche === 'barber' ? 'Barber' : 'Beauty'}, com dados fictícios`} /></div>
                  {interactive && <iframe key={demoHref} title={`Simulação interativa ${niche === 'barber' ? 'da barbearia' : 'do salão'}: ${activeView.label}`} src={`/demo-preview${demoHref.slice(1)}`} sandbox="allow-scripts allow-same-origin allow-forms" />}
                </PhoneFrame>
              </div>
              <figcaption>{businesses[niche]} · Dados fictícios</figcaption>
            </figure>
          </div>
          <div className="landing-demo-conversion"><div><h3>Agora, com o nome do seu negócio.</h3><p>Cadastre seus serviços, prepare a agenda e compartilhe seu próprio link.</p></div><div className="landing-demo-conversion-actions"><a className="landing-button" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><span><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span></div></div>
        </div>
      </section>

      <section id="produto" className="landing-features" tabIndex={-1}>
        <div className="landing-wrap wrap"><div className="landing-benefits-head"><span className="landing-eyebrow">Da primeira marcação ao fechamento</span><h2>Seu negócio funciona melhor<br /><span>quando tudo se conecta.</span></h2><p>A organização deixa de ser mais uma tarefa e passa a fazer parte do atendimento.</p></div>{features.slice(0, 2).map(feature)}</div>
      </section>
      <section className="landing-features landing-features-more" aria-label="Financeiro, clientes e gestão da equipe"><div className="landing-wrap wrap">{features.slice(2).map((item, index) => feature(item, index + 2))}
        <div className="landing-team"><div className="landing-team-intro"><span className="landing-eyebrow">O valor de cada atendimento</span><h3>Seu tempo importa.<br /><span>O da sua equipe, também.</span></h3><p>Acompanhe comissões e faturamento por hora de cadeira. Para quem chega sem marcar, organize a fila em uma tela própria.</p><div className="landing-team-points"><span><Check size={16} aria-hidden="true" /> Mais clareza sobre o trabalho da equipe</span><span><Check size={16} aria-hidden="true" /> Atendimentos com e sem agendamento</span></div></div><figure className="landing-team-photo"><img src="/landing/team-salon-800.webp" srcSet="/landing/team-salon-800.webp 800w, /landing/team-salon-1448.webp 1448w" sizes="(max-width: 760px) 100vw, 40vw" loading="lazy" width="1448" height="1086" alt="Duas profissionais de salão organizando o dia juntas com um tablet" /></figure><div className="landing-team-operation landing-phone-stage">
          <div className="landing-team-operation-copy">
            <div className="landing-operation-tabs" role="group" aria-label="Gestão da equipe">
              {teamViews.map(({ id, label }) => <button key={id} aria-pressed={operation === id} onClick={() => setOperation(id)}>{label}</button>)}
            </div>
            <a className="landing-text-link" href={`/#/demo/${niche}/${activeOperation.route}`}>{activeOperation.action} <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <figure>
            <PhoneFrame niche={niche}><PhoneImage niche={niche} view={operation} alt={activeOperation.alt} /></PhoneFrame>
            <figcaption>Dados fictícios</figcaption>
          </figure>
        </div></div>
      </div></section>

      <section id="historia" className="landing-story" tabIndex={-1}>
        <div className="landing-wrap wrap landing-story-grid">
          <figure className="landing-story-photo">
            <img src="/landing/story-barbershop-800.webp" srcSet="/landing/story-barbershop-800.webp 800w, /landing/story-barbershop-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 50vw" width="1536" height="1024" loading="lazy" alt="Profissional conferindo a gestão da barbearia em um tablet no balcão" />
          </figure>
          <div className="landing-story-copy">
            <span className="landing-eyebrow">De perto, faz mais sentido</span>
            <h2>Para que o esforço de hoje construa o crescimento de amanhã.</h2>
            <p>Rhian Lepore cresceu entre barbearias e salões, em um ambiente familiar ligado à beleza. Dessa convivência veio uma percepção que deu origem ao AgendiX:</p>
            <blockquote className="landing-story-quote">
              <p>“Vi meus pais trabalhando para o negócio, sem que o negócio também trabalhasse para eles. Percebi que ter clientes e dinheiro entrando não era suficiente. Era preciso entender os custos, organizar as contas e saber o que realmente sobrava. Foi por isso que criei o AgendiX.”</p>
              <span className="landing-story-attribution">Rhian Lepore, criador do AgendiX</span>
            </blockquote>
            <p>O sistema nasceu para aproximar a gestão da rotina de quem atende: reunir agenda, financeiro e equipe, trazer clareza às decisões e ajudar o profissional a transformar seu trabalho em um negócio mais organizado.</p>
            <p className="landing-story-slogan">Você cresce. O AgendiX acompanha você e ajuda seu negócio a ir além.</p>
            <button className="landing-text-link" onClick={() => scrollTo('demonstracao')}>Conheça essa forma de trabalhar <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      <section className="landing-onboarding"><div className="landing-wrap wrap"><div className="landing-onboarding-head"><div><span className="landing-eyebrow">Seu próximo passo, sem complicação</span><h2>Comece pelo essencial.<br /><span>Avance no seu ritmo.</span></h2></div><a href={signupHref} className="landing-text-link">Criar minha conta <ArrowRight size={18} aria-hidden="true" /></a></div><ol className="landing-steps"><li><span>01</span><h3>Crie sua conta</h3><p>Escolha o seu segmento e conte um pouco sobre o seu negócio. Sem cartão no cadastro.</p></li><li><span>02</span><h3>Prepare sua agenda</h3><p>Cadastre os serviços, os profissionais e os horários de atendimento.</p></li><li><span>03</span><h3>Compartilhe seu link</h3><p>Receba pedidos de agendamento e acompanhe a rotina no mesmo lugar.</p></li></ol></div></section>

      <section className="landing-faq"><div className="landing-wrap wrap landing-faq-grid"><div><span className="landing-eyebrow">Antes de começar</span><h2>Uma boa escolha<br />começa com clareza.</h2><p>As respostas para você dar o próximo passo com tranquilidade.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
      <section className="landing-close"><div className="landing-wrap wrap"><div><span className="landing-eyebrow">Seu talento merece esse cuidado</span><h2>Mais organização<br />nos bastidores.<br /><span>Mais presença<br />no atendimento.</span></h2></div><div className="landing-close-action"><p>Conheça o AgendiX na sua rotina.<br />Comece com uma conta grátis.</p><a className="landing-button landing-button-light" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><span><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-wrap wrap"><div className="landing-footer-top"><div><a className="landing-wordmark" href="/#/landing">AgendiX</a><p>Seu ofício merece uma boa gestão.</p></div><a href={buildWhatsAppLink('+351 927 688 674', 'PT')} target="_blank" rel="noopener noreferrer">Suporte no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} AgendiX</span><a href="/#/termos">Termos de uso</a><a href="/#/privacidade">Privacidade</a><span>Fotos da demonstração: Pexels</span></div></div></footer>
  </div>;
};
