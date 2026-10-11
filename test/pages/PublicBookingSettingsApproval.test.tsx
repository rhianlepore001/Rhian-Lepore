import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state: {
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
} = { profile: null, settings: null };
const updateSettings = vi.fn().mockResolvedValue({});
const updateProfile = vi.fn().mockResolvedValue({});
const updateApproval = vi.fn().mockResolvedValue('saved');
const showToast = vi.fn();

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings }),
  useUpdateBusinessSettings: () => ({ mutateAsync: updateSettings }),
  useProfileFields: () => ({ data: state.profile }),
  useUpdateProfileFields: () => ({ mutateAsync: updateProfile }),
  useUpdateOnlineBookingRequiresApproval: () => ({ mutateAsync: updateApproval }),
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
  useToast: () => ({ showToast }),
}));
vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));
vi.mock('../../components/SettingsSwitch', () => ({
  SettingsSwitch: ({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) => (
    <input type="checkbox" aria-label={ariaLabel} checked={checked} onChange={(e) => onChange(e.target.checked)} />
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

const toggle = () => screen.getByRole('checkbox', { name: 'Aprovar agendamentos online' });
const save = () => fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

describe('PublicBookingSettings — Aprovar agendamentos online', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.profile = { business_slug: 'corte-fino', business_name: 'Corte Fino', public_booking_enabled: true, booking_lead_time_hours: 2 };
    state.settings = { client_cancel_cutoff_hours: 2, cancellation_policy: 'flexible' };
  });

  it('sem a coluna (linha antiga) aparece ligado: manual é o padrão', () => {
    render(<PublicBookingSettings />);
    expect(toggle()).toBeChecked();
    expect(screen.getByTestId('online-booking-approval-row')).toHaveTextContent('Desligado: o horário é confirmado na hora');
    expect(screen.queryByTestId('online-booking-approval-pending-note')).toBeNull();
  });

  it('salvar sem mexer não grava a opção', async () => {
    render(<PublicBookingSettings />);
    save();
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateApproval).not.toHaveBeenCalled();
  });

  it('desligar mostra o aviso dos pedidos pendentes e salva false', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(toggle());
    expect(toggle()).not.toBeChecked();
    expect(screen.getByTestId('online-booking-approval-pending-note'))
      .toHaveTextContent('Pedidos que já chegaram continuam esperando sua resposta.');
    save();
    await waitFor(() => expect(updateApproval).toHaveBeenCalledWith(false));
    expect(updateSettings).toHaveBeenCalledWith(expect.not.objectContaining({ online_booking_requires_approval: expect.anything() }));
  });

  it('já desligado: carrega desligado e religar salva true', async () => {
    state.settings = { ...state.settings, online_booking_requires_approval: false };
    render(<PublicBookingSettings />);
    expect(toggle()).not.toBeChecked();
    expect(screen.queryByTestId('online-booking-approval-pending-note')).toBeNull();
    fireEvent.click(toggle());
    save();
    await waitFor(() => expect(updateApproval).toHaveBeenCalledWith(true));
  });

  it('banco sem a migration: volta para ligado e avisa, sem erro', async () => {
    updateApproval.mockResolvedValueOnce('unsupported');
    render(<PublicBookingSettings />);
    fireEvent.click(toggle());
    save();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/continua precisando de aprovação/), 'info'));
    expect(toggle()).toBeChecked();
    expect(showToast).not.toHaveBeenCalledWith('Erro ao salvar configurações.', 'error');
  });
});
