import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingNiche } from '../../hooks/useNiche';
import { getRegisterPath, TRAIL_CONTENT } from './content';
import { ProductVisual } from './ProductVisual';

interface NicheTrailProps {
  niche: LandingNiche;
  active: boolean;
  onCtaClick: (position: 'trail' | 'final') => void;
}

export const NicheTrail: React.FC<NicheTrailProps> = ({ niche, active, onCtaClick }) => {
  const content = TRAIL_CONTENT[niche];

  return (
    <section
      id={`${niche}-trail`}
      className={`landing-trail landing-trail--${niche} ${active ? 'is-active' : 'is-secondary'}`}
      data-niche={content.publicLabel}
      data-testid={`landing-trail-${niche}`}
      aria-labelledby={`${niche}-trail-title`}
    >
      <div className="landing-container">
        <div className="landing-section-rail"><span>{niche === 'barber' ? '03' : '05'}</span><span>{content.eyebrow}</span></div>
        <div className="landing-trail-heading">
          <div>
            <p className="landing-eyebrow"><span /> {content.eyebrow}</p>
            <h2 id={`${niche}-trail-title`}>{content.trailTitle}</h2>
          </div>
          <p>{content.trailDescription}</p>
        </div>

        <div className="landing-pain-grid" aria-label={`Desafios de uma ${content.publicLabel}`}>
          {content.pains.map((pain, index) => {
            const Icon = pain.icon;
            return (
              <article className="landing-pain-card" key={pain.title}>
                <span className="landing-card-index">0{index + 1}</span>
                <Icon size={20} aria-hidden="true" />
                <h3>{pain.title}</h3>
                <p>{pain.description}</p>
              </article>
            );
          })}
        </div>

        <div className="landing-feature-intro">
          <p className="landing-eyebrow"><span /> O QUE MUDA NA PRÁTICA</p>
          <h3>O trabalho fica mais simples<br /><em>sem ficar menor.</em></h3>
        </div>
        <div className="landing-feature-grid">
          {content.features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="landing-feature-card" key={feature.title}>
                <ProductVisual niche={niche} visual={feature.visual} label={feature.title} />
                <div className="landing-feature-copy">
                  <div className="landing-feature-icon"><Icon size={17} aria-hidden="true" /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="landing-trail-cta">
          <div>
            <p className="landing-eyebrow"><span /> PRÓXIMO PASSO</p>
            <h3>Coloque a operação<br /><em>no seu ritmo.</em></h3>
          </div>
          <Link to={getRegisterPath(niche)} className="landing-button landing-button--trail" onClick={() => onCtaClick('trail')}>
            {content.ctaLabel} <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};
