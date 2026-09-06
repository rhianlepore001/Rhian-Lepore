import React, { startTransition, useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SOCIAL_PROOF_ENABLED } from '../constants';
import { trackLandingEvent } from '../lib/analytics';
import { useNiche, toPublicNiche, type LandingNiche } from '../hooks/useNiche';
import { HeroIntro } from '../components/landing/HeroIntro';
import { LandingFaq } from '../components/landing/LandingFaq';
import { NicheGate } from '../components/landing/NicheGate';
import { NicheTrailBarber } from '../components/landing/NicheTrailBarber';
import { NicheTrailBeauty } from '../components/landing/NicheTrailBeauty';
import { SEOHead } from '../components/landing/SEOHead';
import { SocialProof } from '../components/landing/SocialProof';
import { StickyCta } from '../components/landing/StickyCta';
import './Landing.css';

function getUtmOrigin(searchParams: URLSearchParams): string {
  return searchParams.get('utm_source') ?? 'direto';
}

export const Landing: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { niche, method, setNicho, trocarNicho } = useNiche();
  const viewTracked = useRef(false);
  const scrollDepths = useRef<Set<number>>(new Set());
  const experiment = searchParams.get('exp') === 'flat' ? 'flat' : 'immersive';

  useEffect(() => {
    const theme = niche === 'beauty' ? 'beauty' : 'barber';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', 'dark');
  }, [niche]);

  useEffect(() => {
    if (loading || viewTracked.current) return;
    viewTracked.current = true;
    trackLandingEvent('landing_view', {
      nicho: toPublicNiche(niche),
      exp: experiment,
      origem: getUtmOrigin(searchParams),
    });
    if (niche) {
      trackLandingEvent('niche_selected', { nicho: toPublicNiche(niche), metodo: method });
    }
  }, [experiment, loading, method, niche, searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const percentage = (window.scrollY / maxScroll) * 100;
      [25, 50, 75, 100].forEach((depth) => {
        if (percentage >= depth && !scrollDepths.current.has(depth)) {
          scrollDepths.current.add(depth);
          trackLandingEvent('scroll_depth', { profundidade: depth });
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectNiche = (nextNiche: LandingNiche): void => {
    const previousNiche = niche;
    startTransition(() => {
      if (previousNiche) {
        trocarNicho(nextNiche);
      } else {
        setNicho(nextNiche);
      }
    });
    if (previousNiche && previousNiche !== nextNiche) {
      trackLandingEvent('niche_switched', { de: toPublicNiche(previousNiche), para: toPublicNiche(nextNiche) });
    } else if (!previousNiche) {
      trackLandingEvent('niche_selected', { nicho: toPublicNiche(nextNiche), metodo: 'selector' });
    }
    window.setTimeout(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      document.getElementById(`${nextNiche}-trail`)?.scrollIntoView({ behavior, block: 'start' });
    }, 0);
  };

  const handleCtaClick = (position: 'hero' | 'trail' | 'final' | 'sticky'): void => {
    trackLandingEvent('cta_click', { nicho: toPublicNiche(niche), posicao: position });
  };

  if (loading) {
    return <div className="landing-loading" aria-busy="true"><span>AGENDIX</span></div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={`landing-page landing-page--${experiment}`} data-active-niche={niche ?? 'neutral'}>
      <SEOHead niche={niche} />
      <HeroIntro niche={niche} onCtaClick={handleCtaClick} onSelectNiche={handleSelectNiche} />
      <SocialProof enabled={SOCIAL_PROOF_ENABLED} />
      {!niche && <NicheGate onSelect={handleSelectNiche} />}
      <main id="trilhas">
        <NicheTrailBarber active={niche === 'barber'} onCtaClick={handleCtaClick} />
        <NicheTrailBeauty active={niche === 'beauty'} onCtaClick={handleCtaClick} />
      </main>
      <LandingFaq activeNiche={niche} />
      <section className="landing-final-cta landing-container" aria-labelledby="landing-final-title">
        <div className="landing-final-cta-mark" aria-hidden="true">AGX</div>
        <p className="landing-eyebrow"><span /> O PRÓXIMO DIA COMEÇA HOJE</p>
        <h2 id="landing-final-title">Seu negócio merece<br /><em>um sistema à altura.</em></h2>
        <p>Comece com 20 dias para sentir o fluxo antes de decidir.</p>
        <a href="#trilhas" className="landing-button landing-button--outline" onClick={(event) => {
          event.preventDefault();
          document.getElementById('trilhas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}>Voltar às trilhas</a>
        <Link to={niche ? `/register?nicho=${toPublicNiche(niche)}` : '/register'} className="landing-button landing-button--primary" onClick={() => handleCtaClick('final')}>Testar 20 dias grátis</Link>
      </section>
      <footer className="landing-footer landing-container">
        <Link to="/" className="landing-footer-brand">AGENDIX<span> / 2026</span></Link>
        <div className="landing-footer-links">
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/login">Entrar</Link>
        </div>
        <p>Gestão para quem faz acontecer.</p>
      </footer>
      <StickyCta niche={niche} onClick={() => handleCtaClick('sticky')} />
    </div>
  );
};

export default Landing;
