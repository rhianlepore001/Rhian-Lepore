import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Minus,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import {
  useCreateProduct,
  useProducts,
  useSellProduct,
  useUpdateProduct,
} from '@/hooks/useCatalog';
import { useTenantLocale } from '@/hooks/useTenantLocale';
import { deleteProductImage, uploadProductImage } from '@/services/catalog';
import {
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  validateProductImageFile,
} from '@/utils/productImage';
import type { Product } from '@/types/catalog';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonCard,
  Table,
  useToast,
  type TableColumn,
} from '@/components/ui';

type StockFilter = 'all' | 'low';

interface ProductFormState {
  name: string;
  description: string;
  salePrice: string;
  costPrice: string;
  stockQuantity: string;
  minStockQuantity: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  salePrice?: string;
  costPrice?: string;
  stockQuantity?: string;
  minStockQuantity?: string;
  image?: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
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
  if (form.description.trim().length > MAX_PRODUCT_DESCRIPTION_LENGTH) {
    errors.description = `Máximo de ${MAX_PRODUCT_DESCRIPTION_LENGTH} caracteres`;
  }
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
    description: product.description ?? '',
    salePrice: String(product.sale_price),
    costPrice: String(product.cost_price ?? 0),
    stockQuantity: String(product.stock_quantity),
    minStockQuantity: String(product.min_stock_quantity),
  };
}

