import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingNiche } from '../../hooks/useNiche';
import { getRegisterPath } from './content';

interface StickyCtaProps {
  niche: LandingNiche | null;
  onClick: () => void;
}

export const StickyCta: React.FC<StickyCtaProps> = ({ niche, onClick }) => (
  <div className="landing-sticky-cta" data-testid="landing-sticky-cta">
    <span>20 dias para testar de verdade.</span>
    <Link to={getRegisterPath(niche)} onClick={onClick} className="landing-button landing-button--primary">
      Começar <ArrowRight size={16} aria-hidden="true" />
    </Link>
  </div>
);
