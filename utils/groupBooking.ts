export interface PricedServiceLike {
  price?: number | null;
  duration_minutes?: number | null;
}

export function isPricedService(service: PricedServiceLike): boolean {
  const price = Number(service.price);
  const duration = Number(service.duration_minutes);
  return Number.isFinite(price) && price > 0 && Number.isFinite(duration) && duration > 0;
}

export interface GroupLoad {
  professionalId: string;
  durationMinutes: number;
}

export function planGroupStarts(start: Date, people: GroupLoad[]): Date[] {
  const cursors = new Map<string, number>();
  return people.map(person => {
    const at = cursors.get(person.professionalId) ?? start.getTime();
    cursors.set(person.professionalId, at + person.durationMinutes * 60_000);
    return new Date(at);
  });
}

export function groupSlotRequirements(people: GroupLoad[]): GroupLoad[] {
  const totals = new Map<string, number>();
  people.forEach(person => totals.set(person.professionalId, (totals.get(person.professionalId) ?? 0) + person.durationMinutes));
  return Array.from(totals, ([professionalId, durationMinutes]) => ({ professionalId, durationMinutes }));
}

export function intersectSlotLists(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const [first, ...rest] = lists;
  return first.filter(slot => rest.every(list => list.includes(slot)));
}

export interface GroupPersonSelection {
  name: string;
  professionalId: string;
  serviceIds: string[];
}

interface GroupServiceLike extends PricedServiceLike {
  id: string;
  name?: string;
}

export function summarizeGroup(start: Date, people: GroupPersonSelection[], services: GroupServiceLike[]) {
  const loads = people.map(person => {
    const picked = person.serviceIds.map(id => services.find(service => service.id === id));
    if (!picked.length || picked.some(service => !service)) throw new Error('Escolha os serviços de cada pessoa.');
    return {
      durationMinutes: picked.reduce((sum, service) => sum + Number(service?.duration_minutes || 0), 0),
      totalPrice: picked.reduce((sum, service) => sum + Number(service?.price || 0), 0),
      serviceNames: picked.map(service => service?.name ?? ''),
    };
  });
  const starts = planGroupStarts(start, people.map((person, index) => ({ professionalId: person.professionalId, durationMinutes: loads[index].durationMinutes })));
  const rows = people.map((person, index) => ({ ...person, ...loads[index], startsAt: starts[index] }));
  return { people: rows, totalPrice: rows.reduce((sum, row) => sum + row.totalPrice, 0) };
}

export function validateGroupPeople(people: GroupPersonSelection[]): string | null {
  const names = new Set<string>();
  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const name = person.name.trim();
    if (!name) return `Informe o nome da pessoa ${index + 1}.`;
    if (person.serviceIds.length === 0) return `Escolha ao menos um serviço para ${name}.`;
    if (!person.professionalId) return `Escolha o profissional de ${name}.`;
    const key = name.toLocaleLowerCase('pt-BR');
    if (names.has(key)) return 'Use nomes diferentes para cada pessoa.';
    names.add(key);
  }
  return null;
}
