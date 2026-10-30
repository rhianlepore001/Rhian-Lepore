import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const db = vi.hoisted(() => ({ row: null as null | Record<string, unknown>, upserts: [] as unknown[] }));

vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: {},
    colors: { inputBg: '', border: '', text: '', textMuted: '', textSecondary: '' },
    classes: { input: 'input' },
  }),
}));
vi.mock('../../utils/Logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('../../lib/supabase', () => {
  const table = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: db.row, error: null }),
      single: () => Promise.resolve({ data: db.row, error: null }),
      upsert: (payload: Record<string, unknown>) => {
        db.upserts.push(payload);
        db.row = { id: '00000000-0000-4000-8000-000000000001', onboarding_completed: false, onboarding_step: 3, ...(db.row ?? {}), ...payload };
        return chain;
      },
      then: (resolve: (v: unknown) => void) => resolve({ data: db.row, error: null }),
    };
    return chain;
  };
  return { supabase: { from: table, rpc: () => Promise.resolve({ error: null }) } };
});

import { StepBusinessHours } from '../../components/onboarding/StepBusinessHours';
import { useBusinessSettings } from '../../hooks/useSettings';

const OWNER = '11111111-1111-4111-8111-111111111111';
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: OWNER }, companyId: OWNER }),
}));

const Probe: React.FC = () => {
  const { data, isSuccess } = useBusinessSettings();
  const mon = (data?.business_hours as any)?.mon;
  return <output data-testid="probe">{isSuccess ? JSON.stringify(mon?.blocks ?? 'sem-horario') : 'carregando'}</output>;
};

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Horários: assistente e Ajustes usam a mesma fonte e o mesmo cache', () => {
  beforeEach(() => {
    db.row = null;
    db.upserts = [];
  });

  it('depois de continuar no assistente, os horários salvos aparecem em Ajustes sem recarregar a página', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
        <StepBusinessHours onNext={vi.fn()} onBack={vi.fn()} accentColor="x" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('sem-horario'));

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(db.upserts).toHaveLength(1));
    expect((db.upserts[0] as any).business_hours.mon.blocks).toEqual([
      { start: '09:00', end: '12:30' },
      { start: '13:30', end: '21:00' },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('"start":"09:00","end":"12:30"'),
    );
  });

  it('ao voltar ao passo, mostra os horários já salvos em vez de recomeçar do padrão', async () => {
    db.row = {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: OWNER,
      business_hours: {
        mon: { isOpen: true, blocks: [{ start: '10:00', end: '16:00' }] },
        sun: { isOpen: false, blocks: [] },
      },
    };
    render(
      <QueryClientProvider client={makeClient()}>
        <StepBusinessHours onNext={vi.fn()} onBack={vi.fn()} accentColor="x" />
      </QueryClientProvider>,
    );
    const hour = (await screen.findByLabelText('Segunda-feira, bloco 1, início (hora)')) as HTMLSelectElement;
    await waitFor(() => expect(hour.value).toBe('10'));
    expect((screen.getByLabelText('Segunda-feira, bloco 1, fim (hora)') as HTMLSelectElement).value).toBe('16');
  });
});
