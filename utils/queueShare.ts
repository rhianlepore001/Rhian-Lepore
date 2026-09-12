export function buildQueueTrackingPath(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return '';
  return `/#/minha-area/${encodeURIComponent(trimmed)}?tab=fila`;
}

export function buildQueueTrackingUrl(slug: string, origin?: string): string {
  const path = buildQueueTrackingPath(slug);
  if (!path) return '';
  const base = (origin ?? (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '');
  return `${base}${path}`;
}

export function buildQueueTrackingMessage(input: {
  clientName: string;
  businessName: string;
  url: string;
}): string {
  const firstName = input.clientName.trim().split(/\s+/).filter(Boolean)[0] || 'Olá';
  const house = input.businessName.trim() || 'o estabelecimento';
  return [
    `Olá, ${firstName}! Você entrou na fila da ${house}.`,
    'Acompanhe sua senha neste link:',
    input.url,
    '',
    'Se for a primeira vez, informe o mesmo WhatsApp usado no balcão e veja a posição na fila.',
  ].join('\n');
}
