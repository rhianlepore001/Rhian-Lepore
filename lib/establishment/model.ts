export type SiteKind = 'barber' | 'beauty' | 'studio';
export type SiteStyle = 'dark' | 'light';
export type SitePreset = 'urban' | 'editorial' | 'salon';
export type LogoDisplayMode = 'both' | 'logo';
export type OfferKind = 'first_visit' | 'featured' | 'combo' | 'club';
export type SectionId = 'services' | 'differences' | 'gallery' | 'beforeAfter' | 'team' | 'reviews' | 'club' | 'faq' | 'location';
export type PhotoFocus = 'center' | 'top' | 'bottom' | 'work' | 'space';
export interface PhotoPosition { x: number; y: number }

export const RESERVED_SITE_SLUGS = new Set([
  'admin', 'app', 'www', 'blog', 'suporte', 'ajuda', 'status', 'cdn', 'static',
  'mail', 'sitemap', 'robots', 'login', 'register', 'landing', 'termos',
  'privacidade', 'agenda', 'dashboard', 'configuracoes', 'book', 'site',
  'site-preview', 'site-demo', 's', 'pro', 'clube', 'minha-area', 'queue',
  'queue-status', 'avaliar', 'demo', 'demo-preview', 'api', 'assets',
  'onboarding', 'onboarding-wizard', 'staff-onboarding', 'forgot-password',
  'update-password', 'fila', 'clientes', 'produtos', 'financeiro', 'insights',
  'meus-insights', 'resultados-por-hora', 'club-demo',
]);

export function isReservedSiteSlug(slug: string): boolean {
  return RESERVED_SITE_SLUGS.has(slug.trim().toLowerCase());
}

export const FOCUS_PRESETS: Record<PhotoFocus, PhotoPosition> = {
  center: { x: 50, y: 50 },
  work: { x: 34, y: 38 },
  space: { x: 72, y: 42 },
  top: { x: 50, y: 18 },
  bottom: { x: 50, y: 82 },
};

export function clampPercent(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function photoObjectPosition(config: Pick<SiteConfig, 'photoFocus' | 'photoPosition'>): string {
  const fallback = (config.photoFocus && FOCUS_PRESETS[config.photoFocus]) || FOCUS_PRESETS.center;
  const x = config.photoPosition?.x ?? fallback.x;
  const y = config.photoPosition?.y ?? fallback.y;
  return `${x}% ${y}%`;
}

export interface SiteService {
  id: string;
  name: string;
  category?: string;
  description?: string;
  includes: string[];
  audience?: string;
  duration: number;
  price: number;
  priceFrom?: boolean;
  priceNote?: string;
  image?: string;
  featured?: boolean;
}

export interface SiteClubPlan {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  usageLimitPerMonth?: number;
  badgeColor?: string;
  image?: string;
}

export interface SiteData {
  id: string;
  slug: string;
  name: string;
  kind: SiteKind;
  region: 'BR' | 'PT';
  demo: boolean;
  logo?: string;
  cover?: string;
  address: string;
  phone?: string;
  instagram?: string;
  cancellationPolicy?: string;
  hours: Array<{ day: string; hours: string }>;
  services: SiteService[];
  clubPlans?: SiteClubPlan[];
  team: Array<{ id: string; name: string; bio?: string; image?: string }>;
  gallery: Array<{ src: string; alt: string }>;
  reviews: Array<{ id: string; name?: string; rating: number; comment: string }>;
  rating?: number;
  reviewCount: number;
  config?: SiteConfig;
}

export interface RecommendedBackground {
  id: 'urban' | 'editorial' | 'salon';
  hex: string;
  label: string;
  style: SiteStyle;
  recommended: true;
}

/** Padrões atuais de cada estilo, destacados como recomendados pelo AgendiX. */
export const RECOMMENDED_BACKGROUNDS: RecommendedBackground[] = [
  { id: 'urban', hex: '#09090B', label: 'Urbano preciso', style: 'dark', recommended: true },
  { id: 'editorial', hex: '#FBF7F0', label: 'Editorial clássico', style: 'light', recommended: true },
  { id: 'salon', hex: '#FFFFFF', label: 'Salão claro', style: 'light', recommended: true },
];

export function defaultBackground(style: SiteStyle, kind: SiteKind = 'barber'): string {
  if (style === 'dark') return '#09090B';
  return kind === 'beauty' ? '#FFFFFF' : '#FBF7F0';
}

export function isRecommendedBackground(hex: string): boolean {
  return RECOMMENDED_BACKGROUNDS.some(item => item.hex.toLowerCase() === hex.toLowerCase());
}

function hexColor(value: unknown): string | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : undefined;
}

