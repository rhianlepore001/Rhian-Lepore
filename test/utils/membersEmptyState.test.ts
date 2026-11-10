import { describe, it, expect } from 'vitest';
import { membersEmptyState } from '../../utils/membersEmptyState';

describe('membersEmptyState', () => {
  it('sem filtro nem busca: frase completa, sem espaço antes do ponto', () => {
    const s = membersEmptyState('all', '');
    expect(s.title).toBe('Nenhum assinante ainda.');
    expect(s.title).not.toMatch(/\s[.!?]/);
    expect(s.hint).toBe('Crie planos em Configurações e compartilhe o link do clube.');
  });

  it.each([
    ['active', 'Nenhum assinante ativo.'],
    ['pending', 'Nenhum assinante pendente.'],
    ['overdue', 'Nenhum assinante atrasado.'],
    ['cancelled', 'Nenhum assinante cancelado.'],
  ] as const)('filtro %s: "%s"', (tab, title) => {
    const s = membersEmptyState(tab, '');
    expect(s.title).toBe(title);
    expect(s.hint).toBe('Mude o filtro para ver outros.');
  });

  it('busca sem resultado cita a busca', () => {
    const s = membersEmptyState('all', '  joão ');
    expect(s.title).toBe('Nenhum assinante encontrado para “joão”.');
    expect(s.hint).toBe('Confira a busca ou mude o filtro.');
  });

  it('nenhuma variação tem espaço sobrando', () => {
    for (const tab of ['all', 'active', 'pending', 'overdue', 'cancelled'] as const) {
      for (const q of ['', 'x']) {
        const { title, hint } = membersEmptyState(tab, q);
        for (const t of [title, hint]) {
          expect(t).toBe(t.trim());
          expect(t).not.toMatch(/\s{2,}|\s[.,!?]/);
        }
      }
    }
  });
});
