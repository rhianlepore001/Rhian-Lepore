import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('mostra só as próprias métricas operacionais, com delta vs o mês anterior', async () => {
    render(<MemoryRouter><StaffInsights /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: /Meus resultados/ })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2 do Clube')).toBeInTheDocument();
    expect(screen.queryByText('12 atendimentos')).toBeNull();
    expect(screen.getByText('R$ 103,33/h')).toBeInTheDocument();
    expect(screen.getByText('6h de cadeira paga')).toBeInTheDocument();
    expect(screen.getByText('R$ 62,00')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('R$ 257,00')).toBeInTheDocument();
    expect(screen.getByText('7h (1h do Clube)')).toBeInTheDocument();
    expect(screen.getByText(/Faltas 7%/)).toBeInTheDocument();
    expect(screen.getByText(/Cancelamentos/)).toBeInTheDocument();
    expect(screen.queryByText('Cancel.')).toBeNull();
    expect(screen.queryByText('igual')).toBeNull();
    expect(screen.getByText(/3 de 12 com produto/)).toBeInTheDocument();
    expect(screen.queryByText(/Retorno para a casa/i)).toBeNull();
    expect(screen.queryByText(/ranking/i)).toBeNull();
    expect(screen.queryByText(/melhor funcionário/i)).toBeNull();
    expect(screen.queryByText('Bruno')).toBeNull();
  });

  it('RPC ausente: estado honesto, sem números inventados', async () => {
    fetchStaffInsights.mockRejectedValue({ code: 'PGRST202', message: 'missing' });
    render(<MemoryRouter><StaffInsights /></MemoryRouter>);
    expect(await screen.findByText(/ainda não foi ativada|Não foi possível carregar/i)).toBeInTheDocument();
    expect(screen.queryByText('R$ 257,00')).toBeNull();
  });
});
