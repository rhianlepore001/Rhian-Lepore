import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Minus,
  MoreVertical,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import {
  useCreateProduct,
  useProducts,
  useSellProduct,
  useUpdateProduct,
} from '@/hooks/useCatalog';
import { formatCurrency } from '@/utils/formatters';
import type { Product } from '@/types/catalog';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  SkeletonCard,
  Table,
  useToast,
  type TableColumn,
} from '@/components/ui';

type StockFilter = 'all' | 'low';

interface ProductFormState {
  name: string;
  salePrice: string;
  costPrice: string;
  stockQuantity: string;
  minStockQuantity: string;
}

interface FormErrors {
  name?: string;
  salePrice?: string;
  costPrice?: string;
  stockQuantity?: string;
  minStockQuantity?: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  salePrice: '',
  costPrice: '',
  stockQuantity: '0',
  minStockQuantity: '0',
};

function isLowStock(product: Product): boolean {
  return product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_quantity;
}

function parseSellError(error: unknown): 'insufficient_stock' | 'product_not_found' | 'generic' {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('insufficient_stock')) return 'insufficient_stock';
  if (
    message.includes('product_not_found') ||
    message.includes('not authorized') ||
    message.includes('permission')
  ) {
    return 'product_not_found';
  }
  return 'generic';
}

function validateForm(form: ProductFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Informe o nome';
  const salePrice = parseFloat(form.salePrice);
  if (form.salePrice === '' || isNaN(salePrice) || salePrice < 0) {
    errors.salePrice = 'Informe um preço válido';
  }
  const costPrice = parseFloat(form.costPrice);
  if (form.costPrice === '' || isNaN(costPrice) || costPrice < 0) {
    errors.costPrice = 'Informe um custo válido';
  }
  const stock = parseInt(form.stockQuantity, 10);
  if (form.stockQuantity === '' || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    errors.stockQuantity = 'Informe um estoque válido';
  }
  const minStock = parseInt(form.minStockQuantity, 10);
  if (form.minStockQuantity === '' || isNaN(minStock) || minStock < 0 || !Number.isInteger(minStock)) {
    errors.minStockQuantity = 'Informe um mínimo válido';
  }
  return errors;
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    salePrice: String(product.sale_price),
    costPrice: String(product.cost_price),
    stockQuantity: String(product.stock_quantity),
    minStockQuantity: String(product.min_stock_quantity),
  };
}

