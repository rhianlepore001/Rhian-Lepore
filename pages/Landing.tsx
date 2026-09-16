import React, { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRIAL_DAYS } from '../constants';
import {
  LANDING,
  LOGIN_PATH,
  PRICING,
  type PricingCurrency,
  registerPath,
} from './landingContent';
import './landing.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62,700;0,62,800;0,100,400;0,100,600;0,100,700&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';

function useLandingFonts(): void {
  useEffect(() => {
    const id = 'ax-lp-fonts';
    if (document.getElementById(id)) return;
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.gstatic.com';
    preconnect.crossOrigin = 'anonymous';
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.append(preconnect, link);
  }, []);
}

function useLandingChrome(): void {
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-lp', 'marketing');
    const previousTheme = html.getAttribute('data-theme');
    const previousMode = html.getAttribute('data-mode');
    html.removeAttribute('data-theme');
    html.removeAttribute('data-mode');
    const theme = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = theme?.getAttribute('content') ?? '';
    theme?.setAttribute('content', '#E9E4D8');
    return () => {
      html.removeAttribute('data-lp');
      if (previousTheme) html.setAttribute('data-theme', previousTheme);
      else html.removeAttribute('data-theme');
      if (previousMode) html.setAttribute('data-mode', previousMode);
      else html.removeAttribute('data-mode');
      if (theme && previousThemeColor) theme.setAttribute('content', previousThemeColor);
    };
  }, []);
}

function useSeo(): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = LANDING.title;
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', LANDING.description);
    setMeta('meta[property="og:title"]', 'content', LANDING.title);
    setMeta('meta[property="og:description"]', 'content', LANDING.description);
    setMeta('meta[property="og:url"]', 'content', 'https://www.agendixstudio.com/');
    return () => {
      document.title = previousTitle;
    };
  }, []);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type LandingShot = (typeof LANDING.shots)[number];

function ShotFigure({
  shot,
  index,
  eager = false,
  compact = false,
}: {
  shot: LandingShot;
  index: number;
  eager?: boolean;
  compact?: boolean;
}): React.ReactElement {
  return (
    <figure className={`ax-lp-shot${index === 1 ? ' ax-lp-shot-shift' : ''}`}>
      <div className="ax-lp-shot-frame">
        <span className="ax-lp-staple" aria-hidden="true" />
        <img
          src={shot.src}
          alt={shot.alt}
          width={720}
          height={780}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager && index === 0 ? 'high' : 'auto'}
        />
      </div>
      <figcaption>
        <span className="ax-lp-shot-copy">{compact ? shot.heroLabel : shot.caption}</span>
        {compact ? null : (
          <a href={shot.href} rel="noreferrer noopener" target="_blank">{shot.hrefLabel}</a>
        )}
      </figcaption>
    </figure>
  );
}

