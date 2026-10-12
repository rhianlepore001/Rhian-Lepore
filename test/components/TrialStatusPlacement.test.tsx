import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'owner', logout: vi.fn(), fullName: 'Dono', businessName: 'Negócio', avatarUrl: null, userType: 'barber' }),
}));
vi.mock('@/contexts/UIContext', () => ({
  useUI: () => ({ isSidebarOpen: true, closeSidebar: vi.fn(), setModalOpen: vi.fn() }),
}));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ mode: 'dark' }) }));
vi.mock('@/components/TrialStatusCard', () => ({ TrialStatusCard: () => <div data-testid="trial-status-slot" /> }));

import { Sidebar } from '@/components/Sidebar';
import { MoreOptionsDrawer } from '@/components/MoreOptionsDrawer';

describe('status do período de teste fica no menu', () => {
  it('sidebar (desktop) mostra o status do período de teste', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByTestId('trial-status-slot')).toBeTruthy();
  });
  it('menu lateral do celular mostra o status do período de teste', () => {
    render(<MemoryRouter><MoreOptionsDrawer onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId('trial-status-slot')).toBeTruthy();
  });
});
