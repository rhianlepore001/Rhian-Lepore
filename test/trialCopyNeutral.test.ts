import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// O prazo do período de teste é decidido no banco (promoções); a copy não cita dias.
const FILES = ['pages/Login.tsx', 'pages/Legal.tsx', 'components/PaywallModal.tsx', 'components/TrialStatusCard.tsx'];

describe('copy do período de teste sem prazo fixo', () => {
  it.each(FILES)('%s não usa TRIAL_DAYS nem "N dias grátis"/"teste grátis"', (f) => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
    expect(src).not.toMatch(/TRIAL_DAYS/);
    expect(src).not.toMatch(/\d+\s*dias\s*(grátis|de teste|de período)/i);
    expect(src).not.toMatch(/teste grátis/i);
  });
  it('Login convida com "Crie sua conta grátis"', () => {
    expect(fs.readFileSync(path.resolve(__dirname, '../pages/Login.tsx'), 'utf8')).toContain('Crie sua conta grátis');
  });
});