export const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<PricingCurrency>('BRL');
  const [stickyAway, setStickyAway] = useState(true);
  const menuId = useId();

  useLandingFonts();
  useLandingChrome();
  useSeo();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const hideIds = ['preco', 'trial', 'comecar'];
    const hideNodes = hideIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const hero = document.querySelector('.ax-lp-hero');
    const visible = new Set<string>();
    const sync = () => {
      const heroCovering = visible.has('hero');
      const sectionCovering = hideIds.some((id) => visible.has(id));
      setStickyAway(heroCovering || sectionCovering);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.id || (entry.target.classList.contains('ax-lp-hero') ? 'hero' : '');
          if (!key) return;
          if (entry.isIntersecting) visible.add(key);
          else visible.delete(key);
        });
        sync();
      },
      { threshold: 0.12, rootMargin: '0px 0px -18% 0px' },
    );
    hideNodes.forEach((node) => observer.observe(node));
    if (hero) {
      visible.add('hero');
      observer.observe(hero);
    }
    sync();
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    const node = document.getElementById(id);
    node?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const prices = PRICING[currency];

  return (
    <div className="ax-lp" data-testid="marketing-landing">
      <button type="button" className="ax-lp-skip" onClick={() => scrollTo('conteudo')}>
        Pular para o conteúdo
      </button>

      <header className="ax-lp-nav">
        <button type="button" className="ax-lp-brand" onClick={() => scrollTo('conteudo')}>
          <img src="/logo-agendix-light.png" alt="" width={32} height={32} />
          <span>AgendiX</span>
        </button>

        <nav className="ax-lp-nav-links" aria-label="Seções">
          <button type="button" onClick={() => scrollTo('beneficios')}>Benefícios</button>
          <button type="button" onClick={() => scrollTo('como-funciona')}>Como funciona</button>
          <button type="button" onClick={() => scrollTo('preco')}>Preço</button>
          <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          <Link to={LOGIN_PATH}>{LANDING.ctaLogin}</Link>
        </nav>

        <Link className="ax-lp-btn ax-lp-btn-ink ax-lp-nav-cta" to={registerPath()}>
          {LANDING.ctaTrial}
        </Link>

        <button
          type="button"
          className="ax-lp-burger"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div id={menuId} className={`ax-lp-menu${menuOpen ? ' is-open' : ''}`}>
        <button type="button" onClick={() => scrollTo('beneficios')}>Benefícios</button>
        <button type="button" onClick={() => scrollTo('como-funciona')}>Como funciona</button>
        <button type="button" onClick={() => scrollTo('preco')}>Preço</button>
        <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
        <Link to={LOGIN_PATH} onClick={() => setMenuOpen(false)}>{LANDING.ctaLogin}</Link>
        <Link className="ax-lp-btn ax-lp-btn-ink" to={registerPath()} onClick={() => setMenuOpen(false)}>
          {LANDING.ctaTrial}
        </Link>
      </div>

      <main id="conteudo">
        <section className="ax-lp-hero">
          <svg className="ax-lp-crease" viewBox="0 0 1200 420" aria-hidden="true" focusable="false">
            <path d="M-20 310 C 220 40, 520 40, 1180 280" />
          </svg>
          <div className="ax-lp-wrap ax-lp-hero-grid">
            <div>
              <h1>
                {LANDING.h1[0]}
                {' '}
                <br />
                {LANDING.h1[1]}
              </h1>
              <p className="ax-lp-lede">{LANDING.sub}</p>
              <div className="ax-lp-actions">
                <Link className="ax-lp-btn ax-lp-btn-ink" to={registerPath()}>
                  {LANDING.ctaTrial}
                </Link>
                <button type="button" className="ax-lp-btn ax-lp-btn-ghost" onClick={() => scrollTo('como-funciona')}>
                  {LANDING.ctaHow}
                </button>
              </div>
            </div>

            <div className="ax-lp-hero-proof">
              {LANDING.shots.map((shot, index) => (
                <ShotFigure key={`hero-${shot.src}`} shot={shot} index={index} eager compact />
              ))}
            </div>
          </div>
        </section>

        <section className="ax-lp-facts" aria-label="O que o produto entrega">
          <ul className="ax-lp-wrap">
            {LANDING.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>

        <section className="ax-lp-section ax-lp-problem" id="problema">
          <div className="ax-lp-wrap ax-lp-split">
            <h2>{LANDING.problemLead}</h2>
            <div>
              <p className="ax-lp-copy">{LANDING.problemBody}</p>
              <p className="ax-lp-copy">{LANDING.promise}</p>
            </div>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-benefits" id="beneficios">
          <div className="ax-lp-wrap">
            <h2>Como a agenda cresce</h2>
            <div className="ax-lp-pillars">
              {LANDING.pillars.map((pillar) => (
                <article className="ax-lp-pillar" key={pillar.title}>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.body}</p>
                  <ul>
                    {pillar.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-product" id="produto">
          <div className="ax-lp-wrap">
            <h2>{LANDING.productIntro}</h2>
            <div className="ax-lp-product-grid">
              {LANDING.shots.map((shot, index) => (
                <ShotFigure key={shot.src} shot={shot} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="ax-lp-section" id="comparar">
          <div className="ax-lp-wrap">
            <h2>Três jeitos de tocar a casa</h2>
            <div className="ax-lp-compare">
              <article>
                <h3>{LANDING.vsOld.title}</h3>
                <ul>
                  {LANDING.vsOld.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
              <article>
                <h3>{LANDING.vsErp.title}</h3>
                <ul>
                  {LANDING.vsErp.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
              <article className="ax-lp-compare-us">
                <h3>{LANDING.vsUs.title}</h3>
                <ul>
                  {LANDING.vsUs.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-steps" id="como-funciona">
          <div className="ax-lp-wrap">
            <h2>Três passos até o cliente marcar</h2>
            <ol>
              {LANDING.steps.map((step, index) => (
                <li key={step.title}>
                  <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-trial" id="trial">
          <div className="ax-lp-wrap">
            <h2>{LANDING.trialLead}</h2>
            <ul className="ax-lp-includes">
              {LANDING.trialIncludes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="ax-lp-note">{LANDING.trialNote}</p>
            <div className="ax-lp-actions ax-lp-actions-late">
              <Link className="ax-lp-btn ax-lp-btn-ink" to={registerPath()}>
                {LANDING.ctaTrial}
              </Link>
            </div>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-pricing" id="preco">
          <div className="ax-lp-wrap">
            <h2>{LANDING.pricingLead}</h2>
            <div className="ax-lp-currency" role="group" aria-label="Moeda">
              <button type="button" aria-pressed={currency === 'BRL'} onClick={() => setCurrency('BRL')}>
                Brasil · R$
              </button>
              <button type="button" aria-pressed={currency === 'EUR'} onClick={() => setCurrency('EUR')}>
                Portugal · €
              </button>
            </div>
            <div className="ax-lp-plans">
              {LANDING.plans.map((plan) => (
                <article className={`ax-lp-plan${plan.id === 'team' ? ' ax-lp-plan-team' : ''}`} key={plan.id}>
                  <h3>{plan.name}</h3>
                  <p className="ax-lp-price">
                    {plan.id === 'solo' ? prices.solo : prices.team}
                    <span>/mês</span>
                  </p>
                  <p className="ax-lp-who">{plan.who}</p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="ax-lp-actions ax-lp-actions-late">
                    <Link className="ax-lp-btn ax-lp-btn-ink ax-lp-btn-full" to={registerPath()}>
                      {LANDING.ctaTrial}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ax-lp-section ax-lp-faq" id="faq">
          <div className="ax-lp-wrap">
            <h2>Perguntas que o dono faz</h2>
            {LANDING.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ax-lp-section ax-lp-close" id="comecar">
          <div className="ax-lp-wrap">
            <h2>{LANDING.closeLead}</h2>
            <div className="ax-lp-actions">
              <Link className="ax-lp-btn ax-lp-btn-ink" to={registerPath()}>
                {LANDING.ctaTrial}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="ax-lp-wrap ax-lp-foot">
        <p>{LANDING.footerNote}</p>
        <nav aria-label="Legal">
          <Link to={LOGIN_PATH}>Entrar</Link>
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
        </nav>
      </footer>

      <Link
        className={`ax-lp-btn ax-lp-btn-ink ax-lp-sticky ax-lp-btn-full${stickyAway || menuOpen ? ' is-away' : ''}`}
        to={registerPath()}
        tabIndex={stickyAway || menuOpen ? -1 : undefined}
      >
        {LANDING.ctaTrial}
      </Link>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AgendiX',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: LANDING.description,
            offers: [
              { '@type': 'Offer', name: 'Solo', price: '34.90', priceCurrency: 'BRL' },
              { '@type': 'Offer', name: 'Equipe', price: '59.90', priceCurrency: 'BRL' },
              { '@type': 'Offer', name: 'Solo', price: '9.90', priceCurrency: 'EUR' },
              { '@type': 'Offer', name: 'Equipe', price: '19.90', priceCurrency: 'EUR' },
            ],
            additionalProperty: {
              '@type': 'PropertyValue',
              name: 'trialDays',
              value: TRIAL_DAYS,
            },
          }),
        }}
      />
    </div>
  );
};

export default Landing;
