import { SUPPORT_WHATSAPP_NUMBER } from '../support';
import { normalizeCoordinates } from './location';
import { safeImageUrl, type SiteConfig, type SiteData } from './model';

export interface ShareLinks {
  direct: string;
  instagram: string;
  google: string;
  qr: string;
}

export type CompletenessSectionKey = 'brand' | 'intro' | 'photos' | 'contact';

export interface SiteCompletenessItem {
  id: string;
  label: string;
  done: boolean;
  sectionKey: CompletenessSectionKey;
  actionLabel: string;
}

export interface SiteCompleteness {
  percent: number;
  completed: number;
  total: number;
  items: SiteCompletenessItem[];
}

export type CompletenessData = Pick<
  SiteData,
  'logo' | 'cover' | 'services' | 'gallery' | 'address' | 'hours' | 'phone'
>;

export type CompletenessConfig = Pick<
  SiteConfig,
  'cover' | 'coverRemoved' | 'headline' | 'about' | 'contact' | 'serviceDetails'
> & {
  logo?: string;
  logoRemoved?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safePngDataUrl(value: string): string {
  const trimmed = value.trim();
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    throw new Error('QR Code inválido para impressão.');
  }
  return trimmed;
}

export function buildShareLinks(origin: string, slug: string): ShareLinks {
  const cleanOrigin = new URL(origin).origin;
  const cleanSlug = slug.trim();
  if (!cleanSlug) {
    throw new Error('Slug do estabelecimento inválido.');
  }
  const base = `${cleanOrigin}/s/${encodeURIComponent(cleanSlug)}`;
  return {
    direct: base,
    instagram: `${base}?origem=instagram`,
    google: `${base}?origem=google`,
    qr: `${base}?origem=qr`,
  };
}

