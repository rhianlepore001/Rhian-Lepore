import React from 'react';
import { Package } from 'lucide-react';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { PublicProductCatalogItem } from '@/types/catalog';

interface PublicProductsShowcaseProps {
  products: PublicProductCatalogItem[];
  currencyRegion: Region;
  searchQuery?: string;
  mode: 'section' | 'tab';
  onClearSearch?: () => void;
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const PublicProductsShowcase: React.FC<PublicProductsShowcaseProps> = ({
  products,
  currencyRegion,
  searchQuery = '',
  mode,
  onClearSearch,
}) => {
  const { colors, accent } = useBrutalTheme();

  if (products.length === 0) return null;

  const query = normalizeSearch(searchQuery);
  const visibleProducts = query
    ? products.filter((product) => {
        const haystack = normalizeSearch(`${product.name} ${product.description ?? ''}`);
        return haystack.includes(query);
      })
    : products;

  if (mode === 'section' && visibleProducts.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="public-products-showcase-heading"
      data-testid="public-products-showcase"
      className={mode === 'section' ? `space-y-3 pt-4 border-t ${colors.divider}` : 'space-y-3'}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="public-products-showcase-heading"
          className={`font-heading text-lg md:text-xl font-bold tracking-tight ${colors.text}`}
        >
          Produtos disponíveis
        </h3>
        <p className={`text-xs ${colors.textSecondary}`}>
          Disponíveis no local · peça ao profissional no atendimento
        </p>
      </div>

      {visibleProducts.length === 0 ? (
        <div
          className={`rounded-xl border p-6 text-center space-y-2 ${colors.card} ${colors.border}`}
          data-testid="public-products-empty-search"
        >
          <p className={`text-sm font-medium ${colors.text}`}>
            Nenhum produto encontrado para essa busca.
          </p>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className={`text-xs font-semibold underline underline-offset-2 ${accent.text}`}
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-5">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              data-testid={`public-product-card-${product.id}`}
              className={`grid min-h-[102px] min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border p-2.5 text-left md:block md:overflow-hidden md:p-0 ${colors.card} ${colors.border}`}
            >
              <div
                className={`flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-lg md:aspect-auto md:h-44 md:rounded-none ${colors.surface}`}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className={`h-6 w-6 ${accent.text}`} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 md:p-4">
                <h4 className={`break-words text-[0.9375rem] font-bold leading-tight md:text-lg ${colors.text}`}>
                  {product.name}
                </h4>
                {product.description && (
                  <p className={`mt-1 line-clamp-2 text-xs leading-snug ${colors.textSecondary}`}>
                    {product.description}
                  </p>
                )}
                <p className={`mt-1.5 text-sm font-bold tabular-nums ${accent.text}`}>
                  {formatCurrency(Number(product.sale_price), currencyRegion)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
