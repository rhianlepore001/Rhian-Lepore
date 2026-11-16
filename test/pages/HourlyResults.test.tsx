import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HourlyResults } from '@/pages/HourlyResults';

const state = vi.hoisted(() => ({
  role: 'owner' as 'owner' | 'staff',
  teamMemberId: 'tm-1' as string | null,
  theme: 'barber',
  data: null as unknown,
  status: 'ready',
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: state.role, teamMemberId: state.teamMemberId, companyId: 'c1', user: { id: 'u1' } }),
}));
vi.mock('@/hooks/useBusinessCopy', () => ({
  useBusinessCopy: () => ({ chairHour: state.theme === 'beauty' ? 'hora de atendimento' : 'hora de cadeira' }),
}));
vi.mock('@/hooks/useTenantLocale', () => ({
  useTenantLocale: () => ({ formatMoney: (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}` }),
}));
const theme = {
  colors: { text: '', textMuted: '', border: '', card: '', textSecondary: '' },
  radius: { card: '' },
  density: { cardPadding: '' },
  shadow: { card: '' },
  classes: {},
  font: { heading: '' },
};
vi.mock('@/hooks/useBrutalTheme', () => ({ useBrutalTheme: () => theme }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => theme }));
vi.mock('@/hooks/useChairHour', () => ({
  useChairHour: () => ({ data: state.data, status: state.status, retry: vi.fn() }),
}));

const metrics = {
  available_minutes: 600,
  worked_minutes: 300,
  estimated_count: 1,
  revenue_per_worked_hour: 100,
  revenue_per_available_hour: 50,
  occupancy: 0.5,
  cost_per_hour: 25,
  margin_per_hour: 25,
  idle_cost: 125,
};

const mount = (url = '/resultados-por-hora?de=2026-11-01&ate=2026-11-30') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/resultados-por-hora" element={<HourlyResults />} />
      </Routes>
    </MemoryRouter>,
  );

const noZeroHero = (container: HTMLElement) => {
  expect(container.textContent).not.toMatch(/R\$\s*0[,.]00/);
};

describe('HourlyResults — gestor', () => {
  beforeEach(() => {
    state.role = 'owner';
    state.teamMemberId = null;
    state.theme = 'barber';
    state.status = 'ready';
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, worked_minutes: 0, available_minutes: null }, professionals: [] };
  });

  it('título e empty de configuração com propósito e passos, sem R$ 0,00', () => {
    const { container } = mount();
    expect(screen.getByRole('heading', { name: 'Resultados por hora', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Aqui você vê se cada hora aberta paga as contas/)).toBeInTheDocument();
    expect(screen.getByText(/Não é o caixa do dia/i)).toBeInTheDocument();
    expect(screen.getByText(/contas do mês/i)).toBeInTheDocument();
    expect(screen.getByText(/horários/i)).toBeInTheDocument();
    expect(screen.getByText(/material dos serviços/i)).toBeInTheDocument();
    expect(screen.getByText(/defina quando avisar que sobrou pouco/i)).toBeInTheDocument();
    expect(screen.getByText(/O progresso aparece em Ajustes como N de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/fechar o primeiro atendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum número é inventado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar à performance da equipe/i })).toHaveAttribute('href', '/financeiro/performance');
    expect(screen.getByRole('link', { name: /ajustes|configurações|financeiro/i })).toHaveAttribute('href', expect.stringContaining('/configuracoes/financeiro'));
    noZeroHero(container);
  });

  it('horário existe mas sem atendimento → copy honesta', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 600, worked_minutes: 0 }, professionals: [] };
    const { container } = mount();
    expect(screen.getByText(/Ainda não há atendimento fechado neste período/i)).toBeInTheDocument();
    noZeroHero(container);
  });

  it('com atendimento mas sem valor registrado → unmeasurable, sem R$ 0,00', () => {
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: { ...metrics, available_minutes: 600, worked_minutes: 300, revenue_per_worked_hour: 0 },
      professionals: [],
    };
    const { container } = mount();
    expect(screen.getByText(/não têm valor registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/Confira os preços dos serviços/i)).toBeInTheDocument();
    noZeroHero(container);
  });

  it('com dados reais mostra ChairHourCard e não o empty de propósito', () => {
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: metrics,
      professionals: [{ id: '1', name: 'Ana', ...metrics }],
      services: [{ name: 'Corte', status: 'loss' }],
    };
    mount();
    expect(screen.queryByText(/Não é o caixa do dia/i)).not.toBeInTheDocument();
    expect(screen.getByText('Cada hora aberta rendeu')).toBeInTheDocument();
  });
});

describe('HourlyResults — colaborador', () => {
  beforeEach(() => {
    state.role = 'staff';
    state.teamMemberId = 'tm-1';
    state.data = null;
  });

  it('sem métricas pede horários ao responsável, sem falar de contas do mês', () => {
    const { container } = mount();
    expect(screen.getByText(/Peça ao responsável para definir seus horários/i)).toBeInTheDocument();
    expect(screen.queryByText(/contas do mês/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar a Meus resultados/i })).toHaveAttribute('href', '/meus-insights');
    noZeroHero(container);
  });
});