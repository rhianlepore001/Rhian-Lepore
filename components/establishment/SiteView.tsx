import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Clock3, MapPin, MessageCircle, Scissors, Star, X } from 'lucide-react';
import { accessibleAccent, applySiteConfig, formatPrice, visibleSections, type SiteConfig, type SiteData } from '../../lib/establishment/model';
import { buildWhatsAppLink } from '../../utils/formatters';
import '../../styles/establishment.css';

interface SiteViewProps { data: SiteData; config: SiteConfig; serviceId?: string; preview?: boolean }
interface BookingContext { serviceId?: string; professionalId?: string; offer?: boolean }

const sectionLabels: Record<string, string> = { services: 'Serviços', differences: 'A casa', gallery: 'Nosso trabalho', team: 'Equipe', reviews: 'Avaliações', faq: 'Dúvidas', location: 'Onde estamos' };

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
  const cover = config.cover || data.cover;
  const offerVisible = config.offer.enabled && config.offer.title && (!config.offer.expires || new Date(`${config.offer.expires}T23:59:59`).getTime() >= Date.now());
  const price = (value: number) => formatPrice(value, data.region);
  const scrollTo = (id: string) => document.getElementById(`${preview ? 'preview-' : ''}${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const openBooking = (context: BookingContext = {}) => {
    if (preview) { setNotice('A prévia não faz agendamentos. Abra o site para testar o fluxo.'); return; }
    setBooking(context);
  };
  useEffect(() => {
    if (booking) dialog.current?.showModal();
    else dialog.current?.close();
    if (!booking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [booking]);
  const params = new URLSearchParams({ agendar: '1', embed: 'site', appearance: config.style, brand: accent.background });
  if (booking?.serviceId) params.set('rebook', booking.serviceId);
  if (booking?.professionalId) params.set('pro', booking.professionalId);
  const bookingSlug = data.demo ? `simulacao-${beauty ? 'beauty' : 'barber'}` : data.slug;
  const bookingUrl = data.demo ? `/demo-preview#/demo/${beauty ? 'beauty' : 'barber'}/book/${bookingSlug}?${params}` : `/#/book/${bookingSlug}?${params}`;
  const serviceLink = (id: string) => `${home}/servico/${id}`;
  const imageError = (event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.style.visibility = 'hidden'; };
  const primary = (label = 'Agendar horário', context: BookingContext = {}) => <button className="es-button" onClick={() => openBooking(context)}><CalendarDays size={17} aria-hidden="true" />{label}</button>;

  return <div className="establishment" data-style={config.style} data-preview={preview || undefined} style={{ '--es-accent': accent.background, '--es-on-accent': accent.foreground } as React.CSSProperties}>
    <a className="es-skip" href="#es-content" onClick={e => { e.preventDefault(); document.getElementById('es-content')?.focus(); }}>Pular para o conteúdo</a>
    {data.demo && <div className="es-demo">Demonstração AgendiX <span>Casa, preços e avaliações fictícios</span></div>}
    <header className="es-header es-wrap">
      <a className="es-wordmark" href={home}>{data.logo ? <img src={data.logo} alt="" width="40" height="40" /> : <Scissors size={24} strokeWidth={1.3} aria-hidden="true" />}<span>{data.name}<small>{beauty ? 'Cabelo & cuidado' : 'Barbearia'}</small></span></a>
      {!serviceId && <nav aria-label="Navegação do estabelecimento">{sections.filter(s => ['services', 'team', 'location'].includes(s.id)).map(s => <button key={s.id} onClick={() => scrollTo(s.id)}>{sectionLabels[s.id]}</button>)}</nav>}
      <div className="es-header-cta">{primary()}</div>
      <span className="es-header-place">{data.demo ? 'Pinheiros, SP' : data.address}</span>
    </header>

    <main id="es-content" tabIndex={-1}>
      {serviceId ? service ? <>
        <div className="es-wrap es-breadcrumb"><a href={home}>Início</a><span>/</span><span>{service.name}</span></div>
        <section className="es-service-detail es-wrap">
          {service.image && <div className="es-detail-photo es-photo"><img src={service.image} alt={service.name} fetchPriority="high" onError={imageError} /></div>}
          <div className="es-detail-copy"><h1>{service.name}</h1><p>{service.description || `Reserve ${service.duration} minutos para cuidar de você na ${data.name}.`}</p>
            <div className="es-detail-price"><span>{service.priceFrom && <small>A partir de </small>}{price(service.price)}</span><span><Clock3 size={16} /> {service.duration} min</span></div>
            {service.priceNote && <p className="es-price-note">{service.priceNote}</p>}
            {service.includes.length > 0 && <><h2>O que inclui</h2><ul className="es-includes">{service.includes.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></>}
            {service.audience && <><h2>É para você?</h2><p>{service.audience}</p></>}
            {primary('Agendar este serviço', { serviceId: service.id })}<p className="es-caption">Escolha o profissional e veja os horários disponíveis.</p>
          </div>
        </section>
      </> : <section className="es-wrap es-empty"><h1>Serviço não encontrado</h1><p>Este serviço pode ter saído do catálogo.</p><a href={home}>Ver os serviços da casa</a></section> : <>
        <section className={`es-hero es-wrap ${!cover ? 'es-no-cover' : ''}`}>
          <div className="es-hero-copy"><h1>{config.headline}</h1><p>{config.about}</p>
            {offerVisible && <div className="es-hero-offer"><strong>{config.offer.title}</strong><span>{config.offer.condition}</span></div>}
            <div className="es-hero-actions">{primary('Agendar horário', offerVisible ? { serviceId: config.offer.serviceId, offer: true } : {})}<button className="es-text-button" onClick={() => scrollTo('services')}>Serviços e preços <ChevronDown size={16} aria-hidden="true" /></button></div>
            {data.rating && data.reviewCount > 0 && <button className="es-proof" onClick={() => scrollTo('reviews')}><span className="es-stars" aria-label="5 estrelas"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></span><strong>{data.rating.toFixed(1).replace('.', ',')}</strong><span>{data.reviewCount} avaliações{data.demo ? ' ilustrativas' : ' verificadas'}</span></button>}
          </div>
          {cover && <div className="es-hero-photo es-photo"><img src={cover} alt={`Ambiente ${data.demo ? 'ilustrativo de' : 'de'} ${data.name}`} fetchPriority="high" width="960" height="1000" onError={imageError} /><div className="es-photo-note"><MapPin size={15} aria-hidden="true" />{data.demo ? 'No coração de Pinheiros' : data.address}</div></div>}
        </section>
        {offerVisible && <aside className="es-offer es-wrap"><div><span className="es-offer-label">{beauty ? 'Um cuidado de boas-vindas' : 'Boas-vindas à casa'}</span><p>{config.offer.title}</p><small>{config.offer.condition}{config.offer.expires && ` Válida até ${config.offer.expires.split('-').reverse().join('/')}.`}</small></div><button onClick={() => openBooking({ serviceId: config.offer.serviceId, offer: true })}>{beauty ? 'Agendar meu corte' : 'Quero esse cuidado'}<CalendarDays size={18} aria-hidden="true" /></button></aside>}
        {sections.map(section => <section id={`${preview ? 'preview-' : ''}${section.id}`} key={section.id} className={`es-section es-section-${section.id}`}>
          <div className="es-wrap">
            {section.id === 'services' && <><div className="es-section-heading"><h2>{beauty ? 'O que seu cabelo precisa?' : 'Cuidado do seu jeito.'}</h2><p>{beauty ? 'Do primeiro corte à próxima mudança. Encontre o seu cuidado.' : 'Escolha o serviço. O resto, a gente cuida.'}</p></div><div className="es-services">{data.services.map((s, index) => <article className="es-service" key={s.id}>
              {s.image && <a className="es-service-photo es-photo" href={serviceLink(s.id)} tabIndex={-1} aria-hidden="true"><img src={s.image} alt="" loading="lazy" width="500" height="400" onError={imageError} />{index === 1 && data.demo && <span>{beauty ? 'Para iluminar' : 'O ritual completo'}</span>}</a>}
              <div className="es-service-body"><div className="es-service-title"><h3><a href={serviceLink(s.id)}>{s.name}</a></h3><span><Clock3 size={14} />{s.duration} min</span></div><p>{s.description}</p>{s.includes.length > 0 && <details><summary>O que inclui <ChevronDown size={15} /></summary><ul>{s.includes.map(item => <li key={item}>{item}</li>)}</ul></details>}<div className="es-service-bottom"><strong>{s.priceFrom && <small>A partir de </small>}{price(s.price)}</strong><button onClick={() => openBooking({ serviceId: s.id })}>Agendar <span className="es-sr">{s.name}</span></button></div><a className="es-service-more" href={serviceLink(s.id)}>Ver detalhes do serviço</a></div>
            </article>)}</div></>}
            {section.id === 'differences' && <div className="es-differences"><h2>{beauty ? 'A beleza de se sentir à vontade.' : 'Boa conversa.\nCorte melhor ainda.'}</h2><div>{config.differences.filter(Boolean).map(d => <p key={d}><Check size={20} aria-hidden="true" />{d}</p>)}</div></div>}
            {section.id === 'gallery' && <><div className="es-section-heading"><h2>{beauty ? 'Texturas, tons e movimento.' : 'O detalhe faz o corte.'}</h2><p>{data.demo ? 'Inspirações de resultado. Fotos ilustrativas de banco.' : 'Um pouco do trabalho e do dia a dia da casa.'}</p></div><div className="es-gallery">{data.gallery.map((photo, i) => <figure className="es-photo" key={photo.src}><img src={photo.src} alt={photo.alt} loading="lazy" width="500" height="600" onError={imageError} /><figcaption>{data.demo ? beauty ? ['Cortes com movimento', 'Cor com naturalidade', 'Seu jeito de ser'][i % 3] : ['Precisão no acabamento', 'Cuidado com a barba', 'O corte em cada ângulo'][i % 3] : photo.alt}</figcaption></figure>)}</div></>}
            {section.id === 'team' && <><div className="es-section-heading"><h2>{beauty ? 'Mãos que cuidam. Gente que escuta.' : 'Conheça quem cuida do seu estilo.'}</h2><p>Escolha com quem você quer agendar.</p></div><div className="es-team">{data.team.map(person => <article key={person.id}>{person.image ? <div className="es-team-photo es-photo"><img src={person.image} alt={person.name} width="300" height="340" loading="lazy" onError={imageError} /></div> : <span className="es-monogram" aria-hidden="true">{person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>}<div><h3>{person.name}</h3>{person.bio && <p>{person.bio}</p>}<button className="es-text-button" onClick={() => openBooking({ professionalId: person.id })}>Agendar com {person.name.split(' ')[0]}<CalendarDays size={16} /></button></div></article>)}</div></>}
            {section.id === 'reviews' && <><div className="es-section-heading"><h2>{beauty ? 'Quem vem, se sente em casa.' : 'Quem sentou na cadeira conta.'}</h2><p>{data.rating && <strong>{data.rating.toFixed(1).replace('.', ',')} de 5 </strong>}{data.reviewCount} avaliações {data.demo ? 'fictícias, para demonstração' : 'de atendimentos verificados'}</p></div><div className="es-reviews">{data.reviews.filter(review => review.comment.trim()).map(review => <figure key={review.id}><div className="es-stars" aria-label={`${review.rating} de 5 estrelas`}>{Array.from({ length: review.rating }, (_, n) => <Star key={n} size={14} fill="currentColor" />)}</div><blockquote>“{review.comment}”</blockquote><figcaption><span className="es-review-avatar" aria-hidden="true">{(review.name || 'C')[0]}</span><span>{review.name || 'Cliente verificado'}<small>{data.demo ? 'Depoimento fictício' : 'Atendimento verificado'}</small></span></figcaption></figure>)}</div></>}
            {section.id === 'faq' && <div className="es-faq"><h2>Antes da sua visita.</h2><div>{config.faq.filter(f => f.question && f.answer).map(faq => <details key={faq.question}><summary>{faq.question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></div>}
            {section.id === 'location' && <div className="es-location"><div><h2>{beauty ? 'Seu momento tem endereço.' : 'A sua próxima parada.'}</h2><p className="es-address"><MapPin size={20} aria-hidden="true" />{data.address}</p>{data.demo ? <p className="es-caption">Endereço ilustrativo. Este estabelecimento é fictício.</p> : <a className="es-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`} target="_blank" rel="noreferrer">Como chegar</a>}{data.phone && <a className="es-text-button" href={buildWhatsAppLink(data.phone, data.region)} target="_blank" rel="noreferrer"><MessageCircle size={17} />Falar pelo WhatsApp</a>}{data.instagram && <a className="es-text-button" href={`https://www.instagram.com/${data.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">Ver nosso Instagram</a>}</div><div className="es-hours"><h3>Horários da casa</h3>{data.hours.map(h => <div key={h.day}><span>{h.day}</span><span>{h.hours}</span></div>)}<p>Atendimento com hora marcada.</p></div></div>}
          </div>
        </section>)}
        <section className="es-close"><div className="es-wrap"><Scissors size={30} strokeWidth={1.2} aria-hidden="true" /><h2>{beauty ? 'Um tempo para o seu cabelo.\nUm tempo para você.' : 'Seu próximo corte\ncomeça por aqui.'}</h2><p>{offerVisible ? config.offer.title : 'Escolha o serviço e encontre o melhor horário para você.'}</p>{primary()}</div></section>
      </>}
    </main>
    <footer className="es-footer es-wrap"><a className="es-footer-brand" href={home}>{data.name}</a><p>{data.demo ? 'Demonstração. Nenhum agendamento ou cobrança real.' : data.address}</p><div><a href="/#/privacidade">Privacidade</a><a href="/#/termos">Termos</a><span>Feito com AgendiX</span></div>{data.demo && <small>Fotos Pexels, ilustrativas. Créditos em /demo/CREDITS.md.</small>}</footer>
    {!preview && <div className="es-mobile-action"><div><strong>{service ? service.name : data.name}</strong><span>{service ? `${price(service.price)} · ${service.duration} min` : 'Escolha seu melhor horário'}</span></div>{primary('Agendar', service ? { serviceId: service.id } : {})}</div>}
    {notice && <p className="es-preview-notice" role="status" onClick={() => setNotice('')}>{notice}</p>}
    <dialog className="es-booking-dialog" ref={dialog} onCancel={() => setBooking(null)} onClose={() => setBooking(null)} aria-labelledby="es-booking-title"><div className="es-booking-header"><div><h2 id="es-booking-title">Seu horário na {data.name}</h2>{booking?.offer && <p>{config.offer.title} {config.offer.condition} A condição será conferida pela casa; o fluxo mostra o preço de tabela.</p>}{data.demo && <small>Simulação segura · dados fictícios · sem cobrança</small>}</div><button onClick={() => setBooking(null)} aria-label="Fechar agendamento"><X size={23} /></button></div>{booking && <iframe title="Agendamento do estabelecimento" src={bookingUrl} className="es-booking-frame" />}</dialog>
  </div>;
}
