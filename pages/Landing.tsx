import React, { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRIAL_DAYS } from '../constants';
import { applyPublicAuthTheme } from '../utils/publicAuthTheme';
import {
  LANDING,
  LOGIN_PATH,
  PRICING,
  type PricingCurrency,
  registerPath,
} from './landingContent';
import './landing.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap';

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

export const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<PricingCurrency>('BRL');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [stickyAway, setStickyAway] = useState(false);
  const menuId = useId();

  useLandingFonts();
  useSeo();

  useEffect(() => {
    applyPublicAuthTheme();
    setReduceMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const close = document.getElementById('comecar');
    if (!close || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyAway(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(close);
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
          <img src="/logo-agendix-icon.png" alt="" width={32} height={32} />
          <span>AgendiX</span>
        </button>

        <nav className="ax-lp-nav-links" aria-label="Seções">
          <button type="button" onClick={() => scrollTo('beneficios')}>Benefícios</button>
          <button type="button" onClick={() => scrollTo('como-funciona')}>Como funciona</button>
          <button type="button" onClick={() => scrollTo('preco')}>Preço</button>
          <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          <Link to={LOGIN_PATH}>{LANDING.ctaLogin}</Link>
        </nav>

        <Link className="ax-lp-btn ax-lp-btn-gold ax-lp-nav-cta" to={registerPath()}>
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
        <Link className="ax-lp-btn ax-lp-btn-gold" to={registerPath()} onClick={() => setMenuOpen(false)}>
          {LANDING.ctaTrial}
        </Link>
      </div>

      <main id="conteudo">
        <section className="ax-lp-hero">
          <div className="ax-lp-hero-media" aria-hidden="true">
            {reduceMotion ? (
              <img src="/landing/videos/loop-hero-poster.webp" alt="" />
            ) : (
              <video autoPlay muted loop playsInline poster="/landing/videos/loop-hero-poster.webp">
                <source src="/landing/videos/loop-hero-720.webm" type="video/webm" />
                <source src="/landing/videos/loop-hero-720.mp4" type="video/mp4" />
              </video>
            )}
            <div className="ax-lp-hero-wash" />
          </div>

          <div className="ax-lp-wrap ax-lp-hero-grid">
            <div>
              <h1>
                {LANDING.h1[0]}
                <br />
                <em>{LANDING.h1[1]}</em>
              </h1>
              <p className="ax-lp-lede">{LANDING.sub}</p>
              <div className="ax-lp-actions">
                <Link className="ax-lp-btn ax-lp-btn-gold" to={registerPath()}>
                  {LANDING.ctaTrial}
                </Link>
                <button type="button" className="ax-lp-btn ax-lp-btn-ghost" onClick={() => scrollTo('como-funciona')}>
                  {LANDING.ctaHow}
                </button>
              </div>
            </div>

            <figure className="ax-lp-shot ax-lp-shot-hero">
              <div className="ax-lp-shot-frame">
                <img src={LANDING.shots[0].src} alt={LANDING.shots[0].alt} width={720} height={780} />
              </div>
              <figcaption>
                {LANDING.shots[0].caption}
                <br />
                <a href={LANDING.shots[0].href} rel="noreferrer noopener" target="_blank">{LANDING.shots[0].hrefLabel}</a>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="ax-lp-facts" aria-label="O que o produto entrega">
          <ul className="ax-lp-wrap">
            {LANDING.facts.map((fact, index) => (
              <li key={fact}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {fact}
              </li>
            ))}
          </ul>
        </section>

        <section className="ax-lp-section ax-lp-problem" id="problema">
          <div className="ax-lp-wrap ax-lp-split">
            <div>
              <h2>{LANDING.problemLead}</h2>
            </div>
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
              {LANDING.shots.map((shot) => (
                <figure className="ax-lp-shot" key={shot.src}>
                  <div className="ax-lp-shot-frame">
                    <img src={shot.src} alt={shot.alt} width={960} height={780} />
                    <span className="ax-lp-callout">{shot.callout}</span>
                  </div>
                  <figcaption>
                    {shot.caption}
                    <br />
                    <a href={shot.href} rel="noreferrer noopener" target="_blank">{shot.hrefLabel}</a>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="ax-lp-product-grid ax-lp-niche-row">
              {LANDING.niches.map((niche) => (
                <article className={`ax-lp-niche ax-lp-niche-${niche.id}`} key={niche.id}>
                  <div className="ax-lp-niche-media" aria-hidden="true">
                    {reduceMotion ? (
                      <img src={niche.poster} alt="" />
                    ) : (
                      <video autoPlay muted loop playsInline poster={niche.poster}>
                        <source src={niche.videoWebm} type="video/webm" />
                        <source src={niche.videoMp4} type="video/mp4" />
                      </video>
                    )}
                  </div>
                  <div className="ax-lp-niche-body">
                    <h3>{niche.title}</h3>
                    <p>{niche.body}</p>
                    <div className="ax-lp-actions">
                      <Link className="ax-lp-btn ax-lp-btn-gold" to={registerPath(niche.id)}>
                        Testar {TRIAL_DAYS} dias
                      </Link>
                    </div>
                  </div>
                </article>
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
              <Link className="ax-lp-btn ax-lp-btn-gold" to={registerPath()}>
                {LANDING.ctaTrial}
              </Link>
            </div>
          </div>
        </section>

        <section className="ax-lp-section" id="preco">
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
              <Link className="ax-lp-btn ax-lp-btn-gold" to={registerPath('barber')}>
                Testar como barbearia
              </Link>
              <Link className="ax-lp-btn ax-lp-btn-ghost" to={registerPath('beauty')}>
                Testar como salão
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
        className={`ax-lp-btn ax-lp-btn-gold ax-lp-sticky ax-lp-btn-full${stickyAway || menuOpen ? ' is-away' : ''}`}
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
