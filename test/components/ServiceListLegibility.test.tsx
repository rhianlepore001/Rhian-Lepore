import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ServiceList } from '../../components/appointment/ServiceList';

const LONG = 'COMBO 02 (CORTE + BARBA + PIGMENTAÇÃO)';
const cats = [
  { id: 'c-combos', name: 'Combos' },
  { id: 'c-cortes', name: 'Cortes' },
];
const services = [
  { id: 's1', name: LONG, price: 70, duration_minutes: 60, category_id: 'c-combos' },
  { id: 's2', name: 'Corte Social', price: 30, duration_minutes: 30, category_id: 'c-cortes' },
  { id: 's3', name: 'Barba', price: 20, duration_minutes: 30, category_id: 'c-barba' },
];
const base = {
  services,
  selectedServiceIds: [] as string[],
  toggleService: vi.fn(),
  isBeauty: false,
  currencyRegion: 'BR' as const,
  searchQuery: '',
  activeCategory: 'all',
  categories: cats,
  setSearchQuery: vi.fn(),
  isCustomService: false,
  setIsCustomService: vi.fn(),
  customServiceName: '',
  setCustomServiceName: vi.fn(),
  customServicePrice: '',
  setCustomServicePrice: vi.fn(),
  currencySymbol: 'R$',
};

describe('ServiceList: nome legível e categorias honestas', () => {
  it('nome longo quebra em até 2 linhas (sem truncate de 1 linha) e mantém o nome completo no title', () => {
    render(<ServiceList {...base} />);
    const title = screen.getByText(LONG);
    expect(title.className).not.toMatch(/\btruncate\b/);
    expect(title.className).toMatch(/line-clamp-2/);
    expect(title.className).toMatch(/break-words/);
    expect(title).toHaveAttribute('title', LONG);
  });

  it('cabeçalhos mostram os nomes reais das categorias, na ordem das categorias, e desconhecidas vão para "Outros serviços"', () => {
    render(<ServiceList {...base} />);
    const headers = screen.getAllByTestId('service-group-header').map((h) => h.textContent);
    expect(headers).toEqual(['Combos', 'Cortes', 'Outros serviços']);
    expect(screen.queryByText('Serviços')).not.toBeInTheDocument();
  });

  it('equipe sem acesso às categorias (lista vazia): nenhum cabeçalho falso "Serviços", todos os serviços listados', () => {
    render(<ServiceList {...base} categories={[]} />);
    expect(screen.queryAllByTestId('service-group-header')).toHaveLength(0);
    expect(screen.queryByText('Serviços')).not.toBeInTheDocument();
    const list = screen.getByTestId('service-groups');
    for (const s of services) expect(within(list).getByText(s.name)).toBeInTheDocument();
  });

  it('filtrando por categoria não mostra cabeçalho', () => {
    render(<ServiceList {...base} activeCategory="c-combos" />);
    expect(screen.queryAllByTestId('service-group-header')).toHaveLength(0);
    expect(screen.getByText(LONG)).toBeInTheDocument();
    expect(screen.queryByText('Corte Social')).not.toBeInTheDocument();
  });
});
