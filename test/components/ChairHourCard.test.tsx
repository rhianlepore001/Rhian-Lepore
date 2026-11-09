import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChairHourCard } from '@/components/performance/ChairHourCard';

const state = vi.hoisted(() => ({ role: 'owner', teamMemberId: '1' as string | null, theme: 'barber', data: null as unknown, prev: null as unknown, status: 'ready', calls: [] as unknown[][] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role, teamMemberId: state.teamMemberId }) }));
vi.mock('@/hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ chairHour: state.theme === 'beauty' ? 'hora de atendimento' : 'hora de cadeira' }) }));
vi.mock('@/hooks/useTenantLocale', () => ({ useTenantLocale: () => ({ formatMoney: (n: number) => `R$ ${n.toFixed(2)}` }) }));
vi.mock('@/hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '', textSecondary: '' }, radius: { card: '' }, density: { cardPadding: '' }, shadow: { card: '' }, classes: {} }) }));
vi.mock('@/hooks/useChairHour', () => ({ useChairHour: (...args: unknown[]) => {
  state.calls.push(args);
  const options = args[3] as { enabled?: boolean } | undefined;
  if (options?.enabled === false) return { data: null, status: 'ready', retry: vi.fn() };
  return { data: options ? state.prev : state.data, status: state.status, retry: vi.fn() };
} }));

const metrics = { available_minutes: 600, worked_minutes: 300, estimated_count: 1, revenue: 500, revenue_per_worked_hour: 100, revenue_per_available_hour: 50, occupancy: 0.5, cost_per_hour: 25, margin_per_hour: 25, idle_cost: 125 };
const mount = () => render(<MemoryRouter><ChairHourCard month="2026-11-01" /></MemoryRouter>);
const staffOnly = { id: '1', available_minutes: 600, worked_minutes: 420, estimated_count: 0, revenue_per_worked_hour: 85, revenue_per_available_hour: 59.5, occupancy: 0.7 };

beforeEach(() => { state.role = 'owner'; state.teamMemberId = '1'; state.theme = 'barber'; state.status = 'ready'; state.prev = null; state.calls = []; state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [{ id: '1', name: 'Ana', ...metrics }], services: [{ name: 'Corte', status: 'loss' }] }; });

describe('hora de cadeira — gestor', () => {
  it('mostra um número principal e diz quanto cada hora precisa render, sem chamar de lucro', () => {
    const { container } = mount();
    expect(screen.getByRole('heading', { name: 'Sua hora de cadeira' })).toBeInTheDocument();
    expect(screen.getByText('Cada hora aberta rendeu')).toBeInTheDocument();
    expect(screen.getByText(/para pagar as contas, cada hora aberta precisa render/i)).toBeInTheDocument();
    expect(screen.getByText(/sobrou cerca de/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/lucro|margem|rateio|custo fixo|prejuízo/i);
  });
  it('separa os três números da hora, cada um com explicação ao tocar', () => {
    mount();
    for (const label of ['Rende por hora aberta', 'Rende por hora atendendo', 'Sobra estimada por hora']) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByLabelText(`O que é "${label}"?`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByLabelText('O que é "Rende por hora aberta"?'));
    expect(screen.getByText(/R\$ 600 em 10 horas abertas/)).toBeInTheDocument();
  });
  it('explica a ocupação como horas de cada 10 e as horas vazias como parte das contas, não gasto extra', () => {
    mount();
    expect(screen.getByText(/A equipe atendeu em/)).toHaveTextContent('5 de cada 10');
    expect(screen.getByText(/não é gasto a mais/i)).toBeInTheDocument();
  });
  it('usa selo que não condena o serviço e deixa claro que é estimativa', () => {
    mount();
    expect(screen.getByText(/não cobre o custo da hora/i)).toBeInTheDocument();
    expect(screen.getAllByText(/estimad/i).length).toBeGreaterThan(0);
  });
  it('mostra selo de qualidade dos dados sempre visível', () => {
    mount();
    expect(screen.getByText('Agenda: 1 tempo estimado')).toBeInTheDocument();
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, estimated_count: 0 }, professionals: [] };
    mount();
    expect(screen.getByText('Tempos informados no fechamento')).toBeInTheDocument();
  });
  it('dá uma dica prática baseada nos números', () => {
    mount();
    expect(screen.getByText(/muitos horários ficaram vazios/i)).toBeInTheDocument();
  });
  it('adapta o nome ao salão', () => {
    state.theme = 'beauty'; mount();
    expect(screen.getByRole('heading', { name: 'Sua hora de atendimento' })).toBeInTheDocument();
  });
  it('guia quando não existem horários, com botão e sem inventar números', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, worked_minutes: 0, available_minutes: null, cost_per_hour: null, margin_per_hour: null, idle_cost: null, revenue_per_available_hour: null }, professionals: [], services: [] }; mount();
    expect(screen.getByText(/defina os horários de trabalho/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Definir horários' })).toHaveAttribute('href', '/configuracoes/financeiro');
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });
  it('distingue período sem horas abertas e mantém o rendimento por hora atendendo', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 0, cost_per_hour: null, margin_per_hour: null, idle_cost: null, revenue_per_available_hour: null }, professionals: [], services: [] }; mount();
    expect(screen.getByText(/não houve horas abertas neste período/i)).toBeInTheDocument();
    expect(screen.getByText('Cada hora atendendo rendeu')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 100.00').length).toBeGreaterThan(0);
  });
  it('orienta conferir dados sem presumir a causa quando não dá para calcular quanto a hora precisa render', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, cost_per_hour: null, margin_per_hour: null }, professionals: [], services: [] };
    mount();
    expect(screen.getByText(/ainda não dá para dizer se paga as contas/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conferir contas e horários' })).toBeInTheDocument();
    expect(screen.queryByText(/sobrou cerca/i)).not.toBeInTheDocument();
  });
  it('identifica atendimentos sem profissional', () => {
    state.data = { month:'2026-11-01',role:'owner',total:metrics,professionals:[],unassigned_attendance_count:2 };
    mount();
    expect(screen.getByText(/2 atendimentos sem profissional marcado/)).toBeInTheDocument();
  });
  it('mostra o intervalo informado para não confundir com o mês inteiro', () => {
    render(<MemoryRouter><ChairHourCard month="2026-11-04" endDate="2026-11-09" /></MemoryRouter>);
    expect(screen.getByText(/04\/11\/2026.*09\/11\/2026/)).toBeInTheDocument();
  });
  it('destaca serviços em que sobra pouco', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [{ name: 'Barba', status: 'low' }] };
    mount();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText(/^Sobra pouco/)).toBeInTheDocument();
  });
  it('avisa quando há atendimentos sem dados para avaliar serviços, e some quando não há', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [], services_pending_count: 2 };
    const { unmount } = mount();
    expect(screen.getByText(/2 atendimentos ficaram de fora por falta de dados/i)).toBeInTheDocument();
    unmount();
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [], services_pending_count: 0 };
    mount();
    expect(screen.queryByText(/falta de dados/i)).not.toBeInTheDocument();
  });
  it('mostra carregamento com esqueleto', () => {
    state.status = 'loading'; mount();
    expect(screen.getByRole('status', { name: 'Carregando resultados' })).toBeInTheDocument();
  });
  it('não consulta período anterior para o gestor', () => {
    mount();
    expect(state.calls.some(args => (args[3] as { enabled?: boolean } | undefined)?.enabled === true)).toBe(false);
  });
});

