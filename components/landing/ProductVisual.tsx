import React from 'react';
import { Check, Clock3, CreditCard, ListChecks, PackageCheck, UsersRound } from 'lucide-react';
import type { LandingNiche } from '../../hooks/useNiche';
import type { VisualKind } from './content';

interface ProductVisualProps {
  niche: LandingNiche;
  visual: VisualKind;
  label: string;
}

const VISUAL_META: Record<VisualKind, { eyebrow: string; title: string; icon: React.ElementType }> = {
  agenda: { eyebrow: 'AGENDA', title: 'Hoje, sem ruído', icon: Clock3 },
  money: { eyebrow: 'FINANCEIRO', title: 'Fechamento claro', icon: CreditCard },
  membership: { eyebrow: 'CLUBE', title: 'Recorrência no fluxo', icon: Check },
  team: { eyebrow: 'EQUIPE', title: 'Todos no mesmo ritmo', icon: UsersRound },
  booking: { eyebrow: 'LINK PÚBLICO', title: 'Agendamento simples', icon: ListChecks },
  packages: { eyebrow: 'CATÁLOGO', title: 'Tudo organizado', icon: PackageCheck },
};

export const ProductVisual: React.FC<ProductVisualProps> = ({ niche, visual, label }) => {
  const meta = VISUAL_META[visual];
  const Icon = meta.icon;

  return (
    <div className={`landing-product-visual landing-product-visual--${niche}`} aria-label={label}>
      <div className="landing-product-topbar">
        <span className="landing-product-brand">AGENDIX / {meta.eyebrow}</span>
        <span className="landing-product-status"><span aria-hidden="true" /> AO VIVO</span>
      </div>
      <div className="landing-product-body">
        <div className="landing-product-heading">
          <div className="landing-product-icon"><Icon size={18} aria-hidden="true" /></div>
          <div>
            <p>{meta.eyebrow}</p>
            <h4>{meta.title}</h4>
          </div>
        </div>
        <div className="landing-product-chart" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <div className="landing-product-row-list" aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
      <div className="landing-product-label">{label}</div>
    </div>
  );
};
