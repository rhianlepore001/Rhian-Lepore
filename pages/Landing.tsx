import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, CreditCard, Menu, Play, Smartphone, X } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import '../styles/landing.css';

const features = [
  { title: 'Uma agenda que acompanha o seu dia.', text: 'Veja os horários, os serviços e quem vai atender. Do primeiro cliente ao último encaixe, tenha o dia inteiro em uma só visão.', image: 'agenda', route: 'agenda', alt: 'Agenda real do AgendiX com horários organizados por profissional', label: 'A rotina, em ordem', action: 'Explorar a agenda' },
  { title: 'Seu cliente escolhe. Você acompanha.', text: 'Coloque seu link na bio ou compartilhe pelo WhatsApp. O cliente consulta serviços e horários, escolhe o profissional e envia o pedido de agendamento.', image: 'booking', route: 'book/simulacao', alt: 'Agendamento público do AgendiX com seleção de serviços e horários', label: 'Um link para o próximo atendimento', action: 'Explorar o agendamento' },
  { title: 'Saiba o que entra. Entenda o que fica.', text: 'Acompanhe entradas e despesas sem juntar anotações de lugares diferentes. Consulte as comissões e o movimento do caixa para decidir com mais clareza.', image: 'finance', route: 'financeiro', alt: 'Financeiro real do AgendiX com fluxo de caixa e lançamentos ilustrativos', label: 'Clareza para gerir', action: 'Explorar o financeiro' },
];
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
  { id: 'agenda', label: 'Agenda', route: 'agenda', image: 'agenda', task: 'Encontre um horário livre e experimente criar um atendimento.' },
  { id: 'booking', label: 'Agendamento online', route: 'book/simulacao', image: 'booking', task: 'Escolha um serviço e veja como seu cliente pede um horário pelo seu link.' },
  { id: 'finance', label: 'Financeiro', route: 'financeiro', image: 'finance', task: 'Confira as entradas, as despesas e o saldo ilustrativo do período.' },
] as const;

