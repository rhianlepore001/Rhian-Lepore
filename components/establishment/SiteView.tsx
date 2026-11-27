import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  accessibleAccent,
  applyNormalizedSiteConfig,
  contrastRatio,
  defaultConfig,
  formatPrice,
  headerSurface,
  isDarkSurfaceColor,
  neighborhoodFromAddress,
  normalizeSiteConfig,
  offerDisplay,
  photoObjectPosition,
  placeFromAddress,
  resolvedBackground,
  resolvedPreset,
  siteSurface,
  visibleSections,
  type SiteClubPlan,
  type SiteConfig,
  type SiteData,
  type SiteService,
} from '../../lib/establishment/model';
import { studioCopy } from '../../lib/establishment/copy';
import { openingStatus, timezoneForRegion, weekdayNumbers } from '../../lib/establishment/hours';
import { buildGoogleMapsDirectionsUrl, buildSafeMapEmbedUrl } from '../../lib/establishment/location';
import { buildWhatsAppLink } from '../../utils/formatters';
import { BeforeAfterComparator } from './BeforeAfterComparator';
import { FaqAccordion } from './FaqAccordion';
import '../../styles/establishment.css';

interface SiteViewProps {
  data: SiteData;
  config: SiteConfig;
  serviceId?: string;
  preview?: boolean;
}

interface BookingContext {
  serviceId?: string;
  professionalId?: string;
  offer?: boolean;
}

const ALLOWED_ORIGINS = new Set(['instagram', 'google', 'qr']);

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function formatOfferDate(expires: string | undefined, region: 'BR' | 'PT'): string {
  if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return '';
  try {
    const date = new Date(`${expires}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return expires;
    return new Intl.DateTimeFormat(region === 'PT' ? 'pt-PT' : 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return expires;
  }
}

function currentWeekdayIndex(timeZone: string): number {
  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date());
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[short] ?? new Date().getDay();
  } catch {
    return new Date().getDay();
  }
}

function readOriginParam(slug?: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const fromHash = new URLSearchParams(hashQuery).get('origem')?.trim().toLowerCase();
  const fromSearch = new URLSearchParams(window.location.search).get('origem')?.trim().toLowerCase();
  const found = [fromHash, fromSearch].find(val => val && ALLOWED_ORIGINS.has(val));
  const key = slug ? `agendix:presence:origin:${slug}` : '';
  if (found) {
    if (key) {
      try {
        sessionStorage.setItem(key, found);
      } catch {
        // ignore storage errors
      }
    }
    return found;
  }
  if (key) {
    try {
      const stored = sessionStorage.getItem(key)?.trim().toLowerCase();
      if (stored && ALLOWED_ORIGINS.has(stored)) return stored;
    } catch {
      // ignore storage errors
    }
  }
  return undefined;
}

function openNativeDialog(element: HTMLDialogElement | null) {
  if (!element) return;
  if (typeof element.showModal === 'function') {
    if (!element.open) element.showModal();
  } else {
    element.setAttribute('open', '');
  }
}

function closeNativeDialog(element: HTMLDialogElement | null) {
  if (!element) return;
  if (typeof element.close === 'function') {
    if (element.open) element.close();
  } else {
    element.removeAttribute('open');
  }
}

const arrowLeftSvg = (
  <svg className="es-arrow-back" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.5 8h-9" />
    <path d="M7.25 4.25 3.5 8l3.75 3.75" />
  </svg>
);

const checkSvg = (
  <svg className="es-check-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.25 8.5 6.5 11.75 12.75 4.75" />
  </svg>
);

function MapSketch({ accent, label }: { accent: string; label?: string }) {
  return (
    <div className="es-map-sketch">
      <svg aria-hidden="true" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice">
        <rect width="420" height="220" fill="currentColor" fillOpacity="0.015" />
        <path
          d="M-10 46 Q 110 38, 220 56 T 430 42 M-10 112 Q 140 124, 260 104 T 430 118 M-10 176 Q 150 166, 290 182 T 430 170"
          stroke="currentColor"
          strokeOpacity="0.11"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M68 -10 Q 82 95, 62 230 M162 -10 Q 150 110, 174 230 M264 -10 Q 278 105, 254 230 M352 -10 Q 340 115, 362 230"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M-10 132 L430 82 M196 -10 L218 230"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="4"
          fill="none"
        />
        <circle cx="208" cy="108" r="34" fill={accent} fillOpacity="0.1" />
      </svg>
      {label && <span className="es-map-label">{label}</span>}
    </div>
  );
}

const mapPinSvg = (
  <span className="es-map-pin" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  </span>
);

function LocationMap({
  accent,
  name,
  address,
  label,
  lat,
  lng,
  region,
  demo,
  preview,
  directionsUrl,
}: {
  accent: string;
  name: string;
  address: string;
  label?: string;
  lat?: number;
  lng?: number;
  region: 'BR' | 'PT';
  demo: boolean;
  preview?: boolean;
  directionsUrl?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const rawEmbedUrl = useMemo(
    () => (demo ? undefined : buildSafeMapEmbedUrl({ address, lat, lng, region })),
    [demo, address, lat, lng, region],
  );
  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState(rawEmbedUrl);
  const debouncedPreviewUrlRef = useRef(debouncedPreviewUrl);
  debouncedPreviewUrlRef.current = debouncedPreviewUrl;
  useEffect(() => {
    if (!preview || !rawEmbedUrl) {
      if (debouncedPreviewUrlRef.current !== rawEmbedUrl) setDebouncedPreviewUrl(rawEmbedUrl);
      return;
    }
    if (rawEmbedUrl === debouncedPreviewUrlRef.current) return;
    const timer = window.setTimeout(() => setDebouncedPreviewUrl(rawEmbedUrl), 750);
    return () => window.clearTimeout(timer);
  }, [preview, rawEmbedUrl]);
  const embedUrl = preview ? debouncedPreviewUrl : rawEmbedUrl;

  useEffect(() => {
    setLoaded(false);
    setInteractive(false);
  }, [embedUrl]);

  if (!embedUrl) {
    if (!demo && directionsUrl) {
      return (
        <a
          className="es-map es-map-link"
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir localização de ${name} no mapa`}
        >
          <MapSketch accent={accent} />
          {mapPinSvg}
        </a>
      );
    }
    return (
      <div className="es-map" role="img" aria-label={`Mapa ilustrativo de ${label || name}`}>
        <MapSketch accent={accent} />
        {mapPinSvg}
      </div>
    );
  }

  return (
    <div
      className="es-map es-map-embed"
      data-loaded={loaded || undefined}
      data-interactive={interactive || undefined}
    >
      <MapSketch accent={accent} />
      {mapPinSvg}
      <iframe
        title={`Mapa com a localização de ${name}`}
        src={embedUrl}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
      <button
        type="button"
        className="es-map-toggle"
        aria-pressed={interactive}
        onClick={() => setInteractive(prev => !prev)}
      >
        {interactive ? 'Bloquear mapa' : 'Explorar mapa'}
      </button>
      {label && <span className="es-map-label">{label}</span>}
    </div>
  );
}

