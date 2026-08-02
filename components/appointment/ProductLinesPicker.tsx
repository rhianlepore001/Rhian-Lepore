import React from 'react';
import { Minus, Plus, Package } from 'lucide-react';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import type { Region } from '@/utils/formatters';
import type { Product } from '@/types/catalog';

export interface ProductLineSelection {
  productId: string;
  quantity: number;
}

interface ProductLinesPickerProps {
  products: Product[];
  value: ProductLineSelection[];
  onChange: (lines: ProductLineSelection[]) => void;
  currencyRegion?: Region;
  title?: string;
  compact?: boolean;
}

export const ProductLinesPicker: React.FC<ProductLinesPickerProps> = ({
  products,
  value,
  onChange,
  currencyRegion = 'BR',
  title = 'Produtos (opcional)',
  compact = false,
}) => {
  const { colors } = useBrutalTheme();
  const available = products.filter(p => p.is_active && p.stock_quantity > 0);

  const getQty = (productId: string) =>
    value.find(l => l.productId === productId)?.quantity ?? 0;

  const setQty = (productId: string, quantity: number, max: number) => {
    const nextQty = Math.max(0, Math.min(max, quantity));
    const others = value.filter(l => l.productId !== productId);
    if (nextQty <= 0) {
      onChange(others);
      return;
    }
    onChange([...others, { productId, quantity: nextQty }]);
  };

  if (available.length === 0) {
    return (
      <div className={`rounded-2xl border ${colors.border} p-4 ${colors.card}`}>
        <div className="flex items-center gap-2 mb-1">
          <Package className={`w-4 h-4 ${colors.textMuted}`} />
          <h3 className={`text-sm font-semibold ${colors.text}`}>{title}</h3>
        </div>
        <p className={`text-xs ${colors.textMuted}`}>Nenhum produto disponível em estoque.</p>
      </div>
    );
  }

  const total = value.reduce((sum, line) => {
    const product = available.find(p => p.id === line.productId);
    return sum + (product ? product.sale_price * line.quantity : 0);
  }, 0);

  return (
    <div className={`rounded-2xl border ${colors.border} ${compact ? 'p-3' : 'p-4'} ${colors.card}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Package className={`w-4 h-4 ${colors.textMuted}`} />
          <h3 className={`text-sm font-semibold ${colors.text}`}>{title}</h3>
        </div>
        {total > 0 && (
          <span className={`text-xs font-mono tabular-nums ${colors.textSecondary}`}>
            + {formatCurrency(total, currencyRegion)}
          </span>
        )}
      </div>
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {available.map(product => {
          const qty = getQty(product.id);
          return (
            <li
              key={product.id}
              className={`flex items-center justify-between gap-2 py-2 border-b last:border-0 ${colors.divider}`}
            >
              <div className="min-w-0">
                <p className={`text-sm truncate ${colors.text}`}>{product.name}</p>
                <p className={`text-xs font-mono tabular-nums ${colors.textSecondary}`}>
                  {formatCurrency(product.sale_price, currencyRegion)} · {product.stock_quantity} un.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQty(product.id, qty - 1, product.stock_quantity)}
                  disabled={qty <= 0}
                  aria-label={`Diminuir ${product.name}`}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className={`font-mono tabular-nums w-6 text-center text-sm ${colors.text}`}>
                  {qty}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQty(product.id, qty + 1, product.stock_quantity)}
                  disabled={qty >= product.stock_quantity}
                  aria-label={`Aumentar ${product.name}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
