import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const dependentInputSchema = z.object({
  name: z.string().trim().min(1).max(80).refine(value => !Array.from(value).some(char => /[\p{Cc}]/u.test(char)), 'Use apenas texto no nome.'),
  nickname: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(500).nullish(),
  is_active: z.boolean().optional(),
});

export type DependentInput = z.infer<typeof dependentInputSchema>;
export interface ClientDependent {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  nickname: string | null;
  notes: string | null;
  is_active: boolean;
}

export async function listDependents(companyId: string, clientId: string): Promise<ClientDependent[]> {
  const { data, error } = await supabase.from('client_dependents').select('*')
    .eq('user_id', companyId).eq('client_id', clientId).eq('is_active', true).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createDependent(companyId: string, clientId: string, input: DependentInput): Promise<ClientDependent> {
  const parsed = dependentInputSchema.parse(input);
  const { data, error } = await supabase.from('client_dependents').insert({
    user_id: companyId, client_id: clientId, name: parsed.name,
    nickname: parsed.nickname || null, notes: parsed.notes || null, source: 'manual',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateDependent(companyId: string, clientId: string, id: string, input: DependentInput): Promise<ClientDependent> {
  const parsed = dependentInputSchema.parse(input);
  const { data, error } = await supabase.from('client_dependents').update({
    ...parsed, nickname: parsed.nickname || null, notes: parsed.notes || null,
  }).eq('user_id', companyId).eq('client_id', clientId).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
