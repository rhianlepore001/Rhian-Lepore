import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Menu, X } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import '../styles/landing.css';

const features = [
  { title: 'Agenda no ritmo do seu dia.', text: 'Horários, profissionais e atendimentos em uma só visão. Abra um horário e marque o próximo cliente.', image: 'agenda', route: 'agenda', alt: 'Agenda real do AgendiX com horários organizados por profissional' },
  { title: 'Seu cliente escolhe o horário.', text: 'Compartilhe seu link. O cliente escolhe o serviço e o profissional; você acompanha o pedido na agenda.', image: 'booking', route: 'book/simulacao', alt: 'Agendamento público do AgendiX com seleção de serviços' },
  { title: 'Seu financeiro em uma visão clara.', text: 'Acompanhe entradas, despesas e comissões. Veja o que sobra depois de um dia de trabalho.', image: 'finance', route: 'financeiro', alt: 'Financeiro real do AgendiX com fluxo de caixa e lançamentos ilustrativos' },
];
const questions = [
  ['O AgendiX é para barbearias ou salões?', 'Para os dois. A agenda, os serviços e a linguagem acompanham o seu tipo de negócio. Experimente a barbearia e o salão na simulação antes de criar sua conta.'],
  ['Preciso instalar algum programa?', 'Você pode usar o AgendiX pelo navegador do celular ou do computador. Sua equipe acessa o mesmo negócio, com as permissões de cada profissional.'],
  ['Como funciona o período de teste?', 'Crie sua conta grátis para conhecer o produto. O prazo e as condições do período de teste aparecem na sua conta e podem variar conforme a oferta disponível.'],
  ['A simulação usa dados de clientes reais?', 'Não. Os nomes, atendimentos e valores são fictícios. As alterações ficam na memória do navegador e reiniciam ao recarregar. Nenhuma mensagem é enviada pela simulação.'],
  ['Como falo com o suporte?', 'Fale com o suporte pelo WhatsApp +351 927 688 674. O link está no rodapé desta página.'],
];