describe('hora de cadeira — colaborador', () => {
  beforeEach(() => { state.role = 'staff'; });
  it('mostra "Sua agenda" sem custos, serviços, equipe ou sobra, mesmo com payload indevido', () => {
    const { container } = mount();
    expect(screen.getByRole('heading', { name: 'Sua agenda' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/sobra|contas|custo|margem|prejuízo|Por profissional|Ana/i);
    expect(screen.getByText('Cada hora atendendo rendeu')).toBeInTheDocument();
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
    expect(screen.getByText(/Você atendeu em/)).toHaveTextContent('5 de cada 10');
  });
  it('deixa claro que o valor não é comissão nem salário', () => {
    mount();
    expect(screen.getByText(/não é sua comissão nem seu salário/i)).toBeInTheDocument();
  });
  it('compara só com o próprio mês anterior, sem ranking', () => {
    state.data = { month: '2026-11-01', role: 'staff', professionals: [staffOnly] };
    state.prev = { month: '2026-10-01', role: 'staff', professionals: [{ ...staffOnly, revenue_per_worked_hour: 78, occupancy: 0.62 }] };
    mount();
    expect(state.calls.some(args => args[0] === '2026-10-01' && (args[3] as { enabled?: boolean }).enabled === true)).toBe(true);
    expect(screen.getByText(/R\$ 7\.00/)).toBeInTheDocument();
    expect(screen.getByText(/a mais que no mês anterior/)).toBeInTheDocument();
    expect(screen.getByText(/No mês anterior: 6 de cada 10/)).toBeInTheDocument();
  });
  it('preserva rendimento conhecido quando a jornada antiga é desconhecida', () => {
    state.data = { month:'2026-11-01',role:'staff',history_estimated:true,professionals:[{ id:'1',...metrics,available_minutes:null,revenue_per_available_hour:null,occupancy:null }] };
    mount();
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
    expect(screen.getByText('Período antigo: horários estimados')).toBeInTheDocument();
    expect(screen.getByText(/sem horário de trabalho registrado/i)).toBeInTheDocument();
  });
  it('não apresenta valores de outro profissional', () => {
    state.data = { month: '2026-11-01', role: 'staff', professionals: [{ id: '2', name: 'Outra pessoa', ...metrics }] };
    mount();
    expect(screen.queryByText('R$ 100.00')).not.toBeInTheDocument();
    expect(screen.getByText(/peça ao responsável para definir seus horários/i)).toBeInTheDocument();
  });
  it('explica quando ainda não está vinculado', () => {
    state.teamMemberId = null; mount();
    expect(screen.getByText(/perfil ainda não vinculado/i)).toBeInTheDocument();
  });
});