export function buildWhatsAppShareUrl(siteName: string, link: string): string {
  const cleanName = siteName.trim();
  const message = cleanName
    ? `Conheça o site de ${cleanName} e agende seu horário online: ${link}`
    : `Conheça nosso site e agende seu horário online: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Link do WhatsApp da equipe para pedir a liberação da publicação do site. */
export function buildPresenceActivationUrl(params: {
  name: string;
  slug: string;
  region?: 'BR' | 'PT';
}): string {
  const name = params.name.trim() || 'meu estabelecimento';
  const slug = params.slug.trim();
  const reference = slug ? ` (endereço ${slug})` : '';
  const message =
    params.region === 'PT'
      ? `Olá! O rascunho do site de ${name}${reference} já está pronto. Podem libertar a publicação, por favor?`
      : `Olá! O rascunho do site de ${name}${reference} já está pronto. Podem liberar a publicação, por favor?`;
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildQrPrintHtml(params: {
  name: string;
  logo?: string;
  link: string;
  qrDataUrl: string;
  region?: 'BR' | 'PT';
}): string {
  const region = params.region === 'PT' ? 'PT' : 'BR';
  const lang = region === 'PT' ? 'pt-PT' : 'pt-BR';
  const instruction =
    region === 'PT'
      ? 'Aponte a câmara do telemóvel para ver serviços e marcar'
      : 'Aponte a câmera do celular para ver serviços e agendar';

  const safeName = escapeHtml(params.name.trim() || 'Agendamento online');
  const safeLink = escapeHtml(params.link.trim());
  const safeQr = escapeHtml(safePngDataUrl(params.qrDataUrl));
  const validatedLogo = params.logo ? safeImageUrl(params.logo) : undefined;
  const safeLogo = validatedLogo ? escapeHtml(validatedLogo) : undefined;

  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${safeName} — Placa QR</title>`,
    '  <style>',
    '    @page { size: A5 portrait; margin: 14mm; }',
    '    * { box-sizing: border-box; }',
    '    body {',
    '      margin: 0;',
    '      min-height: 100vh;',
    '      display: flex;',
    '      align-items: center;',
    '      justify-content: center;',
    '      background: #f5f2ec;',
    '      color: #18181b;',
    '      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '      padding: 24px;',
    '    }',
    '    .plaque {',
    '      width: 100%;',
    '      max-width: 380px;',
    '      background: #ffffff;',
    '      border: 1.5px solid #d6cfc2;',
    '      border-radius: 20px;',
    '      padding: 32px 28px;',
    '      text-align: center;',
    '      box-shadow: 0 12px 32px rgba(24, 24, 27, 0.08);',
    '    }',
    '    .logo {',
    '      display: block;',
    '      width: 64px;',
    '      height: 64px;',
    '      object-fit: contain;',
    '      margin: 0 auto 14px;',
    '    }',
    '    .name {',
    '      margin: 0 0 8px;',
    '      font-size: 22px;',
    '      font-weight: 700;',
    '      line-height: 1.25;',
    '      letter-spacing: -0.01em;',
    '      color: #18181b;',
    '    }',
    '    .instruction {',
    '      margin: 0 0 22px;',
    '      font-size: 14px;',
    '      line-height: 1.45;',
    '      color: #52525b;',
    '    }',
    '    .qr-frame {',
    '      display: inline-block;',
    '      padding: 14px;',
    '      background: #ffffff;',
    '      border: 1px solid #e4e4e7;',
    '      border-radius: 14px;',
    '      margin-bottom: 18px;',
    '    }',
    '    .qr-frame img {',
    '      display: block;',
    '      width: 210px;',
    '      height: 210px;',
    '      image-rendering: pixelated;',
    '    }',
    '    .link {',
    '      margin: 0;',
    '      font-size: 11px;',
    '      line-height: 1.4;',
    '      color: #71717a;',
    '      word-break: break-all;',
    '    }',
    '    @media print {',
    '      body { background: #ffffff; padding: 0; min-height: auto; }',
    '      .plaque { box-shadow: none; border-color: #c7bfb2; margin: 0 auto; }',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main class="plaque">',
    safeLogo ? `    <img class="logo" src="${safeLogo}" alt="${safeName}" />` : '',
    `    <h1 class="name">${safeName}</h1>`,
    `    <p class="instruction">${escapeHtml(instruction)}</p>`,
    '    <div class="qr-frame">',
    `      <img src="${safeQr}" alt="QR Code de ${safeName}" />`,
    '    </div>',
    `    <p class="link">${safeLink}</p>`,
    '  </main>',
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function computeSiteCompleteness(
  data: CompletenessData,
  config: CompletenessConfig,
): SiteCompleteness {
  const hasLogo = !config.logoRemoved && Boolean(config.logo || data.logo);
  const hasCover = !config.coverRemoved && Boolean(config.cover || data.cover);
  const hasHeadline = config.headline.trim().length >= 8;
  const hasServices =
    data.services.length > 0 &&
    data.services.some(service =>
      Boolean((config.serviceDetails?.[service.id]?.description ?? service.description)?.trim()),
    );
  const hasGallery = data.gallery.length > 0;
  const hasLocation =
    Boolean((config.contact?.address ?? data.address).trim()) ||
    Boolean(normalizeCoordinates(config.contact?.lat, config.contact?.lng));
  const hasWhatsApp = Boolean((config.contact?.phone ?? data.phone)?.trim());

  const items: SiteCompletenessItem[] = [
    {
      id: 'logo',
      label: 'Logo do estabelecimento',
      done: hasLogo,
      sectionKey: 'brand',
      actionLabel: 'Adicionar logo',
    },
    {
      id: 'cover',
      label: 'Foto de capa',
      done: hasCover,
      sectionKey: 'brand',
      actionLabel: 'Enviar capa',
    },
    {
      id: 'headline',
      label: 'Frase de apresentação',
      done: hasHeadline,
      sectionKey: 'intro',
      actionLabel: 'Escrever frase',
    },
    {
      id: 'services',
      label: 'Serviços com descrição',
      done: hasServices,
      sectionKey: 'photos',
      actionLabel: 'Descrever serviços',
    },
    {
      id: 'gallery',
      label: 'Fotos do espaço/trabalhos',
      done: hasGallery,
      sectionKey: 'photos',
      actionLabel: 'Adicionar fotos',
    },
    {
      id: 'location',
      label: 'Endereço e ponto de referência',
      done: hasLocation,
      sectionKey: 'contact',
      actionLabel: 'Conferir endereço',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp de contato',
      done: hasWhatsApp,
      sectionKey: 'contact',
      actionLabel: 'Informar WhatsApp',
    },
  ];

  const completed = items.filter(item => item.done).length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100);

  return { percent, completed, total, items };
}