export const Landing = () => {
  const [menu, setMenu] = useState(false);
  const [niche, setNiche] = useState<'barber' | 'beauty'>('barber');
  const [nicheChosen, setNicheChosen] = useState(false);
  const [operation, setOperation] = useState('performance');
  const [view, setView] = useState<(typeof demoViews)[number]['id']>('booking');
  const [interactive, setInteractive] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const activeView = demoViews.find(item => item.id === view)!;
  const signupHref = nicheChosen ? `/#/register?type=${niche}` : '/#/register';
  const demoHref = `/#/demo/${niche}/${activeView.route}`;
  const imageFor = (image: string) => niche === 'beauty' ? image === 'agenda' ? 'beauty' : `beauty-${image}` : image;
  const posterImage = imageFor(activeView.image);

  useEffect(() => {
    const root = document.documentElement;
    const previousSurface = root.dataset.surface;
    const previousTitle = document.title;
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
  const chooseNiche = (next: 'barber' | 'beauty') => {
    setNiche(next);
    setNicheChosen(true);
  };
  const feature = (item: (typeof features)[number], index: number) => <article className={`landing-feature feature-${index}`} key={item.title}>
    <div className="landing-feature-copy"><span className="landing-eyebrow"><span className="landing-feature-number">0{index + 1}</span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p>{index === 1 && <span className="landing-feature-assurance"><Check size={15} aria-hidden="true" /> Sem aplicativo para o cliente instalar</span>}<a className="landing-text-link" href={`/#/demo/${niche}/${item.route}`}>{item.action} <ArrowRight size={18} aria-hidden="true" /></a></div>
    <div className="landing-feature-shot"><div className="landing-shot-caption"><span>AgendiX / {index === 0 ? 'Agenda' : index === 1 ? 'Agendamento online' : 'Financeiro'}</span><span>Dados fictícios</span></div><picture><source media="(max-width: 760px)" srcSet={`/landing/${imageFor(item.image)}-mobile.webp`} /><img src={`/landing/${imageFor(item.image)}-1440.webp`} alt={item.alt} loading="lazy" width="1440" height="790" /></picture></div>
  </article>;

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
        <div className="landing-wrap wrap">
          <div className="landing-hero-head">
            <div><span className="landing-eyebrow"><span className="landing-status-dot" /> Gestão para barbearias e salões</span><h1>Seu talento<br className="landing-hero-break" /> cuida dos clientes.<br /><span>O AgendiX cuida<br className="landing-hero-break" /> do seu negócio.</span></h1></div>
            <div className="landing-hero-lead"><span className="landing-lead-line" aria-hidden="true" /><p>Agenda, agendamento online, financeiro e equipe para barbearias e salões. Organize os horários, receba pedidos pelo seu link e acompanhe o caixa, entre um cliente e outro.</p><a href={signupHref} className="landing-button">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><span className="landing-no-card"><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span><button className="landing-text-link" onClick={() => scrollTo('demonstracao')}>Experimente antes de criar sua conta <ArrowDown size={16} aria-hidden="true" /></button></div>
          </div>
          <div className="landing-hero-product-head"><div className="landing-hero-segments" role="group" aria-label="Seu tipo de negócio"><button aria-pressed={niche === 'barber'} onClick={() => chooseNiche('barber')}>Barbearia</button><button aria-pressed={niche === 'beauty'} onClick={() => chooseNiche('beauty')}>Salão de beleza</button></div><span>Seu dia, em uma visão. Dados de demonstração.</span></div>
          <a href={`/#/demo/${niche}/agenda`} className="landing-product-stage" aria-label="Experimentar a agenda do AgendiX"><div className="landing-frame-bar"><span><span className="landing-window-dots" aria-hidden="true"><i /><i /><i /></span>AgendiX / Agenda</span><span>{niche === 'barber' ? 'Barbearia Corte Fino' : 'Studio Aurora'} · Simulação</span><ArrowRight size={18} aria-hidden="true" /></div><picture><source media="(max-width: 640px)" srcSet={`/landing/${niche === 'barber' ? 'hero-agenda' : 'beauty'}-mobile.webp`} /><img src={`/landing/${niche === 'barber' ? 'hero-agenda' : 'beauty'}-1440.webp`} width="1440" height="790" fetchPriority="high" alt={`Agenda do AgendiX com atendimentos e profissionais ${niche === 'barber' ? 'da Barbearia Corte Fino' : 'do Studio Aurora'}, em uma simulação com dados fictícios`} /></picture><div className="landing-stage-invitation">Seu próximo horário começa aqui. <span>Explore a agenda <ArrowRight size={15} aria-hidden="true" /></span></div></a>
          <div className="landing-value-line"><span><Check size={15} aria-hidden="true" /> Agenda e agendamento online</span><span><Check size={15} aria-hidden="true" /> Financeiro e comissões</span><span><Smartphone size={15} aria-hidden="true" /> Celular e computador</span></div>
        </div>
      </section>

      <section id="demonstracao" className="landing-demo-section" tabIndex={-1}>
        <div className="landing-wrap wrap">
          <div className="landing-section-head"><div><span className="landing-eyebrow">Conheça antes de decidir</span><h2>Não fique só<br />na apresentação.<br /><span>Experimente.</span></h2></div><div><p>Abra a agenda, conheça o agendamento ou consulte o financeiro. Explore os fluxos do AgendiX com dados fictícios, sem cadastro.</p><div className="landing-tabs" role="group" aria-label="Negócio da demonstração"><button aria-pressed={niche === 'barber'} onClick={() => chooseNiche('barber')}>Barbearia</button><button aria-pressed={niche === 'beauty'} onClick={() => chooseNiche('beauty')}>Salão</button></div></div></div>
          <div className="landing-demo-toolbar"><div className="landing-demo-view-tabs" role="group" aria-label="Tela da demonstração">{demoViews.map(item => <button key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}</div><span>Você está explorando: {niche === 'barber' ? 'barbearia' : 'salão'}</span></div>
          <div className="landing-demo-task" aria-live="polite"><span>O que experimentar</span><p>{activeView.task}</p></div><div className="landing-demo-frame">
            {interactive ? <iframe key={`${niche}-${view}`} title={`Simulação interativa ${niche === 'barber' ? 'da barbearia' : 'do salão'}: ${activeView.label}`} src={demoHref} loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms" /> : <div className="landing-demo-poster"><picture><source media="(max-width: 640px)" srcSet={`/landing/${posterImage}-mobile.webp`} /><img src={`/landing/${posterImage}-1440.webp`} alt={`${activeView.label} do AgendiX, com dados fictícios`} loading="lazy" width="1440" height="790" /></picture><div className="landing-demo-start"><span className="landing-demo-start-icon"><Play size={20} fill="currentColor" aria-hidden="true" /></span><strong>Explore por dentro.</strong><span>Faça um teste com dados fictícios.</span><button className="landing-button landing-demo-embed-action" onClick={() => setInteractive(true)}>Explorar a simulação <ArrowRight size={18} aria-hidden="true" /></button><a className="landing-button landing-demo-mobile-action" href={demoHref}>Explorar a simulação <ArrowRight size={18} aria-hidden="true" /></a></div></div>}
          </div>
          <div className="landing-demo-foot"><span><span className="landing-status-dot" /> Simulação segura · nenhuma mensagem é enviada</span><a className="landing-text-link" href={demoHref}>Abrir em tela cheia <ArrowRight size={17} aria-hidden="true" /></a></div>
          <div className="landing-demo-conversion"><div><span className="landing-eyebrow">Do primeiro clique à sua rotina</span><h3>Agora, com o nome do seu negócio.</h3><p>Cadastre seus serviços, prepare a agenda e compartilhe seu próprio link.</p></div><div className="landing-demo-conversion-actions"><a className="landing-button" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><span><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span><a className="landing-text-link" href={buildWhatsAppLink('+351 927 688 674', 'PT')} target="_blank" rel="noopener noreferrer">Falar com suporte <ArrowRight size={16} aria-hidden="true" /></a></div></div>
        </div>
      </section>

      <section id="produto" className="landing-features" tabIndex={-1}>
        <div className="landing-wrap wrap"><div className="landing-benefits-head"><span className="landing-eyebrow">Da primeira marcação ao fechamento</span><h2>Seu negócio funciona melhor<br /><span>quando tudo se conecta.</span></h2><p>A organização deixa de ser mais uma tarefa e passa a fazer parte do atendimento.</p></div>{features.slice(0, 2).map(feature)}</div>
      </section>
      <section className="landing-features landing-features-more" aria-label="Financeiro e gestão da equipe"><div className="landing-wrap wrap">{features.slice(2).map((item, index) => feature(item, index + 2))}
        <div className="landing-team"><div className="landing-team-intro"><span className="landing-eyebrow">O valor de cada atendimento</span><h3>Seu tempo importa.<br /><span>O da sua equipe, também.</span></h3><p>Acompanhe comissões e faturamento por hora de cadeira. Para quem chega sem marcar, organize a fila em uma tela própria.</p><div className="landing-team-points"><span><Check size={16} aria-hidden="true" /> Mais clareza sobre o trabalho da equipe</span><span><Check size={16} aria-hidden="true" /> Atendimentos com e sem agendamento</span></div></div><figure className="landing-team-photo"><img src="/landing/craft-800.webp" srcSet="/landing/craft-800.webp 800w, /landing/craft-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 40vw" loading="lazy" width="800" height="1000" alt="Profissional trabalhando no cabelo de uma cliente, em fotografia de banco" /><figcaption>Fotografia ilustrativa de banco.</figcaption></figure><div className="landing-team-operation"><div className="landing-operation-tabs" role="group" aria-label="Gestão da equipe"><button aria-pressed={operation === 'performance'} onClick={() => setOperation('performance')}>Hora de cadeira</button><button aria-pressed={operation === 'team'} onClick={() => setOperation('team')}>Equipe</button><button aria-pressed={operation === 'queue'} onClick={() => setOperation('queue')}>Fila</button></div><a className="landing-team-proof" href={`/#/demo/${niche}/${operation === 'performance' ? 'financeiro/performance' : operation === 'team' ? 'configuracoes/equipe' : 'fila'}`}><picture><source media="(max-width: 760px)" srcSet={`/landing/${imageFor(operation)}-mobile.webp`} /><img src={`/landing/${imageFor(operation)}-1440.webp`} width={operation === 'performance' ? 1142 : 1320} height={operation === 'performance' ? 524 : 682} loading="lazy" alt={`Tela real de ${operation === 'performance' ? 'hora de cadeira' : operation === 'team' ? 'equipe e comissões' : 'fila de espera'} do AgendiX, com dados fictícios`} /></picture><span className="landing-proof-link">Experimentar {operation === 'performance' ? 'a visão de hora de cadeira' : operation === 'team' ? 'a gestão da equipe' : 'a fila digital'} <ArrowRight size={17} aria-hidden="true" /></span></a></div></div>
      </div></section>

      <section id="historia" className="landing-story" tabIndex={-1}><div className="landing-wrap wrap landing-story-grid"><figure className="landing-story-photo"><img src="/landing/barber-800.webp" srcSet="/landing/barber-800.webp 800w, /landing/barber-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 50vw" width="1600" height="1067" loading="lazy" alt="Barbeiro fazendo a barba de um cliente; fotografia ilustrativa de banco" /><figcaption>Fotografia ilustrativa de banco.</figcaption></figure><div className="landing-story-copy"><span className="landing-eyebrow">De perto, faz mais sentido</span><h2>Gestão feita para<br />quem vive o balcão.</h2><p>O atendimento tem nome, conversa e confiança. A gestão precisa acompanhar esse cuidado.</p><p>Criado por Rhian Lepore, o AgendiX acompanha a rotina de quem vive o balcão. A Moderna, do Tales, é uma das barbearias que usam o sistema. Essa proximidade orienta as melhorias do produto.</p><button className="landing-text-link" onClick={() => scrollTo('demonstracao')}>Conheça essa forma de trabalhar <ArrowRight size={18} aria-hidden="true" /></button></div></div></section>

      <section className="landing-onboarding"><div className="landing-wrap wrap"><div className="landing-onboarding-head"><div><span className="landing-eyebrow">Seu próximo passo, sem complicação</span><h2>Comece pelo essencial.<br /><span>Avance no seu ritmo.</span></h2></div><a href={signupHref} className="landing-text-link">Criar minha conta <ArrowRight size={18} aria-hidden="true" /></a></div><ol className="landing-steps"><li><span>01</span><h3>Crie sua conta</h3><p>Escolha o seu segmento e conte um pouco sobre o seu negócio. Sem cartão no cadastro.</p></li><li><span>02</span><h3>Prepare sua agenda</h3><p>Cadastre os serviços, os profissionais e os horários de atendimento.</p></li><li><span>03</span><h3>Compartilhe seu link</h3><p>Receba pedidos de agendamento e acompanhe a rotina no mesmo lugar.</p></li></ol></div></section>

      <section className="landing-faq"><div className="landing-wrap wrap landing-faq-grid"><div><span className="landing-eyebrow">Antes de começar</span><h2>Uma boa escolha<br />começa com clareza.</h2><p>As respostas para você dar o próximo passo com tranquilidade.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
      <section className="landing-close"><div className="landing-wrap wrap"><div><span className="landing-eyebrow">Seu talento merece esse cuidado</span><h2>Mais organização<br />nos bastidores.<br /><span>Mais presença<br />no atendimento.</span></h2></div><div className="landing-close-action"><p>Conheça o AgendiX na sua rotina.<br />Comece com uma conta grátis.</p><a className="landing-button landing-button-light" href={signupHref}>Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><span><CreditCard size={15} aria-hidden="true" /> Sem cartão no cadastro</span></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-wrap wrap"><div className="landing-footer-top"><div><a className="landing-wordmark" href="/#/landing">AgendiX</a><p>Seu ofício merece uma boa gestão.</p></div><a href={buildWhatsAppLink('+351 927 688 674', 'PT')} target="_blank" rel="noopener noreferrer">Suporte no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} AgendiX</span><a href="/#/termos">Termos de uso</a><a href="/#/privacidade">Privacidade</a><span>Fotografias ilustrativas: <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a></span></div></div></footer>
  </div>;
};
