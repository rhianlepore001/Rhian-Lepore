import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const wizardList = vi.hoisted(() => vi.fn());

vi.mock('@/services/fixedCosts', () => ({
  fixedCostsApi: { list: (...args: unknown[]) => wizardList(...args) },
}));

const openHours = { mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } };

const wizardPayload = (complete: boolean) =>
  complete
    ? {
        costs: [
          {
            id: 'c1',
            company_id: 'c1',
            professional_id: null,
            category: 'Aluguel',
            description: 'Sala',
            amount: 500,
            start_date: '2026-01-01',
            end_date: null,
            is_owner_salary: false,
            active: true,
          },
        ],
        services: [{ id: 's1', name: 'Corte' }],
        materials: [{ service_id: 's1', amount: 2 }],
        professionals: [{ id: 'p1', name: 'Ana', working_hours: openHours }],
        lowMargin: 20,
        lowMarginSaved: true,
      }
    : {
        costs: [],
        services: [{ id: 's1', name: 'Corte' }],
        materials: [],
        professionals: [{ id: 'p1', name: 'Ana', working_hours: openHours }],
        lowMargin: 20,
        lowMarginSaved: false,
      };

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
    wizardList.mockReset();
    wizardList.mockResolvedValue(wizardPayload(false));
  });

  it('título e empty de configuração com propósito e passos, sem R$ 0,00', async () => {
    const { container } = mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalledWith('c1'));
    expect(screen.getByRole('heading', { name: 'Resultados por hora', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Aqui você vê se cada hora aberta paga as contas/)).toBeInTheDocument();
    expect(screen.getByText(/Não é o caixa do dia/i)).toBeInTheDocument();
    expect(screen.getAllByText(/contas do mês/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horários/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/material dos serviços/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/defina quando avisar que sobrou pouco/i)).toBeInTheDocument();
    expect(screen.getByText(/O progresso aparece em Ajustes como N de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/fechar o primeiro atendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum número é inventado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar à performance da equipe/i })).toHaveAttribute('href', '/financeiro/performance');
    expect(screen.getByRole('link', { name: /ajustes|configurações|financeiro/i })).toHaveAttribute('href', expect.stringContaining('/configuracoes/financeiro'));
    noZeroHero(container);
  });

  it('horário existe mas sem atendimento → copy honesta só com wizard completo', async () => {
    wizardList.mockResolvedValue(wizardPayload(true));
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 600, worked_minutes: 0 }, professionals: [] };
    const { container } = mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalledWith('c1'));
    expect(screen.getByText(/Ainda não há atendimento fechado neste período/i)).toBeInTheDocument();
    expect(screen.queryByText(/contas do mês.*Falta|Falta.*contas do mês/i)).not.toBeInTheDocument();
    noZeroHero(container);
  });

  it('horário existe e wizard incompleto → propósito e passos com Feito/Falta', async () => {
    wizardList.mockResolvedValue(wizardPayload(false));
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 600, worked_minutes: 0 }, professionals: [] };
    const { container } = mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalledWith('c1'));
    expect(screen.getByText(/Aqui você vê se cada hora aberta paga as contas/i)).toBeInTheDocument();
    expect(screen.getAllByText('Falta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Horários/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ainda não há atendimento fechado neste período/i)).not.toBeInTheDocument();
    noZeroHero(container);
  });

  it('com atendimento mas sem valor registrado → unmeasurable, sem R$ 0,00', async () => {
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: { ...metrics, available_minutes: 600, worked_minutes: 300, revenue_per_worked_hour: 0 },
      professionals: [],
    };
    const { container } = mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalled());
    expect(screen.getByText(/não têm valor registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/Confira os preços dos serviços/i)).toBeInTheDocument();
    noZeroHero(container);
  });

  it('com dados reais mostra ChairHourCard e não o empty de propósito', async () => {
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: metrics,
      professionals: [{ id: '1', name: 'Ana', ...metrics }],
      services: [{ name: 'Corte', status: 'loss' }],
    };
    mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalled());
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