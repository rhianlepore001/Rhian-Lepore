/**
 * Filtra serviços elegíveis para NOVA seleção (agenda interna, booking público, fila).
 * Serviços inativos/ausentes nunca entram na lista de escolha.
 * Histórico e edição de agendamentos existentes podem manter o serviço atual
 * via `keepSelectedIds` sem reoferecer outros inativos.
 */
export type BookableServiceLike = {
  id: string;
  active?: boolean | null;
};

export function isBookableService(service: BookableServiceLike): boolean {
  return service.active === true;
}

export function filterBookableServices<T extends BookableServiceLike>(
  services: T[],
  options?: { keepSelectedIds?: Iterable<string> },
): T[] {
  const keep = new Set(options?.keepSelectedIds ?? []);
  return services.filter(
    (service) => isBookableService(service) || keep.has(service.id),
  );
}
