import { renderWhatsAppTemplate, type WhatsAppTheme, type WhatsAppTemplateOverride } from './whatsappTemplates';

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
  theme?: WhatsAppTheme;
  template?: WhatsAppTemplateOverride;
}): string {
  const firstName = input.clientName.trim().split(/\s+/).filter(Boolean)[0] || '';
  return renderWhatsAppTemplate('queue_joined', input.theme ?? 'barber', {
    primeiro_nome: firstName,
    estabelecimento: input.businessName.trim() || 'o estabelecimento',
    link_fila: input.url,
  }, undefined, input.template);
}
