import React from 'react';
import type { LandingNiche } from '../../hooks/useNiche';
import { NicheTrail } from './NicheTrail';

interface NicheTrailBeautyProps {
  active: boolean;
  onCtaClick: (position: 'trail' | 'final') => void;
}

export const NicheTrailBeauty: React.FC<NicheTrailBeautyProps> = ({ active, onCtaClick }) => (
  <NicheTrail niche={'beauty' satisfies LandingNiche} active={active} onCtaClick={onCtaClick} />
);
