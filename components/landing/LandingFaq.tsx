import React from 'react';
import { Plus } from 'lucide-react';
import type { LandingNiche } from '../../hooks/useNiche';
import { FAQ_CONTENT, TRAIL_CONTENT } from './content';

interface LandingFaqProps {
  activeNiche: LandingNiche | null;
}

export const LandingFaq: React.FC<LandingFaqProps> = ({ activeNiche }) => (
  <section id="faq" className="landing-faq landing-container" aria-labelledby="landing-faq-title">
    <div className="landing-section-rail"><span>07</span><span>SEM LETRA MIÚDA</span></div>
    <div className="landing-faq-layout">
      <div>
        <p className="landing-eyebrow"><span /> PERGUNTAS FREQUENTES</p>
        <h2 id="landing-faq-title">Antes de começar,<br /><em>tire o peso da dúvida.</em></h2>
      </div>
      <div className="landing-faq-groups">
        {(Object.keys(FAQ_CONTENT) as LandingNiche[]).map((niche) => (
          <div className={`landing-faq-group ${activeNiche && activeNiche !== niche ? 'is-muted' : ''}`} key={niche}>
            <div className="landing-faq-group-heading"><span>{niche === 'barber' ? 'BARBEARIA' : 'SALÃO'}</span><span>{TRAIL_CONTENT[niche].publicLabel}</span></div>
            {FAQ_CONTENT[niche].map((item) => (
              <details key={item.question}>
                <summary>{item.question}<Plus size={18} aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);
