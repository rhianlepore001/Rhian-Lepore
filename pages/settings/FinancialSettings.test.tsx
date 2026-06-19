import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialSettings } from './FinancialSettings';

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({
    data: {
      machine_fee_enabled: false,
      debit_fee_percent: 0,
      credit_fee_percent: 0,
    },
    isLoading: false,
  }),
  useUpdateBusinessSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-123' },
    companyId: 'owner-123',
    userType: 'barber',
  })
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));

vi.mock('../../components/SettingsSwitch', () => ({
  SettingsSwitch: ({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={ariaLabel} />
  )
}));

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    accent: { text: 'text-amber-400', bgDim: 'bg-amber-400/10', borderDim: 'border-amber-400/30' },
    colors: { text: 'text-white', textSecondary: 'text-neutral-400', textMuted: 'text-neutral-400', inputBg: 'bg-neutral-900', border: 'border-neutral-700', divider: 'border-neutral-800' },
    classes: { label: 'text-sm font-bold', input: 'w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl' },
    radius: { card: 'rounded-xl', button: 'rounded-xl', input: 'rounded-xl', badge: 'rounded-md', avatar: 'rounded-xl', modal: 'rounded-xl' },
    density: { cardPadding: 'p-4' },
    shadow: { card: 'shadow-sm' },
  })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('FinancialSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it('renderiza sem crash', async () => {
    render(<FinancialSettings />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/repassar taxa/i)).toBeInTheDocument();
    });
  });

  it('campos de porcentagem NÃO aparecem quando toggle desativado', async () => {
    render(<FinancialSettings />, { wrapper });
    await waitFor(() => {
      expect(screen.queryByLabelText(/Taxa Débito/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Taxa Crédito/i)).not.toBeInTheDocument();
    });
  });

  it('botão Salvar aciona mutation de business_settings', async () => {
    render(<FinancialSettings />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/salvar/i)).toBeInTheDocument();
    });
    const saveButton = screen.getByText(/salvar/i);
    saveButton.click();
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});