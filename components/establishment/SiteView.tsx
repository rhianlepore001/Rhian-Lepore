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

function heroLocationText(address: string): string {
  const neighborhood = neighborhoodFromAddress(address);
  if (!neighborhood) return '';
  const place = placeFromAddress(address);
  const city = place.replace(neighborhood, '').replace(/^[,\s—–-]+/, '').trim();
  return city ? `em ${neighborhood}, ${city}` : `em ${neighborhood}`;
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

const arrowRightSvg = (
  <svg className="es-arrow" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8h9" />
    <path d="M8.75 4.25 12.5 8l-3.75 3.75" />
  </svg>
);

const arrowLeftSvg = (
  <svg className="es-arrow-back" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.5 8h-9" />
    <path d="M7.25 4.25 3.5 8l3.75 3.75" />
  </svg>
);

const expandSvg = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.5 3.5h4v4M7.5 16.5h-4v-4M16.5 3.5l-5 5M3.5 16.5l5-5" />
  </svg>
);

const checkSvg = (
  <svg className="es-check-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.25 8.5 6.5 11.75 12.75 4.75" />
  </svg>
);

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  const label = `${value.toFixed(1).replace('.', ',')} de 5`;
  return (
    <span className="es-stars" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          width={size}
          height={size}
          fill={n < filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={n < filled ? '0' : '1.5'}
          aria-hidden="true"
        >
          <path d="M10 1.8l2.47 5.01 5.53.8-4 3.9.94 5.51L10 14.42l-4.94 2.6.94-5.51-4-3.9 5.53-.8L10 1.8z" />
        </svg>
      ))}
    </span>
  );
}

