import { supabase } from '@/lib/supabase';
import {
  createCategoryInputSchema,
  saveServiceInputSchema,
  serviceCategorySchema,
  serviceItemSchema,
  type CreateCategoryInput,
  type SaveServiceInput,
  type ServiceCategory,
  type ServiceItem,
} from '@/types/serviceSettings';

export async function fetchServiceCategories(companyId: string): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('user_id', companyId)
    .order('display_order');

  if (error) throw error;
  return (data || []).map(item => serviceCategorySchema.parse(item));
}

export async function fetchServices(companyId: string): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('user_id', companyId);

  if (error) throw error;
  return (data || []).map(item => serviceItemSchema.parse(item));
}

export async function createServiceCategory(input: CreateCategoryInput): Promise<ServiceCategory> {
  const parsed = createCategoryInputSchema.parse(input);
  const { data, error } = await supabase
    .from('service_categories')
    .insert({
      user_id: parsed.companyId,
      name: parsed.name,
      display_order: parsed.displayOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return serviceCategorySchema.parse(data);
}

export async function deleteServiceCategory(companyId: string, categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('service_categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', companyId);

  if (error) throw error;
}

export async function deleteService(companyId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('user_id', companyId);

  if (error) throw error;
}

export async function fetchServiceUpsellIds(serviceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('service_upsells')
    .select('upsell_service_id')
    .eq('parent_service_id', serviceId);

  if (error) throw error;
  return (data || []).map(row => row.upsell_service_id);
}

export async function uploadServiceImage(companyId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${companyId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('service_images')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('service_images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function saveService(input: SaveServiceInput): Promise<string> {
  const parsed = saveServiceInputSchema.parse(input);

  const serviceData = {
    user_id: parsed.companyId,
    name: parsed.name,
    description: parsed.description,
    price: parsed.price,
    duration_minutes: parsed.durationMinutes,
    category_id: parsed.categoryId,
    active: parsed.active,
    image_url: parsed.imageUrl ?? null,
  };

  let serviceId = parsed.serviceId;

  if (serviceId) {
    const { error } = await supabase
      .from('services')
      .update(serviceData)
      .eq('id', serviceId)
      .eq('user_id', parsed.companyId);

    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('services')
      .insert(serviceData)
      .select()
      .single();

    if (error) throw error;
    serviceId = data.id;
  }

  if (serviceId) {
    if (parsed.serviceId) {
      const { error: deleteError } = await supabase
        .from('service_upsells')
        .delete()
        .eq('parent_service_id', serviceId);

      if (deleteError) throw deleteError;
    }

    if (parsed.upsellIds.length > 0) {
      const upsellData = parsed.upsellIds.map(upsellId => ({
        parent_service_id: serviceId,
        upsell_service_id: upsellId,
      }));

      const { error: insertError } = await supabase
        .from('service_upsells')
        .insert(upsellData);

      if (insertError) throw insertError;
    }
  }

  return serviceId!;
}
