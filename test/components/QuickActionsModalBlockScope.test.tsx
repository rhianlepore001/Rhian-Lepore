import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state: { role: string; teamMemberId: string | null; settings: Record<string, unknown> | null; loading: boolean } = {
  role: 'staff', teamMemberId: 'tm-1', settings: null, loading: false,
};

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('focus-trap-react', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role, teamMemberId: state.teamMemberId }) }));
vi.mock('../../contexts/UIContext', () => ({ useUI: () => ({ setModalOpen: vi.fn() }) }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', divider: '' },
    accent: { text: '', bg: '', bgDim: '', border: '' },
    status: {},
    radius: { modal: '' },
    shadow: { modal: '' },
  }),
}));
vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings, isLoading: state.loading }),
}));

import { QuickActionsModal } from '../../components/QuickActionsModal';

describe('Ações rápidas — atalho "Bloquear agenda" conforme a permissão', () => {
  beforeEach(() => {
    state.role = 'staff';
    state.teamMemberId = 'tm-1';
    state.loading = false;
  });

  it.each([
    ['own', true],
    ['all', true],
    ['none', false],
  ])('staff com scope %s → atalho visível = %s', (scope, visible) => {
    state.settings = { staff_agenda_block_scope: scope, staff_can_block_agenda: scope !== 'none' };
    render(<QuickActionsModal onClose={() => {}} />);
    expect(!!screen.queryByText('Bloquear agenda')).toBe(visible);
  });

  it('banco antigo: booleano desligado esconde, ligado mostra', () => {
    state.settings = { staff_can_block_agenda: false };
    const { unmount } = render(<QuickActionsModal onClose={() => {}} />);
    expect(screen.queryByText('Bloquear agenda')).toBeNull();
    unmount();
    state.settings = { staff_can_block_agenda: true };
    render(<QuickActionsModal onClose={() => {}} />);
    expect(screen.getByText('Bloquear agenda')).toBeInTheDocument();
  });

  it('staff enquanto carrega não vê o atalho; dono sempre vê', () => {
    state.loading = true;
    state.settings = null;
    const { unmount } = render(<QuickActionsModal onClose={() => {}} />);
    expect(screen.queryByText('Bloquear agenda')).toBeNull();
    unmount();
    state.role = 'owner';
    state.teamMemberId = null;
    state.settings = { staff_agenda_block_scope: 'none' };
    render(<QuickActionsModal onClose={() => {}} />);
    expect(screen.getByText('Bloquear agenda')).toBeInTheDocument();
  });
});