function MapSketch({ accent, label }: { accent: string; label?: string }) {
  return (
    <div className="es-map-sketch">
      <svg aria-hidden="true" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid slice">
        <rect width="420" height="200" fill="currentColor" fillOpacity="0.025" />
        <rect x="28" y="18" width="96" height="58" rx="6" fill="currentColor" fillOpacity="0.055" />
        <rect x="148" y="16" width="118" height="62" rx="6" fill="currentColor" fillOpacity="0.045" />
        <rect x="288" y="20" width="106" height="56" rx="6" fill="currentColor" fillOpacity="0.055" />
        <rect x="32" y="102" width="88" height="72" rx="6" fill="currentColor" fillOpacity="0.045" />
        <rect x="146" y="106" width="122" height="68" rx="8" fill={accent} fillOpacity="0.1" />
        <rect x="292" y="102" width="102" height="72" rx="6" fill="currentColor" fillOpacity="0.045" />
        <path d="M0 90 L420 84 M136 0 L132 200 M278 0 L282 200" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" fill="none" />
        <path d="M0 44 L420 48 M0 144 L420 140 M76 0 L72 200 M344 0 L348 200" stroke="currentColor" strokeOpacity="0.08" strokeWidth="3" fill="none" />
        <path d="M68 164 Q142 124 210 98" stroke={accent} strokeWidth="2.5" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
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
          <MapSketch accent={accent} label={label} />
          {mapPinSvg}
        </a>
      );
    }
    return (
      <div className="es-map" role="img" aria-label={`Mapa ilustrativo de ${label || name}`}>
        <MapSketch accent={accent} label={label} />
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxTransitioning, setLightboxTransitioning] = useState(false);
  const [selectedClubPlan, setSelectedClubPlan] = useState<SiteClubPlan | null>(null);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [brokenTeamIds, setBrokenTeamIds] = useState<Record<string, boolean>>({});
  const [lightboxBroken, setLightboxBroken] = useState(false);
  const [notice, setNotice] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
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
  const closeAccent = useMemo(() => {
    const candidate = accessibleAccent(config.accent, 'dark', '#161311');
    if (preset === 'salon' || preset === 'editorial' || contrastRatio(candidate.background, '#161311') < 5.5) {
      return { background: '#FBF7F0', foreground: '#1C1714' };
    }
    return candidate;
  }, [config.accent, preset]);

  const service = serviceId ? data.services.find(item => item.id === serviceId) : undefined;
  const home = `/#/site/${encodeURIComponent(data.slug)}`;
  const beauty = data.kind === 'beauty';
  const cover = data.cover;
  const logo = data.logo;
  const hasLogo = Boolean(logo && !logoBroken);
  const logoOnly = config.logoDisplay === 'logo' && hasLogo;
  const place = placeFromAddress(data.address);
  const neighborhood = neighborhoodFromAddress(data.address);
  const heroLocation = heroLocationText(data.address);
  const ctaLabel = config.ctaLabel?.trim() || copy.book;

  const offer = offerDisplay(config.offer);
  const offerVisible = Boolean(
    config.offer.enabled &&
      offer.title &&
      (!config.offer.expires || new Date(`${config.offer.expires}T23:59:59`).getTime() >= Date.now()),
  );
  const offerKind = config.offer.kind || 'first_visit';
  const offerFormattedDate = formatOfferDate(config.offer.expires, data.region);
  const offerExpiryText = offerFormattedDate ? copy.offerValidUntil(offerFormattedDate) : '';
  const showSticky = !preview && (!serviceId || Boolean(service));
  const offerService = offerVisible && config.offer.serviceId ? data.services.find(item => item.id === config.offer.serviceId) : undefined;

  const price = (value: number) => formatPrice(value, data.region);
  const hasRating = Boolean(data.rating && data.reviewCount > 0);
  const reviewWord = data.reviewCount === 1 ? 'avaliação' : 'avaliações';
  const teamHasPhotos = data.team.some(person => Boolean(person.image));
  const timeZone = timezoneForRegion(data.region);
  const status = openingStatus(data.hours, new Date(), timeZone);
  const isOpenNow = Boolean(status && /^Aberto\b/i.test(status.label));
  const todayWeekday = currentWeekdayIndex(timeZone);

  const featuredId = data.services.find(item => item.featured)?.id || offerService?.id;
  const categories = Array.from(new Set(data.services.map(item => item.category?.trim()).filter((value): value is string => Boolean(value))));
  const activeCategory = selectedCategory !== 'all' && categories.includes(selectedCategory) ? selectedCategory : 'all';
  const filteredServices = activeCategory === 'all' || categories.length < 2
    ? data.services
    : data.services.filter(item => item.category?.trim() === activeCategory);

  const pairs = (config.beforeAfter ?? []).filter(pair => pair.before && pair.after && pair.before !== pair.after);
  const pageColor = surface.background;

  const scrollTo = (sectionId: string) =>
    document.getElementById(`${preview ? 'preview-' : ''}${sectionId}`)?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'instant' : 'smooth',
      block: 'start',
    });

  const openBooking = (context: BookingContext = {}) => {
    if (preview) {
      setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.');
      return;
    }
    setBooking(context);
  };

  const stepLightbox = (delta: number, instant = false) => {
    if (data.gallery.length < 2 || lightboxIndex === null) return;
    if (!instant) setLightboxTransitioning(true);
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
      setLightboxTransitioning(false);
    }
  }, [lightboxIndex, activePhotoSrc]);

  useEffect(() => {
    if (!lightboxTransitioning) return;
    const timer = window.setTimeout(() => setLightboxTransitioning(false), 180);
    return () => window.clearTimeout(timer);
  }, [lightboxTransitioning]);

  useEffect(() => {
    if (legalDoc) openNativeDialog(legalDialog.current);
    else closeNativeDialog(legalDialog.current);
  }, [legalDoc]);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.establishment = config.style;
    html.style.setProperty('--es-page', pageColor);
  }, [config.style, pageColor]);

  // Sincroniza cor da barra de status no celular com a cor real do topo do estabelecimento
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
    meta.content = headerBg;
    return () => {
      if (created) meta?.remove();
      else if (meta && previous !== undefined) meta.content = previous;
    };
  }, [headerBg, preview]);

  // Header translúcido reativo + barra ultrafina de progresso via compositor (zero React state por scroll)
  useEffect(() => {
    if (preview || typeof window === 'undefined') return;
    let rafId = 0;
    let lastScrolled: boolean | null = null;

    const updateScroll = () => {
      rafId = 0;
      const scrollY = window.scrollY || 0;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, scrollY / scrollable));
      const scrolled = scrollY > 20;
      if (scrolled !== lastScrolled) {
        lastScrolled = scrolled;
        if (headerRef.current) {
          if (scrolled) headerRef.current.setAttribute('data-scrolled', 'true');
          else headerRef.current.removeAttribute('data-scrolled');
        }
      }
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [preview, serviceId]);

  // Scroll-spy sutil no menu tablet/desktop diretamente via DOM (zero re-render durante scroll)
  useEffect(() => {
    if (preview || serviceId || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const navEl = navRef.current;
    if (!navEl) return;

    const allowedNavIds = new Set(['services', 'team', 'club', 'location']);
    const navIds = sections.map(section => section.id).filter(key => allowedNavIds.has(key));
    const targets = navIds
      .map(key => document.getElementById(key))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;

    let currentActive = '';
    const applyActiveNav = (idToActivate: string) => {
      if (idToActivate === currentActive) return;
      currentActive = idToActivate;
      const buttons = navEl.querySelectorAll<HTMLButtonElement>('button[data-nav-id]');
      buttons.forEach(btn => {
        const isCurrent = btn.dataset.navId === idToActivate;
        if (isCurrent) {
          btn.setAttribute('data-active', 'true');
          btn.setAttribute('aria-current', 'location');
        } else {
          btn.removeAttribute('data-active');
          btn.removeAttribute('aria-current');
        }
      });
    };

    const mql = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    let observer: IntersectionObserver | null = null;
    let listening = false;
    const visibleIds = new Set<string>();

    const onTop = () => {
      if (window.scrollY < 140) applyActiveNav('home');
    };

    const stop = () => {
      observer?.disconnect();
      observer = null;
      visibleIds.clear();
      if (listening) {
        window.removeEventListener('scroll', onTop);
        listening = false;
      }
    };

    const start = () => {
      if (observer) return;
      applyActiveNav('home');
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) visibleIds.add(entry.target.id);
            else visibleIds.delete(entry.target.id);
          });
          if (window.scrollY < 140) {
            applyActiveNav('home');
            return;
          }
          const activeFromOrder = navIds.find(idKey => visibleIds.has(idKey));
          if (activeFromOrder) applyActiveNav(activeFromOrder);
        },
        { rootMargin: '-22% 0px -58% 0px', threshold: 0.02 },
      );
      targets.forEach(el => observer!.observe(el));
      window.addEventListener('scroll', onTop, { passive: true });
      listening = true;
    };

    const syncMedia = () => {
      if (!mql || mql.matches) start();
      else stop();
    };

    syncMedia();
    mql?.addEventListener?.('change', syncMedia);
    return () => {
      stop();
      mql?.removeEventListener?.('change', syncMedia);
    };
  }, [preview, serviceId, sections]);

  // Scroll reveal progressivo e seguro: sem forced style recalc e nunca oculta nada em preview ou reduced-motion
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal-item]'));
    if (!items.length) return;

    if (preview) {
      items.forEach(el => el.removeAttribute('data-reveal'));
      return;
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.setAttribute('data-reveal', 'visible'));
      return;
    }

    const viewportH = window.innerHeight || 800;
    const measurements = items.map(el => ({
      el,
      alreadyVisible: el.getAttribute('data-reveal') === 'visible',
      top: el.getBoundingClientRect().top,
    }));

    const pending: HTMLElement[] = [];
    measurements.forEach(({ el, alreadyVisible, top }) => {
      if (alreadyVisible) return;
      if (top > viewportH * 0.96) {
        el.setAttribute('data-reveal', 'pending');
        pending.push(el);
      } else {
        el.setAttribute('data-reveal', 'visible');
      }
    });

    if (!pending.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            entry.target.setAttribute('data-reveal', 'visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px 24px 0px' },
    );

    pending.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [preview, serviceId, sections.length, pairs.length]);

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

  const primary = (label: string, context: BookingContext = {}, className = '', withArrow = true) => (
    <button type="button" className={`es-button ${className}`} onClick={() => openBooking(context)}>
      <span>{label}</span>
      {withArrow && arrowRightSvg}
    </button>
  );

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
  const has = (key: (typeof sections)[number]['id']) => sections.some(section => section.id === key);

  const nav = [
    {
      id: 'home',
      label: copy.navHome,
      onClick: () =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'instant' : 'smooth',
        }),
    },
    ...(has('services') ? [{ id: 'services', label: copy.navServices, onClick: () => scrollTo('services') }] : []),
    ...(has('team') ? [{ id: 'team', label: copy.navTeam, onClick: () => scrollTo('team') }] : []),
    ...(has('club') ? [{ id: 'club', label: copy.navClub, onClick: () => scrollTo('club') }] : []),
    ...(has('location') ? [{ id: 'location', label: copy.navLocation, onClick: () => scrollTo('location') }] : []),
  ];

  const footerSectionLinks = sections
    .filter(section => ['services', 'club', 'team', 'reviews', 'location'].includes(section.id))
    .map(section => ({
      id: section.id,
      label:
        section.id === 'services'
          ? copy.navServices
          : section.id === 'club'
            ? copy.navClub
            : section.id === 'team'
              ? copy.navTeam
              : section.id === 'reviews'
                ? copy.reviewsTitle
                : copy.navLocation,
    }));

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
        width={opts.width || 640}
        height={opts.height || 800}
        onError={imageError}
      />
    </div>
  );

  const serviceCard = (item: SiteService, index: number, compact = false) => {
    const isFeatured = featuredId === item.id || (!featuredId && index === 0 && data.services.length > 2);
    if (compact) {
      return (
        <article className="es-service-row" key={item.id}>
          <div className="es-service-row-copy">
            <h3>
              <a href={serviceLink(item.id)}>{item.name}</a>
            </h3>
            <p className="es-service-price">
              <span className="es-price-value">
                {item.priceFrom && <small>A partir de </small>}
                {price(item.price)}
              </span>
              <span className="es-price-sep" aria-hidden="true">·</span>
              <span className="es-price-duration">{item.duration} min</span>
            </p>
            <a className="es-service-more" href={serviceLink(item.id)}>
              Ver detalhes
              {arrowRightSvg}
            </a>
          </div>
          <button type="button" className="es-button" onClick={() => openBooking({ serviceId: item.id })}>
            <span>Agendar</span>
          </button>
        </article>
      );
    }

    return (
      <article
        className="es-service"
        data-featured={isFeatured || undefined}
        style={{ '--es-stagger': `${Math.min(index, 4) * 55}ms` } as React.CSSProperties}
        key={item.id}
      >
        <div className="es-service-head">
          {(isFeatured || (categories.length >= 2 && item.category)) && (
            <div className="es-service-meta">
              {isFeatured && <span className="es-flag">{copy.mostRequested}</span>}
              {categories.length >= 2 && item.category && <span className="es-service-cat">{item.category}</span>}
            </div>
          )}
          <h3>
            <a href={serviceLink(item.id)}>{item.name}</a>
          </h3>
          <p className="es-service-price">
            <span className="es-price-value">
              {item.priceFrom && <small>A partir de </small>}
              {price(item.price)}
            </span>
            <span className="es-price-sep" aria-hidden="true">·</span>
            <span className="es-price-duration">{item.duration} min</span>
          </p>
          {item.description && <p className="es-service-desc">{item.description}</p>}
          {item.includes.length > 0 && (
            <div className="es-includes">
              <b>{copy.includes}</b>
              <ul>
                {item.includes.slice(0, 3).map(entry => (
                  <li key={entry}>
                    {checkSvg}
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="es-service-actions">
          <button type="button" className="es-button es-button-block" onClick={() => openBooking({ serviceId: item.id })}>
            <span>{copy.bookService}</span>
            {arrowRightSvg}
          </button>
          <a className="es-service-more" href={serviceLink(item.id)}>
            Ver página do serviço
            {arrowRightSvg}
          </a>
        </div>
      </article>
    );
  };

  const faqBlock = <FaqAccordion items={config.faq} />;

  const addressNote = config.contact?.addressNote?.trim();

  const locationBlock = (
    <div className="es-location">
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
      <div className="es-location-info">
        {data.address && <p className="es-address">{data.address}</p>}
        {addressNote && (
          <p className="es-address-note">
            <span>{copy.referencePoint}:</span> {addressNote}
          </p>
        )}
        {data.demo && <p className="es-lede es-demo-note">Endereço ilustrativo — esta casa é fictícia.</p>}
        {data.hours.length > 0 && (
          <dl className="es-hours">
            {data.hours.map(row => {
              const isToday = weekdayNumbers(row.day).includes(todayWeekday);
              return (
                <div key={row.day} className={isToday ? 'es-hours-today' : undefined} data-today={isToday || undefined}>
                  <dt>
                    {isToday && <span className="es-live-dot" aria-hidden="true" />}
                    {row.day}
                    {isToday ? ' (hoje)' : ''}:
                  </dt>
                  <dd>{row.hours}</dd>
                </div>
              );
            })}
          </dl>
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
        <div className="es-location-actions">
          {directionsUrl && !data.demo && (
            <a className="es-button" href={directionsUrl} target="_blank" rel="noreferrer">
              <span>{copy.directions}</span>
              {arrowRightSvg}
            </a>
          )}
          {data.demo && data.address && (
            <span className="es-button" aria-disabled="true">
              <span>{copy.directions}</span>
            </span>
          )}
          {whatsapp && (
            <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );

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

  const renderSection = (section: (typeof sections)[number]) => {
    if (section.id === 'faq' && has('location')) return null;
    if (section.id === 'location' && has('faq')) return null;
    return (
      <section
        id={id(section.id)}
        key={section.id}
        className={`es-section es-section-${section.id}`}
        data-reveal-item={section.id === 'services' ? undefined : 'true'}
      >
        <div className="es-wrap">
          {section.id === 'services' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.servicesTitle}</h2>
                {data.services.length > 0 && (
                  <p className="es-section-count" aria-hidden="true">
                    {String(filteredServices.length).padStart(2, '0')}
                  </p>
                )}
              </div>
              {categories.length >= 2 && (
                <div className="es-category-filters" role="group" aria-label="Filtrar serviços por categoria">
                  <button
                    type="button"
                    className="es-category-chip"
                    aria-pressed={activeCategory === 'all'}
                    onClick={() => setSelectedCategory('all')}
                  >
                    {copy.allCategories}
                  </button>
                  {categories.map(category => (
                    <button
                      type="button"
                      key={category}
                      className="es-category-chip"
                      aria-pressed={activeCategory === category}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
              <div className="es-services" key={activeCategory} data-count={filteredServices.length}>
                {filteredServices.map((item, index) => serviceCard(item, index))}
              </div>
            </>
          )}
          {section.id === 'differences' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.aboutTitle(data.name)}</h2>
              </div>
              <ol className="es-differences" data-count={config.differences.filter(item => item.trim()).length}>
                {config.differences
                  .filter(item => item.trim())
                  .map((item, index) => (
                    <li key={`${index}-${item}`}>
                      <span className="es-num" aria-hidden="true">0{index + 1}</span>
                      <p>{item}</p>
                    </li>
                  ))}
              </ol>
            </>
          )}
          {section.id === 'beforeAfter' && pairs.length > 0 && (
            <>
              <div className="es-section-heading">
                <h2>{copy.beforeTitle}</h2>
                <p>
                  {data.demo
                    ? 'Fotos ilustrativas — deslize o divisor para experimentar o comparador.'
                    : 'Deslize o divisor para ver cada transformação de perto.'}
                </p>
              </div>
              <div className="es-before-grid" data-count={pairs.length}>
                {pairs.map((pair, index) => (
                  <BeforeAfterComparator
                    key={`${index}-${pair.before}-${pair.after}`}
                    before={pair.before}
                    after={pair.after}
                    caption={pair.caption}
                    showCaption={Boolean(pair.caption && data.demo)}
                  />
                ))}
                {pairs.length === 1 && (
                  <aside className="es-before-aside">
                    <span className="es-club-tag">{copy.beforeEyebrow}</span>
                    <h3>{pairs[0].caption ? pairs[0].caption.split('—')[0].trim() : copy.beforeTitle}</h3>
                    <p>
                      {beauty
                        ? 'Cada resultado nasce de um diagnóstico cuidadoso do seu fio, respeitando textura, brilho e facilidade no dia a dia.'
                        : 'Acabamento limpo, proporção pensada para o seu rosto e cuidado nos detalhes do início ao fim.'}
                    </p>
                    {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                  </aside>
                )}
              </div>
            </>
          )}
          {section.id === 'gallery' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.galleryTitle}</h2>
                <p>{data.demo ? 'Fotos ilustrativas de banco de imagens.' : copy.galleryLead}</p>
              </div>
              <div className="es-gallery" data-count={data.gallery.length}>
                {data.gallery.map((item, index) => (
                  <figure key={`${item.src}-${index}`} data-featured={index === 0 && data.gallery.length === 3 ? 'true' : undefined}>
                    <button
                      type="button"
                      className="es-gallery-trigger"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={`Ampliar foto: ${item.alt}`}
                    >
                      {photo(item.src, item.alt, { width: 800, height: 600 })}
                      <span className="es-gallery-zoom" aria-hidden="true">
                        {expandSvg}
                      </span>
                    </button>
                    <figcaption>{item.alt}</figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
          {section.id === 'team' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.teamTitle}</h2>
              </div>
              <div className="es-team" data-photos={teamHasPhotos ? 'true' : 'false'} data-count={data.team.length}>
                {data.team.map(person => (
                  <article key={person.id}>
                    {person.image && !brokenTeamIds[person.id] ? (
                      <div className="es-photo es-team-photo">
                        <img
                          src={person.image}
                          alt={person.name}
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={500}
                          onError={() => setBrokenTeamIds(prev => ({ ...prev, [person.id]: true }))}
                        />
                      </div>
                    ) : (
                      <span className="es-monogram" aria-hidden="true">{initials(person.name)}</span>
                    )}
                    <div className="es-team-body">
                      <div className="es-team-copy">
                        <h3>{person.name}</h3>
                        {person.bio && <p>{person.bio}</p>}
                      </div>
                      <button type="button" className="es-button" onClick={() => openBooking({ professionalId: person.id })}>
                        <span>{copy.bookWith(person.name)}</span>
                        {arrowRightSvg}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {section.id === 'reviews' && (() => {
            const visibleReviews = data.reviews.filter(review => review.comment.trim());
            return (
              <>
                <div className="es-section-heading es-reviews-head">
                  <h2>{copy.reviewsTitle}</h2>
                  {hasRating && (
                    <div className="es-score-box">
                      <strong className="es-score-num">{data.rating!.toFixed(1).replace('.', ',')}</strong>
                      <div className="es-score-meta">
                        <Stars value={data.rating!} size={13} />
                        <div className="es-score-caption">
                          <span>{copy.verifiedReviews}</span>
                          <span aria-hidden="true">·</span>
                          <span>{data.reviewCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="es-reviews" data-count={visibleReviews.length}>
                  {visibleReviews.map(review => (
                    <figure key={review.id}>
                      <div className="es-review-top">
                        <Stars value={review.rating} size={14} />
                        <blockquote>“{review.comment}”</blockquote>
                      </div>
                      <figcaption>
                        {review.name || copy.verifiedReview}
                        {data.demo ? ` · ${copy.fictionalReview}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </>
            );
          })()}
          {section.id === 'club' && data.clubPlans && data.clubPlans.length > 0 && (
            <>
              <div className="es-section-heading">
                <h2>{copy.clubTitle}</h2>
                <p>{copy.clubLead}</p>
              </div>
              <div className="es-club-grid" data-count={data.clubPlans.length}>
                {data.clubPlans.map(plan => (
                  <article className="es-club-card" key={plan.id}>
                    <div className="es-club-head">
                      <span className="es-club-tag">{copy.navClub}</span>
                      <h3>{plan.name}</h3>
                      {plan.description && <p className="es-club-desc">{plan.description}</p>}
                    </div>
                    <div className="es-club-footer">
                      <p className="es-club-price">
                        {price(plan.priceCents / 100)}
                        <span>{copy.clubPerMonth}</span>
                      </p>
                      <p className="es-club-limit">
                        {checkSvg}
                        <span>
                          {plan.usageLimitPerMonth && plan.usageLimitPerMonth > 0
                            ? copy.clubLimit(plan.usageLimitPerMonth)
                            : copy.clubUnlimited}
                        </span>
                      </p>
                      {preview || data.demo ? (
                        <button
                          type="button"
                          className="es-button es-button-block"
                          onClick={() => {
                            if (preview) {
                              setNotice('A prévia não realiza assinaturas. Abra o site para testar o fluxo.');
                            } else {
                              setSelectedClubPlan(plan);
                            }
                          }}
                        >
                          <span>{copy.clubJoin}</span>
                          {arrowRightSvg}
                        </button>
                      ) : (
                        <a className="es-button es-button-block" href={`/#/clube/${encodeURIComponent(data.slug)}`}>
                          <span>{copy.clubJoin}</span>
                          {arrowRightSvg}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {section.id === 'faq' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.faqTitle}</h2>
              </div>
              {faqBlock}
            </>
          )}
          {section.id === 'location' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.locationTitle()}</h2>
              </div>
              {locationBlock}
            </>
          )}
        </div>
      </section>
    );
  };

  const pairFaqLocation = has('faq') && has('location') && !serviceId;
  const activePhoto = lightboxIndex !== null ? data.gallery[lightboxIndex] : undefined;

  return (
    <div
      ref={rootRef}
      className="establishment"
      data-style={config.style}
      data-dark-surface={isDarkSurface ? 'true' : 'false'}
      data-preset={preset}
      data-kind={data.kind}
      data-preview={preview || undefined}
      data-has-sticky={showSticky || undefined}
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
      {data.demo && (
        <div className="es-demo">
          <strong>{copy.demoBanner}</strong> <span>{copy.demoHint}</span>
        </div>
      )}
      <header ref={headerRef} className="es-header">
        <div className="es-wrap es-header-inner">
          <a
            className="es-wordmark"
            href={home}
            aria-label={data.name}
            data-logo-mode={logoOnly ? 'logo' : hasLogo ? 'both' : 'text'}
          >
            {hasLogo ? (
              <img
                className={`es-brand-logo${logoOnly ? ' es-brand-logo-solo' : ''}`}
                src={logo}
                alt=""
                decoding="async"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <span className="es-brand-monogram" aria-hidden="true">
                {initials(data.name)}
              </span>
            )}
            {logoOnly ? (
              <span className="es-sr">{data.name}</span>
            ) : (
              <span className="es-wordmark-text">
                <b>{data.name}</b>
              </span>
            )}
          </a>
          {!serviceId && (
            <nav ref={navRef} className="es-header-nav" aria-label="Navegação do estabelecimento">
              {nav.map((item, idx) => (
                <button
                  type="button"
                  key={item.id}
                  data-nav-id={item.id}
                  data-active={idx === 0 ? 'true' : undefined}
                  aria-current={idx === 0 ? 'location' : undefined}
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          <div className="es-header-cta" data-sticky-twin={showSticky || undefined}>
            {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {}, '', false)}
          </div>
        </div>
        {!preview && <span ref={progressRef} className="es-scroll-progress" aria-hidden="true" />}
      </header>

      <main id="es-content" tabIndex={-1}>
        {serviceId ? (
          service ? (
            <>
              <div className="es-wrap es-breadcrumb">
                <a href={home}>
                  {arrowLeftSvg}
                  <span>{copy.allServices}</span>
                </a>
              </div>
              <section className="es-service-detail es-wrap">
                <div className="es-detail-copy">
                  <p className="es-kicker">
                    {data.name}
                    {neighborhood ? ` · ${copy.kindLine} em ${neighborhood}` : ''}
                  </p>
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
                    photo(service.image, service.name, { className: 'es-detail-photo es-detail-photo-mobile', priority: true, width: 720, height: 540 })}
                  <div className="es-detail-actions" data-sticky-twin={showSticky || undefined}>
                    {primary(copy.bookService, { serviceId: service.id }, 'es-button-block')}
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
                  {showSticky && whatsapp && (
                    <a className="es-text-button es-detail-whatsapp-mobile" href={whatsapp} target="_blank" rel="noreferrer">
                      {copy.whatsappQuestion}
                    </a>
                  )}
                </div>
                {service.image &&
                  photo(service.image, service.name, { className: 'es-detail-photo es-detail-photo-desktop', priority: true, width: 720, height: 540 })}
              </section>
              {pairs.length > 0 && (
                <section className="es-section es-section-beforeAfter" data-reveal-item="true">
                  <div className="es-wrap">
                    <div className="es-section-heading">
                      <h2>{copy.beforeTitle}</h2>
                      {data.demo && <p>Fotos ilustrativas de demonstração — deslize o divisor para comparar.</p>}
                    </div>
                    <div className="es-before-grid" data-count={pairs.length}>
                      {pairs.map((pair, index) => (
                        <BeforeAfterComparator
                          key={`${index}-${pair.before}-${pair.after}`}
                          before={pair.before}
                          after={pair.after}
                          caption={pair.caption}
                          showCaption={Boolean(pair.caption && data.demo)}
                        />
                      ))}
                      {pairs.length === 1 && (
                        <aside className="es-before-aside">
                          <span className="es-club-tag">{copy.beforeEyebrow}</span>
                          <h3>{pairs[0].caption ? pairs[0].caption.split('—')[0].trim() : service.name}</h3>
                          <p>
                            {beauty
                              ? 'Deslize o divisor ao lado para conferir o caimento e a luminosidade do resultado antes de escolher seu horário.'
                              : 'Deslize o divisor ao lado para ver o acabamento de perto e escolha o melhor horário na agenda.'}
                          </p>
                          {primary(copy.bookService, { serviceId: service.id })}
                        </aside>
                      )}
                    </div>
                  </div>
                </section>
              )}
              {data.services.length > 1 && (
                <section className="es-section es-more-services" data-reveal-item="true">
                  <div className="es-wrap">
                    <h2 className="es-h2-small">{copy.otherServices}</h2>
                    <div className="es-services es-services-compact">
                      {data.services
                        .filter(item => item.id !== service.id)
                        .map((item, index) => serviceCard(item, index, true))}
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
            <section className={`es-hero ${cover && !coverBroken ? 'es-has-cover' : 'es-no-cover'}`}>
              {cover && !coverBroken && (
                <div className="es-hero-media">
                  <div className="es-photo es-hero-photo">
                    <img
                      style={{ objectPosition: photoObjectPosition(config) }}
                      src={cover}
                      alt={`${data.demo ? 'Foto ilustrativa — ' : ''}${data.name}`}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      width={1600}
                      height={2000}
                      onError={() => setCoverBroken(true)}
                    />
                  </div>
                </div>
              )}
              <div className="es-hero-copy">
                <p className="es-kicker es-hero-enter" style={{ '--es-delay': '0ms' } as React.CSSProperties}>
                  {config.headline.toLowerCase().includes(copy.kindLine.toLowerCase())
                    ? place || copy.kindLine
                    : `${copy.kindLine}${heroLocation ? ` ${heroLocation}` : ''}`}
                </p>
                <h1 className="es-hero-enter es-hero-lead" style={{ '--es-delay': '40ms' } as React.CSSProperties}>
                  {config.headline}
                </h1>
                {config.about && (
                  <p className="es-lede es-hero-enter" style={{ '--es-delay': '105ms' } as React.CSSProperties}>
                    {config.about}
                  </p>
                )}
                {offerVisible && (
                  <div className="es-offer es-hero-enter" style={{ '--es-delay': '155ms' } as React.CSSProperties}>
                    <div className="es-offer-top">
                      <span className="es-offer-badge">{copy.offerKinds[offerKind]}</span>
                      {offerExpiryText && <span className="es-offer-expires">{offerExpiryText}</span>}
                    </div>
                    <strong>{offer.title}</strong>
                    {offer.detail && <span className="es-offer-detail">{offer.detail}</span>}
                  </div>
                )}
                <div className="es-hero-actions es-hero-enter" style={{ '--es-delay': '195ms' } as React.CSSProperties}>
                  {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                  {whatsapp && (
                    <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">
                      {copy.whatsapp}
                    </a>
                  )}
                </div>
                {(hasRating || status || data.hours[0]) && (
                  <div className="es-trust es-hero-enter-fade" style={{ '--es-delay': '230ms' } as React.CSSProperties}>
                    {hasRating && (
                      <strong className="es-trust-rating">
                        <svg className="es-trust-star" viewBox="0 0 20 20" width="13" height="13" fill="currentColor" aria-hidden="true">
                          <path d="M10 1.8l2.47 5.01 5.53.8-4 3.9.94 5.51L10 14.42l-4.94 2.6.94-5.51-4-3.9 5.53-.8L10 1.8z" />
                        </svg>
                        <span>{data.rating!.toFixed(1).replace('.', ',')} · {data.reviewCount} {reviewWord}</span>
                      </strong>
                    )}
                    {hasRating && (status || data.hours[0]) && (
                      <span className="es-trust-sep" aria-hidden="true">|</span>
                    )}
                    {status && (
                      <em className="es-trust-status" data-open={isOpenNow || undefined}>
                        {isOpenNow && <span className="es-live-dot" aria-hidden="true" />}
                        {status.label}
                      </em>
                    )}
                    {!status && data.hours[0] && (
                      <em className="es-trust-status">{copy.openToday(data.hours[0].hours)}</em>
                    )}
                  </div>
                )}
              </div>
            </section>

            {sections.map(renderSection)}

            {pairFaqLocation && (
              <section className="es-section es-section-split" id={id('faq')} data-reveal-item="true">
                <div className="es-wrap es-split">
                  <div>
                    <div className="es-section-heading">
                      <h2>{copy.faqTitle}</h2>
                    </div>
                    {faqBlock}
                  </div>
                  <div className="es-split-loc" id={id('location')}>
                    <div className="es-section-heading">
                      <h2>{copy.locationTitle()}</h2>
                    </div>
                    {locationBlock}
                  </div>
                </div>
              </section>
            )}

            <section
              className="es-close"
              data-reveal-item="true"
              style={
                {
                  '--es-accent': closeAccent.background,
                  '--es-on-accent': closeAccent.foreground,
                } as React.CSSProperties
              }
            >
              {cover && !coverBroken && (
                <div className="es-photo es-close-photo">
                  <img
                    key={cover}
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={800}
                    onError={() => setCoverBroken(true)}
                  />
                </div>
              )}
              <div className="es-wrap">
                <div className="es-close-inner">
                  {offerVisible && <p className="es-kicker">{offer.title}</p>}
                  <h2>{copy.closeTitle(data.name)}</h2>
                  {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="es-footer">
        <div className="es-wrap">
          <div className="es-footer-identity">
            <div className="es-footer-brand-row">
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
              {neighborhood && <span className="es-footer-neighborhood">· {neighborhood}</span>}
            </div>
            {data.demo && <span className="es-footer-demo">Demonstração. Nenhum agendamento ou cobrança real.</span>}
          </div>
          <div className="es-footer-links">
            {!serviceId &&
              footerSectionLinks.map(item => (
                <button type="button" key={item.id} onClick={() => scrollTo(item.id)}>
                  {item.label}
                </button>
              ))}
            <button type="button" onClick={() => setLegalDoc('privacy')}>Privacidade</button>
            <button type="button" onClick={() => setLegalDoc('terms')}>Termos</button>
            <span className="es-footer-note">{copy.footerNote}</span>
          </div>
        </div>
      </footer>

      {showSticky && (
        <div className="es-sticky" data-has-price={service ? 'true' : undefined}>
          {service ? (
            <>
              <div className="es-sticky-info">
                <strong>
                  {service.priceFrom ? 'A partir de ' : ''}
                  {price(service.price)}
                </strong>
                <span>{service.duration} min</span>
              </div>
              {primary(copy.bookService, { serviceId: service.id })}
            </>
          ) : (
            primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})
          )}
        </div>
      )}

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
            stepLightbox(-1, true);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            stepLightbox(1, true);
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
              data-transitioning={lightboxTransitioning || undefined}
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
                    aria-label={copy.lightboxPrev}
                    onClick={() => stepLightbox(-1)}
                  >
                    ← {copy.lightboxPrev}
                  </button>
                  <button
                    type="button"
                    className="es-lightbox-nav"
                    aria-label={copy.lightboxNext}
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
              <span>Simular agendamento</span>
              {arrowRightSvg}
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
              <span>Entendi</span>
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
