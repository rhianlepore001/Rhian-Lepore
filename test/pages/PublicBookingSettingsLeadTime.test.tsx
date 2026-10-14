import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state: { profile: Record<string, unknown> | null } = { profile: null };
const updateSettings = vi.fn().mockResolvedValue({});
const updateProfile = vi.fn().mockResolvedValue({});

const updateLeadMinutes = vi.fn().mockResolvedValue('saved');
const updatePolicyText = vi.fn().mockResolvedValue('saved');

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: { enable_self_rescheduling: true, public_products_enabled: false } }),
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

describe('PublicBookingSettings — antecedência mínima', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.profile = {
      business_slug: 'corte-fino',
      public_booking_enabled: true,
      booking_lead_time_hours: 2,
      max_bookings_per_day: null,
    };
  });

  it('mostra Antecedência mínima com o valor salvo (2h) marcado', () => {
    render(<PublicBookingSettings />);
    expect(screen.getByRole('heading', { name: 'Antecedência mínima para marcar pelo link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sem mínimo' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Sem mínimo' })).toHaveClass('whitespace-nowrap');
    expect(screen.getByTestId('lead-time-preset-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lead-time-preset-8')).toBeInTheDocument();
    expect(screen.getByTestId('lead-time-preset-16')).toBeInTheDocument();
    expect(screen.getByTestId('lead-time-preset-24')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Outro/ })).toBeInTheDocument();
    expect(screen.getByTestId('lead-time-example-text')).toHaveTextContent(
      'Com 2h: se agora são 14h, o cliente só vê horários a partir das 16h.',
    );
    expect(screen.getByTestId('lead-time-notes')).toHaveTextContent('Agenda não é afetada');
    expect(screen.getByTestId('lead-time-notes')).toHaveTextContent('Sem mínimo');
    expect(screen.getByText('Cliente pode editar na Minha Área')).toBeInTheDocument();
  });

  it('valor 8h salvo já vem marcado', () => {
    state.profile = { ...state.profile, booking_lead_time_hours: 8 };
    render(<PublicBookingSettings />);
    expect(screen.getByTestId('lead-time-preset-8')).toHaveAttribute('aria-pressed', 'true');
  });

  it('valor fora da lista abre Outro com as horas', () => {
    state.profile = { ...state.profile, booking_lead_time_hours: 3 };
    render(<PublicBookingSettings />);
    expect(screen.getByRole('button', { name: /Outro/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('booking-lead-time-custom')).toHaveValue('3');
    expect(screen.getByTestId('booking-lead-time-custom-minutes')).toHaveValue('0');
  });

  it('salvar envia booking_lead_time_hours do preset escolhido', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-8'));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      booking_lead_time_hours: 8,
    }));
  });

  it('Outro vazio mostra erro e não salva', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-custom'));
    expect(screen.getByTestId('booking-lead-time-custom')).toHaveValue('');
    expect(screen.getByTestId('booking-lead-time-custom-minutes')).toHaveValue('');
    expect(screen.getByTestId('lead-time-custom-hint')).toHaveTextContent('Horas de 0 a 720 e minutos de 0 a 59.');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    expect(await screen.findByTestId('lead-time-custom-error')).toHaveTextContent('Informe horas e/ou minutos de antecedência.');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('Outro 1h30: exemplo com minutos e salva 90 min + horas no teto (2)', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-custom'));
    fireEvent.change(screen.getByTestId('booking-lead-time-custom'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('booking-lead-time-custom-minutes'), { target: { value: '30' } });
    expect(screen.getByTestId('lead-time-example-text')).toHaveTextContent(
      'Com 1h30: se agora são 14h, o cliente só vê horários a partir das 15h30.',
    );
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updateLeadMinutes).toHaveBeenCalledWith(90));
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ booking_lead_time_hours: 2 }));
  });

  it('Outro só 20 minutos', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-custom'));
    fireEvent.change(screen.getByTestId('booking-lead-time-custom-minutes'), { target: { value: '20' } });
    expect(screen.getByTestId('lead-time-example-text')).toHaveTextContent('Com 20 min: se agora são 14h, o cliente só vê horários a partir das 14h20.');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    await waitFor(() => expect(updateLeadMinutes).toHaveBeenCalledWith(20));
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ booking_lead_time_hours: 1 }));
  });

  it('minutos acima de 59 mostram erro e não salvam', async () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-custom'));
    fireEvent.change(screen.getByTestId('booking-lead-time-custom-minutes'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));
    expect(await screen.findByTestId('lead-time-custom-error')).toHaveTextContent('Os minutos vão de 0 a 59.');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(updateLeadMinutes).not.toHaveBeenCalled();
  });

  it('minutos salvos (90) abrem Outro com 1 h e 30 min', () => {
    state.profile = { ...state.profile, booking_lead_time_hours: 2, booking_lead_time_minutes: 90 };
    render(<PublicBookingSettings />);
    expect(screen.getByRole('button', { name: /Outro/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('booking-lead-time-custom')).toHaveValue('1');
    expect(screen.getByTestId('booking-lead-time-custom-minutes')).toHaveValue('30');
  });

  it('minutos salvos 120 = preset 2h marcado', () => {
    state.profile = { ...state.profile, booking_lead_time_hours: 2, booking_lead_time_minutes: 120 };
    render(<PublicBookingSettings />);
    expect(screen.getByTestId('lead-time-preset-2')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Sem mínimo explica no exemplo', () => {
    render(<PublicBookingSettings />);
    fireEvent.click(screen.getByTestId('lead-time-preset-0'));
    expect(screen.getByTestId('lead-time-example-text')).toHaveTextContent('Sem mínimo: o cliente vê qualquer horário livre que ainda não passou.');
  });
});