export function resolvedBackground(config: Pick<SiteConfig, 'style'> & { background?: string }, kind: SiteKind): string {
  return hexColor(config.background) ?? defaultBackground(config.style, kind);
}

export function recommendedPresetForKind(kind: SiteKind): SitePreset {
  return kind === 'beauty' ? 'salon' : 'urban';
}

export function resolvedPreset(config: Pick<SiteConfig, 'style' | 'preset'>, kind: SiteKind): SitePreset {
  if (config.preset === 'urban' || config.preset === 'editorial' || config.preset === 'salon') return config.preset;
  if (config.style === 'dark') return 'urban';
  return kind === 'beauty' ? 'salon' : 'editorial';
}

export interface SiteConfig {
  style: SiteStyle;
  preset?: SitePreset;
  accent: string;
  background: string;
  headline: string;
  about: string;
  ctaLabel?: string;
  logo?: string;
  logoRemoved?: boolean;
  logoDisplay?: LogoDisplayMode;
  coverRemoved?: boolean;
  offer: { enabled: boolean; kind?: OfferKind; title: string; condition: string; serviceId?: string; expires?: string };
  differences: string[];
  faq: Array<{ question: string; answer: string }>;
  sections: Array<{ id: SectionId; enabled: boolean }>;
  seoTitle: string;
  seoDescription: string;
  cover?: string;
  /** Enquadramento da foto principal escolhido pelo dono. */
  photoFocus?: PhotoFocus;
  photoPosition?: PhotoPosition;
  gallery?: Array<{ src: string; alt: string }>;
  serviceDetails?: Record<string, { description?: string; includes?: string[]; audience?: string; priceFrom?: boolean; priceNote?: string; image?: string; featured?: boolean }>;
  contact?: { phone?: string; instagram?: string; addressNote?: string };
  teamDetails?: Record<string, { bio?: string; image?: string }>;
  beforeAfter?: Array<{ before: string; after: string; caption?: string }>;
}

const sectionIds: SectionId[] = ['services', 'differences', 'gallery', 'beforeAfter', 'team', 'reviews', 'club', 'faq', 'location'];
const kinds: Record<SiteKind, string> = { barber: 'Barbearia', beauty: 'Salão de beleza', studio: 'Estúdio' };

export function placeFromAddress(address: string): string {
  return (address.split(/\s[—–]\s/).pop() || address).trim();
}

export function neighborhoodFromAddress(address: string): string | undefined {
  const parts = address.split(/\s[—–]\s/);
  if (parts.length < 2) return undefined;
  const neighborhood = parts[parts.length - 1].split(',')[0]?.trim();
  return neighborhood || undefined;
}

function defaultHeadline(data: SiteData): string {
  const place = neighborhoodFromAddress(data.address);
  if (data.kind === 'barber') return place ? `Barbearia em ${place} com corte preciso e horário respeitado` : 'Barbearia com corte preciso e horário respeitado';
  if (data.kind === 'beauty') return place ? `Salão em ${place} dedicado à cor natural e ao cuidado do cabelo` : 'Salão dedicado à cor natural e ao cuidado do cabelo';
  return place ? `Estúdio em ${place} com atendimento pontual` : 'Estúdio com atendimento pontual';
}

