import React, { useEffect, useRef, useState } from 'react';
import { accessibleAccent, applySiteConfig, defaultConfig, neighborhoodFromAddress, normalizeSiteConfig, offerDisplay, photoObjectPosition, placeFromAddress, formatPrice, resolvedBackground, siteSurface, visibleSections, type SiteConfig, type SiteData, type SiteService } from '../../lib/establishment/model';
import { studioCopy } from '../../lib/establishment/copy';
import { openingStatus, timezoneForRegion } from '../../lib/establishment/hours';
import { buildWhatsAppLink } from '../../utils/formatters';
import '../../styles/establishment.css';

interface SiteViewProps { data: SiteData; config: SiteConfig; serviceId?: string; preview?: boolean }
interface BookingContext { serviceId?: string; professionalId?: string; offer?: boolean }

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function Stars({ value }: { value: number }) {
  const label = `${value.toFixed(1).replace('.', ',')} de 5`;
  return <span className="es-stars" aria-label={label}>{Array.from({ length: 5 }, (_, n) => <span key={n} aria-hidden="true">{n < Math.round(value) ? '★' : '☆'}</span>)}</span>;
}

function MapSketch({ accent }: { accent: string }) {
  return <svg aria-hidden="true" viewBox="0 0 360 180">
    <path d="M0 36 L360 54 M0 96 L360 82 M0 144 L360 128 M55 0 L75 180 M145 0 L130 180 M245 0 L265 180 M315 0 L300 180" stroke="#fff" strokeWidth="6" fill="none" />
    <path d="M35 170 Q165 105 320 24" stroke={accent} strokeOpacity="0.45" strokeWidth="4" fill="none" />
  </svg>;
}

export { placeFromAddress };

