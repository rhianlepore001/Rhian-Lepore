import { supabase } from '@/lib/supabase';

export async function fetchClientAdditionalPhones(companyId: string, clientId: string): Promise<string[]> {
  if (!companyId || !clientId) return [];
  const { data, error } = await supabase.from('clients').select('additional_phones')
    .eq('id', clientId).eq('user_id', companyId).maybeSingle();
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') return [];
    throw error;
  }
  const phones: unknown = data?.additional_phones;
  return Array.isArray(phones) ? phones.filter((phone): phone is string => typeof phone === 'string') : [];
}