function defaultAbout(data: SiteData): string {
  if (!data.services.length) return '';
  const place = neighborhoodFromAddress(data.address);
  if (data.kind === 'barber') return place ? `Corte, barba e acabamento em ${place}.` : 'Corte, barba e acabamento.';
  if (data.kind === 'beauty') return place ? `Corte, cor e tratamento em ${place}.` : 'Corte, cor e tratamento.';
  return place ? `Cuidado de beleza em ${place}.` : 'Cuidado de beleza, no seu tempo.';
}

export function defaultConfig(data: SiteData): SiteConfig {
  const preset: SitePreset = data.kind === 'beauty' ? 'salon' : 'urban';
  const style: SiteStyle = preset === 'urban' ? 'dark' : 'light';
  return {
    style,
    preset,
    accent: style === 'dark' ? '#9A5628' : '#3F4E41',
    background: defaultBackground(style, data.kind),
    headline: defaultHeadline(data),
    about: defaultAbout(data),
    offer: { enabled: false, kind: 'first_visit', title: '', condition: '' },
    differences: [],
    faq: data.cancellationPolicy ? [{ question: 'Como funciona o cancelamento?', answer: data.cancellationPolicy }] : [],
    sections: sectionIds.map(id => ({ id, enabled: true })),
    seoTitle: '',
    seoDescription: '',
  };
}