export function SiteView({ data: sourceData, config: incoming, serviceId, preview = false }: SiteViewProps) {
  const config = normalizeSiteConfig(incoming, defaultConfig(sourceData));
  const data = applySiteConfig(sourceData, config);
  const copy = studioCopy(data.kind, data.region);
  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const sections = visibleSections(data, config);
  const surface = siteSurface(resolvedBackground(config, data.kind), config.style);
  const accent = accessibleAccent(config.accent, config.style, surface.background);
  const service = serviceId ? data.services.find(item => item.id === serviceId) : undefined;
  const home = `/#/site/${data.slug}`;
  const beauty = data.kind === 'beauty';
  const cover = config.cover || sourceData.cover;
  const place = placeFromAddress(data.address);
  const neighborhood = neighborhoodFromAddress(data.address);
  const offer = offerDisplay(config.offer);
  const offerVisible = Boolean(config.offer.enabled && offer.title && (!config.offer.expires || new Date(`${config.offer.expires}T23:59:59`).getTime() >= Date.now()));
  const showSticky = !preview && !serviceId;
  const offerService = offerVisible && config.offer.serviceId ? data.services.find(item => item.id === config.offer.serviceId) : undefined;
  const price = (value: number) => formatPrice(value, data.region);
  const hasRating = Boolean(data.rating && data.reviewCount > 0);
  const reviewWord = data.reviewCount === 1 ? 'avaliação' : 'avaliações';
  const teamHasPhotos = data.team.some(person => Boolean(person.image));
  const status = openingStatus(data.hours, new Date(), timezoneForRegion(data.region));
  const featuredId = data.services.find(item => item.featured)?.id || offerService?.id;
  const pairs = (config.beforeAfter ?? []).filter(pair => pair.before && pair.after);
  const embedBefore = sections.some(section => section.id === 'beforeAfter') && sections.some(section => section.id === 'services') && pairs.length > 0;
  const topServices = embedBefore ? data.services.slice(0, 3) : data.services;
  const extraServices = embedBefore ? data.services.slice(3) : [];
  const pageColor = surface.background;
  const scrollTo = (id: string) => document.getElementById(`${preview ? 'preview-' : ''}${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const openBooking = (context: BookingContext = {}) => {
    if (preview) { setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.'); return; }
    setBooking(context);
  };
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.establishment = config.style;
    html.style.setProperty('--es-page', pageColor);
  }, [config.style, pageColor]);
  useEffect(() => {
    if (booking) dialog.current?.showModal?.();
    else dialog.current?.close?.();
    if (!booking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [booking]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);
  const params = new URLSearchParams({ agendar: '1', embed: 'site', appearance: config.style === 'dark' ? 'dark' : 'light', brand: accent.background });
  if (booking?.serviceId) params.set('rebook', booking.serviceId);
  if (booking?.professionalId) params.set('pro', booking.professionalId);
  const bookingSlug = data.demo ? `simulacao-${beauty ? 'beauty' : 'barber'}` : data.slug;
  const bookingUrl = data.demo ? `/demo-preview#/demo/${beauty ? 'beauty' : 'barber'}/book/${bookingSlug}?${params}` : `/#/book/${bookingSlug}?${params}`;
  const serviceLink = (id: string) => `${home}/servico/${id}`;
  const imageError = (event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.closest('.es-photo')?.setAttribute('data-broken', 'true'); };
  const primary = (label: string, context: BookingContext = {}, className = '') => <button className={`es-button ${className}`} onClick={() => openBooking(context)}>{label}</button>;
  const whatsapp = data.phone ? buildWhatsAppLink(data.phone, data.region) : undefined;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name} ${data.address}`)}`;
  const id = (section: string) => `${preview ? 'preview-' : ''}${section}`;
  const has = (key: typeof sections[number]['id']) => sections.some(section => section.id === key);
  const nav = [
    { id: 'home', label: copy.navHome, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    ...(has('services') ? [{ id: 'services', label: copy.navServices, onClick: () => scrollTo('services') }] : []),
    ...(has('team') ? [{ id: 'team', label: copy.navTeam, onClick: () => scrollTo('team') }] : []),
    ...(has('location') ? [{ id: 'location', label: copy.navLocation, onClick: () => scrollTo('location') }] : []),
  ];

  const photo = (src: string, alt: string, opts: { className?: string; priority?: boolean; width?: number; height?: number; position?: string } = {}) => <div className={`es-photo ${opts.className || ''}`}>
    <img style={opts.position ? { objectPosition: opts.position } : undefined} src={src} alt={alt} loading={opts.priority ? 'eager' : 'lazy'} fetchPriority={opts.priority ? 'high' : undefined} decoding="async" width={opts.width || 640} height={opts.height || 800} onError={imageError} />
  </div>;

  const beforeBlock = (pair = pairs[0]) => pair ? <div className="es-before" aria-label={pair.caption || 'Antes e depois'}>
    <div className="es-before-pair">
      <figure>{photo(pair.before, 'Antes', { width: 480, height: 640 })}<figcaption>Antes</figcaption></figure>
      <figure>{photo(pair.after, 'Depois', { width: 480, height: 640 })}<figcaption>Depois</figcaption></figure>
    </div>
    {pair.caption && data.demo && <p>{pair.caption}</p>}
  </div> : null;

  const serviceCard = (item: SiteService, index: number, compact = false) => compact ? <article className="es-service-row" key={item.id}>
    <div>
      <h3><a href={serviceLink(item.id)}>{item.name}</a></h3>
      <p className="es-service-price">{item.duration} min — {item.priceFrom && 'A partir de '}{price(item.price)}</p>
      <a className="es-service-more" href={serviceLink(item.id)}>Ver detalhes</a>
    </div>
    <button className="es-button" onClick={() => openBooking({ serviceId: item.id })}>Agendar</button>
  </article> : <article className="es-service" key={item.id}>
    <div className="es-service-head">
      {(featuredId === item.id || (!featuredId && index === 0 && data.services.length > 2)) && <span className="es-flag">{copy.mostRequested}</span>}
      <h3><a href={serviceLink(item.id)}>{item.name}</a></h3>
      <p className="es-service-price">{item.duration} min — {item.priceFrom && 'A partir de '}{price(item.price)}</p>
      {item.description && <p className="es-service-desc">{item.description}</p>}
      {item.includes.length > 0 && <div className="es-includes"><b>{copy.includes}</b><p>{item.includes.slice(0, 2).join(' · ')}</p></div>}
    </div>
    <div className="es-service-actions">
      <button className="es-button es-button-block" onClick={() => openBooking({ serviceId: item.id })}>{copy.bookService}</button>
      <a className="es-service-more" href={serviceLink(item.id)}>Ver página do serviço</a>
    </div>
  </article>;

  const faqBlock = <div className="es-faq">{config.faq.filter(item => item.question && item.answer).map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>;

  const locationBlock = <div className="es-location">
    {data.address && !data.demo && <a className="es-map" href={mapsUrl} target="_blank" rel="noreferrer" aria-label={`Abrir mapa de ${data.name}`}><iframe title={`Mapa de ${data.name}`} src={`https://www.google.com/maps?q=${encodeURIComponent(`${data.name} ${data.address}`)}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></a>}
    {data.demo && data.address && <div className="es-map" role="img" aria-label={`Mapa ilustrativo de ${place}`}><MapSketch accent={accent.background} /><span className="es-map-pin" aria-hidden="true">📍</span></div>}
    <div>
      {data.address && <p className="es-address">{data.address}</p>}
      {data.demo && <p className="es-lede">Endereço ilustrativo — esta casa é fictícia.</p>}
      {data.hours.length > 0 && <dl className="es-hours">{data.hours.map(row => <div key={row.day}><dt>{row.day}:</dt><dd>{row.hours}</dd></div>)}</dl>}
      {(data.phone || data.instagram) && <div className="es-location-meta">
        {data.phone && <a href={`tel:${data.phone.replace(/\s+/g, '')}`}>{data.phone}</a>}
        {data.instagram && <a href={`https://www.instagram.com/${data.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">@{data.instagram.replace(/^@/, '')}</a>}
      </div>}
      <div className="es-location-actions">
        {data.address && !data.demo && <a className="es-button" href={mapsUrl} target="_blank" rel="noreferrer">{copy.directions}</a>}
        {data.demo && data.address && <span className="es-button" aria-disabled="true">{copy.directions}</span>}
        {whatsapp && <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
      </div>
    </div>
  </div>;

  const renderSection = (section: typeof sections[number]) => {
    if (section.id === 'beforeAfter' && embedBefore) return null;
    if (section.id === 'faq' && has('location')) return null;
    if (section.id === 'location' && has('faq')) return null;
    return <section id={id(section.id)} key={section.id} className={`es-section es-section-${section.id}`}>
      <div className="es-wrap">
        {section.id === 'services' && <>
          <div className="es-section-heading"><h2>{copy.servicesTitle}</h2></div>
          <div className={`es-services ${embedBefore ? 'es-with-before' : ''}`}>
            {topServices.map((item, index) => serviceCard(item, index))}
            {embedBefore && beforeBlock()}
          </div>
          {extraServices.length > 0 && <div className="es-services" style={{ marginTop: 14 }}>{extraServices.map((item, index) => serviceCard(item, index + 3, true))}</div>}
        </>}
        {section.id === 'differences' && <>
          <div className="es-section-heading"><h2>{copy.aboutTitle(data.name)}</h2></div>
          <ol className="es-differences">{config.differences.filter(item => item.trim()).map((item, index) => <li key={item}><span className="es-num" aria-hidden="true">0{index + 1}.</span><p>{item}</p></li>)}</ol>
        </>}
        {section.id === 'beforeAfter' && <>
          <div className="es-section-heading"><h2>{copy.beforeTitle}</h2>{data.demo && <p>Fotos ilustrativas, para mostrar o bloco. Não são resultados desta casa.</p>}</div>
          {pairs.map(pair => <div key={`${pair.before}-${pair.after}`}>{beforeBlock(pair)}</div>)}
        </>}
        {section.id === 'gallery' && <>
          <div className="es-section-heading"><h2>{copy.galleryTitle}</h2><p>{data.demo ? 'Fotos ilustrativas de banco de imagens.' : copy.galleryLead}</p></div>
          <div className="es-gallery">{data.gallery.map(item => <figure key={item.src}>{photo(item.src, item.alt, { width: 640, height: 480 })}<figcaption>{item.alt}</figcaption></figure>)}</div>
        </>}
        {section.id === 'team' && <>
          <div className="es-section-heading"><h2>{copy.teamTitle}</h2></div>
          <div className="es-team" data-photos={teamHasPhotos ? 'true' : 'false'}>{data.team.map(person => {
            const first = person.name.split(' ')[0];
            const specialty = (person.bio || '').split('&')[0].trim();
            return <article key={person.id}>
              {person.image ? photo(person.image, person.name, { className: 'es-team-photo', width: 320, height: 400 }) : <span className="es-monogram" aria-hidden="true">{initials(person.name)}</span>}
              <div className="es-team-body">
                <div>
                  <h3>{specialty ? `${first} · ${specialty}` : person.name}</h3>
                  {person.bio && <p>{person.bio}</p>}
                </div>
                <button className="es-button" onClick={() => openBooking({ professionalId: person.id })}>{copy.bookWith(person.name)}</button>
              </div>
            </article>;
          })}</div>
        </>}
        {section.id === 'reviews' && <>
          <div className="es-reviews-head">
            <h2>{copy.reviewsTitle}</h2>
            {hasRating && <div className="es-score-box"><span>{copy.googleReviews}</span><strong>{data.rating!.toFixed(1).replace('.', ',')}</strong></div>}
          </div>
          <div className="es-reviews">{data.reviews.filter(review => review.comment.trim()).map(review => <figure key={review.id}>
            <div><Stars value={review.rating} /><blockquote>“{review.comment}”</blockquote></div>
            <figcaption>{review.name || 'Cliente'}{data.demo ? ` · ${copy.fictionalReview}` : ''}</figcaption>
          </figure>)}</div>
        </>}
        {section.id === 'faq' && <><div className="es-section-heading"><h2>{copy.faqTitle}</h2></div>{faqBlock}</>}
        {section.id === 'location' && <><div className="es-section-heading"><h2>{copy.locationTitle()}</h2></div>{locationBlock}</>}
      </div>
    </section>;
  };

  const pairFaqLocation = has('faq') && has('location') && !serviceId;

  return <div className="establishment" data-style={config.style} data-kind={data.kind} data-preview={preview || undefined} style={{ '--es-accent': accent.background, '--es-on-accent': accent.foreground, '--es-bg': surface.background, '--es-ink': surface.ink, '--es-body': surface.body, '--es-muted': surface.muted, '--es-line': surface.line, '--es-panel': surface.panel, '--es-map': surface.map } as React.CSSProperties}>
    <a className="es-skip" href="#es-content" onClick={event => { event.preventDefault(); document.getElementById('es-content')?.focus(); }}>{copy.skip}</a>
    {data.demo && <div className="es-demo"><strong>{copy.demoBanner}</strong> <span>{copy.demoHint}</span></div>}
    <header className="es-header">
      <div className="es-wrap es-header-inner">
        <a className="es-wordmark" href={home} aria-label={data.name}>
          <b>{data.name}</b>
          <i aria-hidden="true" />
        </a>
        {!serviceId && <nav className="es-header-nav" aria-label="Navegação do estabelecimento">{nav.map(item => <button key={item.id} onClick={item.onClick}>{item.label}</button>)}</nav>}
        <div className="es-header-cta" data-sticky-twin={showSticky || undefined}>{primary(copy.book, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}</div>
      </div>
    </header>

    <main id="es-content" tabIndex={-1}>
      {serviceId ? service ? <>
        <div className="es-wrap es-breadcrumb"><a href={home}>{copy.allServices}</a></div>
        <section className="es-service-detail es-wrap">
          <div className="es-detail-copy">
            <p className="es-kicker">{data.name}{neighborhood ? ` · ${copy.kindLine} em ${neighborhood}` : ''}</p>
            <h1>{service.name}</h1>
            <p className="es-decision">{service.priceFrom ? 'A partir de ' : ''}{price(service.price)} · {service.duration} min</p>
            {service.priceNote && <p className="es-price-note">{service.priceNote}</p>}
            {service.description && <p className="es-detail-desc">{service.description}</p>}
            {primary(copy.bookService, { serviceId: service.id }, 'es-button-block')}
            {service.includes.length > 0 && <div className="es-detail-block"><h2>{copy.includes}</h2><ul className="es-includes">{service.includes.map(entry => <li key={entry}>{entry}</li>)}</ul></div>}
            {service.audience && <div className="es-detail-block"><h2>{copy.audience}</h2><p>{service.audience}</p></div>}
          </div>
          {service.image && photo(service.image, service.name, { className: 'es-detail-photo', priority: true, width: 720, height: 540 })}
        </section>
        {data.services.length > 1 && <section className="es-section es-more-services"><div className="es-wrap"><h2 className="es-h2-small">{copy.otherServices}</h2><div className="es-services">{data.services.filter(item => item.id !== service.id).map((item, index) => serviceCard(item, index, true))}</div></div></section>}
      </> : <section className="es-wrap es-empty"><h1>Serviço não encontrado</h1><p>Este serviço pode ter saído do cardápio.</p><a href={home}>Ver os serviços da casa</a></section> : <>
        <section className={`es-hero ${cover ? 'es-has-cover' : 'es-no-cover'}`}>
          {cover && <div className="es-hero-media">{photo(cover, `${data.demo ? 'Foto ilustrativa — ' : ''}${data.name}`, { className: 'es-hero-photo', priority: true, width: 1600, height: 2000, position: photoObjectPosition(config) })}</div>}
          <div className="es-hero-copy">
            <p className="es-kicker">{copy.kindLine}{neighborhood ? ` em ${neighborhood}` : ''}{place && neighborhood ? `, ${place.replace(neighborhood, '').replace(/^,\s*/, '') || 'São Paulo'}` : ''}</p>
            <h1>{config.headline}</h1>
            {config.about && <p className="es-lede">{config.about}</p>}
            {offerVisible && <div className="es-offer"><strong>{offer.title}</strong>{offer.detail && <span>{offer.detail}</span>}</div>}
            <div className="es-hero-actions">
              {primary(copy.book, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
              {whatsapp && <a className="es-ghost" href={whatsapp} target="_blank" rel="noreferrer">{copy.whatsapp}</a>}
            </div>
            <div className="es-trust">
              {hasRating && <strong>★ {data.rating!.toFixed(1).replace('.', ',')} · {data.reviewCount} {reviewWord}</strong>}
              {hasRating && (status || data.hours[0]) && <span aria-hidden="true">|</span>}
              {status && <em>{status.open ? status.label.replace('Aberto hoje até', 'Aberto hoje até') : status.label}</em>}
              {!status && data.hours[0] && <em>{copy.openToday(data.hours[0].hours)}</em>}
            </div>
          </div>
        </section>

        {sections.map(renderSection)}

        {pairFaqLocation && <section className="es-section" id={id('faq')}>
          <div className="es-wrap es-split">
            <div>
              <div className="es-section-heading"><h2>{copy.faqTitle}</h2></div>
              {faqBlock}
            </div>
            <div className="es-split-loc" id={id('location')}>
              <div className="es-section-heading"><h2>{copy.locationTitle()}</h2></div>
              {locationBlock}
            </div>
          </div>
        </section>}

        <section className="es-close">
          {cover && photo(cover, '', { className: 'es-close-photo', width: 1200, height: 800 })}
          <div className="es-wrap es-close-inner">
            {offerVisible && <p className="es-kicker">{offer.title}</p>}
            <h2>{copy.closeTitle(data.name)}</h2>
            {primary(copy.book, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
          </div>
        </section>
      </>}
    </main>
    <footer className="es-footer"><div className="es-wrap"><p><a className="es-footer-brand" href={home}>{data.name}</a>{neighborhood ? ` · ${neighborhood}` : ''}{data.demo ? ' · Demonstração. Nenhum agendamento ou cobrança real.' : ''}</p><div className="es-footer-links"><a href="/#/privacidade">Privacidade</a><a href="/#/termos">Termos</a><span>{copy.footerCredit}</span><span>{copy.footerFee}</span></div></div></footer>
    {showSticky && <div className="es-sticky">{primary(copy.book, offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}</div>}
    {notice && <p className="es-preview-notice" role="status" onClick={() => setNotice('')}>{notice}</p>}
    <dialog className="es-booking-dialog" ref={dialog} onCancel={() => setBooking(null)} onClose={() => setBooking(null)} aria-labelledby="es-booking-title">
      <div className="es-booking-header">
        <div>
          <h2 id="es-booking-title">{copy.bookingTitle(data.name)}</h2>
          {booking?.offer && <p>{[offer.title, offer.detail].filter(Boolean).join(' ')} {copy.offerDisclaimer}</p>}
          {data.demo && <small>{copy.demoBooking}</small>}
        </div>
        <button onClick={() => setBooking(null)} aria-label={copy.closeBooking}>×</button>
      </div>
      {booking && <iframe title="Agendamento do estabelecimento" src={bookingUrl} className="es-booking-frame" />}
    </dialog>
  </div>;
}
