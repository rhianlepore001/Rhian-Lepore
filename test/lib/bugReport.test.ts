import { describe, it, expect } from 'vitest';
import { categoryFromRoute, buildTitle, inferType } from '@/lib/bugReport';

describe('bugReport — categoryFromRoute', () => {
  it('mapeia rotas conhecidas para a área correta', () => {
    expect(categoryFromRoute('#/agenda')).toBe('agenda');
    expect(categoryFromRoute('#/financeiro')).toBe('finance');
    expect(categoryFromRoute('#/clientes/123')).toBe('clients');
    expect(categoryFromRoute('#/fila')).toBe('queue');
    expect(categoryFromRoute('#/queue/abc')).toBe('queue');
    expect(categoryFromRoute('#/configuracoes/equipe')).toBe('settings');
    expect(categoryFromRoute('#/login')).toBe('login');
    expect(categoryFromRoute('#/forgot-password')).toBe('login');
  });

  it('cai em "other" para rotas desconhecidas ou vazias', () => {
    expect(categoryFromRoute('#/dashboard')).toBe('other');
    expect(categoryFromRoute('')).toBe('other');
    expect(categoryFromRoute('#/produtos')).toBe('other');
  });

  it('todas as categorias retornadas respeitam o CHECK da tabela', () => {
    const validas = ['agenda', 'login', 'clients', 'finance', 'queue', 'settings', 'modal', 'other'];
    const rotas = ['#/agenda', '#/financeiro', '#/clientes', '#/fila', '#/configuracoes', '#/login', '#/qualquer'];
    for (const r of rotas) {
      expect(validas).toContain(categoryFromRoute(r));
    }
  });
});

describe('bugReport — buildTitle', () => {
  it('usa a primeira linha da descrição quando há texto', () => {
    expect(buildTitle('bug', 'Modal não fecha\nsegunda linha', '#/agenda')).toBe('Modal não fecha');
  });

  it('trunca títulos longos com reticências', () => {
    const longo = 'a'.repeat(200);
    const title = buildTitle('bug', longo, '#/agenda');
    expect(title.length).toBeLessThanOrEqual(90);
    expect(title.endsWith('…')).toBe(true);
  });

  it('gera um padrão por tipo + área quando não há descrição', () => {
    expect(buildTitle('bug', '', '#/agenda')).toBe('Problema em agenda');
    expect(buildTitle('idea', null, '#/financeiro')).toBe('Sugestão em finance');
    expect(buildTitle('question', '   ', '#/desconhecida')).toBe('Dúvida em other');
  });
});

describe('bugReport — inferType', () => {
  it('mantém idea/question e força bug no resto', () => {
    expect(inferType('idea')).toBe('idea');
    expect(inferType('question')).toBe('question');
    expect(inferType('bug')).toBe('bug');
  });
});
