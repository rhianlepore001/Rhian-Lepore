import { supabase } from '@/lib/supabase';

export interface FixedCost { id: string; company_id: string; professional_id: string | null; category: string; description: string; amount: number; start_date: string; end_date: string | null; is_owner_salary: boolean; active: boolean }
export type FixedCostInput = Omit<FixedCost, 'id'> & { id?: string };
export type WorkingHours = Record<string, { isOpen: boolean; blocks: { start: string; end: string }[] }>;
export interface CostChoice { id: string; name: string; working_hours?: WorkingHours | null }
export interface MaterialCost { service_id: string; amount: number }
export interface ExpenseSuggestion { id: string; description: string; amount: number; created_at: string }

export const fixedCostsApi = {
  async list(companyId: string): Promise<{ costs: FixedCost[]; services: CostChoice[]; materials: MaterialCost[]; professionals: CostChoice[]; lowMargin?: number }> {
    const [costs, services, materials, professionals, settings] = await Promise.all([
      supabase.from('fixed_costs').select('*').eq('company_id', companyId).order('start_date', { ascending: false }),
      supabase.from('services').select('id,name').eq('user_id', companyId).order('name'),
      supabase.from('service_costs').select('service_id,amount').eq('company_id', companyId),
      supabase.from('team_members').select('id,name,working_hours').eq('user_id', companyId).eq('active', true).order('name'),
      supabase.from('chair_hour_settings').select('low_margin_pct').eq('company_id', companyId).maybeSingle(),
    ]);
    if (costs.error || services.error || materials.error || professionals.error || settings.error) throw new Error('Não foi possível carregar os custos.');
    return { costs: (costs.data || []) as FixedCost[], services: (services.data || []) as CostChoice[], materials: (materials.data || []) as MaterialCost[], professionals: (professionals.data || []) as CostChoice[], lowMargin: Number(settings.data?.low_margin_pct ?? 20) };
  },
  async suggestions(companyId: string): Promise<ExpenseSuggestion[]> {
    const { data, error } = await supabase.from('finance_records').select('id,description,commission_value,created_at,appointment_id').eq('user_id', companyId).eq('type', 'expense').is('appointment_id', null).order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error('Não foi possível buscar as despesas.');
    const candidates = (data || []).filter(row => !row.appointment_id && row.commission_value !== null && row.commission_value !== undefined);
    if (!candidates.length) return [];
    const { data: sales, error: salesError } = await supabase.from('product_sales').select('finance_record_id').eq('company_id', companyId).in('finance_record_id', candidates.map(row => row.id));
    if (salesError) throw new Error('Não foi possível buscar as despesas.');
    const saleIds = new Set((sales || []).map(row => row.finance_record_id));
    return candidates.filter(row => !saleIds.has(row.id)).map(row => ({ id: String(row.id), description: String(row.description || 'Despesa'), amount: Number(row.commission_value), created_at: String(row.created_at) })).filter(row => Number.isFinite(row.amount) && row.amount >= 0);
  },
  async saveCost(input: FixedCostInput): Promise<void> {
    const { id, ...values } = input;
    if (id) {
      const { data, error } = await supabase.from('fixed_costs').update({ end_date: values.end_date }).eq('id', id).eq('company_id', input.company_id).select('id').maybeSingle();
      if (error || !data) throw new Error('Não foi possível salvar o custo.');
    } else {
      const { error } = await supabase.from('fixed_costs').insert(values);
      if (error) throw new Error('Não foi possível salvar o custo.');
    }
  },
  async saveLowMargin(companyId: string, value: number): Promise<void> {
    const { data, error } = await supabase.from('chair_hour_settings').upsert({ company_id: companyId, low_margin_pct: value }, { onConflict: 'company_id' }).select('company_id').maybeSingle();
    if (error || !data) throw new Error('Não foi possível salvar o limite.');
  },
  async saveWorkingHours(companyId: string, professionalId: string, hours: WorkingHours | null): Promise<void> {
    const { data, error } = await supabase.from('team_members').update({ working_hours: hours }).eq('user_id', companyId).eq('id', professionalId).select('id').maybeSingle();
    if (error || !data) throw new Error('Não foi possível salvar os horários.');
  },
  async saveMaterial(companyId: string, serviceId: string, amount: number): Promise<void> {
    const { error } = await supabase.from('service_costs').upsert({ company_id: companyId, service_id: serviceId, amount }, { onConflict: 'company_id,service_id' });
    if (error) throw new Error('Não foi possível salvar o custo do serviço.');
  },
};
