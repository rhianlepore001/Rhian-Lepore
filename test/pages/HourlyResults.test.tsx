import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HourlyResults } from '@/pages/HourlyResults';

const state = vi.hoisted(() => ({
  role: 'owner' as 'owner' | 'staff',
  teamMemberId: 'tm-1' as string | null,
  theme: 'barber',
  data: null as unknown,
  status: 'ready',
}));

const businessSettingsState = vi.hoisted(() => ({
  data: undefined as { business_hours?: Record<string, unknown>; timezone?: string } | undefined,
}));

vi.mock('@/hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: businessSettingsState.data, isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: state.role, teamMemberId: state.teamMemberId, companyId: 'c1', user: { id: 'u1' }, region: 'BR' }),
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

const activeCost = {
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
};

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
    businessSettingsState.data = undefined;
    wizardList.mockReset();
    wizardList.mockResolvedValue(wizardPayload(false));
  });

  it('título e empty de configuração com propósito e passos, sem R$ 0,00', async () => {
    const { container } = mount();
    await waitFor(() => expect(wizardList).toHaveBeenCalledWith('c1'));
    expect(screen.getByRole('heading', { name: 'Resultados por hora', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Veja se o que você ganha por hora de agenda aberta cobre as contas/)).toBeInTheDocument();
    expect(screen.getAllByText(/contas do mês/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horários/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/material dos serviços/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/defina quando avisar que sobrou pouco/i)).toBeInTheDocument();
    expect(screen.getByText(/de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/finalize um atendimento na Agenda ou na Fila/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Ainda não há atendimentos finalizados neste período/i)).toBeInTheDocument();
    expect(screen.queryByText(/contas do mês.*Falta|Falta.*contas do mês/i)).not.toBeInTheDocument();
    noZeroHero(container);
  });

  it('horário existe e wizard incompleto → propósito e passos com Feito/Falta', async () => {
    wizardList.mockResolvedValue(wizardPayload(false));
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 600, worked_minutes: 0 }, professionals: [] };
    const { container } = mount();
    expect(await screen.findByText(/Veja se o que você ganha por hora de agenda aberta cobre as contas/i)).toBeInTheDocument();
    expect(screen.getAllByText('Falta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Horários/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ainda não há atendimentos finalizados neste período/i)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Veja se o que você ganha por hora de agenda aberta/i)).not.toBeInTheDocument();
    expect(screen.getByText('Cada hora aberta rendeu')).toBeInTheDocument();
  });

  it('enquanto wizardList não resolve, os passos não exibem quatro selos “Falta”', async () => {
    wizardList.mockImplementation(() => new Promise(() => {}));
    mount();
    await waitFor(() => expect(screen.getByText(/de 4/i)).toBeInTheDocument());
    expect(screen.queryAllByText('Falta')).not.toHaveLength(4);
  });

  it('links dos passos apontam para financeiro com query bloco=', async () => {
    mount();
    await screen.findAllByText('Falta');
    const stepLinks = screen.getAllByRole('link').filter((el) => /contas do mês|horários|material|sobrar|sobra/i.test(el.textContent ?? ''));
    expect(stepLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of stepLinks.slice(0, 4)) {
      expect(link.getAttribute('href')).toMatch(/bloco=(contas|horarios|materiais|margem)/);
    }
  });

  it('sem working_hours do profissional mas business_hours aberto → passo Horários “Feito”', async () => {
    businessSettingsState.data = { business_hours: openHours };
    wizardList.mockResolvedValue({
      costs: [],
      services: [{ id: 's1', name: 'Corte' }],
      materials: [],
      professionals: [{ id: 'p1', name: 'Ana', working_hours: null }],
      lowMargin: 20,
      lowMarginSaved: false,
    });
    mount();
    await screen.findByText('Feito');
    const horariosRow = screen.getAllByText(/Horários/i).find((node) => node.closest('li'));
    expect(horariosRow).toBeTruthy();
    const row = horariosRow!.closest('li')!;
    expect(within(row).getByText('Feito')).toBeInTheDocument();
  });

  it('com atendimento e só margem pendente: aviso sobre avisar sobra, sem custo baixo', async () => {
    wizardList.mockResolvedValue({
      costs: [activeCost],
      services: [{ id: 's1', name: 'Corte' }],
      materials: [{ service_id: 's1', amount: 2 }],
      professionals: [{ id: 'p1', name: 'Ana', working_hours: openHours }],
      lowMargin: 20,
      lowMarginSaved: false,
    });
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: metrics,
      professionals: [{ id: '1', name: 'Ana', ...metrics }],
      services: [{ name: 'Corte', status: 'ok' }],
    };
    mount();
    expect(await screen.findByText(/definir quando avisar|avisar.*sobra/i)).toBeInTheDocument();
    expect(screen.queryByText(/custo da hora pode estar baixo/i)).not.toBeInTheDocument();
  });

  it('erro ao carregar o wizard mostra Tentar de novo, sem selos Falta eternamente', async () => {
    wizardList.mockRejectedValue(new Error('falha'));
    mount();
    expect(await screen.findByText(/Não foi possível conferir os ajustes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
    expect(screen.queryAllByText('Falta')).not.toHaveLength(4);
  });

  it('com atendimento e contas+material pendentes: aviso 2 de 4 e link Completar com bloco=', async () => {
    businessSettingsState.data = { business_hours: openHours };
    wizardList.mockResolvedValue({
      costs: [],
      services: [{ id: 's1', name: 'Corte' }],
      materials: [],
      professionals: [{ id: 'p1', name: 'Ana', working_hours: null }],
      lowMargin: 20,
      lowMarginSaved: true,
    });
    state.data = {
      month: '2026-11-01',
      role: 'owner',
      total: metrics,
      professionals: [{ id: '1', name: 'Ana', ...metrics }],
      services: [{ name: 'Corte', status: 'loss' }],
    };
    mount();
    expect(await screen.findByText(/Faltam 2 de 4/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /completar/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/configuracoes\/financeiro.*bloco=/i),
    );
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

describe('HourlyResults — fuso do negócio', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    state.role = 'owner';
    state.teamMemberId = null;
    state.theme = 'barber';
    state.status = 'ready';
    state.data = { month: '2026-11-01', role: 'owner', total: { available_minutes: null, worked_minutes: 0, estimated_count: null, revenue_per_worked_hour: null, revenue_per_available_hour: null, occupancy: null }, professionals: [] };
    wizardList.mockReset();
    wizardList.mockResolvedValue(wizardPayload(false));
    vi.useFakeTimers({ toFake: ['Date'] });
    // 01/12/2026 01:00 UTC: já é dezembro em Lisboa e ainda 30/11 à noite em São Paulo.
    vi.setSystemTime(new Date('2026-12-01T01:00:00Z'));
  });

  it('sem ?de=, o mês padrão segue o fuso do negócio (Lisboa)', async () => {
    businessSettingsState.data = { timezone: 'Europe/Lisbon' };
    mount('/resultados-por-hora');
    expect(await screen.findByText(/Dezembro de 2026/i)).toBeInTheDocument();
    await waitFor(() => expect(wizardList).toHaveBeenCalled());
  });

  it('sem ?de=, America/Sao_Paulo no mesmo instante cai em novembro', async () => {
    businessSettingsState.data = { timezone: 'America/Sao_Paulo' };
    mount('/resultados-por-hora');
    expect(await screen.findByText(/Novembro de 2026/i)).toBeInTheDocument();
    await waitFor(() => expect(wizardList).toHaveBeenCalled());
  });
});
