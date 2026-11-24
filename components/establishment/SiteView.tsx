import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, MessageCircle, Navigation, Star, X } from 'lucide-react';
import { accessibleAccent, applySiteConfig, formatPrice, visibleSections, type SiteConfig, type SiteData, type SiteService } from '../../lib/establishment/model';
import { buildWhatsAppLink } from '../../utils/formatters';
import '../../styles/establishment.css';

interface SiteViewProps { data: SiteData; config: SiteConfig; serviceId?: string; preview?: boolean }
interface BookingContext { serviceId?: string; professionalId?: string; offer?: boolean }

const navLabels: Record<string, string> = { services: 'Serviços', team: 'Equipe', reviews: 'Avaliações', location: 'Onde estamos' };
const kindLabel = { barber: 'Barbearia', beauty: 'Salão de beleza', studio: 'Estúdio de beleza' } as const;

/** "Rua X, 420 — Pinheiros, São Paulo" → "Pinheiros, São Paulo" */
export function placeFromAddress(address: string): string {
  const afterDash = address.split(/\s[—–-]\s/).pop() || address;
  return afterDash.trim();
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="es-stars" aria-label={`${value.toFixed(1).replace('.', ',')} de 5 estrelas`}>{Array.from({ length: 5 }, (_, n) => <Star key={n} size={size} fill={n < Math.round(value) ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>;
}

export function SiteView({ data: sourceData, config, serviceId, preview = false }: SiteViewProps) {
  const data = applySiteConfig(sourceData, config);
  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const sections = visibleSections(data, config);
  const accent = accessibleAccent(config.accent, config.style);
  const service = serviceId ? data.services.find(s => s.id === serviceId) : undefined;
  const home = `/#/site/${data.slug}`;
  const beauty = data.kind === 'beauty';
  const editorial = config.style === 'light';
  const cover = config.cover || data.cover;
  const place = placeFromAddress(data.address);
  const neighborhood = place.split(',')[0]?.trim();
  const offerVisible = Boolean(config.offer.enabled && config.offer.title && (!config.offer.expires || new Date(`${config.offer.expires}T23:59:59`).getTime() >= Date.now()));
  const offerService = offerVisible && config.offer.serviceId ? data.services.find(s => s.id === config.offer.serviceId) : undefined;
  const price = (value: number) => formatPrice(value, data.region);
  const hasRating = Boolean(data.rating && data.reviewCount > 0);
  const reviewWord = data.reviewCount === 1 ? 'avaliação' : 'avaliações';
  const heroEyebrow = { barber: 'Corte · Barba · Acabamento', beauty: 'Corte · Cor · Tratamento', studio: 'Beleza com hora marcada' }[data.kind];
  const teamHasPhotos = data.team.some(p => Boolean(p.image));
  const weekdayHours = data.hours.find(h => !/fechad/i.test(h.hours));
  const scrollTo = (id: string) => document.getElementById(`${preview ? 'preview-' : ''}${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const openBooking = (context: BookingContext = {}) => {
    if (preview) { setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.'); return; }
    setBooking(context);
  };
  useEffect(() => {
    if (booking) dialog.current?.showModal?.();
    else dialog.current?.close?.();
    if (!booking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [booking]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(t); }, [notice]);
  const params = new URLSearchParams({ agendar: '1', embed: 'site', appearance: config.style, brand: accent.background });
  if (booking?.serviceId) params.set('rebook', booking.serviceId);
  if (booking?.professionalId) params.set('pro', booking.professionalId);
  const bookingSlug = data.demo ? `simulacao-${beauty ? 'beauty' : 'barber'}` : data.slug;
  const bookingUrl = data.demo ? `/demo-preview#/demo/${beauty ? 'beauty' : 'barber'}/book/${bookingSlug}?${params}` : `/#/book/${bookingSlug}?${params}`;
  const serviceLink = (id: string) => `${home}/servico/${id}`;
  const imageError = (event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.closest('.es-photo')?.setAttribute('data-broken', 'true'); };
  const markLowRes = (event: React.SyntheticEvent<HTMLImageElement>) => { const img = event.currentTarget; if (img.naturalWidth && img.clientWidth && img.naturalWidth < img.clientWidth * 0.75) img.closest('.es-photo')?.setAttribute('data-lowres', 'true'); };
  const primary = (label = 'Agendar horário', context: BookingContext = {}, className = '') => <button className={`es-button ${className}`} onClick={() => openBooking(context)}><CalendarDays size={18} aria-hidden="true" />{label}</button>;
  const whatsapp = data.phone ? buildWhatsAppLink(data.phone, data.region) : undefined;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name} ${data.address}`)}`;
  const id = (section: string) => `${preview ? 'preview-' : ''}${section}`;

  const photo = (src: string, alt: string, opts: { className?: string; priority?: boolean; width?: number; height?: number; focus?: string } = {}) => <div className={`es-photo ${opts.className || ''}`}>
    <img style={opts.focus ? { objectPosition: `50% ${opts.focus === 'top' ? '15%' : '85%'}` } : undefined} src={src} alt={alt} loading={opts.priority ? 'eager' : 'lazy'} fetchPriority={opts.priority ? 'high' : undefined} decoding="async" width={opts.width || 640} height={opts.height || 800} onError={imageError} onLoad={markLowRes} />
  </div>;

  const serviceRow = (s: SiteService, index: number) => <article className={`es-service ${s.image ? '' : 'es-service-noimage'}`} key={s.id}>
    {s.image && <a className="es-service-thumb" href={serviceLink(s.id)} tabIndex={-1} aria-hidden="true">{photo(s.image, '', { width: 320, height: 320 })}</a>}
    <div className="es-service-body">
      <div className="es-service-head">
        <h3><a href={serviceLink(s.id)}>{s.name}</a></h3>
        <strong className="es-service-price">{s.priceFrom && <small>a partir de</small>}{price(s.price)}</strong>
      </div>
      <p className="es-service-meta"><Clock3 size={14} aria-hidden="true" />{s.duration} min{offerService?.id === s.id && <span className="es-tag">Oferta de 1ª visita</span>}{!offerService && index === 0 && data.services.length > 2 && <span className="es-tag">Mais pedido</span>}</p>
      {s.description && <p className="es-service-desc">{s.description}</p>}
      <div className="es-service-actions">
        <button className="es-chip-button" onClick={() => openBooking({ serviceId: s.id })}>Agendar <span className="es-sr">{s.name}</span></button>
        <a className="es-service-more" href={serviceLink(s.id)}>{s.includes.length ? 'O que inclui' : 'Detalhes'}<ArrowRight size={15} aria-hidden="true" /></a>
      </div>
    </div>
  </article>;

  return <div className="establishment" data-style={config.style} data-kind={data.kind} data-preview={preview || undefined} style={{ '--es-accent': accent.background, '--es-on-accent': accent.foreground } as React.CSSProperties}>
    <a className="es-skip" href="#es-content" onClick={e => { e.preventDefault(); document.getElementById('es-content')?.focus(); }}>Pular para o conteúdo</a>
    {data.demo && <div className="es-demo"><strong>Demonstração AgendiX</strong> <span>Casa, preços e avaliações fictícios</span></div>}
    <header className="es-header">
      <div className="es-wrap es-header-inner">
        <a className="es-wordmark" href={home}>
          {data.logo ? <img src={data.logo} alt="" width="40" height="40" /> : <span className="es-monomark" aria-hidden="true">{initials(data.name)}</span>}
          <span><b>{data.name}</b><small>{kindLabel[data.kind]}{neighborhood ? ` · ${neighborhood}` : ''}</small></span>
        </a>
        {!serviceId && <nav aria-label="Navegação do estabelecimento">{sections.filter(s => navLabels[s.id]).map(s => <button key={s.id} onClick={() => scrollTo(s.id)}>{navLabels[s.id]}</button>)}</nav>}
        <div className="es-header-cta">{primary('Agendar')}</div>
      </div>
    </header>

    <main id="es-content" tabIndex={-1}>
      {serviceId ? service ? <>
        <div className="es-wrap es-breadcrumb"><a href={home}><ArrowLeft size={16} aria-hidden="true" />Todos os serviços</a></div>
        <section className="es-service-detail es-wrap">
          {service.image && photo(service.image, service.name, { className: 'es-detail-photo', priority: true, width: 640, height: 640 })}
          <div className="es-detail-copy">
            <p className="es-eyebrow">{data.name} · {kindLabel[data.kind]}</p>
            <h1>{service.name}</h1>
            <div className="es-decision">
              <div><span>{service.priceFrom ? 'A partir de' : 'Valor'}</span><strong>{price(service.price)}</strong></div>
              <div><span>Duração</span><strong>{service.duration} min</strong></div>
            </div>
            {service.priceNote && <p className="es-price-note">{service.priceNote}</p>}
            {primary('Agendar este serviço', { serviceId: service.id }, 'es-button-block')}
            <p className="es-caption">Você escolhe o profissional e vê os horários livres na hora.</p>
            {service.description && <p className="es-detail-desc">{service.description}</p>}
            {service.includes.length > 0 && <div className="es-detail-block"><h2>O que inclui</h2><ul className="es-includes">{service.includes.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></div>}
            {service.audience && <div className="es-detail-block"><h2>Indicado para</h2><p>{service.audience}</p></div>}
          </div>
        </section>
        {data.services.length > 1 && <section className="es-section es-more-services"><div className="es-wrap"><h2 className="es-h2-small">Outros serviços da casa</h2><div className="es-services">{data.services.filter(s => s.id !== service.id).map(serviceRow)}</div></div></section>}
      </> : <section className="es-wrap es-empty"><h1>Serviço não encontrado</h1><p>Este serviço pode ter saído do catálogo.</p><a href={home}>Ver os serviços da casa</a></section> : <>
        <section className={`es-hero ${cover ? 'es-has-cover' : 'es-no-cover'}`}>
          {cover && photo(cover, `${data.demo ? 'Foto ilustrativa — ' : ''}${data.name}`, { className: 'es-hero-photo', priority: true, width: 640, height: 960, focus: config.photoFocus })}
          <div className="es-hero-copy es-wrap">
            <p className="es-eyebrow">{heroEyebrow}</p>
            <h1>{config.headline}</h1>
            {config.about && <p className="es-lede">{config.about}</p>}
            {offerVisible && <div className="es-hero-offer">
              <span className="es-offer-kicker">{beauty ? 'Presente de boas-vindas' : 'Primeira visita'}</span>
              <strong>{config.offer.title}</strong>
              {config.offer.condition && <small>{config.offer.condition}{config.offer.expires && ` Válida até ${config.offer.expires.split('-').reverse().join('/')}.`}</small>}
            </div>}
            <div className="es-hero-actions">
              {primary(offerVisible ? (beauty ? 'Agendar com o presente' : 'Quero minha 1ª visita') : 'Agendar horário', offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {}, 'es-button-block')}
              {data.services.length > 0 && <button className="es-text-button" onClick={() => scrollTo('services')}>Ver serviços e preços<ChevronDown size={16} aria-hidden="true" /></button>}
            </div>
            <ul className="es-facts">
              {hasRating && <li><button onClick={() => scrollTo('reviews')}><Star size={15} fill="currentColor" aria-hidden="true" /><b>{data.rating!.toFixed(1).replace('.', ',')}</b> · {data.reviewCount} {reviewWord}{data.demo ? ' fictícias' : ''}</button></li>}
              {weekdayHours && <li><Clock3 size={15} aria-hidden="true" />{weekdayHours.day.replace('Segunda a sexta', 'Seg a sex')} · {weekdayHours.hours}</li>}
              {!hasRating && whatsapp && <li><MessageCircle size={15} aria-hidden="true" /><a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></li>}
            </ul>
          </div>
        </section>

        {sections.map(section => <section id={id(section.id)} key={section.id} className={`es-section es-section-${section.id}`}>
          <div className="es-wrap">
            {section.id === 'services' && <>
              <div className="es-section-heading"><p className="es-eyebrow">Serviços e preços</p><h2>{beauty ? 'Escolha o seu cuidado.' : 'Escolha o seu serviço.'}</h2><p>Preço e duração na mesa, antes de você marcar.</p></div>
              <div className="es-services">{data.services.map(serviceRow)}</div>
            </>}
            {section.id === 'differences' && <>
              <div className="es-section-heading"><p className="es-eyebrow">Por que {data.name}</p><h2>{beauty ? 'O cuidado que a gente não abre mão.' : 'O que você encontra aqui.'}</h2></div>
              <ol className="es-differences">{config.differences.filter(d => d.trim()).map((d, i) => { const [title, ...rest] = d.split(/(?<=\.)\s/); return <li key={d}><span className="es-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><div><strong>{title}</strong>{rest.length > 0 && <p>{rest.join(' ')}</p>}</div></li>; })}</ol>
            </>}
            {section.id === 'gallery' && <>
              <div className="es-section-heading"><p className="es-eyebrow">{beauty ? 'Resultados' : 'Trabalho da casa'}</p><h2>{beauty ? 'Cabelo com movimento e cor.' : 'Acabamento de perto.'}</h2>{data.demo && <p>Fotos ilustrativas de banco de imagens.</p>}</div>
              <div className="es-gallery" role="list">{data.gallery.map(p => <figure role="listitem" key={p.src}>{photo(p.src, p.alt, { width: 640, height: 800 })}</figure>)}</div>
            </>}
            {section.id === 'team' && <>
              <div className="es-section-heading"><p className="es-eyebrow">Equipe</p><h2>{beauty ? 'Escolha quem vai cuidar de você.' : 'Escolha o seu barbeiro.'}</h2></div>
              <div className="es-team" data-photos={teamHasPhotos ? 'true' : 'false'}>{data.team.map(person => <article key={person.id}>
                {person.image ? photo(person.image, person.name, { className: 'es-team-photo', width: 480, height: 600 }) : <span className={`es-monogram ${teamHasPhotos ? 'es-team-photo' : ''}`} aria-hidden="true">{initials(person.name)}</span>}
                <div className="es-team-body"><h3>{person.name}</h3>{person.bio && <p>{person.bio}</p>}<button className="es-chip-button" onClick={() => openBooking({ professionalId: person.id })}>{teamHasPhotos ? `Agendar com ${person.name.split(' ')[0]}` : <>Agendar<span className="es-sr"> com {person.name.split(' ')[0]}</span></>}</button></div>
              </article>)}</div>
            </>}
            {section.id === 'reviews' && <>
              <div className="es-reviews-summary">
                <p className="es-eyebrow">Avaliações</p>
                {hasRating ? <><strong className="es-score">{data.rating!.toFixed(1).replace('.', ',')}</strong><Stars value={data.rating!} size={18} /><p>{data.reviewCount} {reviewWord} {data.demo ? 'fictícias, para demonstração' : 'de clientes atendidos'}</p></> : <h2>O que dizem os clientes</h2>}
              </div>
              <div className="es-reviews">{data.reviews.filter(r => r.comment.trim()).map(review => <figure key={review.id}>
                <Stars value={review.rating} />
                <blockquote>{review.comment}</blockquote>
                <figcaption><span className="es-review-avatar" aria-hidden="true">{(review.name || 'C')[0]}</span><span><b>{review.name || 'Cliente'}</b><small>{data.demo ? 'Depoimento fictício' : 'Atendimento verificado'}</small></span></figcaption>
              </figure>)}</div>
            </>}
            {section.id === 'faq' && <>
              <div className="es-section-heading"><p className="es-eyebrow">Dúvidas</p><h2>Antes da sua visita.</h2></div>
              <div className="es-faq">{config.faq.filter(f => f.question && f.answer).map(faq => <details key={faq.question}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
            </>}
            {section.id === 'location' && <div className="es-location">
              <div className="es-location-main">
                <p className="es-eyebrow">Onde estamos</p>
                <h2>{neighborhood ? `Em ${neighborhood}.` : 'Como chegar.'}</h2>
                {data.address && <p className="es-address"><MapPin size={18} aria-hidden="true" />{data.address}</p>}
                {data.demo && <p className="es-caption">Endereço ilustrativo — esta casa é fictícia.</p>}
                <div className="es-location-actions">
                  {data.address && !data.demo && <a className="es-outline" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" />Como chegar</a>}
                  {data.demo && data.address && <span className="es-outline es-outline-disabled" aria-disabled="true"><Navigation size={16} aria-hidden="true" />Como chegar</span>}
                  {whatsapp && <a className="es-outline" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>}
                  {data.instagram && <a className="es-outline" href={`https://www.instagram.com/${data.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">Instagram</a>}
                </div>
              </div>
              {data.hours.length > 0 && <div className="es-hours"><h3>Horários</h3><dl>{data.hours.map(h => <div key={h.day}><dt>{h.day}</dt><dd>{h.hours}</dd></div>)}</dl><p>Atendimento com hora marcada.</p></div>}
            </div>}
          </div>
        </section>)}

        <section className="es-close">
          {cover && photo(cover, '', { className: 'es-close-photo', width: 640, height: 960 })}
          <div className="es-wrap es-close-inner">
            <h2>{beauty ? 'Seu próximo cuidado começa com um toque.' : data.kind === 'studio' ? 'Seu horário está a um toque.' : 'Seu próximo corte está a um toque.'}</h2>
            <p>{offerVisible ? `${config.offer.title} ${config.offer.condition}` : 'Escolha o serviço, o profissional e o horário — em menos de um minuto.'}</p>
            {primary('Agendar agora', offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}
            {whatsapp && <a className="es-text-button" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />Prefere conversar? Chame no WhatsApp</a>}
          </div>
        </section>
      </>}
    </main>
    <footer className="es-footer"><div className="es-wrap"><a className="es-footer-brand" href={home}>{data.name}</a><p>{data.demo ? 'Demonstração. Nenhum agendamento ou cobrança real.' : data.address}</p><div className="es-footer-links"><a href="/#/privacidade">Privacidade</a><a href="/#/termos">Termos</a><span>Site feito com AgendiX</span></div>{data.demo && <small>Fotos Pexels, ilustrativas. Créditos em /demo/CREDITS.md.</small>}</div></footer>
    {!preview && <div className="es-mobile-action"><div><strong>{service ? service.name : offerVisible && offerService ? offerService.name : data.name}</strong><span>{service ? `${service.priceFrom ? 'a partir de ' : ''}${price(service.price)} · ${service.duration} min` : offerVisible ? (beauty ? 'Presente na 1ª visita' : 'Condição de 1ª visita') : hasRating ? `★ ${data.rating!.toFixed(1).replace('.', ',')} · ${data.reviewCount} ${reviewWord}` : 'Horários livres agora'}</span></div>{primary('Agendar', service ? { serviceId: service.id } : offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}</div>}
    {notice && <p className="es-preview-notice" role="status" onClick={() => setNotice('')}>{notice}</p>}
    <dialog className="es-booking-dialog" ref={dialog} onCancel={() => setBooking(null)} onClose={() => setBooking(null)} aria-labelledby="es-booking-title"><div className="es-booking-header"><div><h2 id="es-booking-title">Agendar na {data.name}</h2>{booking?.offer && <p>{config.offer.title} {config.offer.condition} A condição é conferida pela casa; o fluxo mostra o preço de tabela.</p>}{data.demo && <small>Simulação segura · dados fictícios · sem cobrança</small>}</div><button onClick={() => setBooking(null)} aria-label="Fechar agendamento"><X size={22} /></button></div>{booking && <iframe title="Agendamento do estabelecimento" src={bookingUrl} className="es-booking-frame" />}</dialog>
  </div>;
}
