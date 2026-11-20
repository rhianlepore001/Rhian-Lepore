import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: {
      card: 'bg-card',
      border: 'border-theme',
      surface: 'bg-surface',
      divider: 'border-divider',
      text: 'text-main',
      textSecondary: 'text-sec',
      textMuted: 'text-muted',
    },
    accent: { text: 'text-accent', bg: 'bg-accent' },
  }),
}));

import { PublicProductsShowcase } from '@/components/booking/PublicProductsShowcase';
import type { PublicProductCatalogItem } from '@/types/catalog';

const sampleProducts: PublicProductCatalogItem[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Pomada Modeladora Matte',
    description: 'Fixação média com acabamento fosco, 150g.',
    sale_price: 58,
    image_url: 'https://cdn.example.com/pomada.webp',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Óleo para Barba',
    description: null,
    sale_price: 49.5,
    image_url: null,
  },
];

describe('PublicProductsShowcase', () => {
  it('exibe foto, nome, descrição e preço sem mostrar estoque nem botões de carrinho', () => {
    render(
      <PublicProductsShowcase
        products={sampleProducts}
        currencyRegion="BR"
        mode="section"
      />,
    );

    expect(screen.getByText('Produtos disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Pomada Modeladora Matte')).toBeInTheDocument();
    expect(screen.getByText('Fixação média com acabamento fosco, 150g.')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*58,00/)).toBeInTheDocument();
    expect(screen.getByAltText('Pomada Modeladora Matte')).toHaveAttribute(
      'src',
      'https://cdn.example.com/pomada.webp',
    );
    expect(screen.getByText('Óleo para Barba')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aumentar|Diminuir/i })).toBeNull();
    expect(screen.queryByText(/un\./i)).toBeNull();
  });

  it('formata preço em euro para região PT', () => {
    render(
      <PublicProductsShowcase
        products={[sampleProducts[0]]}
        currencyRegion="PT"
        mode="tab"
      />,
    );

    expect(screen.getByText(/58,00\s*€/)).toBeInTheDocument();
  });

  it('filtra por nome/descrição e oferece limpar busca na aba Produtos', () => {
    const onClearSearch = vi.fn();
    render(
      <PublicProductsShowcase
        products={sampleProducts}
        currencyRegion="BR"
        searchQuery="inexistente"
        mode="tab"
        onClearSearch={onClearSearch}
      />,
    );

    expect(screen.getByTestId('public-products-empty-search')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onClearSearch).toHaveBeenCalledOnce();
  });

  it('não renderiza nada quando não há produtos', () => {
    const { container } = render(
      <PublicProductsShowcase
        products={[]}
        currencyRegion="BR"
        mode="section"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
