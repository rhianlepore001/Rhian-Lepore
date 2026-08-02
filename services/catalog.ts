import { supabase } from '@/lib/supabase';
import {
  appointmentProductLineSchema,
  createProductInputSchema,
  listProductsInputSchema,
  productSaleSchema,
  productSchema,
  publicProductCatalogItemSchema,
  sellProductInputSchema,
  setAppointmentProductLinesInputSchema,
  updateProductInputSchema,
  type AppointmentProductLine,
  type CreateProductInput,
  type ListProductsInput,
  type Product,
  type ProductSale,
  type PublicProductCatalogItem,
  type SellProductInput,
  type SetAppointmentProductLinesInput,
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
  return (data || []).flatMap(item => {
    const parsed = productSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
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
      commission_percent: parsed.commissionPercent ?? 0,
      show_in_public: parsed.showInPublic ?? true,
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
  if (parsed.commissionPercent !== undefined) changes.commission_percent = parsed.commissionPercent;
  if (parsed.showInPublic !== undefined) changes.show_in_public = parsed.showInPublic;
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
    p_client_id: parsed.clientId ?? null,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? null,
  });

  if (error) throw error;
  return productSaleSchema.parse(data);
}

export async function listAppointmentProductLines(
  companyId: string,
  appointmentId: string
): Promise<AppointmentProductLine[]> {
  const { data, error } = await supabase
    .from('appointment_product_lines')
    .select('*')
    .eq('company_id', companyId)
    .eq('appointment_id', appointmentId);

  if (error) throw error;
  return (data || []).map(item => appointmentProductLineSchema.parse(item));
}

export async function setAppointmentProductLines(
  input: SetAppointmentProductLinesInput
): Promise<AppointmentProductLine[]> {
  const parsed = setAppointmentProductLinesInputSchema.parse(input);

  const { error: deleteError } = await supabase
    .from('appointment_product_lines')
    .delete()
    .eq('company_id', parsed.companyId)
    .eq('appointment_id', parsed.appointmentId);

  if (deleteError) throw deleteError;

  if (parsed.lines.length === 0) return [];

  const productIds = parsed.lines.map(l => l.productId);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sale_price')
    .eq('company_id', parsed.companyId)
    .in('id', productIds);

  if (productsError) throw productsError;

  const priceMap = new Map((products || []).map(p => [p.id as string, Number(p.sale_price)]));

  const rows = parsed.lines.map(line => ({
    company_id: parsed.companyId,
    appointment_id: parsed.appointmentId,
    product_id: line.productId,
    quantity: line.quantity,
    unit_sale_price: priceMap.get(line.productId) ?? 0,
  }));

  const { data, error } = await supabase
    .from('appointment_product_lines')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []).map(item => appointmentProductLineSchema.parse(item));
}

export async function fetchPublicProductsCatalog(
  businessId: string
): Promise<PublicProductCatalogItem[]> {
  const { data, error } = await supabase.rpc('get_public_products_catalog', {
    p_business_id: businessId,
  });

  if (error) throw error;
  const items = Array.isArray(data) ? data : [];
  return items.map(item => publicProductCatalogItemSchema.parse(item));
}

export async function copyBookingProductsToAppointment(
  bookingId: string,
  appointmentId: string
): Promise<void> {
  const { error } = await supabase.rpc('copy_booking_products_to_appointment', {
    p_booking_id: bookingId,
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
}