export const Landing = () => {
  const [menu, setMenu] = useState(false);
  const [niche, setNiche] = useState<'barber' | 'beauty'>('barber');
  const [operation, setOperation] = useState('performance');
  const [interactive, setInteractive] = useState(false);
  const [sticky, setSticky] = useState(false);
  const heroAction = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = 'marketing';
    const viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    const observer = new IntersectionObserver(([entry]) => setSticky(!entry.isIntersecting));
    if (heroAction.current) observer.observe(heroAction.current);
    document.title = 'AgendiX — Agenda e gestão para barbearias e salões';
    return () => {
      delete root.dataset.surface;
      if (previous) viewport?.setAttribute('content', previous);
      observer.disconnect();
    };
  }, []);
  const scrollTo = (id: string) => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <div className={`landing${sticky ? " has-mobile-cta" : ""}`}>
    <a className="landing-skip" href="#landing-main" onClick={event => { event.preventDefault(); document.getElementById('landing-main')?.focus(); }}>Pular para o conteúdo</a>
    <header className="landing-nav">
      <div className="landing-wrap wrap landing-nav-row">
        <a href="/" className="landing-wordmark" aria-label="AgendiX, início">AgendiX</a>
        <nav className={menu ? 'landing-links is-open' : 'landing-links'} aria-label="Navegação principal">
          <button onClick={() => scrollTo('produto')}>O produto</button>
          <button onClick={() => scrollTo('historia')}>Nossa história</button>
          <button onClick={() => scrollTo('demonstracao')}>Experimentar</button>
          <a href="/#/register?type=beauty">Criar conta para salão</a>
        </nav>
        <div className="landing-nav-actions"><a href="/#/login">Entrar</a><a className="landing-button" href="/#/register">Criar conta <ArrowRight size={16} aria-hidden="true" /></a></div>
        <button className="landing-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
      </div>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="landing-hero">
        <div className="landing-wrap wrap">
          <div className="landing-hero-head">
            <h1>Seu talento cuida dos clientes.<br /><span>O AgendiX cuida do seu negócio.</span></h1>
            <div className="landing-hero-lead"><p>Agenda, financeiro e equipe para barbearias e salões. Mais clareza na gestão. Mais atenção a quem senta na sua cadeira.</p><a ref={heroAction} href="/#/register" className="landing-button">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a><button className="landing-text-link" onClick={() => scrollTo('demonstracao')}>Conheça o produto <ArrowDown size={16} aria-hidden="true" /></button></div>
          </div>
          <a href="/#/demo/barber/agenda" className="landing-product-stage" aria-label="Experimentar a agenda do AgendiX"><div className="landing-frame-bar"><span>AgendiX / Agenda</span><span>Barbearia Corte Fino · Simulação</span><ArrowRight size={18} aria-hidden="true" /></div><picture><source media="(max-width: 640px)" srcSet="/landing/hero-agenda-mobile.webp" /><img src="/landing/hero-agenda-1440.webp" width="1440" height="790" fetchPriority="high" alt="Agenda do AgendiX: atendimentos e profissionais da Barbearia Corte Fino, em uma simulação com dados fictícios" /></picture></a>
        </div>
      </section>
      <section id="historia" className="landing-story">
        <div className="landing-wrap wrap landing-story-grid">
          <div className="landing-story-copy"><h2>Gestão feita para<br />quem vive o balcão.</h2><p>O atendimento tem nome, conversa e confiança. A gestão precisa acompanhar esse cuidado.</p><p>O AgendiX é o produto do Rhian Lepore. Entre as barbearias que usam está a Moderna, do Tales. É nesse contato com quem vive o balcão que o produto encontra seu lugar.</p><button className="landing-text-link" onClick={() => scrollTo('produto')}>Veja como o AgendiX ajuda <ArrowRight size={18} aria-hidden="true" /></button></div>
          <figure className="landing-story-photo"><img src="/landing/barber-800.webp" srcSet="/landing/barber-800.webp 800w, /landing/barber-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 55vw" width="1600" height="1067" loading="lazy" alt="Barbeiro fazendo a barba de um cliente; fotografia ilustrativa de banco" /></figure>
        </div>
      </section>
      <section id="demonstracao" className="landing-demo-section">
        <div className="landing-wrap wrap">
          <div className="landing-section-head"><h2>Explore o AgendiX<br />no seu ritmo.</h2><div><p>Escolha o seu negócio e explore o produto de verdade. Sem cadastro, com dados fictícios.</p><div className="landing-tabs" role="group" aria-label="Negócio da demonstração"><button aria-pressed={niche === 'barber'} onClick={() => setNiche('barber')}>Barbearia</button><button aria-pressed={niche === 'beauty'} onClick={() => setNiche('beauty')}>Salão</button></div></div></div>
          <div className="landing-demo-frame">
            {interactive ? <iframe key={niche} title={`Simulação interativa ${niche === 'barber' ? 'da barbearia' : 'do salão'}`} src={`/#/demo/${niche}/agenda`} loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms" /> : <div className="landing-demo-poster"><picture><source media="(max-width: 640px)" srcSet={`/landing/${niche === 'barber' ? 'agenda' : 'beauty'}-mobile.webp`} /><img src={`/landing/${niche === 'barber' ? 'agenda' : 'beauty'}-1440.webp`} alt={`Agenda real do ${niche === 'barber' ? 'Barbearia Corte Fino' : 'Studio Aurora'} com dados fictícios`} loading="lazy" width="1440" height="790" /></picture><button className="landing-button" onClick={() => setInteractive(true)}>Explorar a simulação <ArrowRight size={18} aria-hidden="true" /></button></div>}
          </div>
          <div className="landing-demo-foot"><span>Simulação · alterações apenas neste navegador</span><a className="landing-text-link" href={`/#/demo/${niche}/agenda`}>Abrir em tela cheia <ArrowRight size={17} aria-hidden="true" /></a></div>
        </div>
      </section>
      <section id="produto" className="landing-features">
        <div className="landing-wrap wrap">
          <h2>Do primeiro horário<br />ao fechamento do caixa.</h2>
          {features.map((feature, index) => <article className={`landing-feature feature-${index}`} key={feature.title}><div className="landing-feature-copy"><h3>{feature.title}</h3><p>{feature.text}</p><a className="landing-text-link" href={`/#/demo/barber/${feature.route}`}>Explorar {index === 0 ? 'a agenda' : index === 1 ? 'o agendamento' : 'o financeiro'} <ArrowRight size={18} aria-hidden="true" /></a></div><div className="landing-feature-shot"><picture><source media="(max-width: 760px)" srcSet={`/landing/${feature.image}-mobile.webp`} /><img src={`/landing/${feature.image}-1440.webp`} alt={feature.alt} loading="lazy" width="1440" height="790" /></picture></div></article>)}
          <div className="landing-team"><img src="/landing/craft-800.webp" srcSet="/landing/craft-800.webp 800w, /landing/craft-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 45vw" loading="lazy" width="800" height="1000" alt="Profissional trabalhando no cabelo de uma cliente, em fotografia de banco" /><div><h3>Tempo, equipe<br />e trabalho valorizados.</h3><p>Acompanhe as comissões de cada profissional e o faturamento por hora de cadeira. Para quem chega sem marcar, organize a fila em uma tela própria.</p></div><div className="landing-team-operation"><div className="landing-operation-tabs" role="group" aria-label="Gestão da equipe"><button aria-pressed={operation === 'performance'} onClick={() => setOperation('performance')}>Hora de cadeira</button><button aria-pressed={operation === 'team'} onClick={() => setOperation('team')}>Equipe</button><button aria-pressed={operation === 'queue'} onClick={() => setOperation('queue')}>Fila</button></div><a className="landing-team-proof" href={`/#/demo/barber/${operation === 'performance' ? 'financeiro/performance' : operation === 'team' ? 'configuracoes/equipe' : 'fila'}`}><picture><source media="(max-width: 760px)" srcSet={`/landing/${operation}-mobile.webp`} /><img src={`/landing/${operation}-1440.webp`} width={operation === 'performance' ? 1142 : 1320} height={operation === 'performance' ? 524 : 682} loading="lazy" alt={`Tela real de ${operation === 'performance' ? 'hora de cadeira' : operation === 'team' ? 'equipe e comissões' : 'fila de espera'} do AgendiX, com dados fictícios`} /></picture></a></div></div>
        </div>
      </section>
      <section className="landing-close"><div className="landing-wrap wrap"><h2>O próximo capítulo<br />do seu negócio.</h2><div><p>Você já cuida do que faz bem.<br />Comece o período de teste e organize o resto.</p><a className="landing-button landing-button-light" href="/#/register">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a></div></div></section>
      <section className="landing-faq"><div className="landing-wrap wrap landing-faq-grid"><h2>O que você<br />quer saber.</h2><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-wrap wrap"><div className="landing-footer-top"><a className="landing-wordmark" href="/">AgendiX</a><p>Seu ofício merece uma boa gestão.</p><a href={buildWhatsAppLink('+351 927 688 674', 'PT')} target="_blank" rel="noopener noreferrer">Suporte no WhatsApp <ArrowRight size={16} aria-hidden="true" /></a></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} AgendiX</span><a href="/#/termos">Termos de uso</a><a href="/#/privacidade">Privacidade</a><span>Fotografias de banco: <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a></span></div></div></footer>
    <div className={`landing-mobile-cta${sticky ? ' is-visible' : ''}`}><a className="landing-button" href="/#/register">Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" /></a></div>
  </div>;
};
