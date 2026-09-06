import React from 'react';
import type { LandingNiche } from '../../hooks/useNiche';
import { NicheTrail } from './NicheTrail';

interface NicheTrailBarberProps {
  active: boolean;
  onCtaClick: (position: 'trail' | 'final') => void;
}

export const NicheTrailBarber: React.FC<NicheTrailBarberProps> = ({ active, onCtaClick }) => (
  <NicheTrail niche={'barber' satisfies LandingNiche} active={active} onCtaClick={onCtaClick} />
);
