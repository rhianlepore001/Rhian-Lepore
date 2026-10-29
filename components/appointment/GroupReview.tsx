import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export interface GroupReviewRow {
  key: string;
  name: string;
  services: string;
  professional: string;
  time: string;
  price: number;
}

interface Props {
  rows: GroupReviewRow[];
  currencyRegion: 'BR' | 'PT';
  accentColor: string;
}

export const GroupReview: React.FC<Props> = ({ rows, currencyRegion, accentColor }) => (
  <ul data-testid="group-review" aria-label="Pessoas e atendimentos" className="mb-4 space-y-2">
    {rows.map(row => (
      <li key={row.key} data-testid="group-review-person" className="p-3 rounded-xl border border-[var(--color-divider)] bg-theme-card text-theme-text">
        <div className="flex justify-between gap-3">
          <span className="font-bold">{row.name}</span>
          <span className={`font-mono font-bold ${accentColor}`}>{formatCurrency(row.price, currencyRegion)}</span>
        </div>
        <p className="text-sm text-theme-textSecondary mt-0.5">{row.services}</p>
        <p className="text-xs text-theme-textSecondary mt-0.5">{row.professional} · {row.time}</p>
      </li>
    ))}
  </ul>
);
