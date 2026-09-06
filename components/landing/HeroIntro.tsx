import React from 'react';
import { ArrowRight, ChevronDown, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AgendiXLogo } from '../AgendiXLogo';
import type { LandingNiche } from '../../hooks/useNiche';
import { getRegisterPath, TRAIL_CONTENT } from './content';
import { AmbientVideo } from './AmbientVideo';

interface HeroIntroProps {
  niche: LandingNiche | null;
  onCtaClick: (position: 'hero') => void;
  onSelectNiche: (niche: LandingNiche) => void;
}

const NICHE_LABELS: Record<LandingNiche, string> = {
  barber: 'Barbearia',
  beauty: 'Salão',
};

export const HeroIntro: React.FC<HeroIntroProps> = ({ niche, onCtaClick, onSelectNiche }) => {
  const content = niche ? TRAIL_CONTENT[niche] : null;
  const videoName = niche ?? 'hero';
  const targetId = niche ? `${niche}-trail` : 'niche-gate';
  const scrollBehavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const scrollToTarget = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero-media" aria-hidden="true">
        <AmbientVideo sourceName={videoName} className="landing-hero-video" />
        <div className="landing-hero-wash" />
        <div className="landing-hero-gridline" />
      </div>

      <header className="landing-header landing-container">
        <Link to="/" className="landing-brand" aria-label="AgendiX, voltar ao início">
          <AgendiXLogo size={24} showText />
        </Link>
        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#trilhas" onClick={(event) => scrollToSection(event, 'trilhas')}>Trilhas</a>
          <a href="#faq" onClick={(event) => scrollToSection(event, 'faq')}>Perguntas</a>
          <Link to="/login" className="landing-login-link"><LogIn size={15} aria-hidden="true" /> Entrar</Link>
        </nav>
        <div className="landing-header-switcher" role="group" aria-label="Escolher tipo de negócio">
          {(Object.keys(NICHE_LABELS) as LandingNiche[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className={niche === kind ? 'is-active' : ''}
              aria-pressed={niche === kind}
              onClick={() => onSelectNiche(kind)}
            >
              {NICHE_LABELS[kind]}
            </button>
          ))}
        </div>
      </header>

      <div className="landing-container landing-hero-content">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> {content?.eyebrow ?? 'AGENDIX / GESTÃO PARA QUEM FAZ ACONTECER'}</p>
          <h1 id="landing-hero-title">
            {content?.headline ?? <>Mais tempo atendendo.<br /><em>Menos tempo</em> operando.</>}
          </h1>
          <p className="landing-hero-description">
            {content?.description ?? 'Agenda, equipe, fila e caixa em um fluxo que acompanha o seu negócio — não o contrário.'}
          </p>
          <div className="landing-hero-actions">
            <Link to={getRegisterPath(niche)} className="landing-button landing-button--primary" onClick={() => onCtaClick('hero')}>
              {content?.ctaLabel ?? 'Testar por 20 dias'} <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href={`#${targetId}`} className="landing-text-link" onClick={scrollToTarget}>Ver como funciona <ChevronDown size={16} aria-hidden="true" /></a>
          </div>
          <ul className="landing-trust-list" aria-label="Condições do teste">
            <li><span aria-hidden="true">01</span> 20 dias de teste real</li>
            <li><span aria-hidden="true">02</span> Sem cartão para começar</li>
            <li><span aria-hidden="true">03</span> Suporte em português</li>
          </ul>
        </div>

        <div className="landing-hero-ledger" aria-label="O que o AgendiX organiza">
          <div className="landing-ledger-caption"><span>AGENDIX / 2026</span><span>OPERAÇÃO EM FOCO</span></div>
          <div className="landing-ledger-main">
            <p className="landing-ledger-kicker">Uma visão do seu dia</p>
            <div className="landing-ledger-line"><span>Agenda</span><strong>Clareza</strong><i /></div>
            <div className="landing-ledger-line"><span>Equipe</span><strong>Sincronia</strong><i /></div>
            <div className="landing-ledger-line"><span>Caixa</span><strong>Controle</strong><i /></div>
          </div>
          <div className="landing-ledger-foot"><span>01 — 03</span><span>SCROLL PARA EXPLORAR</span></div>
        </div>
      </div>
      <div className="landing-hero-index" aria-hidden="true">01 / 07</div>
    </section>
  );
};
