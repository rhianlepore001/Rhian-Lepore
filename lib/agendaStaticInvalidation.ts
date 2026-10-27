import { queryClient } from '@/lib/queryClient';
import { agendaStaticKeys } from '@/lib/agendaStaticKeys';

export type AgendaStaticEntity = 'clients' | 'dependents' | 'services' | 'categories' | 'team' | 'profile';

const KEY_BY_ENTITY = {
  clients: agendaStaticKeys.clients,
  dependents: agendaStaticKeys.clients,
  services: agendaStaticKeys.services,
  categories: agendaStaticKeys.categories,
  team: agendaStaticKeys.team,
  profile: agendaStaticKeys.profile,
} as const;

/**
 * Ponto único para avisar a Agenda de que clientes, dependentes, serviços,
 * categorias, equipe ou perfil mudaram em qualquer tela. Marca a query como
 * obsoleta: se a Agenda estiver aberta, recarrega na hora; senão, ao abrir.
 * Sem companyId, invalida a entidade em todas as empresas do cache.
 */
export function invalidateAgendaStaticData(
  companyId: string | null | undefined,
  ...entities: AgendaStaticEntity[]
): Promise<void> {
  const unique = Array.from(new Set(entities.map(e => KEY_BY_ENTITY[e])));
  return Promise.all(unique.map(keyFn => {
    if (companyId) return queryClient.invalidateQueries({ queryKey: keyFn(companyId) });
    const tail = keyFn('*');
    return queryClient.invalidateQueries({
      predicate: q => q.queryKey.length === tail.length
        && tail.every((part, i) => i === 1 || q.queryKey[i] === part),
    });
  })).then(() => undefined);
}
