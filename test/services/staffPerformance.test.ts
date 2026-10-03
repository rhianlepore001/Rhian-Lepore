import { beforeEach, describe, expect, it, vi } from 'vitest';
import team from '../fixtures/staffPerformance/team.json';
import detail from '../fixtures/staffPerformance/detail.json';
import staff from '../fixtures/staffPerformance/staff.json';
import cycle from '../fixtures/staffPerformance/cycle.json';

// Fixtures = saída real das funções no Postgres local (harness da seção 5 do ACCEPTANCE).
const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import {
  fetchStaffPerformance,
  fetchCommissionCycle,
  isRpcUnavailable,
  StaffPerformanceForbiddenError,
} from '@/services/staffPerformance';

describe('fetchStaffPerformance (get_staff_performance_v1)', () => {
  beforeEach(() => rpc.mockReset());

  it('chama a RPC com os parâmetros nomeados e defaults', async () => {
    rpc.mockResolvedValueOnce({ data: team, error: null });
    await fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30' });
    expect(rpc).toHaveBeenCalledWith('get_staff_performance_v1', {
      p_start: '2026-09-01', p_end: '2026-09-30', p_professional_id: null, p_compare: true,
    });
  });

  it('modo dono: membros, dono marcado, ranking por Retorno por hora (Ana 1, Bruno 2)', async () => {
    rpc.mockResolvedValueOnce({ data: team, error: null });
    const r = await fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30' });
    expect(r.mode).toBe('owner');
    if (r.mode !== 'owner') return;
    const ana = r.members.find((m) => m.name === 'Ana')!;
    expect(ana.metrics.retorno_por_hora).toBe(68);
    expect(ana.metrics.retorno).toBe(408);
    expect(ana.rank).toBe(1);
    expect(r.members.find((m) => m.name === 'Bruno')!.rank).toBe(2);
    const dono = r.members.find((m) => m.is_owner)!;
    expect(dono.rank).toBeNull();
    expect(dono.metrics.comissao_periodo).toBe(0);
    expect(r.period).toMatchObject({ start: '2026-09-01', end: '2026-09-30', currency: 'BRL', tz: 'America/Sao_Paulo' });
    expect(r.team_totals?.receita_gerada).toBeGreaterThan(0);
    expect(r.ranking_available).toBe(true);
    expect(r.trend).toBeNull();
  });

  it('detalhe: 6 meses de tendência e top serviços', async () => {
    rpc.mockResolvedValueOnce({ data: detail, error: null });
    const r = await fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30', professionalId: 'ana' });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_professional_id: 'ana' });
    if (r.mode !== 'owner') throw new Error('modo');
    expect(r.trend).toHaveLength(6);
    expect(r.trend![4]).toMatchObject({ month: '2026-08', retorno: 360, low_sample: false });
    expect(r.trend![0].low_sample).toBe(true);
    expect(r.top_services[0]).toEqual({ service: 'corte', count: 8 });
  });

  it('modo staff: só os próprios números — sem retorno, custo, ranking ou equipe, mesmo se o servidor mandar', async () => {
    const leaky = structuredClone(staff) as any;
    leaky.me.metrics.retorno = 999;
    leaky.me.metrics.custo_produtos = 1;
    leaky.me.rank = 1;
    leaky.members = [{}];
    leaky.trend[5].retorno = 1;
    rpc.mockResolvedValueOnce({ data: leaky, error: null });
    const r = await fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30' });
    expect(r.mode).toBe('staff');
    if (r.mode !== 'staff') return;
    expect(r.me.metrics.comissao_periodo).toBe(257);
    expect(r.me.previous?.comissao_periodo).toBe(240);
    expect(r.me.metrics).not.toHaveProperty('retorno');
    expect(r.me.metrics).not.toHaveProperty('custo_produtos');
    expect(r.me).not.toHaveProperty('rank');
    expect(r).not.toHaveProperty('members');
    expect(r.trend[5]).not.toHaveProperty('retorno');
    expect(r.trend[5].comissao).toBe(257);
  });

  it('42501 vira StaffPerformanceForbiddenError; payload inválido é erro (sem tela com lixo)', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'sem permissão' } });
    await expect(fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30' })).rejects.toBeInstanceOf(StaffPerformanceForbiddenError);
    rpc.mockResolvedValueOnce({ data: { mode: 'owner', members: 'x' }, error: null });
    await expect(fetchStaffPerformance({ start: '2026-09-01', end: '2026-09-30' })).rejects.toThrow();
  });
});

describe('fetchCommissionCycle (get_commission_cycle_v1)', () => {
  beforeEach(() => rpc.mockReset());

  it('sem data pede o ciclo padrão do servidor (p_cycle_end null)', async () => {
    rpc.mockResolvedValueOnce({ data: cycle, error: null });
    await fetchCommissionCycle();
    expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: null });
  });

  it('mapeia ciclo, navegação, totais e M1/M2 por colaborador', async () => {
    rpc.mockResolvedValueOnce({ data: cycle, error: null });
    const c = await fetchCommissionCycle('2026-10-05');
    expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: '2026-10-05' });
    expect(c.cycle).toEqual({ start: '2026-09-06', end: '2026-10-05', open: true });
    expect(c.previous_end).toBe('2026-09-05');
    expect(c.next_end).toBe('2026-11-05');
    expect(c.settlement_day).toBe(5);
    expect(c.totals).toEqual({ a_pagar_ciclo: 699, pendentes: 5, pago_ciclo: 0 });
    const caio = c.members.find((m) => m.name === 'Caio')!;
    expect(caio).toMatchObject({ a_pagar_ciclo: 100, saldo_acumulado: 107, saldo_anterior: 7, status: 'pendente', servicos_ciclo: 5, pago_ciclo_em: null });
    const ana = c.members.find((m) => m.name === 'Ana')!;
    expect(ana.ultimo_pagamento).toMatchObject({ amount: 264, end_date: '2026-09-05' });
    expect(c.members.find((m) => m.name === 'Eva')).toMatchObject({
      inactive: true, status: 'pendente', saldo_acumulado: 15, saldo_anterior: 15, primeiro_nao_pago: '2026-08-20',
    });
  });

  it('status desconhecido é rejeitado', async () => {
    const bad = structuredClone(cycle) as any;
    bad.members[0].status = 'talvez';
    rpc.mockResolvedValueOnce({ data: bad, error: null });
    await expect(fetchCommissionCycle()).rejects.toThrow();
  });
});

describe('isRpcUnavailable (migration ainda não aplicada)', () => {
  it.each([
    [{ code: 'PGRST202', message: 'Could not find the function' }, true],
    [{ code: '42883', message: 'function does not exist' }, true],
    [{ status: 404, message: 'Not Found' }, true],
    [{ code: '42501', message: 'sem permissão' }, false],
    [{ message: 'Failed to fetch' }, false],
    [null, false],
  ])('%j → %s', (err, expected) => {
    expect(isRpcUnavailable(err)).toBe(expected);
  });
});
