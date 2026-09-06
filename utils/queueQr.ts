export function queueJoinUrl(origin: string, slug: string, professionalId?: string | null): string {
  const base = `${origin.replace(/\/$/, '')}/#/queue/${slug}`;
  return professionalId ? `${base}?pro=${professionalId}` : base;
}

export function isQueueModeLocked(activeCount: number): boolean {
  return activeCount > 0;
}
