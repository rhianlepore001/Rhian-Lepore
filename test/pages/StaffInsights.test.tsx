import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import staff from '../fixtures/staffPerformance/staff.json';

const fetchStaffInsights = vi.fn();
vi.mock('@/services/staffInsights', async (orig) => {
  const real = await orig<typeof import('../../services/staffInsights')>();
  return { ...real, fetchStaffInsights: (...a: unknown[]) => fetchStaffInsights(...a) };
});
vi.mock('../../services/staffInsights', async (orig) => {
  const real = await orig<typeof import('../../services/staffInsights')>();
  return { ...real, fetchStaffInsights: (...a: unknown[]) => fetchStaffInsights(...a) };
});

const AUTH = {
  role: 'staff',
  fullName: 'Ana Souza',
  teamMemberId: '20000000-0000-0000-0000-0000000000a1',
  region: 'BR',
  companyId: 'owner-1',
};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => AUTH }));

import { StaffInsights } from '../../pages/StaffInsights';

describe('StaffInsights — Meus resultados (P3, D1)', () => {
  beforeEach(() => {
    fetchStaffInsights.mockReset();
    fetchStaffInsights.mockResolvedValue(staff);
  });

  it('mostra só as próprias métricas operacionais, com linguagem de colaborador', async () => {
    render(<MemoryRouter><StaffInsights /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Meus resultados' })).toBeInTheDocument();
    expect(screen.getByText(/Ana · /)).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('2 do Clube')).toBeInTheDocument();
    expect(await screen.findByText('R$ 103,33')).toBeInTheDocument();
    expect(await screen.findByText('R$ 62,00')).toBeInTheDocument();
    expect(await screen.findByText('55%')).toBeInTheDocument();
    expect(await screen.findByText('R$ 257,00')).toBeInTheDocument();
    expect(await screen.findByText('Pela agenda')).toBeInTheDocument();
    expect(await screen.findByText('3 de 12 atendimentos')).toBeInTheDocument();
    expect(screen.queryByText(/Retorno para a casa/i)).toBeNull();
    expect(screen.queryByText(/Ficou para/i)).toBeNull();
    expect(screen.queryByText(/melhor funcionário/i)).toBeNull();
    expect(screen.queryByText('Bruno')).toBeNull();
    fireEvent.click(within(screen.getByTestId('metric-ticket_medio')).getByText('Ver a conta'));
    expect(await screen.findByText('O que isso quer dizer')).toBeInTheDocument();
    expect(screen.getByText(/seus clientes/i)).toBeInTheDocument();
  });

  it('RPC ausente: estado honesto, sem números inventados', async () => {
    fetchStaffInsights.mockRejectedValue({ code: 'PGRST202', message: 'missing' });
    render(<MemoryRouter><StaffInsights /></MemoryRouter>);
    expect(await screen.findByText(/ainda não foi ativada|Não foi possível carregar/i)).toBeInTheDocument();
    expect(screen.queryByText('R$ 257,00')).toBeNull();
  });
});
