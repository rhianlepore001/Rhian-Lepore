import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state: {
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
} = { profile: null, settings: null };
const updateSettings = vi.fn().mockResolvedValue({});
const updateProfile = vi.fn().mockResolvedValue({});

const updateLeadMinutes = vi.fn().mockResolvedValue('saved');
const updatePolicyText = vi.fn().mockResolvedValue('saved');

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings }),
  useUpdateBusinessSettings: () => ({ mutateAsync: updateSettings }),
  useProfileFields: () => ({ data: state.profile }),
  useUpdateProfileFields: () => ({ mutateAsync: updateProfile }),
  useUpdateOnlineBookingRequiresApproval: () => ({ mutateAsync: vi.fn().mockResolvedValue('saved') }),
  useUpdateBookingLeadTimeMinutes: () => ({ mutateAsync: updateLeadMinutes }),
  useUpdateClientCancelPolicyText: () => ({ mutateAsync: updatePolicyText }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, companyId: 'owner-1' }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

vi.mock('../../components/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children, title, description }: { children: React.ReactNode; title?: React.ReactNode; description?: string }) => (
    <section><h2>{title}</h2>{description ? <p>{description}</p> : null}{children}</section>
  ),
}));
vi.mock('../../components/SettingsSwitch', () => ({
  SettingsSwitch: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  ),
}));
vi.mock('../../components/PublicLinkCard', () => ({ PublicLinkCard: () => <div>link</div> }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: { bgDim: '', border: '', text: '', bg: '' },
    colors: { text: '', textSecondary: '', textMuted: '', inputBg: '', border: '', divider: '' },
    classes: { label: 'label', input: 'input' },
  }),
}));

import { PublicBookingSettings } from '../../pages/settings/PublicBookingSettings';

describe('PublicBookingSettings — prazo para o cliente cancelar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.profile = {
      business_slug: 'corte-fino',
      business_name: 'Barbearia São João',
      public_booking_enabled: true,
      booking_lead_time_hours: 2,
      max_bookings_per_day: null,
    };
    state.settings = {
      enable_self_rescheduling: true,
      public_products_enabled: false,
      client_cancel_cutoff_hours: 2,
      client_cancel_note: null,
      cancellation_policy: 'flexible',
    };
  });

  it('mostra chips 1h · 2h · 6h · 12h · 24h · 48h · Não pode cancelar online, 2h marcado', () => {
    render(<PublicBookingSettings />);
    expect(screen.getByRole('heading', { name: 'Política de cancelamento' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cliente pode cancelar até' })).toBeInTheDocument();
    expect(screen.getByTestId('cancel-cutoff-preset-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cancel-cutoff-preset-1')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-cutoff-preset-6')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-cutoff-preset-12')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-cutoff-preset-24')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-cutoff-preset-48')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não pode cancelar online' })).toBeInTheDocument();
    expect(screen.getByTestId('client-cancel-policy-text')).toHaveValue(
      'Você pode cancelar até 2h antes pela Minha Área',
    );
    expect(screen.getByTestId('cancel-policy-default-badge')).toHaveTextContent('Texto padrão');
  });

  it('salvar envia o cutoff escolhido e a nota', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('cancel-cutoff-preset-12'));
    fireEvent.change(screen.getByTestId('client-cancel-note'), {
      target: { value: 'Avisar se atrasar.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      client_cancel_cutoff_hours: 12,
      client_cancel_note: 'Avisar se atrasar.',
    }));
  });

  it('Não pode cancelar online gera a frase de falar com o negócio', () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('cancel-cutoff-preset-0'));
    expect(screen.getByTestId('client-cancel-policy-text')).toHaveValue(
      'Para cancelar, fale com Barbearia São João.',
    );
  });

  it('texto padrão acompanha o prazo e salva null (usa o gerado)', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('cancel-cutoff-preset-24'));
    expect(screen.getByTestId('client-cancel-policy-text')).toHaveValue('Você pode cancelar até 24h antes pela Minha Área');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updatePolicyText).toHaveBeenCalledWith(null));
  });

  it('gestor edita o texto, salva aparado e pode restaurar o padrão', async () => {
    render(<PublicBookingSettings />);
    const field = screen.getByTestId('client-cancel-policy-text');
    expect(field).toHaveAttribute('maxLength', '300');
    fireEvent.change(field, { target: { value: '  Cancele até 1 dia antes pela Minha Área.  ' } });
    expect(screen.getByTestId('cancel-policy-restore-default')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-policy-preview')).toHaveTextContent('Cancele até 1 dia antes pela Minha Área.');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updatePolicyText).toHaveBeenCalledWith('Cancele até 1 dia antes pela Minha Área.'));

    fireEvent.click(screen.getByTestId('cancel-policy-restore-default'));
    expect(screen.getByTestId('client-cancel-policy-text')).toHaveValue('Você pode cancelar até 2h antes pela Minha Área');
    expect(screen.queryByTestId('cancel-policy-restore-default')).not.toBeInTheDocument();
  });

  it('texto salvo vem carregado como personalizado', () => {
    state.settings = { ...state.settings, client_cancel_policy_text: 'Política da casa.' };
    render(<PublicBookingSettings />);
    expect(screen.getByTestId('client-cancel-policy-text')).toHaveValue('Política da casa.');
    expect(screen.getByTestId('cancel-policy-restore-default')).toBeInTheDocument();
  });

  it('prévia mostra as observações com o prefixo "Observações:", como texto puro', () => {
    render(<PublicBookingSettings />);
    fireEvent.change(screen.getByTestId('client-cancel-note'), { target: { value: '<b>Chegue</b> 5 min antes.' } });
    const preview = screen.getByTestId('cancel-policy-preview');
    expect(preview).toHaveTextContent('Observações: <b>Chegue</b> 5 min antes.');
    expect(preview.querySelector('b')).toBeNull();
  });

  it('banco sem a coluna nova: salva o resto e não quebra', async () => {
    updatePolicyText.mockResolvedValueOnce('unsupported');
    render(<PublicBookingSettings />);
    fireEvent.change(screen.getByTestId('client-cancel-policy-text'), { target: { value: 'Outro texto.' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updatePolicyText).toHaveBeenCalled());
    expect(updateSettings).toHaveBeenCalled();
  });
});
