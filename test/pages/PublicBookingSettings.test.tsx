import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let savedPublicProductsEnabled = false;
const updateLeadMinutes = vi.fn().mockResolvedValue('saved');
const updatePolicyText = vi.fn().mockResolvedValue('saved');

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: { enable_self_rescheduling: true, public_products_enabled: savedPublicProductsEnabled, client_cancel_cutoff_hours: 2 } }),
  useUpdateBusinessSettings: () => ({ mutateAsync: vi.fn() }),
  useProfileFields: () => ({ data: { business_slug: 'bob', public_booking_enabled: true } }),
  useUpdateProfileFields: () => ({ mutateAsync: vi.fn() }),
  useUpdateOnlineBookingRequiresApproval: () => ({ mutateAsync: vi.fn().mockResolvedValue('saved') }),
  useUpdateBookingLeadTimeMinutes: () => ({ mutateAsync: updateLeadMinutes }),
  useUpdateClientCancelPolicyText: () => ({ mutateAsync: updatePolicyText }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

vi.mock('../../components/ui', () => ({
  Button: ({ children, ...rest }: { children: React.ReactNode }) => <button {...rest}>{children}</button>,
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: { bgDim: '', border: '', text: '', bg: '' },
    colors: { textMuted: '', text: '', textSecondary: '', inputBg: '', border: '' },
    classes: { label: 'label', input: 'input' },
  }),
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/PublicLinkCard', () => ({ PublicLinkCard: () => null }));

vi.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));

import { PublicBookingSettings } from '../../pages/settings/PublicBookingSettings';

describe('PublicBookingSettings — PR-1 copy do toggle de edição do cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedPublicProductsEnabled = false;
  });

  it('diz o que o toggle faz de verdade, sem prometer e-mail', () => {
    render(<PublicBookingSettings />);
    expect(screen.getByText('Cliente pode editar na Minha Área')).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente pode editar na Minha Área')).toBeChecked();
    expect(screen.getByText('Mostra o botão Editar nos agendamentos futuros da Minha Área.')).toBeInTheDocument();
    expect(screen.queryByText('Reagendamento Autônomo')).toBeNull();
    expect(screen.queryByText(/via link de e-mail/i)).toBeNull();
    expect(screen.queryByText(/Não envia e-mail/i)).toBeNull();
    expect(screen.queryByText(/Cliente reagenda sozinho via link de e-mail/i)).toBeNull();
  });

  it('toggle Trocar só o serviço sem aprovação vem desligado', () => {
    render(<PublicBookingSettings />);
    expect(screen.getByText('Trocar só o serviço sem aprovação')).toBeInTheDocument();
    expect(screen.getByLabelText('Trocar só o serviço sem aprovação')).not.toBeChecked();
    expect(screen.getByTestId('service-only-edit-skip-row')).toBeInTheDocument();
  });

  it('toggle Produtos no link público vem desligado por padrão', () => {
    render(<PublicBookingSettings />);
    expect(screen.getByTestId('public-products-section')).toBeInTheDocument();
    expect(screen.getByLabelText('Produtos no link público')).not.toBeChecked();
    expect(screen.queryByRole('link', { name: 'Ver vitrine pública' })).not.toBeInTheDocument();
  });

  it('abre a aba Produtos pelo atalho quando a vitrine está publicada', () => {
    savedPublicProductsEnabled = true;
    render(<PublicBookingSettings />);
    expect(screen.getByRole('link', { name: 'Ver vitrine pública' }))
      .toHaveAttribute('href', '/#/book/bob?secao=produtos');
  });
});
