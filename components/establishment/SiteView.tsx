import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  accessibleAccent,
  applyNormalizedSiteConfig,
  contrastRatio,
  defaultConfig,
  formatPrice,
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
import { buildWhatsAppLink } from '../../utils/formatters';
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

function readOriginParam(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const fromHash = new URLSearchParams(hashQuery).get('origem')?.trim().toLowerCase();
  if (fromHash && ALLOWED_ORIGINS.has(fromHash)) return fromHash;
  const fromSearch = new URLSearchParams(window.location.search).get('origem')?.trim().toLowerCase();
  if (fromSearch && ALLOWED_ORIGINS.has(fromSearch)) return fromSearch;
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

function Stars({ value }: { value: number }) {
  const label = `${value.toFixed(1).replace('.', ',')} de 5`;
  return (
    <span className="es-stars" aria-label={label}>
      {Array.from({ length: 5 }, (_, n) => (
        <span key={n} aria-hidden="true">{n < Math.round(value) ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

function MapSketch({ accent, label }: { accent: string; label?: string }) {
  return (
    <div className="es-map-sketch">
      <svg aria-hidden="true" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid slice">
        <rect width="420" height="200" fill="currentColor" fillOpacity="0.03" />
        <rect x="28" y="18" width="96" height="58" rx="6" fill="currentColor" fillOpacity="0.06" />
        <rect x="148" y="16" width="118" height="62" rx="6" fill="currentColor" fillOpacity="0.05" />
        <rect x="288" y="20" width="106" height="56" rx="6" fill="currentColor" fillOpacity="0.06" />
        <rect x="32" y="102" width="88" height="72" rx="6" fill="currentColor" fillOpacity="0.05" />
        <rect x="146" y="106" width="122" height="68" rx="8" fill={accent} fillOpacity="0.09" />
        <rect x="292" y="102" width="102" height="72" rx="6" fill="currentColor" fillOpacity="0.05" />
        <path d="M0 90 L420 84 M136 0 L132 200 M278 0 L282 200" stroke="currentColor" strokeOpacity="0.16" strokeWidth="8" fill="none" />
        <path d="M0 44 L420 48 M0 144 L420 140 M76 0 L72 200 M344 0 L348 200" stroke="currentColor" strokeOpacity="0.09" strokeWidth="3" fill="none" />
        <path d="M68 164 Q142 124 210 98" stroke={accent} strokeWidth="3" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
      </svg>
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
  const [selectedClubPlan, setSelectedClubPlan] = useState<SiteClubPlan | null>(null);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [brokenTeamIds, setBrokenTeamIds] = useState<Record<string, boolean>>({});
  const [lightboxBroken, setLightboxBroken] = useState(false);
  const [notice, setNotice] = useState('');

  const dialog = useRef<HTMLDialogElement>(null);
  const lightboxDialog = useRef<HTMLDialogElement>(null);
  const clubDialog = useRef<HTMLDialogElement>(null);
  const legalDialog = useRef<HTMLDialogElement>(null);

  const sections = useMemo(() => visibleSections(data, config), [data, config]);
  const surface = useMemo(() => siteSurface(resolvedBackground(config, data.kind), config.style), [config, data.kind]);
  const accent = useMemo(() => accessibleAccent(config.accent, config.style, surface.background), [config.accent, config.style, surface.background]);
  const headerBg = preset === 'urban' ? '#09090B' : preset === 'editorial' ? '#1C1714' : '#FFFFFF';
  const headerAccent = useMemo(() => accessibleAccent(config.accent, preset === 'salon' ? 'light' : 'dark', headerBg), [config.accent, preset, headerBg]);
  const closeAccent = useMemo(() => {
    const candidate = accessibleAccent(config.accent, 'dark', '#1C1714');
    if (preset === 'salon' || contrastRatio(candidate.background, '#1C1714') < 5.5) {
      return { background: '#FBF7F0', foreground: '#1C1714' };
    }
    return candidate;
  }, [config.accent, preset]);

  const service = serviceId ? data.services.find(item => item.id === serviceId) : undefined;
  const home = `/#/site/${data.slug}`;
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
  const todayWeekday = currentWeekdayIndex(timeZone);

  const featuredId = data.services.find(item => item.featured)?.id || offerService?.id;
  const categories = Array.from(new Set(data.services.map(item => item.category?.trim()).filter((value): value is string => Boolean(value))));
  const activeCategory = selectedCategory !== 'all' && categories.includes(selectedCategory) ? selectedCategory : 'all';
  const filteredServices = activeCategory === 'all' || categories.length < 2
    ? data.services
    : data.services.filter(item => item.category?.trim() === activeCategory);

  const pairs = (config.beforeAfter ?? []).filter(pair => pair.before && pair.after);
  const embedBefore = activeCategory === 'all' && sections.some(section => section.id === 'beforeAfter') && sections.some(section => section.id === 'services') && pairs.length > 0;
  const topServices = embedBefore ? filteredServices.slice(0, 3) : filteredServices;
  const extraServices = embedBefore ? filteredServices.slice(3) : [];
  const pageColor = surface.background;

  const scrollTo = (sectionId: string) =>
    document.getElementById(`${preview ? 'preview-' : ''}${sectionId}`)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });

  const openBooking = (context: BookingContext = {}) => {
    if (preview) {
      setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.');
      return;
    }
    setBooking(context);
  };

  useEffect(() => {
    setLogoBroken(false);
  }, [logo]);

  useEffect(() => {
    setCoverBroken(false);
  }, [cover]);

  useEffect(() => {
    setLightboxBroken(false);
  }, [lightboxIndex]);

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
    if (booking) openNativeDialog(dialog.current);
    else closeNativeDialog(dialog.current);
    if (!booking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const params = new URLSearchParams({
    agendar: '1',
    embed: 'site',
    appearance: config.style === 'dark' ? 'dark' : 'light',
    preset,
    brand: accent.background,
  });
  if (booking?.serviceId) params.set('rebook', booking.serviceId);
  if (booking?.professionalId) params.set('pro', booking.professionalId);
  const originSource = readOriginParam();
  if (originSource) params.set('origem', originSource);

  const bookingSlug = data.demo ? `simulacao-${beauty ? 'beauty' : 'barber'}` : data.slug;
  const bookingUrl = data.demo
    ? `/demo-preview#/demo/${beauty ? 'beauty' : 'barber'}/book/${bookingSlug}?${params}`
    : `/#/book/${bookingSlug}?${params}`;

  const serviceLink = (targetId: string) => `${home}/servico/${targetId}`;
  const imageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.closest('.es-photo')?.setAttribute('data-broken', 'true');
  };

  const primary = (label: string, context: BookingContext = {}, className = '') => (
    <button type="button" className={`es-button ${className}`} onClick={() => openBooking(context)}>
      {label}
    </button>
  );

  const whatsapp = data.phone ? buildWhatsAppLink(data.phone, data.region) : undefined;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name} ${data.address}`)}`;
  const id = (section: string) => `${preview ? 'preview-' : ''}${section}`;
  const has = (key: (typeof sections)[number]['id']) => sections.some(section => section.id === key);

  const nav = [
    { id: 'home', label: copy.navHome, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
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

  const beforeBlock = (pair = pairs[0]) =>
    pair ? (
      <div className="es-before" aria-label={pair.caption || 'Antes e depois'}>
        <div className="es-before-pair">
          <figure>
            {photo(pair.before, 'Antes', { width: 480, height: 640 })}
            <figcaption>Antes</figcaption>
          </figure>
          <figure>
            {photo(pair.after, 'Depois', { width: 480, height: 640 })}
            <figcaption>Depois</figcaption>
          </figure>
        </div>
        {pair.caption && data.demo && <p>{pair.caption}</p>}
      </div>
    ) : null;

  const serviceCard = (item: SiteService, index: number, compact = false) =>
    compact ? (
      <article className="es-service-row" key={item.id}>
        <div>
          <h3>
            <a href={serviceLink(item.id)}>{item.name}</a>
          </h3>
          <p className="es-service-price">
            {item.duration} min — {item.priceFrom && 'A partir de '}
            {price(item.price)}
          </p>
          <a className="es-service-more" href={serviceLink(item.id)}>Ver detalhes</a>
        </div>
        <button type="button" className="es-button" onClick={() => openBooking({ serviceId: item.id })}>
          Agendar
        </button>
      </article>
    ) : (
      <article className="es-service" key={item.id}>
        <div className="es-service-head">
          {(featuredId === item.id || (!featuredId && index === 0 && data.services.length > 2) || (categories.length >= 2 && item.category)) && (
            <div className="es-service-meta">
              {(featuredId === item.id || (!featuredId && index === 0 && data.services.length > 2)) && (
                <span className="es-flag">{copy.mostRequested}</span>
              )}
              {categories.length >= 2 && item.category && <span className="es-service-cat">{item.category}</span>}
            </div>
          )}
          <h3>
            <a href={serviceLink(item.id)}>{item.name}</a>
          </h3>
          <p className="es-service-price">
            {item.duration} min — {item.priceFrom && 'A partir de '}
            {price(item.price)}
          </p>
          {item.description && <p className="es-service-desc">{item.description}</p>}
          {item.includes.length > 0 && (
            <div className="es-includes">
              <b>{copy.includes}</b>
              <p>{item.includes.slice(0, 2).join(' · ')}</p>
            </div>
          )}
        </div>
        <div className="es-service-actions">
          <button type="button" className="es-button es-button-block" onClick={() => openBooking({ serviceId: item.id })}>
            {copy.bookService}
          </button>
          <a className="es-service-more" href={serviceLink(item.id)}>Ver página do serviço</a>
        </div>
      </article>
    );

  const faqBlock = (
    <div className="es-faq">
      {config.faq
        .filter(item => item.question && item.answer)
        .map(item => (
          <details key={item.question}>
            <summary>
              {item.question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
    </div>
  );

  const addressNote = config.contact?.addressNote?.trim();

  const mapVisual = (
    <>
      <MapSketch accent={accent.background} label={neighborhood || place} />
      <span className="es-map-pin" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
      </span>
    </>
  );

  const locationBlock = (
    <div className="es-location">
      {data.address && !data.demo && (
        <a
          className="es-map es-map-link"
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir localização de ${data.name} no mapa`}
        >
          {mapVisual}
        </a>
      )}
      {data.demo && data.address && (
        <div className="es-map" role="img" aria-label={`Mapa ilustrativo de ${place}`}>
          {mapVisual}
        </div>
      )}
      <div className="es-location-info">
        {data.address && <p className="es-address">{data.address}</p>}
        {addressNote && (
          <p className="es-address-note">
            <span>{copy.referencePoint}:</span> {addressNote}
          </p>
        )}
        {data.demo && <p className="es-lede">Endereço ilustrativo — esta casa é fictícia.</p>}
        {data.hours.length > 0 && (
          <dl className="es-hours">
            {data.hours.map(row => {
              const isToday = weekdayNumbers(row.day).includes(todayWeekday);
              return (
                <div key={row.day} className={isToday ? 'es-hours-today' : undefined} data-today={isToday || undefined}>
                  <dt>
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
          {data.address && !data.demo && (
            <a className="es-button" href={mapsUrl} target="_blank" rel="noreferrer">
              {copy.directions}
            </a>
          )}
          {data.demo && data.address && (
            <span className="es-button" aria-disabled="true">
              {copy.directions}
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

  const renderSection = (section: (typeof sections)[number]) => {
    if (section.id === 'beforeAfter' && embedBefore) return null;
    if (section.id === 'faq' && has('location')) return null;
    if (section.id === 'location' && has('faq')) return null;
    return (
      <section id={id(section.id)} key={section.id} className={`es-section es-section-${section.id}`}>
        <div className="es-wrap">
          {section.id === 'services' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.servicesTitle}</h2>
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
              <div className={`es-services ${embedBefore ? 'es-with-before' : ''}`}>
                {topServices.map((item, index) => serviceCard(item, index))}
                {embedBefore && beforeBlock()}
              </div>
              {extraServices.length > 0 && (
                <div className="es-services" style={{ marginTop: 14 }}>
                  {extraServices.map((item, index) => serviceCard(item, index + 3, true))}
                </div>
              )}
            </>
          )}
          {section.id === 'differences' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.aboutTitle(data.name)}</h2>
              </div>
              <ol className="es-differences">
                {config.differences
                  .filter(item => item.trim())
                  .map((item, index) => (
                    <li key={`${index}-${item}`}>
                      <span className="es-num" aria-hidden="true">0{index + 1}.</span>
                      <p>{item}</p>
                    </li>
                  ))}
              </ol>
            </>
          )}
          {section.id === 'beforeAfter' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.beforeTitle}</h2>
                {data.demo && <p>Fotos ilustrativas, para mostrar o bloco. Não são resultados desta casa.</p>}
              </div>
              {pairs.map(pair => (
                <div key={`${pair.before}-${pair.after}`}>{beforeBlock(pair)}</div>
              ))}
            </>
          )}
          {section.id === 'gallery' && (
            <>
              <div className="es-section-heading">
                <h2>{copy.galleryTitle}</h2>
                <p>{data.demo ? 'Fotos ilustrativas de banco de imagens.' : copy.galleryLead}</p>
              </div>
              <div className="es-gallery">
                {data.gallery.map((item, index) => (
                  <figure key={`${item.src}-${index}`}>
                    <button
                      type="button"
                      className="es-gallery-trigger"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={`Ampliar foto: ${item.alt}`}
                    >
                      {photo(item.src, item.alt, { width: 640, height: 480 })}
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
              <div className="es-team" data-photos={teamHasPhotos ? 'true' : 'false'}>
                {data.team.map(person => {
                  const first = person.name.split(' ')[0];
                  const specialty = (person.bio || '').split('&')[0].trim();
                  return (
                    <article key={person.id}>
                      {person.image && !brokenTeamIds[person.id] ? (
                        <div className="es-photo es-team-photo">
                          <img
                            src={person.image}
                            alt={person.name}
                            loading="lazy"
                            decoding="async"
                            width={320}
                            height={400}
                            onError={() => setBrokenTeamIds(prev => ({ ...prev, [person.id]: true }))}
                          />
                        </div>
                      ) : (
                        <span className="es-monogram" aria-hidden="true">{initials(person.name)}</span>
                      )}
                      <div className="es-team-body">
                        <div>
                          <h3>{specialty ? `${first} · ${specialty}` : person.name}</h3>
                          {person.bio && <p>{person.bio}</p>}
                        </div>
                        <button type="button" className="es-button" onClick={() => openBooking({ professionalId: person.id })}>
                          {copy.bookWith(person.name)}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {section.id === 'reviews' && (
            <>
              <div className="es-reviews-head">
                <h2>{copy.reviewsTitle}</h2>
                {hasRating && (
                  <div className="es-score-box">
                    <span>{copy.verifiedReviews}</span>
                    <strong>{data.rating!.toFixed(1).replace('.', ',')}</strong>
                  </div>
                )}
              </div>
              <div className="es-reviews">
                {data.reviews
                  .filter(review => review.comment.trim())
                  .map(review => (
                    <figure key={review.id}>
                      <div>
                        <Stars value={review.rating} />
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
          )}
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
                      <h3>{plan.name}</h3>
                      {plan.description && <p className="es-club-desc">{plan.description}</p>}
                    </div>
                    <div className="es-club-footer">
                      <p className="es-club-price">
                        {price(plan.priceCents / 100)}
                        <span>{copy.clubPerMonth}</span>
                      </p>
                      <p className="es-club-limit">
                        {plan.usageLimitPerMonth && plan.usageLimitPerMonth > 0
                          ? copy.clubLimit(plan.usageLimitPerMonth)
                          : copy.clubUnlimited}
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
                          {copy.clubJoin}
                        </button>
                      ) : (
                        <a className="es-button es-button-block" href={`/#/clube/${encodeURIComponent(data.slug)}`}>
                          {copy.clubJoin}
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
      className="establishment"
      data-style={config.style}
      data-preset={preset}
      data-kind={data.kind}
      data-preview={preview || undefined}
      style={
        {
          '--es-accent': accent.background,
          '--es-on-accent': accent.foreground,
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
      <header className="es-header">
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
            <nav className="es-header-nav" aria-label="Navegação do estabelecimento">
              {nav.map(item => (
                <button type="button" key={item.id} onClick={item.onClick}>
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          <div className="es-header-cta" data-sticky-twin={showSticky || undefined}>
            {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
          </div>
        </div>
      </header>

      <main id="es-content" tabIndex={-1}>
        {serviceId ? (
          service ? (
            <>
              <div className="es-wrap es-breadcrumb">
                <a href={home}>{copy.allServices}</a>
              </div>
              <section className="es-service-detail es-wrap">
                <div className="es-detail-copy">
                  <p className="es-kicker">
                    {data.name}
                    {neighborhood ? ` · ${copy.kindLine} em ${neighborhood}` : ''}
                  </p>
                  <h1>{service.name}</h1>
                  <p className="es-decision">
                    {service.priceFrom ? 'A partir de ' : ''}
                    {price(service.price)} · {service.duration} min
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
                      <ul className="es-includes">
                        {service.includes.map(entry => (
                          <li key={entry}>{entry}</li>
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
                <section className="es-section es-section-beforeAfter">
                  <div className="es-wrap">
                    <div className="es-section-heading">
                      <h2>{copy.beforeTitle}</h2>
                      {data.demo && <p>Fotos ilustrativas. Não são resultados de um único atendimento.</p>}
                    </div>
                    {pairs.map(pair => (
                      <div key={`${pair.before}-${pair.after}`}>{beforeBlock(pair)}</div>
                    ))}
                  </div>
                </section>
              )}
              {data.services.length > 1 && (
                <section className="es-section es-more-services">
                  <div className="es-wrap">
                    <h2 className="es-h2-small">{copy.otherServices}</h2>
                    <div className="es-services">
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
                <p className="es-kicker">
                  {copy.kindLine}
                  {heroLocation ? ` ${heroLocation}` : ''}
                </p>
                <h1>{config.headline}</h1>
                {config.about && <p className="es-lede">{config.about}</p>}
                {offerVisible && (
                  <div className="es-offer">
                    <div className="es-offer-top">
                      <span className="es-offer-badge">{copy.offerKinds[offerKind]}</span>
                      {offerExpiryText && <span className="es-offer-expires">{offerExpiryText}</span>}
                    </div>
                    <strong>{offer.title}</strong>
                    {offer.detail && <span className="es-offer-detail">{offer.detail}</span>}
                  </div>
                )}
                <div className="es-hero-actions">
                  {primary(ctaLabel, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
                  {whatsapp && (
                    <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">
                      {copy.whatsapp}
                    </a>
                  )}
                </div>
                <div className="es-trust">
                  {hasRating && (
                    <strong>
                      ★ {data.rating!.toFixed(1).replace('.', ',')} · {data.reviewCount} {reviewWord}
                    </strong>
                  )}
                  {hasRating && (status || data.hours[0]) && <span aria-hidden="true">|</span>}
                  {status && <em>{status.label}</em>}
                  {!status && data.hours[0] && <em>{copy.openToday(data.hours[0].hours)}</em>}
                </div>
              </div>
            </section>

            {sections.map(renderSection)}

            {pairFaqLocation && (
              <section className="es-section" id={id('faq')}>
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
              style={
                {
                  '--es-accent': closeAccent.background,
                  '--es-on-accent': closeAccent.foreground,
                } as React.CSSProperties
              }
            >
              {cover && photo(cover, '', { className: 'es-close-photo', width: 1200, height: 800 })}
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
            {neighborhood && <span>· {neighborhood}</span>}
            {data.demo && <span>· Demonstração. Nenhum agendamento ou cobrança real.</span>}
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
            <span>{copy.footerNote}</span>
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
          <button type="button" onClick={() => setBooking(null)} aria-label={copy.closeBooking}>
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
          if (!data.gallery.length || lightboxIndex === null) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setLightboxIndex((lightboxIndex - 1 + data.gallery.length) % data.gallery.length);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            setLightboxIndex((lightboxIndex + 1) % data.gallery.length);
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
            <div className="es-lightbox-media">
              {lightboxBroken ? (
                <p className="es-lede">Não foi possível carregar esta imagem.</p>
              ) : (
                <img src={activePhoto.src} alt={activePhoto.alt} onError={() => setLightboxBroken(true)} />
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
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + data.gallery.length) % data.gallery.length)}
                  >
                    ← {copy.lightboxPrev}
                  </button>
                  <button
                    type="button"
                    className="es-lightbox-nav"
                    aria-label={copy.lightboxNext}
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % data.gallery.length)}
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
