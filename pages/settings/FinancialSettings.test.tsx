import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialSettings } from './FinancialSettings';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-123' },
    userType: 'barber',
  })
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../components/BrutalCard', () => ({
  BrutalCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../components/BrutalButton', () => ({
  BrutalButton: ({ children, onClick, loading }: { children: React.ReactNode; onClick?: () => void; loading?: boolean }) => (
    <button onClick={onClick} disabled={loading}>{children}</button>
  )
}));

describe('FinancialSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem crash', async () => {
    render(<FinancialSettings />);
    await waitFor(() => {
      expect(screen.getByText(/repassar taxa/i)).toBeInTheDocument();
    });
  });

  it('campos de porcentagem NÃO aparecem quando toggle desativado', async () => {
    render(<FinancialSettings />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/taxa débito/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/taxa crédito/i)).not.toBeInTheDocument();
    });
  });

  it('campos de porcentagem APARECEM quando toggle ativado', async () => {
    render(<FinancialSettings />);
    await waitFor(() => {
      expect(screen.getByText(/repassar taxa/i)).toBeInTheDocument();
    });
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.getByLabelText(/taxa d.bito/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/taxa cr.dito/i)).toBeInTheDocument();
    });
  });

  it('botão Salvar aciona upsert em business_settings', async () => {
    const { supabase } = await import('../../lib/supabase');
    render(<FinancialSettings />);
    await waitFor(() => {
      expect(screen.getByText(/salvar/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/salvar/i));
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('business_settings');
    });
  });
});