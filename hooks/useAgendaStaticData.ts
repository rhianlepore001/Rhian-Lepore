import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { agendaStaticKeys } from '@/lib/agendaStaticKeys';
import { invalidateAgendaStaticData } from '@/lib/agendaStaticInvalidation';

/**
 * Dados "fixos" da Agenda (não mudam ao trocar de dia): equipe, clientes,
 * serviços, categorias e perfil do negócio. Carregados uma vez por empresa e
 * mantidos em cache (React Query) por ~5 min.
 *
 * As chaves ficam sob os prefixos já usados por outras telas
 * (['team', id, 'members'], ['serviceSettings', id, ...]) para que as
 * invalidações feitas em Configurações também atualizem a Agenda.
 */
export const AGENDA_STATIC_STALE_TIME = 5 * 60 * 1000;

export { agendaStaticKeys };

export interface AgendaTeamMember {
  id: string;
  name: string;
  photo_url?: string | null;
  staff_user_id?: string | null;
  active?: boolean;
}

export interface AgendaServiceRow {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number;
  category_id?: string;
  description?: string | null;
  active?: boolean;
}

export interface AgendaCategory { id: string; name: string }
export interface AgendaClient { id: string; name: string; phone?: string }
export interface AgendaBusinessProfile {
  business_name: string | null;
  business_slug: string | null;
  public_booking_enabled: boolean | null;
}

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

export function useAgendaStaticData(companyId: string | null | undefined) {
  const id = companyId ?? '';
  const enabled = !!companyId;
  const common = { enabled, staleTime: AGENDA_STATIC_STALE_TIME };

  const team = useQuery({
    ...common,
    queryKey: agendaStaticKeys.team(id),
    queryFn: async () => (await unwrap<AgendaTeamMember[]>(supabase
      .from('team_members')
      .select('id, name, photo_url, staff_user_id, active')
      .eq('user_id', id)
      .eq('active', true)
      .order('name') as any)) ?? [],
  });

  // Todos os serviços (inclui inativos): a lista "agendável" é filtrada no
  // componente e o mapa nome→preço usa todos, como antes.
  const services = useQuery({
    ...common,
    queryKey: agendaStaticKeys.services(id),
    queryFn: async () => (await unwrap<AgendaServiceRow[]>(supabase
      .from('services')
      .select('id, name, price, duration_minutes, category_id, description, active')
      .eq('user_id', id)
      .order('name') as any)) ?? [],
  });

  const categories = useQuery({
    ...common,
    queryKey: agendaStaticKeys.categories(id),
    queryFn: async () => (await unwrap<AgendaCategory[]>(supabase
      .from('service_categories')
      .select('id, name')
      .eq('user_id', id)
      .order('name') as any)) ?? [],
  });

  const clients = useQuery({
    ...common,
    queryKey: agendaStaticKeys.clients(id),
    queryFn: async () => (await unwrap<AgendaClient[]>(supabase
      .from('clients')
      .select('id, name, phone')
      .eq('user_id', id)
      .order('name') as any)) ?? [],
  });

  const profile = useQuery({
    ...common,
    queryKey: agendaStaticKeys.profile(id),
    queryFn: () => unwrap<AgendaBusinessProfile>(supabase
      .from('profiles')
      .select('business_name, business_slug, public_booking_enabled')
      .eq('id', id)
      .single() as any),
  });

  const queryClient = useQueryClient();
  const invalidateClients = useCallback(
    () => invalidateAgendaStaticData(id, 'clients'),
    [id],
  );
  const invalidateServices = useCallback(
    () => Promise.all([
      invalidateAgendaStaticData(id, 'services', 'categories'),
      queryClient.invalidateQueries({ queryKey: ['serviceSettings', id] }),
    ]).then(() => undefined),
    [queryClient, id],
  );
  const refetchAll = useCallback(
    () => Promise.all([team, services, categories, clients, profile].map(q => q.refetch())),
    [team.refetch, services.refetch, categories.refetch, clients.refetch, profile.refetch],
  );

  const all = [team, services, categories, clients, profile];
  return {
    team, services, categories, clients, profile,
    isLoading: enabled && all.some(q => q.isPending),
    error: all.find(q => q.error)?.error ?? null,
    invalidateClients,
    invalidateServices,
    refetchAll,
  };
}