export const Products: React.FC = () => {
  const { companyId, role } = useAuth();
  const { colors, classes } = useBrutalTheme();
  const { currencySymbol, formatMoney } = useTenantLocale();
  const isOwner = role === 'owner';

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellError, setSellError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [moreMenuProduct, setMoreMenuProduct] = useState<Product | null>(null);
  const { showToast } = useToast();

  const revokePreviewObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => revokePreviewObjectUrl, []);

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
    revokePreviewObjectUrl();
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageRemoved(false);
    setFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    revokePreviewObjectUrl();
    setEditingProduct(product);
    setForm(productToForm(product));
    setFormErrors({});
    setImageFile(null);
    setImagePreviewUrl(product.image_url ?? null);
    setImageRemoved(false);
    setFormOpen(true);
    setMoreMenuProduct(null);
  };

  const openSellModal = (product: Product) => {
    setSellProduct(product);
    setSellQuantity(1);
    setSellError(null);
  };

  const closeFormModal = () => {
    revokePreviewObjectUrl();
    setFormOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageRemoved(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateProductImageFile(file);
    if (validationError) {
      setFormErrors(prev => ({ ...prev, image: validationError }));
      return;
    }

    revokePreviewObjectUrl();
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setImageFile(file);
    setImagePreviewUrl(nextUrl);
    setImageRemoved(false);
    setFormErrors(prev => ({ ...prev, image: undefined }));
  };

  const handleRemoveImage = () => {
    revokePreviewObjectUrl();
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageRemoved(true);
    setFormErrors(prev => ({ ...prev, image: undefined }));
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    if (!companyId || isSavingProduct) return;

    setIsSavingProduct(true);
    let uploadedImageUrl: string | null = null;
    const previousImageUrl = editingProduct?.image_url ?? null;

    try {
      if (imageFile) {
        uploadedImageUrl = await uploadProductImage(companyId, imageFile);
      }

      const trimmedDescription = form.description.trim();
      const resolvedImageUrl = uploadedImageUrl
        ?? (imageRemoved ? null : previousImageUrl);

      const payload = {
        companyId,
        name: form.name.trim(),
        description: trimmedDescription || null,
        imageUrl: resolvedImageUrl,
        salePrice: parseFloat(form.salePrice),
        costPrice: parseFloat(form.costPrice),
        stockQuantity: parseInt(form.stockQuantity, 10),
        minStockQuantity: parseInt(form.minStockQuantity, 10),
      };

      if (editingProduct) {
        await updateMutation.mutateAsync({
          ...payload,
          productId: editingProduct.id,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      if (previousImageUrl && previousImageUrl !== resolvedImageUrl) {
        await deleteProductImage(companyId, previousImageUrl).catch(() => undefined);
      }

      showToast('Produto salvo', 'success');
      closeFormModal();
    } catch (error) {
      if (uploadedImageUrl) {
        await deleteProductImage(companyId, uploadedImageUrl).catch(() => undefined);
      }
      const message = error instanceof Error && error.message && /imagem|foto|JPG|PNG|WebP|MB/i.test(error.message)
        ? error.message
        : 'Não foi possível salvar o produto';
      showToast(message, 'error');
    } finally {
      setIsSavingProduct(false);
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

  const formatPrice = (value: number) => formatMoney(value);

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

  const renderProductThumb = (product: Product, sizeClass: string) => (
    <div
      className={`${sizeClass} aspect-square shrink-0 overflow-hidden rounded-xl border ${colors.border} ${colors.surface} flex items-center justify-center`}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <Package className={`h-5 w-5 ${colors.textMuted}`} aria-hidden="true" />
      )}
    </div>
  );

  const renderMobileCard = (product: Product) => {
    const margin = product.cost_price == null ? null : product.sale_price - product.cost_price;
    const marginPct = margin != null && product.sale_price > 0 ? Math.round((margin / product.sale_price) * 100) : 0;
    const outOfStock = product.stock_quantity === 0;

    return (
      <Card
        key={product.id}
        className={`${outOfStock ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-3 mb-3">
          {renderProductThumb(product, 'w-14 h-14')}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`text-sm font-semibold break-words ${colors.text}`}>{product.name}</h3>
              {renderStockBadge(product)}
            </div>
            {product.description && (
              <p className={`text-xs line-clamp-2 mt-0.5 ${colors.textSecondary}`}>
                {product.description}
              </p>
            )}
            <p className={`font-mono text-base font-bold tabular-nums ${colors.text} mt-1.5`}>
              {formatPrice(product.sale_price)}
            </p>
          </div>
        </div>
        <p className={`text-xs ${colors.textSecondary} mb-1`}>
          Estoque: {product.stock_quantity} un.
          {isOwner && <> · mín. {product.min_stock_quantity}</>}
        </p>
        {isOwner && (
          <p className={`text-xs ${colors.textSecondary} mb-4`}>
            Margem: {margin == null ? '—' : `${formatPrice(margin)} (${marginPct}%)`}
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
          <div className="flex items-center gap-3 min-w-0">
            {renderProductThumb(row, 'w-10 h-10')}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{row.name}</span>
                {renderStockBadge(row)}
              </div>
              {row.description && (
                <p className={`text-xs truncate max-w-xs ${colors.textSecondary}`}>
                  {row.description}
                </p>
              )}
            </div>
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
              {row.cost_price == null ? '—' : formatPrice(row.cost_price)}
            </span>
          ),
        },
        {
          key: 'margin',
          header: 'Margem',
          align: 'right',
          headerClassName: 'font-mono uppercase text-xs',
          render: (row) => {
            if (row.cost_price == null) return <span>—</span>;
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
  }, [isOwner, colors, currencySymbol]);

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
      <PageHeader
        title="Produtos"
        subtitle="Consulte o estoque e registre vendas de produtos."
        action={
          isOwner ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Cadastrar
            </Button>
          ) : undefined
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome"
          aria-label="Buscar produtos pelo nome"
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
          aria-label="Filtrar produtos por estoque"
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
          description={isOwner
            ? 'Cadastre seu primeiro produto para vender no balcão.'
            : 'Os produtos cadastrados pelo negócio aparecem aqui.'}
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
          description="Altere a busca ou volte a ver todos os produtos."
          action={
            <Button variant="secondary" onClick={() => { setSearchQuery(''); setStockFilter('all'); }}>
              Limpar filtros
            </Button>
          }
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
              loading={isSavingProduct || createMutation.isPending || updateMutation.isPending}
              onClick={handleSaveProduct}
            >
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <span className={classes.label}>Foto do produto (opcional)</span>
            <div className="flex items-center gap-4">
              <div
                data-testid="product-image-preview"
                className={`w-24 h-24 aspect-square shrink-0 overflow-hidden rounded-2xl border ${colors.border} ${colors.surface} flex items-center justify-center`}
              >
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt={form.name.trim() || 'Prévia da foto do produto'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className={`h-8 w-8 ${colors.textMuted}`} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Camera className="w-4 h-4" />}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {imagePreviewUrl ? 'Trocar foto' : 'Adicionar foto'}
                  </Button>
                  {imagePreviewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={handleRemoveImage}
                    >
                      Remover foto
                    </Button>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${colors.textMuted}`}>
                  JPG, PNG ou WebP. Ajustada automaticamente em formato quadrado para ficar leve no celular.
                </p>
                {formErrors.image && (
                  <p className="text-xs text-[var(--color-danger)]" role="alert">
                    {formErrors.image}
                  </p>
                )}
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto do produto"
              className="hidden"
              onChange={handleImageFileChange}
            />
          </div>

          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            error={formErrors.name}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="product-description" className={classes.label}>
                Descrição (opcional)
              </label>
              <span className={`text-xs tabular-nums ${colors.textMuted}`}>
                {form.description.length}/{MAX_PRODUCT_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              id="product-description"
              rows={2}
              maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value.slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH) }))}
              placeholder="Ex.: Fixação média com efeito fosco, 150g."
              className={classes.input}
            />
            {formErrors.description && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {formErrors.description}
              </p>
            )}
          </div>
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