export const Products: React.FC = () => {
  const { companyId, role, region } = useAuth();
  const { colors } = useBrutalTheme();
  const isOwner = role === 'owner';
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const currencySymbol = region === 'PT' ? '€' : 'R$';

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellError, setSellError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [moreMenuProduct, setMoreMenuProduct] = useState<Product | null>(null);
  const { showToast } = useToast();

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useProducts({
    companyId: companyId ?? '',
    includeInactive: isOwner,
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const sellMutation = useSellProduct();

  const lowStockProducts = useMemo(
    () => products.filter(p => p.is_active && isLowStock(p)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter(product => {
      if (stockFilter === 'low' && !isLowStock(product)) return false;
      if (query && !product.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, searchQuery, stockFilter]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setFormErrors({});
    setFormOpen(true);
    setMoreMenuProduct(null);
  };

  const openSellModal = (product: Product) => {
    setSellProduct(product);
    setSellQuantity(1);
    setSellError(null);
  };

  const closeFormModal = () => {
    setFormOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const handleSaveProduct = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    if (!companyId) return;

    const payload = {
      companyId,
      name: form.name.trim(),
      salePrice: parseFloat(form.salePrice),
      costPrice: parseFloat(form.costPrice),
      stockQuantity: parseInt(form.stockQuantity, 10),
      minStockQuantity: parseInt(form.minStockQuantity, 10),
    };

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          ...payload,
          productId: editingProduct.id,
        });
        showToast('Produto salvo', 'success');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('Produto salvo', 'success');
      }
      closeFormModal();
    } catch {
      showToast('Não foi possível salvar o produto', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget || !companyId) return;
    try {
      await updateMutation.mutateAsync({
        companyId,
        productId: deactivateTarget.id,
        isActive: false,
      });
      showToast('Produto desativado', 'success');
      setDeactivateTarget(null);
      setMoreMenuProduct(null);
    } catch {
      showToast('Não foi possível desativar o produto', 'error');
    }
  };

  const handleConfirmSell = async () => {
    if (!sellProduct) return;
    setSellError(null);
    try {
      await sellMutation.mutateAsync({
        productId: sellProduct.id,
        quantity: sellQuantity,
      });
      showToast('Venda registrada', 'success');
      setSellProduct(null);
    } catch (error) {
      const kind = parseSellError(error);
      if (kind === 'insufficient_stock') {
        setSellError(`Estoque insuficiente. Disponível: ${sellProduct.stock_quantity} un.`);
      } else if (kind === 'product_not_found') {
        showToast('Produto indisponível. Atualize a página.', 'error');
        setSellProduct(null);
        refetch();
      } else {
        showToast('Não foi possível concluir a venda', 'error');
      }
    }
  };

  const formatPrice = (value: number) => formatCurrency(value, currencyRegion);

  const renderStockBadge = (product: Product) => {
    if (!product.is_active) {
      return <Badge variant="neutral">Inativo</Badge>;
    }
    if (product.stock_quantity === 0) {
      return <Badge variant="danger">Sem estoque</Badge>;
    }
    if (isLowStock(product)) {
      return <Badge variant="warning">Estoque baixo</Badge>;
    }
    return null;
  };

  const renderProductActions = (product: Product, mobile = false) => (
    <div className={`flex items-center gap-2 ${mobile ? 'justify-between' : ''}`}>
      <Button
        variant="primary"
        size={mobile ? 'md' : 'sm'}
        onClick={() => openSellModal(product)}
        disabled={!product.is_active || product.stock_quantity === 0}
      >
        Vender
      </Button>
      {isOwner && (
        <>
          <Button variant="ghost" size="sm" onClick={() => openEditModal(product)}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMoreMenuProduct(product)}
            aria-label="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );

  const renderMobileCard = (product: Product) => {
    const margin = product.sale_price - product.cost_price;
    const marginPct = product.sale_price > 0 ? Math.round((margin / product.sale_price) * 100) : 0;
    const outOfStock = product.stock_quantity === 0;

    return (
      <Card
        key={product.id}
        className={`${outOfStock ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`text-sm font-semibold ${colors.text}`}>{product.name}</h3>
          {renderStockBadge(product)}
        </div>
        <p className={`font-mono text-base font-bold tabular-nums ${colors.text} mb-2`}>
          {formatPrice(product.sale_price)}
        </p>
        <p className={`text-xs ${colors.textSecondary} mb-1`}>
          Estoque: {product.stock_quantity} un.
          {isOwner && <> · mín. {product.min_stock_quantity}</>}
        </p>
        {isOwner && (
          <p className={`text-xs ${colors.textSecondary} mb-4`}>
            Margem: {formatPrice(margin)} ({marginPct}%)
          </p>
        )}
        <div className={`border-t ${colors.divider} pt-3`}>
          {renderProductActions(product, true)}
        </div>
      </Card>
    );
  };

  const tableColumns: TableColumn<Product>[] = useMemo(() => {
    const cols: TableColumn<Product>[] = [
      {
        key: 'name',
        header: 'Produto',
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {renderStockBadge(row)}
          </div>
        ),
      },
      {
        key: 'sale_price',
        header: 'Preço venda',
        align: 'right',
        headerClassName: 'font-mono uppercase text-xs',
        render: (row) => (
          <span className="font-mono tabular-nums">{formatPrice(row.sale_price)}</span>
        ),
      },
    ];

    if (isOwner) {
      cols.push(
        {
          key: 'cost_price',
          header: 'Custo',
          align: 'right',
          headerClassName: 'font-mono uppercase text-xs',
          render: (row) => (
            <span className={`font-mono tabular-nums ${colors.textSecondary}`}>
              {formatPrice(row.cost_price)}
            </span>
          ),
        },
        {
          key: 'margin',
          header: 'Margem',
          align: 'right',
          headerClassName: 'font-mono uppercase text-xs',
          render: (row) => {
            const margin = row.sale_price - row.cost_price;
            const pct = row.sale_price > 0 ? Math.round((margin / row.sale_price) * 100) : 0;
            return (
              <span className={`font-mono tabular-nums text-xs ${colors.textSecondary}`}>
                {formatPrice(margin)} ({pct}%)
              </span>
            );
          },
        }
      );
    }

    cols.push(
      {
        key: 'stock',
        header: 'Estoque',
        align: 'center',
        render: (row) => (
          <span className="font-mono tabular-nums text-sm">
            {row.stock_quantity}
            {isLowStock(row) && (
              <Badge variant="warning" className="ml-2 text-xs">
                Baixo
              </Badge>
            )}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        render: (row) =>
          row.is_active ? (
            <Badge variant="success">Ativo</Badge>
          ) : (
            <Badge variant="neutral">Inativo</Badge>
          ),
      },
      {
        key: 'actions',
        header: 'Ações',
        align: 'right',
        render: (row) => renderProductActions(row),
      }
    );

    return cols;
  }, [isOwner, colors, currencyRegion]);

  if (!companyId) {
    return (
      <ErrorState
        title="Sessão inválida"
        message="Não foi possível identificar sua empresa. Faça login novamente."
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${colors.text}`}>
            Produtos
          </h1>
          <p className={`text-xs md:text-sm ${colors.textSecondary} mt-0.5`}>
            Catálogo e vendas avulsas
          </p>
        </div>
        {isOwner && (
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
            className="shrink-0"
          >
            Cadastrar
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          size="md"
        />
        <Select
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'low', label: 'Estoque baixo' },
          ]}
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          size="md"
          fullWidth={false}
          className="sm:w-48"
        />
      </div>

      {/* Low stock banner (owner) */}
      {isOwner && lowStockProducts.length > 0 && stockFilter !== 'low' && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${colors.border} ${colors.card}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
            <span className={`text-xs ${colors.text}`}>
              {lowStockProducts.length} produto{lowStockProducts.length !== 1 ? 's' : ''} abaixo do mínimo
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStockFilter('low')}>
            Ver
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading && (
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {isLoading && (
        <div className="hidden md:block space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="!p-3" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Não foi possível carregar os produtos"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Cadastre seu primeiro produto para vender no balcão."
          action={
            isOwner ? (
              <Button variant="primary" size="md" onClick={openCreateModal}>
                Cadastrar produto
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && products.length > 0 && filteredProducts.length === 0 && (
        <EmptyState
          icon={Search}
          title="Nenhum produto encontrado"
          description="Tente outro termo ou limpe o filtro."
        />
      )}

      {!isLoading && !isError && filteredProducts.length > 0 && (
        <>
          <div className="md:hidden space-y-3">
            {filteredProducts.map(renderMobileCard)}
          </div>
          <div className="hidden md:block">
            <Card noPadding>
              <Table
                columns={tableColumns}
                data={filteredProducts}
                rowKey={(row) => row.id}
              />
            </Card>
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingProduct ? 'Editar produto' : 'Cadastrar produto'}
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {editingProduct?.is_active && (
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  setDeactivateTarget(editingProduct);
                  closeFormModal();
                }}
                className="sm:mr-auto"
              >
                Desativar produto
              </Button>
            )}
            <Button variant="ghost" size="md" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSaveProduct}
            >
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            error={formErrors.name}
          />
          <Input
            label="Preço de venda"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            icon={<span className="text-xs font-mono">{currencySymbol}</span>}
            value={form.salePrice}
            onChange={(e) => setForm(prev => ({ ...prev, salePrice: e.target.value }))}
            error={formErrors.salePrice}
          />
          <Input
            label="Custo"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            icon={<span className="text-xs font-mono">{currencySymbol}</span>}
            value={form.costPrice}
            onChange={(e) => setForm(prev => ({ ...prev, costPrice: e.target.value }))}
            error={formErrors.costPrice}
          />
          <Input
            label="Estoque"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={form.stockQuantity}
            onChange={(e) => setForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
            error={formErrors.stockQuantity}
          />
          <Input
            label="Estoque mínimo"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={form.minStockQuantity}
            onChange={(e) => setForm(prev => ({ ...prev, minStockQuantity: e.target.value }))}
            error={formErrors.minStockQuantity}
          />
        </div>
      </Modal>

      {/* Sell Modal */}
      <Modal
        open={!!sellProduct}
        onClose={() => setSellProduct(null)}
        title={sellProduct ? `Vender · ${sellProduct.name}` : 'Vender'}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="md" onClick={() => setSellProduct(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={sellMutation.isPending}
              onClick={handleConfirmSell}
            >
              Confirmar venda
            </Button>
          </div>
        }
      >
        {sellProduct && (
          <div className="space-y-4">
            <p className={`text-sm ${colors.textSecondary}`}>
              Disponível: {sellProduct.stock_quantity} un.
            </p>
            <p className={`text-sm ${colors.textSecondary}`}>
              Preço unit.:{' '}
              <span className="font-mono tabular-nums">{formatPrice(sellProduct.sale_price)}</span>
            </p>

            <div className="flex items-center justify-between gap-4">
              <span className={`text-sm font-medium ${colors.text}`}>Quantidade</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setSellQuantity(q => Math.max(1, q - 1))}
                  disabled={sellQuantity <= 1}
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className={`font-mono text-lg tabular-nums w-8 text-center ${colors.text}`}>
                  {sellQuantity}
                </span>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() =>
                    setSellQuantity(q => Math.min(sellProduct.stock_quantity, q + 1))
                  }
                  disabled={sellQuantity >= sellProduct.stock_quantity}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className={`text-sm font-semibold ${colors.text}`}>
              Total:{' '}
              <span className="font-mono tabular-nums">
                {formatPrice(sellProduct.sale_price * sellQuantity)}
              </span>
            </p>

            {sellError && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {sellError}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Deactivate confirmation */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Desativar produto"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="md" onClick={() => setDeactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={updateMutation.isPending}
              onClick={handleDeactivate}
            >
              Desativar
            </Button>
          </div>
        }
      >
        {deactivateTarget && (
          <p className={`text-sm ${colors.textSecondary}`}>
            Tem certeza que deseja desativar <strong className={colors.text}>{deactivateTarget.name}</strong>?
            O produto não aparecerá mais para vendas.
          </p>
        )}
      </Modal>

      {/* More options menu */}
      <Modal
        open={!!moreMenuProduct}
        onClose={() => setMoreMenuProduct(null)}
        title={moreMenuProduct?.name}
        size="sm"
        showCloseButton
      >
        {moreMenuProduct && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => openEditModal(moreMenuProduct)}
            >
              Editar produto
            </Button>
            {moreMenuProduct.is_active && (
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  setDeactivateTarget(moreMenuProduct);
                  setMoreMenuProduct(null);
                }}
              >
                Desativar produto
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
