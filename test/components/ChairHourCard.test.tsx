import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChairHourCard } from '@/components/performance/ChairHourCard';

const state = vi.hoisted(() => ({ role: 'owner', teamMemberId: '1' as string | null, theme: 'barber', data: null as unknown, status: 'ready' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role, teamMemberId: state.teamMemberId }) }));
vi.mock('@/hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ chairHour: state.theme === 'beauty' ? 'hora de atendimento' : 'hora de cadeira' }) }));
vi.mock('@/hooks/useTenantLocale', () => ({ useTenantLocale: () => ({ formatMoney: (n: number) => `R$ ${n.toFixed(2)}` }) }));
vi.mock('@/hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '', textSecondary: '' }, radius: { card: '' }, density: { cardPadding: '' }, shadow: { card: '' }, classes: {} }) }));
vi.mock('@/hooks/useChairHour', () => ({ useChairHour: () => ({ data: state.data, status: state.status, retry: vi.fn() }) }));

const metrics = { available_minutes: 600, worked_minutes: 300, estimated_count: 1, revenue: 500, revenue_per_worked_hour: 100, revenue_per_available_hour: 50, occupancy: 0.5, cost_per_hour: 25, margin_per_hour: 75, idle_cost: 125 };
const mount = () => render(<MemoryRouter><ChairHourCard month="2026-11-01" /></MemoryRouter>);

beforeEach(() => { state.role = 'owner'; state.teamMemberId = '1'; state.theme = 'barber'; state.status = 'ready'; state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [{ id: '1', name: 'Ana', ...metrics }], services: [{ name: 'Corte', status: 'loss' }] }; });

describe('hora de trabalho', () => {
  it('apresenta custos, rentabilidade e serviços para o dono', () => {
    mount();
    expect(screen.getByText(/hora de cadeira/i)).toBeInTheDocument();
    expect(screen.getAllByText(/custo das horas paradas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/dá prejuízo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/estimado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tempo estimado em 1 atendimento.').length).toBeGreaterThan(0);
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
  it('adapta o nome ao salão', () => {
    state.theme = 'beauty'; mount();
    expect(screen.getByText(/hora de atendimento/i)).toBeInTheDocument();
  });
  it('nunca mostra custos, serviços, totais ou outros profissionais para colaborador mesmo com payload indevido', () => {
    state.role = 'staff'; mount();
    expect(screen.queryByText(/custo das horas paradas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/margem/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dá prejuízo/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText(/ocupação/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
  });
  it('orienta quando não existem horas sem inventar números', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: null, cost_per_hour: null, margin_per_hour: null, idle_cost: null, revenue_per_available_hour: null }, professionals: [], services: [] }; mount();
    expect(screen.getByText(/configure.*horário/i)).toBeInTheDocument();
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });
  it('distingue período sem horas disponíveis e mantém receita por hora trabalhada', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, available_minutes: 0, cost_per_hour: null, margin_per_hour: null, idle_cost: null, revenue_per_available_hour: null }, professionals: [], services: [] }; mount();
    expect(screen.getByText(/não há horas disponíveis neste período/i)).toBeInTheDocument();
    expect(screen.queryByText(/configure.*horário/i)).not.toBeInTheDocument();
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
    expect(screen.getByText('Receita por hora trabalhada')).toBeInTheDocument();
  });
  it('não apresenta valores de outro profissional ao colaborador', () => {
    state.role = 'staff';
    state.data = { month: '2026-11-01', role: 'staff', professionals: [{ id: '2', name: 'Outra pessoa', ...metrics }] };
    mount();
    expect(screen.queryByText('R$ 100.00')).not.toBeInTheDocument();
  });
  it('explica quando o colaborador ainda não está vinculado', () => {
    state.role = 'staff'; state.teamMemberId = null; mount();
    expect(screen.getByText(/perfil ainda não vinculado/i)).toBeInTheDocument();
  });
  it('mostra o intervalo informado para evitar confundir a análise com mês inteiro', () => {
    render(<MemoryRouter><ChairHourCard month="2026-11-04" endDate="2026-11-09" /></MemoryRouter>);
    expect(screen.getByText(/04\/11\/2026.*09\/11\/2026/)).toBeInTheDocument();
  });
  it('destaca serviços que rendem pouco', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [{ name: 'Barba', status: 'low' }] };
    mount();
    expect(screen.getByText(/Barba.*Rende pouco/)).toBeInTheDocument();
  });
  it('avisa o dono quando há atendimentos sem dados suficientes para avaliar serviços', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [], services_pending_count: 2 };
    mount();
    expect(screen.getByText(/2 atendimentos.*sem dados suficientes para avaliar os serviços/i)).toBeInTheDocument();
  });
  it('não mostra aviso de pendência para o colaborador', () => {
    state.role = 'staff';
    state.data = { month: '2026-11-01', role: 'staff', professionals: [{ id: '1', ...metrics }], services_pending_count: 2 };
    mount();
    expect(screen.queryByText(/sem dados suficientes para avaliar os serviços/i)).not.toBeInTheDocument();
  });
  it('não mostra pendência quando todos os atendimentos puderam ser avaliados', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: metrics, professionals: [], services: [], services_pending_count: 0 };
    mount();
    expect(screen.queryByText(/sem dados suficientes para avaliar os serviços/i)).not.toBeInTheDocument();
  });
  it('orienta revisar dados sem presumir a causa quando o custo por hora não pode ser calculado', () => {
    state.data = { month: '2026-11-01', role: 'owner', total: { ...metrics, cost_per_hour: null }, professionals: [], services: [] };
    mount();
    expect(screen.getByText(/confira os custos, horários e dados dos atendimentos para calcular a margem/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe os custos em configurações financeiras/i)).not.toBeInTheDocument();
  });
});
