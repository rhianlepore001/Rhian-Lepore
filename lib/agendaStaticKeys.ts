/** Chaves React Query dos dados fixos da Agenda (por empresa). */
export const agendaStaticKeys = {
  team: (companyId: string) => ['team', companyId, 'members', 'agenda'] as const,
  services: (companyId: string) => ['serviceSettings', companyId, 'services', 'agenda'] as const,
  categories: (companyId: string) => ['serviceSettings', companyId, 'categories', 'agenda'] as const,
  clients: (companyId: string) => ['clients', companyId, 'agenda-options'] as const,
  profile: (companyId: string) => ['agenda', companyId, 'business-profile'] as const,
};
