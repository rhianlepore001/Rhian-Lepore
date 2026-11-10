import type { MembershipStatus } from '../services/memberships';

const STATUS_SINGULAR: Record<MembershipStatus, string> = {
  active: 'ativo',
  pending: 'pendente',
  overdue: 'atrasado',
  cancelled: 'cancelado',
};

/** Texto do estado vazio de Clube > Assinantes (filtro + busca), sem espaços sobrando. */
export function membersEmptyState(
  tab: MembershipStatus | 'all',
  search: string,
): { title: string; hint: string } {
  const query = search.trim();
  if (query) {
    return { title: `Nenhum assinante encontrado para “${query}”.`, hint: 'Confira a busca ou mude o filtro.' };
  }
  if (tab === 'all') {
    return { title: 'Nenhum assinante ainda.', hint: 'Crie planos em Configurações e compartilhe o link do clube.' };
  }
  return { title: `Nenhum assinante ${STATUS_SINGULAR[tab]}.`, hint: 'Mude o filtro para ver outros.' };
}
