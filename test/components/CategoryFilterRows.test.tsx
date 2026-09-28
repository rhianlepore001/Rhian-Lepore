import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from '../../components/appointment/CategoryFilter';

const mk = (names: string[]) => names.map((name, i) => ({ id: `c${i}`, name }));
const NAMES = ['Cortes', 'Barba', 'Combos', 'Coloração', 'Tratamentos', 'Sobrancelha', 'Pacotes', 'Infantil', 'Estética facial'];

function renderFilter(categories: Array<{ id: string; name: string }>, active = 'all') {
  const setActiveCategory = vi.fn();
  render(<CategoryFilter categories={categories} activeCategory={active} setActiveCategory={setActiveCategory} accentColor="" isBeauty={false} />);
  return setActiveCategory;
}

describe('CategoryFilter: 2 linhas com rolagem horizontal', () => {
  it('muitas categorias: 2 linhas, leitura por linha (Todos + primeiras na 1ª linha), todas presentes em ordem', () => {
    renderFilter(mk(NAMES));
    const rows = screen.getAllByTestId('category-filter-row');
    expect(rows).toHaveLength(2);
    const labels = rows.map((r) => within(r).getAllByRole('button').map((b) => b.textContent));
    expect(labels[0][0]).toBe('Todos');
    expect(labels[0][1]).toBe('Cortes');
    expect(labels.flat()).toEqual(['Todos', ...NAMES]);
    // linhas equilibradas (nenhuma fica com quase tudo)
    expect(Math.abs(labels[0].length - labels[1].length)).toBeLessThanOrEqual(2);
    // um único contêiner rola as duas linhas juntas
    expect(screen.getByTestId('category-filter').className).toMatch(/overflow-x-auto/);
  });

  it('poucas categorias (até 3 chips): uma linha só', () => {
    renderFilter(mk(['Cortes', 'Barba']));
    expect(screen.getAllByTestId('category-filter-row')).toHaveLength(1);
  });

  it('sem categorias (ex.: equipe antes da migration): não mostra filtro só com "Todos"', () => {
    renderFilter([]);
    expect(screen.queryByTestId('category-filter')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument();
  });

  it('chip ativo tem aria-pressed e clicar seleciona a categoria', async () => {
    const set = renderFilter(mk(NAMES), 'c2');
    expect(screen.getByRole('button', { name: 'Combos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Pacotes' }));
    expect(set).toHaveBeenCalledWith('c6');
  });
});