export { placeFromAddress };

export function SiteView({ data: sourceData, config: incoming, serviceId, preview = false }: SiteViewProps) {
  const config = useMemo(() => normalizeSiteConfig(incoming, defaultConfig(sourceData)), [incoming, sourceData]);
  const data = useMemo(() => applyNormalizedSiteConfig(sourceData, config), [sourceData, config]);
  const copy = useMemo(() => studioCopy(data.kind, data.region), [data.kind, data.region]);
  const preset = resolvedPreset(config, data.kind);

  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedClubPlan, setSelectedClubPlan] = useState<SiteClubPlan | null>(null);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [brokenTeamIds, setBrokenTeamIds] = useState<Record<string, boolean>>({});
  const [lightboxBroken, setLightboxBroken] = useState(false);
  const [notice, setNotice] = useState('');

  const dialog = useRef<HTMLDialogElement>(null);
  const lightboxDialog = useRef<HTMLDialogElement>(null);
  const lightboxMediaRef = useRef<HTMLDivElement>(null);
  const lightboxSwipeRef = useRef<{
    pointerId: number;
    startX: number;
    prevX: number;
    prevTime: number;
    lastX: number;
    lastTime: number;
    deltaX: number;
  } | null>(null);
  const clubDialog = useRef<HTMLDialogElement>(null);
  const legalDialog = useRef<HTMLDialogElement>(null);

  const sections = useMemo(() => visibleSections(data, config), [data, config]);
  const surface = useMemo(() => siteSurface(resolvedBackground(config, data.kind), config.style), [config, data.kind]);
  const isDarkSurface = useMemo(() => isDarkSurfaceColor(surface.background), [surface.background]);
  const accent = useMemo(() => accessibleAccent(config.accent, config.style, surface.background), [config.accent, config.style, surface.background]);
  const header = useMemo(() => headerSurface(preset, surface), [preset, surface]);
  const headerBg = header.background;
  const headerInk = header.ink;
  const headerAccent = useMemo(
    () => accessibleAccent(config.accent, header.dark ? 'dark' : 'light', headerBg),
    [config.accent, header.dark, headerBg],
  );
  const closeSurfaceDark = preset === 'editorial' || isDarkSurface;
  const closeAccent = useMemo(() => {
    if (!closeSurfaceDark) return accent;
    const closeBg = preset === 'editorial' ? '#1C1714' : '#111114';
    const candidate = accessibleAccent(config.accent, 'dark', closeBg);
    if (contrastRatio(candidate.background, closeBg) < 4.5) {
      return { background: '#FBF7F0', foreground: '#1C1714' };
    }
    return candidate;
  }, [accent, closeSurfaceDark, config.accent, preset]);

  const service = serviceId ? data.services.find(item => item.id === serviceId) : undefined;
  const home = `/#/site/${encodeURIComponent(data.slug)}`;
  const beauty = data.kind === 'beauty';
  const cover = data.cover;
  const hasCover = Boolean(cover && !coverBroken);
  const isImmersiveHero = hasCover && isDarkSurface && preset === 'urban';
  const logo = data.logo;
  const hasLogo = Boolean(logo && !logoBroken);
  const logoOnly = config.logoDisplay === 'logo' && hasLogo;
  const place = placeFromAddress(data.address);
  const neighborhood = neighborhoodFromAddress(data.address);
  const ctaLabel = config.ctaLabel?.trim() || copy.book;

  const offer = offerDisplay(config.offer);
  const offerVisible = Boolean(
    config.offer.enabled &&
      offer.title &&
      (!config.offer.expires || new Date(`${config.offer.expires}T23:59:59`).getTime() >= Date.now()),
  );
  const offerFormattedDate = formatOfferDate(config.offer.expires, data.region);
  const offerExpiryText = offerFormattedDate ? copy.offerValidUntil(offerFormattedDate) : '';
  const offerLine = offerVisible ? [offer.title, offerExpiryText].filter(Boolean).join(' · ') : '';

  const price = (value: number) => formatPrice(value, data.region);
  const hasRating = Boolean(data.rating && data.reviewCount > 0);
  const reviewWord = data.reviewCount === 1 ? 'avaliação' : 'avaliações';
  const teamHasPhotos = data.team.some(person => Boolean(person.image));
  const timeZone = timezoneForRegion(data.region);
  const status = openingStatus(data.hours, new Date(), timeZone);
  const todayWeekday = currentWeekdayIndex(timeZone);

  const categories = useMemo(
    () => Array.from(new Set(data.services.map(item => item.category?.trim()).filter((value): value is string => Boolean(value)))),
    [data.services],
  );
  const groupServicesByCategory = data.services.length > 6 && categories.length >= 2;

  const pairs = (config.beforeAfter ?? []).filter(pair => pair.before && pair.after && pair.before !== pair.after);
  const pageColor = surface.background;

  const headlineHasPlace = Boolean(
    neighborhood && config.headline.toLowerCase().includes(neighborhood.toLowerCase()),
  );
  const heroPlaceHint = !headlineHasPlace && neighborhood ? neighborhood : '';

  const openBooking = (context: BookingContext = {}) => {
    if (preview) {
      setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.');
      return;
    }
    setBooking(context);
  };

  const stepLightbox = (delta: number) => {
    if (data.gallery.length < 2 || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + delta + data.gallery.length) % data.gallery.length);
  };

  useEffect(() => {
    setLogoBroken(false);
  }, [logo]);

  useEffect(() => {
    setCoverBroken(false);
  }, [cover]);

  useEffect(() => {
    setBrokenTeamIds({});
  }, [data.team]);

  const activePhotoSrc = lightboxIndex !== null ? data.gallery[lightboxIndex]?.src : undefined;

  useEffect(() => {
    setLightboxBroken(false);
    if (lightboxIndex === null) {
      lightboxSwipeRef.current = null;
      if (lightboxMediaRef.current) {
        lightboxMediaRef.current.style.transition = '';
        lightboxMediaRef.current.style.transform = '';
      }
    }
  }, [lightboxIndex, activePhotoSrc]);

  useEffect(() => {
    if (legalDoc) openNativeDialog(legalDialog.current);
    else closeNativeDialog(legalDialog.current);
  }, [legalDoc]);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.establishment = config.style;
    html.style.setProperty('--es-page', pageColor);
  }, [config.style, pageColor]);

  useEffect(() => {
    if (preview || typeof document === 'undefined') return;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    const previous = meta?.content;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = isImmersiveHero ? '#09090B' : surface.background;
    return () => {
      if (created) meta?.remove();
      else if (meta && previous !== undefined) meta.content = previous;
    };
  }, [isImmersiveHero, surface.background, preview]);

  useEffect(() => {
    if (booking) openNativeDialog(dialog.current);
    else closeNativeDialog(dialog.current);
  }, [booking]);

  useEffect(() => {
    if (lightboxIndex !== null && data.gallery[lightboxIndex]) {
      openNativeDialog(lightboxDialog.current);
    } else {
      closeNativeDialog(lightboxDialog.current);
    }
  }, [lightboxIndex, data.gallery]);

  useEffect(() => {
    if (selectedClubPlan) openNativeDialog(clubDialog.current);
    else closeNativeDialog(clubDialog.current);
  }, [selectedClubPlan]);

  const anyDialogOpen = Boolean(booking || lightboxIndex !== null || selectedClubPlan || legalDoc);
  useEffect(() => {
    if (!anyDialogOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [anyDialogOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const originSource = useMemo(() => readOriginParam(data.slug), [data.slug]);
  const params = new URLSearchParams({
    agendar: '1',
    embed: 'site',
    appearance: config.style === 'dark' ? 'dark' : 'light',
    preset,
    brand: accent.background,
  });
  if (booking?.serviceId) params.set('rebook', booking.serviceId);
  if (booking?.professionalId) params.set('pro', booking.professionalId);
  params.set('origem', originSource || 'site');

  const bookingSlug = data.demo ? `simulacao-${beauty ? 'beauty' : 'barber'}` : encodeURIComponent(data.slug);
  const bookingUrl = data.demo
    ? `/demo-preview#/demo/${beauty ? 'beauty' : 'barber'}/book/${bookingSlug}?${params}`
    : `/#/book/${bookingSlug}?${params}`;

  const serviceLink = (targetId: string) => `${home}/servico/${encodeURIComponent(targetId)}`;
  const imageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.closest('.es-photo')?.setAttribute('data-broken', 'true');
  };

  const whatsapp = data.phone ? buildWhatsAppLink(data.phone, data.region) : undefined;
  const directionsUrl = buildGoogleMapsDirectionsUrl({
    name: data.name,
    address: data.address,
    mapsUrl: data.mapsUrl,
    lat: data.lat,
    lng: data.lng,
  });
  const hasLocationTarget = Boolean(data.address || directionsUrl || (data.lat !== undefined && data.lng !== undefined));
  const id = (section: string) => `${preview ? 'preview-' : ''}${section}`;

  const photo = (
    src: string,
    alt: string,
    opts: { className?: string; priority?: boolean; width?: number; height?: number; position?: string } = {},
  ) => (
    <div className={`es-photo ${opts.className || ''}`}>
      <img
        style={opts.position ? { objectPosition: opts.position } : undefined}
        src={src}
        alt={alt}
        loading={opts.priority ? 'eager' : 'lazy'}
        fetchPriority={opts.priority ? 'high' : undefined}
        decoding="async"
        width={opts.width || 900}
        height={opts.height || 1125}
        onError={imageError}
      />
    </div>
  );

  const brandMark = (
    <a
      className="es-wordmark"
      href={home}
      aria-label={data.name}
      data-logo-mode={logoOnly ? 'logo' : hasLogo ? 'both' : 'text'}
    >
      {hasLogo && (
        <img
          className={`es-brand-logo${logoOnly ? ' es-brand-logo-solo' : ''}`}
          src={logo}
          alt=""
          decoding="async"
          onError={() => setLogoBroken(true)}
        />
      )}
      {logoOnly ? (
        <span className="es-sr">{data.name}</span>
      ) : (
        <span className="es-wordmark-text">
          <b>{data.name}</b>
          {heroPlaceHint && (
            <span className="es-wordmark-place">
              <span aria-hidden="true">·</span> {heroPlaceHint}
            </span>
          )}
        </span>
      )}
    </a>
  );

  const renderMenuRow = (item: SiteService) => (
    <article className="es-menu-item" key={item.id}>
      <div className="es-menu-copy">
        <h3>
          <a className="es-service-link" href={serviceLink(item.id)}>
            {item.name}
          </a>
        </h3>
        <p className="es-menu-meta">
          <span className="es-price-value">
            {item.priceFrom && <small>A partir de </small>}
            {price(item.price)}
          </span>
          <span className="es-price-sep" aria-hidden="true">·</span>
          <span className="es-price-duration">{item.duration} min</span>
        </p>
      </div>
      <button
        type="button"
        className="es-menu-book"
        aria-label={`${copy.bookRow} ${item.name}`}
        onClick={() => openBooking({ serviceId: item.id })}
      >
        {copy.bookRow}
      </button>
    </article>
  );

  const addressNote = config.contact?.addressNote?.trim();

  const handleLightboxPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (data.gallery.length < 2) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (lightboxSwipeRef.current) return;
    const now = performance.now();
    lightboxSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      prevX: event.clientX,
      prevTime: now,
      lastX: event.clientX,
      lastTime: now,
      deltaX: 0,
    };
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failure
      }
    }
    if (lightboxMediaRef.current) {
      lightboxMediaRef.current.style.transition = 'none';
    }
  };

  const handleLightboxPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipe = lightboxSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const now = performance.now();
    if (now - swipe.lastTime > 4) {
      swipe.prevX = swipe.lastX;
      swipe.prevTime = swipe.lastTime;
      swipe.lastX = event.clientX;
      swipe.lastTime = now;
    }
    const dx = event.clientX - swipe.startX;
    swipe.deltaX = dx;
    if (lightboxMediaRef.current) {
      lightboxMediaRef.current.style.transform = `translate3d(${dx}px, 0, 0)`;
    }
  };

  const finishLightboxSwipe = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const swipe = lightboxSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    lightboxSwipeRef.current = null;
    if (typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release failure
      }
    }
    const elapsed = Math.max(1, performance.now() - swipe.prevTime);
    const velocity = Math.abs(event.clientX - swipe.prevX) / elapsed;
    if (lightboxMediaRef.current) {
      lightboxMediaRef.current.style.transition = '';
      lightboxMediaRef.current.style.transform = '';
    }
    if (commit && (Math.abs(swipe.deltaX) >= 60 || (Math.abs(swipe.deltaX) > 24 && velocity > 0.35))) {
      stepLightbox(swipe.deltaX < 0 ? 1 : -1);
    }
  };

  const handleLightboxPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finishLightboxSwipe(event, true);
  };

  const handleLightboxPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishLightboxSwipe(event, false);
  };

  const renderSection = (section: (typeof sections)[number]) => (
    <section
      id={id(section.id)}
      key={section.id}
      className={`es-section es-section-${section.id}`}
    >
      <div className="es-wrap">
        {section.id === 'gallery' && (
          <>
            <h2 className="es-section-title">{copy.galleryTitle}</h2>
            <div className="es-gallery" data-count={data.gallery.length}>
              {data.gallery.map((item, index) => (
                <figure key={`${item.src}-${index}`} data-featured={index === 0 ? 'true' : undefined}>
                  <button
                    type="button"
                    className="es-gallery-trigger"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Ampliar foto: ${item.alt}`}
                  >
                    {photo(item.src, item.alt, { width: 1200, height: 900 })}
                  </button>
                </figure>
              ))}
            </div>
          </>
        )}

        {section.id === 'beforeAfter' && pairs.length > 0 && (
          <>
            <h2 className="es-section-title">{copy.beforeTitle}</h2>
            <div className="es-before-grid" data-count={pairs.length}>
              {pairs.map((pair, index) => (
                <BeforeAfterComparator
                  key={`${index}-${pair.before}-${pair.after}`}
                  before={pair.before}
                  after={pair.after}
                  caption={pair.caption}
                  showCaption={Boolean(pair.caption?.trim())}
                />
              ))}
            </div>
          </>
        )}

        {section.id === 'services' && (
          <>
            <h2 className="es-section-title">{copy.servicesTitle}</h2>
            {groupServicesByCategory ? (
              <div className="es-services es-menu-grouped">
                {categories.map(category => {
                  const items = data.services.filter(item => item.category?.trim() === category);
                  if (!items.length) return null;
                  return (
                    <div className="es-menu-group" key={category}>
                      <h3 className="es-menu-group-title">{category}</h3>
                      <div className="es-menu">{items.map(renderMenuRow)}</div>
                    </div>
                  );
                })}
                {data.services.some(item => !item.category?.trim()) && (
                  <div className="es-menu-group">
                    <div className="es-menu">
                      {data.services.filter(item => !item.category?.trim()).map(renderMenuRow)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="es-services es-menu" data-count={data.services.length}>
                {data.services.map(renderMenuRow)}
              </div>
            )}
          </>
        )}

        {section.id === 'team' && (
          <>
            <h2 className="es-section-title">{copy.teamTitle}</h2>
            <div className="es-team" data-photos={teamHasPhotos ? 'true' : 'false'} data-count={data.team.length}>
              {data.team.map(person => (
                <article className="es-person" key={person.id}>
                  {person.image && !brokenTeamIds[person.id] ? (
                    <div className="es-photo es-person-photo">
                      <img
                        src={person.image}
                        alt={person.name}
                        loading="lazy"
                        decoding="async"
                        width={900}
                        height={1200}
                        onError={() => setBrokenTeamIds(prev => ({ ...prev, [person.id]: true }))}
                      />
                    </div>
                  ) : (
                    <span className="es-monogram" aria-hidden="true">{initials(person.name)}</span>
                  )}
                  <div className="es-person-body">
                    <div className="es-person-copy">
                      <h3>{person.name}</h3>
                      {person.bio && <p className="es-person-bio">{person.bio}</p>}
                    </div>
                    <button
                      type="button"
                      className="es-person-book"
                      onClick={() => openBooking({ professionalId: person.id })}
                    >
                      {copy.bookWith(person.name)}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section.id === 'reviews' && (() => {
          const visibleReviews = data.reviews.filter(review => review.comment.trim()).slice(0, 3);
          return (
            <>
              <div className="es-reviews-header">
                <h2 className="es-section-title">{copy.reviewsTitle}</h2>
                {hasRating && (
                  <p className="es-rating-line">
                    <strong>{data.rating!.toFixed(1).replace('.', ',')}</strong>
                    <span>{data.reviewCount} {reviewWord}</span>
                  </p>
                )}
              </div>
              <div className="es-reviews" data-count={visibleReviews.length}>
                {visibleReviews.map(review => (
                  <figure className="es-quote" key={review.id}>
                    <blockquote>“{review.comment}”</blockquote>
                    <figcaption>{review.name || copy.verifiedReview}</figcaption>
                  </figure>
                ))}
              </div>
              {data.demo && <p className="es-demo-reviews-note">Depoimentos ilustrativos de demonstração.</p>}
            </>
          );
        })()}

        {section.id === 'location' && (
          <>
            <h2 className="es-section-title">{copy.locationTitle()}</h2>
            <div className="es-location">
              <div className="es-location-info">
                {status && <p className="es-open-status">{status.label}</p>}
                {data.address && <p className="es-address">{data.address}</p>}
                {addressNote && (
                  <p className="es-address-note">{addressNote}</p>
                )}
                {data.hours.length > 0 && (
                  <dl className="es-hours">
                    {data.hours.map(row => {
                      const isToday = weekdayNumbers(row.day).includes(todayWeekday);
                      return (
                        <div key={row.day} className={isToday ? 'es-hours-today' : undefined} data-today={isToday || undefined}>
                          <dt>{row.day}{isToday ? ' (hoje)' : ''}</dt>
                          <dd>{row.hours}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {((directionsUrl && !data.demo) || whatsapp) && (
                  <div className="es-location-actions">
                    {directionsUrl && !data.demo && (
                      <a className="es-button" href={directionsUrl} target="_blank" rel="noreferrer">
                        {copy.directions}
                      </a>
                    )}
                    {whatsapp && (
                      <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                  </div>
                )}
                {(data.phone || data.instagram) && (
                  <div className="es-location-meta">
                    {data.phone && <a href={`tel:${data.phone.replace(/\s+/g, '')}`}>{data.phone}</a>}
                    {data.instagram && (
                      <a href={`https://www.instagram.com/${data.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">
                        @{data.instagram.replace(/^@/, '')}
                      </a>
                    )}
                  </div>
                )}
              </div>
              {hasLocationTarget && (
                <LocationMap
                  accent={accent.background}
                  name={data.name}
                  address={data.address}
                  label={neighborhood || place || data.name}
                  lat={data.lat}
                  lng={data.lng}
                  region={data.region}
                  demo={data.demo}
                  preview={preview}
                  directionsUrl={directionsUrl}
                />
              )}
            </div>
          </>
        )}

        {section.id === 'club' && data.clubPlans && data.clubPlans.length > 0 && (
          <>
            <h2 className="es-section-title">{copy.clubTitle}</h2>
            <div className="es-club-list" data-count={data.clubPlans.length}>
              {data.clubPlans.map(plan => (
                <article className="es-club-row" key={plan.id}>
                  <div className="es-club-copy">
                    <h3>{plan.name}</h3>
                    {plan.description && <p className="es-club-desc">{plan.description}</p>}
                    <p className="es-club-limit">
                      {plan.usageLimitPerMonth && plan.usageLimitPerMonth > 0
                        ? copy.clubLimit(plan.usageLimitPerMonth)
                        : copy.clubUnlimited}
                    </p>
                  </div>
                  <div className="es-club-action">
                    <p className="es-club-price">
                      {price(plan.priceCents / 100)}
                      <span>{copy.clubPerMonth}</span>
                    </p>
                    {preview || data.demo ? (
                      <button
                        type="button"
                        className="es-menu-book"
                        onClick={() => {
                          if (preview) {
                            setNotice('A prévia não realiza assinaturas. Abra o site para testar o fluxo.');
                          } else {
                            setSelectedClubPlan(plan);
                          }
                        }}
                      >
                        {copy.clubJoin}
                      </button>
                    ) : (
                      <a className="es-menu-book" href={`/#/clube/${encodeURIComponent(data.slug)}`}>
                        {copy.clubJoin}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section.id === 'differences' && (
          <>
            <h2 className="es-section-title">{copy.aboutTitle(data.name)}</h2>
            <ul className="es-differences">
              {config.differences
                .filter(item => item.trim())
                .map((item, index) => (
                  <li key={`${index}-${item}`}>
                    <p>{item}</p>
                  </li>
                ))}
            </ul>
          </>
        )}

        {section.id === 'faq' && (
          <>
            <h2 className="es-section-title">{copy.faqTitle}</h2>
            <FaqAccordion items={config.faq} />
          </>
        )}
      </div>
    </section>
  );

  const activePhoto = lightboxIndex !== null ? data.gallery[lightboxIndex] : undefined;

  return (
    <div
      className="establishment"
      data-style={config.style}
      data-dark-surface={isDarkSurface ? 'true' : 'false'}
      data-preset={preset}
      data-kind={data.kind}
      data-preview={preview || undefined}
      style={
        {
          '--es-accent': accent.background,
          '--es-on-accent': accent.foreground,
          '--es-header': headerBg,
          '--es-header-ink': headerInk,
          '--es-header-accent': headerAccent.background,
          '--es-on-header-accent': headerAccent.foreground,
          '--es-bg': surface.background,
          '--es-ink': surface.ink,
          '--es-body': surface.body,
          '--es-muted': surface.muted,
          '--es-line': surface.line,
          '--es-panel': surface.panel,
          '--es-map': surface.map,
        } as React.CSSProperties
      }
    >
      <a
        className="es-skip"
        href="#es-content"
        onClick={event => {
          event.preventDefault();
          document.getElementById('es-content')?.focus();
        }}
      >
        {copy.skip}
      </a>

      {serviceId && (
        <header className="es-service-header">
          <div className="es-wrap es-service-header-inner">
            <a className="es-back-link" href={home}>
              {arrowLeftSvg}
              <span>{copy.allServices}</span>
            </a>
            {brandMark}
          </div>
        </header>
      )}

      <main id="es-content" tabIndex={-1}>
        {serviceId ? (
          service ? (
            <>
              <section className="es-service-detail es-wrap">
                <div className="es-detail-copy">
                  <h1>{service.name}</h1>
                  <p className="es-decision">
                    <span>
                      {service.priceFrom ? 'A partir de ' : ''}
                      {price(service.price)}
                    </span>
                    <span className="es-price-sep" aria-hidden="true">·</span>
                    <span className="es-decision-duration">{service.duration} min</span>
                  </p>
                  {service.priceNote && <p className="es-price-note">{service.priceNote}</p>}
                  {service.description && <p className="es-detail-desc">{service.description}</p>}
                  {service.image &&
                    photo(service.image, service.name, { className: 'es-detail-photo es-detail-photo-mobile', priority: true, width: 900, height: 675 })}
                  <div className="es-detail-actions">
                    <button type="button" className="es-button es-button-block" onClick={() => openBooking({ serviceId: service.id })}>
                      {copy.bookService}
                    </button>
                    {whatsapp && (
                      <a className="es-ghost es-button-block" href={whatsapp} target="_blank" rel="noreferrer">
                        {copy.whatsappQuestion}
                      </a>
                    )}
                  </div>
                  {service.includes.length > 0 && (
                    <div className="es-detail-block">
                      <h2>{copy.includes}</h2>
                      <ul className="es-detail-includes">
                        {service.includes.map(entry => (
                          <li key={entry}>
                            {checkSvg}
                            <span>{entry}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {service.audience && (
                    <div className="es-detail-block">
                      <h2>{copy.audience}</h2>
                      <p>{service.audience}</p>
                    </div>
                  )}
                </div>
                {service.image &&
                  photo(service.image, service.name, { className: 'es-detail-photo es-detail-photo-desktop', priority: true, width: 900, height: 675 })}
              </section>
              {pairs.length > 0 && (
                <section className="es-section es-section-beforeAfter">
                  <div className="es-wrap">
                    <h2 className="es-section-title">{copy.beforeTitle}</h2>
                    <div className="es-before-grid" data-count={pairs.length}>
                      {pairs.map((pair, index) => (
                        <BeforeAfterComparator
                          key={`${index}-${pair.before}-${pair.after}`}
                          before={pair.before}
                          after={pair.after}
                          caption={pair.caption}
                          showCaption={Boolean(pair.caption?.trim())}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              )}
              {data.services.length > 1 && (
                <section className="es-section es-more-services">
                  <div className="es-wrap">
                    <h2 className="es-section-title">{copy.otherServices}</h2>
                    <div className="es-menu">
                      {data.services
                        .filter(item => item.id !== service.id)
                        .map(renderMenuRow)}
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="es-wrap es-empty">
              <h1>Serviço não encontrado</h1>
              <p>Este serviço pode ter saído do cardápio.</p>
              <a href={home}>Ver os serviços da casa</a>
            </section>
          )
        ) : (
          <>
            <section
              className={`es-hero ${hasCover ? (isImmersiveHero ? 'es-hero-immersive' : 'es-hero-framed') : 'es-no-cover'}`}
            >
              {isImmersiveHero ? (
                <>
                  <div className="es-hero-media">
                    <div className="es-photo es-hero-photo">
                      <img
                        style={{ objectPosition: photoObjectPosition(config) }}
                        src={cover}
                        alt={`${data.demo ? 'Foto ilustrativa — ' : ''}${data.name}`}
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        width={1280}
                        height={720}
                        onError={() => setCoverBroken(true)}
                      />
                    </div>
                  </div>
                  <div className="es-hero-overlay">
                    <header className="es-hero-top">
                      <div className="es-wrap">{brandMark}</div>
                    </header>
                    <div className="es-hero-bottom">
                      <div className="es-wrap es-hero-stack">
                        <h1>{config.headline}</h1>
                        {offerLine && <p className="es-offer-line">{offerLine}</p>}
                        <div className="es-hero-cta">
                          <button
                            type="button"
                            className="es-button"
                            onClick={() => openBooking(offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                          >
                            {ctaLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <header className="es-brand-bar">
                    <div className="es-wrap">{brandMark}</div>
                  </header>
                  <div className="es-hero-stage">
                    {hasCover && (
                      <div className="es-hero-media">
                        <div className="es-photo es-hero-photo">
                          <img
                            style={{ objectPosition: photoObjectPosition(config) }}
                            src={cover}
                            alt={`${data.demo ? 'Foto ilustrativa — ' : ''}${data.name}`}
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            width={1376}
                            height={768}
                            onError={() => setCoverBroken(true)}
                          />
                        </div>
                      </div>
                    )}
                    <div className="es-hero-copy">
                      <div className="es-hero-stack">
                        <h1>{config.headline}</h1>
                        {!hasCover && config.about && <p className="es-lede">{config.about}</p>}
                        {offerLine && <p className="es-offer-line">{offerLine}</p>}
                        <div className="es-hero-cta">
                          <button
                            type="button"
                            className="es-button"
                            onClick={() => openBooking(offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                          >
                            {ctaLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {sections.map(renderSection)}

            <section
              className="es-close"
              data-close-tone={closeSurfaceDark ? 'dark' : 'light'}
              style={
                {
                  '--es-accent': closeAccent.background,
                  '--es-on-accent': closeAccent.foreground,
                } as React.CSSProperties
              }
            >
              <div className="es-wrap">
                <div className="es-close-inner">
                  <h2>{copy.closeTitle(data.name)}</h2>
                  {offerLine && <p className="es-offer-line">{offerLine}</p>}
                  <button
                    type="button"
                    className="es-button"
                    onClick={() => openBooking(offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                  >
                    {ctaLabel}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="es-footer">
        <div className="es-wrap es-footer-inner">
          <div className="es-footer-identity">
            <a className="es-footer-brand" href={home} aria-label={data.name}>
              {hasLogo && (
                <img
                  className="es-footer-logo"
                  src={logo}
                  alt=""
                  decoding="async"
                  onError={() => setLogoBroken(true)}
                />
              )}
              <span className={logoOnly ? 'es-sr' : undefined}>{data.name}</span>
            </a>
            {neighborhood && <span className="es-footer-place">{neighborhood}</span>}
          </div>
          <div className="es-footer-links">
            <button type="button" onClick={() => setLegalDoc('privacy')}>Privacidade</button>
            <button type="button" onClick={() => setLegalDoc('terms')}>Termos</button>
          </div>
          {data.demo && (
            <p className="es-demo">
              {copy.demoBanner} · {copy.demoHint} · nenhum agendamento ou cobrança real.
            </p>
          )}
        </div>
      </footer>

      {notice && (
        <p className="es-preview-notice" role="status" onClick={() => setNotice('')}>
          {notice}
        </p>
      )}

      <dialog
        className="es-booking-dialog"
        ref={dialog}
        onCancel={() => setBooking(null)}
        onClose={() => setBooking(null)}
        aria-labelledby="es-booking-title"
      >
        <div className="es-sheet-handle" aria-hidden="true" />
        <div className="es-booking-header">
          <div>
            <h2 id="es-booking-title">{copy.bookingTitle(data.name)}</h2>
            {booking?.offer && (
              <p>
                {[offer.title, offer.detail].filter(Boolean).join(' ')} {copy.offerDisclaimer}
              </p>
            )}
            {data.demo && <small>{copy.demoBooking}</small>}
            {whatsapp && (
              <div>
                <a className="es-booking-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
                  Prefere falar no WhatsApp?
                </a>
              </div>
            )}
          </div>
          <button type="button" className="es-dialog-close" onClick={() => setBooking(null)} aria-label={copy.closeBooking}>
            ×
          </button>
        </div>
        {booking && <iframe title="Agendamento do estabelecimento" src={bookingUrl} className="es-booking-frame" />}
      </dialog>

      <dialog
        className="es-lightbox"
        ref={lightboxDialog}
        aria-label={activePhoto ? activePhoto.alt : copy.galleryTitle}
        onCancel={() => setLightboxIndex(null)}
        onClose={() => setLightboxIndex(null)}
        onClick={event => {
          if (event.target === event.currentTarget) setLightboxIndex(null);
        }}
        onKeyDown={event => {
          if (data.gallery.length < 2 || lightboxIndex === null) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            stepLightbox(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            stepLightbox(1);
          }
        }}
      >
        {activePhoto && lightboxIndex !== null && (
          <div className="es-lightbox-card">
            <div className="es-lightbox-top">
              <span className="es-lightbox-count">
                {lightboxIndex + 1} / {data.gallery.length}
              </span>
              <button
                type="button"
                className="es-lightbox-close"
                onClick={() => setLightboxIndex(null)}
                aria-label={copy.lightboxClose}
              >
                ×
              </button>
            </div>
            <div
              ref={lightboxMediaRef}
              className="es-lightbox-media"
              onPointerDown={handleLightboxPointerDown}
              onPointerMove={handleLightboxPointerMove}
              onPointerUp={handleLightboxPointerUp}
              onPointerCancel={handleLightboxPointerCancel}
            >
              {lightboxBroken ? (
                <p className="es-lede">Não foi possível carregar esta imagem.</p>
              ) : (
                <img
                  key={activePhoto.src}
                  src={activePhoto.src}
                  alt={activePhoto.alt}
                  draggable={false}
                  onError={() => setLightboxBroken(true)}
                />
              )}
            </div>
            <div className="es-lightbox-bottom">
              <p className="es-lightbox-caption">{activePhoto.alt}</p>
              {data.gallery.length > 1 && (
                <div className="es-lightbox-controls">
                  <button
                    type="button"
                    className="es-lightbox-nav"
                    aria-label="Foto anterior"
                    onClick={() => stepLightbox(-1)}
                  >
                    ← {copy.lightboxPrev}
                  </button>
                  <button
                    type="button"
                    className="es-lightbox-nav"
                    aria-label="Próxima foto"
                    onClick={() => stepLightbox(1)}
                  >
                    {copy.lightboxNext} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>

      <dialog
        className="es-club-dialog"
        ref={clubDialog}
        aria-labelledby="es-club-dialog-title"
        onCancel={() => setSelectedClubPlan(null)}
        onClose={() => setSelectedClubPlan(null)}
        onClick={event => {
          if (event.target === event.currentTarget) setSelectedClubPlan(null);
        }}
      >
        {selectedClubPlan && (
          <div className="es-club-dialog-body">
            <div className="es-club-dialog-head">
              <div>
                <h2 id="es-club-dialog-title">{selectedClubPlan.name}</h2>
                <p className="es-club-price">
                  {price(selectedClubPlan.priceCents / 100)}
                  <span>{copy.clubPerMonth}</span>
                </p>
              </div>
              <button
                type="button"
                className="es-club-dialog-close"
                onClick={() => setSelectedClubPlan(null)}
                aria-label="Fechar detalhes do plano"
              >
                ×
              </button>
            </div>
            {selectedClubPlan.description && <p className="es-club-desc">{selectedClubPlan.description}</p>}
            <p className="es-lede">
              Demonstração: em um site publicado, este botão leva o cliente para assinar o plano sem cobrança nesta simulação.
            </p>
            <button
              type="button"
              className="es-button es-button-block"
              onClick={() => {
                setSelectedClubPlan(null);
                openBooking();
              }}
            >
              Simular agendamento
            </button>
          </div>
        )}
      </dialog>

      <dialog
        className="es-club-dialog"
        ref={legalDialog}
        aria-labelledby="es-legal-dialog-title"
        onCancel={() => setLegalDoc(null)}
        onClose={() => setLegalDoc(null)}
        onClick={event => {
          if (event.target === event.currentTarget) setLegalDoc(null);
        }}
      >
        {legalDoc && (
          <div className="es-club-dialog-body">
            <div className="es-club-dialog-head">
              <h2 id="es-legal-dialog-title">
                {legalDoc === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso'}
              </h2>
              <button
                type="button"
                className="es-club-dialog-close"
                onClick={() => setLegalDoc(null)}
                aria-label="Fechar aviso"
              >
                ×
              </button>
            </div>
            {legalDoc === 'privacy' ? (
              <p className="es-club-desc">
                {data.name} utiliza os dados informados no agendamento exclusivamente para confirmar horários,
                avisar sobre remarcações e realizar o atendimento solicitado, em conformidade com a legislação de proteção de dados.
              </p>
            ) : (
              <p className="es-club-desc">
                Os agendamentos feitos no site de {data.name} seguem os horários disponíveis, valores exibidos no catálogo
                e a política de remarcação e cancelamento informada pelo estabelecimento.
              </p>
            )}
            <button type="button" className="es-button es-button-block" onClick={() => setLegalDoc(null)}>
              Entendi
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
