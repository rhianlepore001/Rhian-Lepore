import React from 'react';
import { ArrowUpRight, Paintbrush, Scissors } from 'lucide-react';
import type { LandingNiche } from '../../hooks/useNiche';

interface NicheGateProps {
  onSelect: (niche: LandingNiche) => void;
}

export const NicheGate: React.FC<NicheGateProps> = ({ onSelect }) => (
  <section id="niche-gate" className="landing-gate landing-container" aria-labelledby="niche-gate-title">
    <div className="landing-section-rail"><span>02</span><span>ESCOLHA SUA TRILHA</span></div>
    <div className="landing-gate-heading">
      <p className="landing-eyebrow"><span /> UMA OPERAÇÃO, DOIS RITMOS</p>
      <h2 id="niche-gate-title">Comece pelo seu<br /><em>jeito de trabalhar.</em></h2>
    </div>
    <div className="landing-gate-options">
      <button type="button" className="landing-gate-option landing-gate-option--barber" onClick={() => onSelect('barber')} data-testid="landing-select-barber">
        <span className="landing-gate-number">01</span>
        <span className="landing-gate-icon"><Scissors size={24} aria-hidden="true" /></span>
        <span className="landing-gate-copy"><strong>Tenho uma barbearia</strong><small>Ritmo de balcão, comissão e recorrência.</small></span>
        <ArrowUpRight size={22} aria-hidden="true" />
      </button>
      <button type="button" className="landing-gate-option landing-gate-option--beauty" onClick={() => onSelect('beauty')} data-testid="landing-select-beauty">
        <span className="landing-gate-number">02</span>
        <span className="landing-gate-icon"><Paintbrush size={24} aria-hidden="true" /></span>
        <span className="landing-gate-copy"><strong>Tenho um salão</strong><small>Equipe, serviços e caixa em sintonia.</small></span>
        <ArrowUpRight size={22} aria-hidden="true" />
      </button>
    </div>
  </section>
);