export function visibleSections(data: SiteData, config: SiteConfig): SiteConfig['sections'] {
  const available: Record<SectionId, boolean> = {
    services: data.services.length > 0,
    differences: config.differences.some(item => item.trim().length > 0),
    gallery: data.gallery.length > 0,
    beforeAfter: (config.beforeAfter ?? []).some(pair => Boolean(pair.before && pair.after)),
    team: data.team.length > 1 || data.team.some(member => Boolean(member.image)),
    reviews: data.reviews.some(review => review.comment.trim().length > 0),
    club: (data.clubPlans ?? []).length > 0,
    faq: config.faq.some(item => Boolean(item.question.trim() && item.answer.trim())),
    location: Boolean(data.address.trim() || data.hours.length),
  };
  const seen = new Set<SectionId>();
  return config.sections.filter(section => {
    if (!section.enabled || !available[section.id] || seen.has(section.id)) return false;
    seen.add(section.id);
    return true;
  });
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function mixHex(first: string, second: string, amount: number): string {
  return '#' + [1, 3, 5].map(index => {
    const a = parseInt(first.slice(index, index + 2), 16);
    const b = parseInt(second.slice(index, index + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  }).join('');
}

function nudgeHex(color: string, toward: number): string {
  return '#' + [1, 3, 5].map(index => {
    const channel = parseInt(color.slice(index, index + 2), 16);
    return Math.round(channel + (toward - channel) * 0.12).toString(16).padStart(2, '0');
  }).join('');
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export interface SiteSurface {
  background: string;
  ink: string;
  body: string;
  muted: string;
  line: string;
  panel: string;
  map: string;
  adjusted: boolean;
  warning?: string;
}

export function siteSurface(background: string, style: SiteStyle): SiteSurface {
  const chosen = hexColor(background) ?? defaultBackground(style);
  const styleInk = style === 'dark' ? '#F4F4F5' : '#1C1714';
  const pickInk = (color: string) => {
    if (contrastRatio(color, styleInk) >= 4.5) return styleInk;
    return contrastRatio(color, '#000000') >= contrastRatio(color, '#FFFFFF') ? '#000000' : '#FFFFFF';
  };
  let page = chosen;
  let ink = pickInk(page);
  for (let step = 0; contrastRatio(page, ink) < 4.5 && step < 36; step += 1) {
    page = nudgeHex(page, luminance(page) > 0.18 ? 0 : 255);
    ink = pickInk(page);
  }
  const adjusted = page.toLowerCase() !== chosen.toLowerCase() || ink.toLowerCase() !== styleInk.toLowerCase() || contrastRatio(chosen, styleInk) < 4.5;
  const body = mixHex(ink, page, 0.18);
  const mutedCandidate = mixHex(ink, page, 0.28);
  const muted = contrastRatio(page, mutedCandidate) >= 4.5 ? mutedCandidate : (contrastRatio(page, body) >= 4.5 ? body : ink);
  return {
    background: page,
    ink,
    body: contrastRatio(page, body) >= 4.5 ? body : ink,
    muted,
    line: mixHex(page, ink, 0.16),
    panel: mixHex(page, ink, 0.06),
    map: mixHex(page, ink, 0.1),
    adjusted,
    ...(adjusted ? { warning: 'Ajustamos o texto para manter a leitura nesta cor de fundo.' } : {}),
  };
}

export function accessibleAccent(hex: string, style: SiteStyle, pageBackground?: string): { background: string; foreground: string } {
  let background = hexColor(hex) ?? (style === 'dark' ? '#9A5628' : '#3F4E41');
  const page = hexColor(pageBackground);
  const surfaces = page
    ? [page, mixHex(page, contrastRatio(page, '#000000') >= contrastRatio(page, '#FFFFFF') ? '#000000' : '#FFFFFF', 0.08), mixHex(page, contrastRatio(page, '#000000') >= contrastRatio(page, '#FFFFFF') ? '#000000' : '#FFFFFF', 0.14)]
    : style === 'dark' ? ['#09090B', '#18181B', '#27272A'] : ['#FBF7F0', '#FDFBF7', '#FFFFFF'];
  const toward = luminance(surfaces[0]) > 0.4 ? 0 : 255;
  const weakest = (color: string) => Math.min(...surfaces.map(surface => contrastRatio(color, surface)));
  for (let step = 0; weakest(background) < 4.5 && step < 36; step += 1) {
    background = nudgeHex(background, toward);
  }
  const darkContrast = contrastRatio(background, '#000000');
  const lightContrast = contrastRatio(background, '#FFFFFF');
  return { background, foreground: darkContrast >= lightContrast ? '#000000' : '#FFFFFF' };
}

export function formatPrice(value: number, region: SiteData['region']): string {
  return new Intl.NumberFormat(region === 'PT' ? 'pt-PT' : 'pt-BR', { style: 'currency', currency: region === 'PT' ? 'EUR' : 'BRL', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

function normalizeOfferText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Título e condição da oferta sem repetir a mesma frase no banner. */
export function offerDisplay(offer: Pick<SiteConfig['offer'], 'title' | 'condition'>): { title: string; detail?: string } {
  const title = offer.title.trim();
  const condition = offer.condition.trim();
  if (!title) return { title: '' };
  if (!condition) return { title };
  const titleNorm = normalizeOfferText(title);
  const conditionNorm = normalizeOfferText(condition);
  if (!conditionNorm || titleNorm.includes(conditionNorm) || conditionNorm.includes(titleNorm)) return { title };
  const words = (value: string) => value.split(' ').filter(word => word.length > 3);
  const titleWords = new Set(words(titleNorm));
  const conditionWords = words(conditionNorm);
  const overlap = conditionWords.filter(word => titleWords.has(word)).length;
  if (conditionWords.length > 0 && overlap / conditionWords.length >= 0.55) return { title };
  return { title, detail: condition };
}

export function buildSeo(sourceData: SiteData, config: SiteConfig, origin: string) {
  const normalized = normalizeSiteConfig(config, defaultConfig(sourceData));
  const data = applyNormalizedSiteConfig(sourceData, normalized);
  const root = new URL(origin).origin;
  const url = `${root}/s/${encodeURIComponent(data.slug)}`;
  const place = placeFromAddress(data.address);
  const title = normalized.seoTitle.trim() || `${data.name} — ${kinds[data.kind]}${place ? ` em ${place}` : ''}`;
  const headlineLead = normalized.headline.trim();
  const headlineSentence = headlineLead ? (/[.!?…]$/.test(headlineLead) ? headlineLead : `${headlineLead}.`) : '';
  const description =
    normalized.seoDescription.trim() ||
    `${headlineSentence} ${data.services.length ? `Conheça os serviços, preços e profissionais de ${data.name}. Agende seu horário online.` : `Conheça ${data.name} e reserve seu horário.`}`.trim();
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': data.kind === 'studio' ? 'LocalBusiness' : 'HairSalon',
    name: data.name,
    url,
    description,
    ...(safeImageUrl(normalized.cover || data.cover) ? { image: safeImageUrl(normalized.cover || data.cover) } : {}),
    ...(data.phone ? { telephone: data.phone } : {}),
    ...(safeImageUrl(data.logo) ? { logo: safeImageUrl(data.logo) } : {}),
    ...(data.instagram ? { sameAs: [`https://www.instagram.com/${data.instagram.replace(/^@/, '').replace(/[^a-z0-9._]/gi, '')}/`] } : {}),
    ...(data.services.length ? { priceRange: `${formatPrice(Math.min(...data.services.map(service => service.price)), data.region)}–${formatPrice(Math.max(...data.services.map(service => service.price)), data.region)}` } : {}),
    ...(data.hours.length ? { openingHours: structuredHours(data.hours) } : {}),
    ...(data.address ? { address: { '@type': 'PostalAddress', streetAddress: data.address, addressCountry: data.region } } : {}),
    ...(data.services.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Serviços', itemListElement: data.services.map(service => ({ '@type': 'Offer', price: service.price, priceCurrency: data.region === 'PT' ? 'EUR' : 'BRL', itemOffered: { '@type': 'Service', name: service.name, ...(service.description ? { description: service.description } : {}) } })) } } : {}),
  };
  return { title, description, url, jsonLd };
}

function structuredHours(hours: SiteData['hours']): string[] {
  const days: Record<string, string> = { Segunda: 'Mo', Terça: 'Tu', Quarta: 'We', Quinta: 'Th', Sexta: 'Fr', Sábado: 'Sa', Domingo: 'Su' };
  return hours.flatMap(item => {
    const day = days[item.day];
    return day ? item.hours.split(' / ').filter(block => /^\d{2}:\d{2}[–-]\d{2}:\d{2}$/.test(block)).map(block => `${day} ${block.replace('–', '-')}`) : [];
  });
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

type PublicRow = Record<string, unknown>;
function row(value: unknown): PublicRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as PublicRow : {}; }
function rows(value: unknown): PublicRow[] { return Array.isArray(value) ? value.map(row) : []; }
function text(value: unknown, limit = 1000): string { return typeof value === 'string' ? Array.from(value.replace(/<[^>]*>/g, '')).filter(character => character.charCodeAt(0) > 31 || [9, 10, 13].includes(character.charCodeAt(0))).join('').trim().slice(0, limit) : ''; }
function number(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }

export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\') || /%2e|%5c/i.test(trimmed)) return undefined;
  if (/^\/(demo|presenca)\/[A-Za-z0-9._/-]+$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
    if (parsed.hostname.toLowerCase() !== 'lcqwrngscsziysyfhpfj.supabase.co') return undefined;
    if (!/^\/storage\/v1\/object\/public\/(logos|covers|service_images|team_photos|galleries|membership_plan_photos)\/[^?#]+$/i.test(parsed.pathname)) {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}

function publicComment(value: unknown): string {
  return text(value, 500).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato removido]').replace(/\+?\d[\d\s().-]{6,}\d/g, '[contato removido]');
}

function normalizeHours(value: unknown): SiteData['hours'] {
  const labels = [['monday', 'Segunda'], ['tuesday', 'Terça'], ['wednesday', 'Quarta'], ['thursday', 'Quinta'], ['friday', 'Sexta'], ['saturday', 'Sábado'], ['sunday', 'Domingo']];
  const numeric: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const source = row(value);
  return labels.flatMap(([key, day]) => {
    const item = row(source[key] ?? source[key.slice(0, 3)] ?? source[numeric[key]]);
    if (typeof item.isOpen !== 'boolean') return [];
    const blocks = rows(item.blocks).filter(block => /^\d{2}:\d{2}$/.test(text(block.start)) && /^\d{2}:\d{2}$/.test(text(block.end))).map(block => `${block.start}–${block.end}`);
    return [{ day, hours: item.isOpen ? blocks.join(' / ') || 'Consulte a agenda' : 'Fechado' }];
  });
}

export function sanitizePublicData(input: { profile: unknown; settings?: unknown; services?: unknown; categories?: unknown; team?: unknown; gallery?: unknown; reviews?: unknown; clubPlans?: unknown }): SiteData {
  const profile = row(Array.isArray(input.profile) ? input.profile[0] : input.profile);
  const settings = row(input.settings);
  const reviews = row(input.reviews);
  const name = text(profile.business_name, 120);
  const kind: SiteKind = profile.user_type === 'beauty' ? 'beauty' : profile.user_type === 'studio' ? 'studio' : 'barber';
  const categoryNames = new Map<string, string>();
  for (const cat of rows(input.categories)) {
    const catId = text(cat.id, 100);
    const catName = text(cat.name, 80);
    if (catId && catName) categoryNames.set(catId, catName);
  }
  return {
    id: text(profile.id, 100), slug: text(profile.business_slug, 100), name, kind,
    region: profile.region === 'PT' ? 'PT' : 'BR', demo: false,
    logo: safeImageUrl(profile.logo_url), cover: safeImageUrl(profile.cover_photo_url),
    address: text(profile.address_street, 300), phone: text(profile.phone, 40) || undefined,
    instagram: text(profile.instagram_handle, 100).replace(/^@/, '').replace(/[^a-z0-9._]/gi, '') || undefined,
    cancellationPolicy: text(settings.client_cancel_policy_text || settings.cancellation_policy) || undefined,
    hours: normalizeHours(settings.business_hours),
    services: rows(input.services).filter(service => service.active !== false && text(service.id) && text(service.name) && number(service.price) !== undefined && (number(service.price) ?? -1) >= 0 && (number(service.duration_minutes) ?? 0) > 0).map(service => {
      const catId = text(service.category_id, 100);
      return {
        id: text(service.id, 100), name: text(service.name, 160), category: catId ? categoryNames.get(catId) : undefined, description: text(service.description, 1500) || undefined,
        includes: [], duration: number(service.duration_minutes)!, price: number(service.price)!, image: safeImageUrl(service.image_url),
      };
    }),
    clubPlans: rows(input.clubPlans).filter(plan => plan.active !== false && text(plan.id) && text(plan.name) && number(plan.price_cents) !== undefined && (number(plan.price_cents) ?? -1) >= 0).map(plan => ({
      id: text(plan.id, 100),
      name: text(plan.name, 120),
      description: text(plan.description, 600) || undefined,
      priceCents: number(plan.price_cents)!,
      usageLimitPerMonth: number(plan.usage_limit_per_month),
      badgeColor: text(plan.badge_color, 24) || undefined,
      image: safeImageUrl(plan.photo_path),
    })),
    team: rows(input.team).filter(member => member.active === true && !member.deleted_at && text(member.id) && text(member.name || member.full_name)).map(member => ({ id: text(member.id, 100), name: text(member.name || member.full_name, 120), bio: text(member.bio, 500) || undefined, image: safeImageUrl(member.photo_url) })),
    gallery: rows(input.gallery).filter(photo => photo.active !== false && safeImageUrl(photo.image_url)).map(photo => ({ src: safeImageUrl(photo.image_url)!, alt: `Trabalho e espaço de ${name}` })),
    reviews: rows(reviews.reviews).filter(review => text(review.id) && Number.isInteger(review.rating) && (number(review.rating) ?? 0) >= 1 && (number(review.rating) ?? 6) <= 5).map(review => ({ id: text(review.id, 100), rating: number(review.rating)!, comment: publicComment(review.comment) })),
    rating: (number(reviews.average) ?? 0) >= 1 && (number(reviews.average) ?? 6) <= 5 ? number(reviews.average) : undefined,
    reviewCount: Math.max(0, Math.floor(number(reviews.total) ?? 0)),
  };
}

export function normalizeSiteConfig(input: unknown, fallback: SiteConfig): SiteConfig {
  const source = row(input);
  const offer = row(source.offer);
  const sections = rows(source.sections).filter(section => sectionIds.includes(section.id as SectionId) && typeof section.enabled === 'boolean').map(section => ({ id: section.id as SectionId, enabled: section.enabled as boolean }));
  const preset: SitePreset | undefined = source.preset === 'urban' || source.preset === 'editorial' || source.preset === 'salon' ? source.preset : fallback.preset;
  const style: SiteStyle = source.style === 'dark' || source.style === 'light' ? source.style : fallback.style;
  const offerKind: OfferKind | undefined = offer.kind === 'first_visit' || offer.kind === 'featured' || offer.kind === 'combo' || offer.kind === 'club' ? offer.kind : fallback.offer.kind;
  return {
    style,
    ...(preset ? { preset } : {}),
    accent: /^#[0-9a-f]{6}$/i.test(text(source.accent)) ? text(source.accent) : fallback.accent,
    background: hexColor(source.background) ?? fallback.background,
    headline: typeof source.headline === 'string' ? text(source.headline, 180) : fallback.headline,
    about: typeof source.about === 'string' ? text(source.about, 2000) : fallback.about,
    ...(typeof source.ctaLabel === 'string' && text(source.ctaLabel, 60) ? { ctaLabel: text(source.ctaLabel, 60) } : {}),
    ...(safeImageUrl(source.logo) ? { logo: safeImageUrl(source.logo) } : {}),
    ...(source.logoRemoved === true ? { logoRemoved: true } : {}),
    ...(source.logoDisplay === 'logo' || source.logoDisplay === 'both' ? { logoDisplay: source.logoDisplay } : {}),
    ...(source.coverRemoved === true ? { coverRemoved: true } : {}),
    offer: typeof source.offer === 'object' && source.offer ? { enabled: offer.enabled === true, ...(offerKind ? { kind: offerKind } : {}), title: text(offer.title, 180), condition: text(offer.condition, 300), serviceId: text(offer.serviceId, 100) || undefined, expires: /^\d{4}-\d{2}-\d{2}$/.test(text(offer.expires)) ? text(offer.expires) : undefined } : fallback.offer,
    differences: Array.isArray(source.differences) ? source.differences.filter((value): value is string => typeof value === 'string').slice(0, 8).map(value => text(value, 250)) : fallback.differences,
    faq: Array.isArray(source.faq) ? rows(source.faq).slice(0, 12).map(item => ({ question: text(item.question, 200), answer: text(item.answer, 1500) })) : fallback.faq,
    sections: sections.length ? sections.filter((section, index) => sections.findIndex(item => item.id === section.id) === index).concat(sectionIds.flatMap(id => sections.some(section => section.id === id) ? [] : [{ id, enabled: true }])) : fallback.sections,
    seoTitle: typeof source.seoTitle === 'string' ? text(source.seoTitle, 180) : fallback.seoTitle,
    seoDescription: typeof source.seoDescription === 'string' ? text(source.seoDescription, 320) : fallback.seoDescription,
    cover: safeImageUrl(source.cover),
    photoFocus: source.photoFocus === 'top' || source.photoFocus === 'bottom' || source.photoFocus === 'work' || source.photoFocus === 'space' || source.photoFocus === 'center' ? source.photoFocus : fallback.photoFocus,
    photoPosition: (() => {
      const pos = row(source.photoPosition);
      const x = clampPercent(pos.x);
      const y = clampPercent(pos.y);
      if (x === undefined && y === undefined) return fallback.photoPosition;
      return { x: x ?? 50, y: y ?? 50 };
    })(),
    ...(Array.isArray(source.gallery) ? { gallery: rows(source.gallery).slice(0, 24).filter(photo => safeImageUrl(photo.src)).map(photo => ({ src: safeImageUrl(photo.src)!, alt: text(photo.alt, 200) })) } : {}),
    ...(source.serviceDetails ? { serviceDetails: normalizeServiceDetails(source.serviceDetails) } : {}),
    ...(source.teamDetails ? { teamDetails: Object.fromEntries(Object.entries(row(source.teamDetails)).slice(0, 40).map(([id, value]) => { const member = row(value); return [id, { ...(typeof member.bio === 'string' ? { bio: text(member.bio, 1000) } : {}), ...(safeImageUrl(member.image) ? { image: safeImageUrl(member.image) } : {}) }]; })) } : {}),
    ...(source.contact ? { contact: normalizeContact(source.contact) } : {}),
    ...(Array.isArray(source.beforeAfter) ? { beforeAfter: rows(source.beforeAfter).slice(0, 8).filter(pair => safeImageUrl(pair.before) && safeImageUrl(pair.after) && safeImageUrl(pair.before) !== safeImageUrl(pair.after)).map(pair => ({ before: safeImageUrl(pair.before)!, after: safeImageUrl(pair.after)!, ...(text(pair.caption, 160) ? { caption: text(pair.caption, 160) } : {}) })) } : {}),
  };
}


function normalizeServiceDetails(input: unknown): NonNullable<SiteConfig['serviceDetails']> {
  return Object.fromEntries(Object.entries(row(input)).slice(0, 150).map(([id, value]) => {
    const service = row(value);
    return [id, {
      ...(typeof service.description === 'string' ? { description: text(service.description, 1500) } : {}),
      ...(Array.isArray(service.includes) ? { includes: service.includes.filter((value): value is string => typeof value === 'string').slice(0, 12).map(value => text(value, 180)) } : {}),
      ...(typeof service.audience === 'string' ? { audience: text(service.audience, 500) } : {}),
      ...(typeof service.priceNote === 'string' ? { priceNote: text(service.priceNote, 300) } : {}),
      ...(typeof service.priceFrom === 'boolean' ? { priceFrom: service.priceFrom } : {}),
      ...(typeof service.featured === 'boolean' ? { featured: service.featured } : {}),
      ...(safeImageUrl(service.image) ? { image: safeImageUrl(service.image) } : {}),
    }];
  }));
}

function normalizeContact(input: unknown): NonNullable<SiteConfig['contact']> {
  const contact = row(input);
  return {
    ...(typeof contact.phone === 'string' ? { phone: text(contact.phone, 40) } : {}),
    ...(typeof contact.instagram === 'string' ? { instagram: text(contact.instagram, 100).replace(/^@/, '').replace(/[^a-z0-9._]/gi, '') } : {}),
    ...(typeof contact.addressNote === 'string' ? { addressNote: text(contact.addressNote, 300) } : {}),
  };
}

export function applyNormalizedSiteConfig(data: SiteData, normalized: SiteConfig): SiteData {
  return {
    ...data,
    logo: normalized.logoRemoved ? undefined : (normalized.logo || data.logo),
    cover: normalized.coverRemoved ? undefined : (normalized.cover || data.cover),
    ...(normalized.contact?.phone !== undefined ? { phone: normalized.contact.phone || undefined } : {}),
    ...(normalized.contact?.instagram !== undefined ? { instagram: normalized.contact.instagram || undefined } : {}),
    gallery: normalized.gallery ?? data.gallery,
    services: data.services.map(service => ({ ...service, ...normalized.serviceDetails?.[service.id] })),
    team: data.team.map(member => ({ ...member, ...normalized.teamDetails?.[member.id] })),
  };
}

export function applySiteConfig(data: SiteData, config: SiteConfig): SiteData {
  return applyNormalizedSiteConfig(data, normalizeSiteConfig(config, defaultConfig(data)));
}
