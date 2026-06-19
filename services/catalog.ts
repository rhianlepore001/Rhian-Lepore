import { supabase } from '@/lib/supabase';
import {
  createProductInputSchema,
  listProductsInputSchema,
  productSaleSchema,
  productSchema,
  sellProductInputSchema,
  updateProductInputSchema,
  type CreateProductInput,
  type ListProductsInput,
  type Product,
  type ProductSale,
  type SellProductInput,
  type UpdateProductInput,
} from '@/types/catalog';

export async function listProducts(input: ListProductsInput): Promise<Product[]> {
  const parsed = listProductsInputSchema.parse(input);
  let query = supabase
    .from('products')
    .select('*')
    .eq('company_id', parsed.companyId);

  if (!parsed.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('name');
  if (error) throw error;
  return (data || []).map(item => productSchema.parse(item));
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const parsed = createProductInputSchema.parse(input);
  const { data, error } = await supabase
    .from('products')
    .insert({
      company_id: parsed.companyId,
      name: parsed.name,
      sale_price: parsed.salePrice,
      cost_price: parsed.costPrice,
      stock_quantity: parsed.stockQuantity,
      min_stock_quantity: parsed.minStockQuantity,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return productSchema.parse(data);
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  const parsed = updateProductInputSchema.parse(input);
  const changes: Record<string, unknown> = {};

  if (parsed.name !== undefined) changes.name = parsed.name;
  if (parsed.salePrice !== undefined) changes.sale_price = parsed.salePrice;
  if (parsed.costPrice !== undefined) changes.cost_price = parsed.costPrice;
  if (parsed.stockQuantity !== undefined) changes.stock_quantity = parsed.stockQuantity;
  if (parsed.minStockQuantity !== undefined) changes.min_stock_quantity = parsed.minStockQuantity;
  if (parsed.isActive !== undefined) changes.is_active = parsed.isActive;

  const { data, error } = await supabase
    .from('products')
    .update(changes)
    .eq('id', parsed.productId)
    .eq('company_id', parsed.companyId)
    .select()
    .single();

  if (error) throw error;
  return productSchema.parse(data);
}

export async function sellProduct(input: SellProductInput): Promise<ProductSale> {
  const parsed = sellProductInputSchema.parse(input);
  const { data, error } = await supabase.rpc('sell_product', {
    p_product_id: parsed.productId,
    p_quantity: parsed.quantity,
    p_appointment_id: parsed.appointmentId ?? null,
  });

  if (error) throw error;
  return productSaleSchema.parse(data);
}
