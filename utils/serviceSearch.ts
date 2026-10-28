export function matchesServiceSearch(service: { name: string; description?: string | null }, query: string): boolean {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const terms = normalize(query);
  return !terms || normalize(service.name).includes(terms) || normalize(service.description ?? '').includes(terms);
}
