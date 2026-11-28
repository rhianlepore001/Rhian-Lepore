import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe,
  Lock,
  MessageCircle,
  Monitor,
  Scissors,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
} from 'lucide-react';
import { getDemoSite } from '../../lib/establishment/demos';
import { formatPrice, photoObjectPosition } from '../../lib/establishment/model';
import { BeforeAfterComparator } from '../establishment/BeforeAfterComparator';
import { trackLandingCta } from '../../hooks/useMetaEngagement';

type Niche = 'barber' | 'beauty';
type ChapterId = 'hero' | 'services' | 'beforeAfter' | 'discovery';
type PreviewViewport = 'desktop' | 'mobile';

export interface LandingPresencaShowcaseProps {
  niche: Niche;
  onNicheChange: (niche: Niche) => void;
  signupHref: string;
  trackingNiche: Niche;
}

const CHAPTERS: ReadonlyArray<{ id: ChapterId; index: string; label: string; hash: string }> = [
  { id: 'hero', index: '01', label: 'Capa e oferta', hash: '' },
  { id: 'services', index: '02', label: 'Serviços', hash: '#servicos' },
  { id: 'beforeAfter', index: '03', label: 'Antes e depois', hash: '#antes-depois' },
  { id: 'discovery', index: '04', label: 'Google e WhatsApp', hash: '' },
];

const PILLARS = [
  {
    index: '01',
    title: 'Zero manutenção dupla',
    text: 'Mudou um serviço, preço ou horário no AgendiX, o seu site atualiza junto automaticamente.',
  },
  {
    index: '02',
    title: 'Aparece melhor no Google',
    text: 'Endereço limpo, bairro, horários e serviços estruturados para quem procura barbearia ou salão na sua região.',
  },
  {
    index: '03',
    title: 'Sua marca no WhatsApp e na bio',
    text: 'Ao compartilhar o link, a prévia mostra a capa e o nome do seu espaço — não uma página genérica.',
  },
  {
    index: '04',
    title: 'Agendamento sem sair do site',
    text: 'Quem chega pelo Google ou pelo Instagram conhece seu trabalho, vê valores e escolhe o horário ali mesmo.',
  },
] as const;

const EDITORIAL_SERVICE_PHOTOS: Record<Niche, readonly string[]> = {
  barber: [
    '/presenca/rhian/barber-fade.webp',
    '/demo/barbearia/galeria-07.webp',
    '/demo/barbearia/servico-barba.webp',
  ],
  beauty: [
    '/presenca/rhian/salon-balayage.webp',
    '/presenca/rhian/salon-after.webp',
    '/demo/salao/galeria-03.webp',
  ],
};

const EDITORIAL_TEAM_PHOTOS: Record<Niche, readonly string[]> = {
  barber: [
    '/presenca/rhian/barber-portrait.webp',
    '/presenca/rhian/barber-fade.webp',
    '/demo/barbearia/servico-barba.webp',
  ],
  beauty: [
    '/presenca/rhian/salon-balayage.webp',
    '/demo/salao/galeria-03.webp',
    '/presenca/rhian/salon-after.webp',
  ],
};

const SAFE_DIFFERENCES: Record<Niche, readonly string[]> = {
  barber: [
    'Atendimento rigorosamente no horário marcado — sem fila de espera.',
    'Lâminas descartáveis e toalhas esterilizadas a cada cliente.',
  ],
  beauty: [
    'Orçamento transparente apresentado antes de iniciar qualquer coloração.',
    'Consulta de 10 minutos antes de qualquer tesoura ou química.',
  ],
};

export const LandingPresencaShowcase: React.FC<LandingPresencaShowcaseProps> = ({
  niche,
  onNicheChange,
  signupHref,
  trackingNiche,
}) => {
  const [chapter, setChapter] = useState<ChapterId>('hero');
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [selectedServiceByNiche, setSelectedServiceByNiche] = useState<Record<Niche, number>>({
    barber: 1,
    beauty: 0,
  });

  const demoSlug = niche === 'beauty' ? 'demo-studio-aurora' : 'demo-corte-fino';
  const publicSlug = niche === 'beauty' ? 'studio-aurora' : 'corte-fino';
  const siteHref = `/#/site/${demoSlug}`;
  const editorHref = `/#/site-demo/editor/${niche}`;

  const site = useMemo(() => getDemoSite(demoSlug)!, [demoSlug]);
  const { data, config } = site;

  const activeChapterMeta = CHAPTERS.find(item => item.id === chapter) ?? CHAPTERS[0];
  const displayUrl = `agendixstudio.com/s/${publicSlug}${activeChapterMeta.hash}`;
  const kindLabel = niche === 'beauty' ? 'Salão de beleza' : 'Barbearia';
  const heroLocation = 'em Pinheiros, São Paulo';
  const selectedIndex = Math.min(selectedServiceByNiche[niche], Math.max(0, data.services.length - 1));
  const selectedService = data.services[selectedIndex] ?? data.services[0];
  const beforeAfter = config.beforeAfter[0];
  const featuredReview = data.reviews[0];
  const coverSrc = config.cover || data.cover || '';
  const logoSrc = data.logo || '';
  const servicePhotos = EDITORIAL_SERVICE_PHOTOS[niche];
  const teamPhotos = EDITORIAL_TEAM_PHOTOS[niche];

  return (
    <section
      id="presenca"
      className="landing-presenca"
      data-niche={niche}
      data-meta-section="presenca"
      aria-labelledby="landing-presenca-title"
      tabIndex={-1}
    >
      <div className="lp-pr-ambient" aria-hidden="true">
        <div className="lp-pr-ambient-layer lp-pr-ambient-barber" />
        <div className="lp-pr-ambient-layer lp-pr-ambient-beauty" />
      </div>

      <div className="landing-wrap wrap">
        <div className="lp-pr-head">
          <div>
            <p className="lp-pr-eyebrow">Site Presença</p>
            <h2 id="landing-presenca-title">
              Seu site próprio.
              <span>Pronto com o que você já cadastrou.</span>
            </h2>
          </div>
          <p className="lp-pr-lead">
            Serviços, preços, equipe, fotos e avaliações viram uma página com a cara da sua marca — pronta para receber clientes do Google e do Instagram e agendar sem sair do site.
          </p>
        </div>

        <div className="lp-pr-toolbar">
          <div className="landing-business-selector" role="group" aria-label="Negócio da prévia do site">
            <button type="button" aria-pressed={niche === 'barber'} onClick={() => onNicheChange('barber')}>
              <Scissors size={16} aria-hidden="true" /> Barbearia
            </button>
            <button type="button" aria-pressed={niche === 'beauty'} onClick={() => onNicheChange('beauty')}>
              <Sparkles size={16} aria-hidden="true" /> Salão de beleza
            </button>
          </div>

          <div className="lp-pr-viewport-toggle" role="group" aria-label="Formato da prévia do site">
            <button type="button" aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}>
              <Monitor size={15} aria-hidden="true" /> Computador
            </button>
            <button type="button" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}>
              <Smartphone size={15} aria-hidden="true" /> Celular
            </button>
          </div>
        </div>

        <div className="lp-pr-stage-outer">
          <div className="lp-pr-device" data-viewport={viewport}>
            <div className="lp-pr-device-inner">
              {viewport === 'desktop' ? (
                <div className="lp-pr-chrome" aria-hidden="true">
                  <div className="lp-pr-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="lp-pr-url">
                    <Lock size={12} />
                    <span>{displayUrl}</span>
                  </div>
                  <div />
                </div>
              ) : (
                <div className="lp-pr-phonebar" aria-hidden="true">
                  <span>9:41</span>
                  <span className="lp-pr-phone-island"><span /></span>
                  <span className="lp-pr-phone-url-mini">/s/{publicSlug}</span>
                </div>
              )}

              <div className="lp-site-canvas" data-niche={niche}>
                <div className="lp-site-header">
                  <div className="lp-site-brand">
                    {logoSrc && <img src={logoSrc} alt="" width="30" height="30" decoding="async" loading="lazy" />}
                    <strong>{data.name}</strong>
                  </div>

                  <div className="lp-site-nav-mock" role="group" aria-label="Navegação interna da prévia">
                    <button type="button" aria-current={chapter === 'hero' ? 'true' : undefined} onClick={() => setChapter('hero')}>
                      Capa
                    </button>
                    <button type="button" aria-current={chapter === 'services' ? 'true' : undefined} onClick={() => setChapter('services')}>
                      Serviços
                    </button>
                    <button type="button" aria-current={chapter === 'beforeAfter' ? 'true' : undefined} onClick={() => setChapter('beforeAfter')}>
                      Resultados
                    </button>
                    <button type="button" aria-current={chapter === 'discovery' ? 'true' : undefined} onClick={() => setChapter('discovery')}>
                      Google e link
                    </button>
                  </div>

                  <button type="button" className="lp-site-cta-pill" onClick={() => setChapter('services')}>
                    Agendar agora
                  </button>
                </div>

                {chapter === 'hero' && (
                  <div key={`hero-${niche}`} className="lp-pr-scene">
                    <div className="lp-scene-hero-photo">
                      <img
                        src={coverSrc}
                        alt={`Foto ilustrativa do espaço de exemplo ${data.name}`}
                        style={{ objectPosition: photoObjectPosition(config) }}
                        width="1600"
                        height="900"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="lp-scene-hero-body">
                      <div>
                        <p className="lp-scene-hero-headline">{config.headline}</p>
                        <p className="lp-scene-hero-kicker">
                          {kindLabel} {heroLocation}
                        </p>
                        <p className="lp-scene-hero-about">{config.about}</p>
                      </div>

                      <div className="lp-scene-hero-meta">
                        <div className="lp-scene-hero-actions">
                          <button type="button" className="lp-site-cta-pill" onClick={() => setChapter('services')}>
                            Agendar agora <ArrowRight size={15} aria-hidden="true" />
                          </button>
                          <button type="button" className="lp-site-cta-ghost" onClick={() => setChapter('discovery')}>
                            Ver no Google
                          </button>
                        </div>

                        {config.offer.enabled && (
                          <p className="lp-scene-offer">
                            <span className="lp-scene-offer-tag">1ª visita</span>
                            <strong>{config.offer.title}</strong>
                          </p>
                        )}

                        <div className="lp-scene-trust">
                          <strong>
                            <Star size={13} fill="currentColor" aria-hidden="true" />
                            {(data.rating ?? 4.9).toFixed(1).replace('.', ',')} · {data.reviewCount} avaliações
                          </strong>
                          <span aria-hidden="true">|</span>
                          <span>
                            <span className="lp-scene-open-dot" aria-hidden="true" />
                            Aberto hoje: {data.hours[0]?.hours}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {chapter === 'services' && (
                  <div key={`services-${niche}`} className="lp-pr-scene lp-scene-services">
                    <div className="lp-scene-services-top">
                      <div className="lp-scene-services-list" role="group" aria-label={`Serviços de exemplo em ${data.name}`}>
                        {data.services.map((service, index) => (
                          <button
                            type="button"
                            key={service.id}
                            className="lp-scene-service-btn"
                            aria-pressed={selectedIndex === index}
                            onClick={() => setSelectedServiceByNiche(prev => ({ ...prev, [niche]: index }))}
                          >
                            <span className="lp-scene-service-thumb">
                              <img
                                src={servicePhotos[index] ?? service.image ?? coverSrc}
                                alt=""
                                width="144"
                                height="144"
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                            <span className="lp-scene-service-info">
                              {service.category && <span className="lp-scene-service-cat">{service.category}</span>}
                              <span className="lp-scene-service-name">{service.name}</span>
                              <span className="lp-scene-service-price">
                                <strong>
                                  {service.priceFrom ? 'A partir de ' : ''}
                                  {formatPrice(service.price, data.region)}
                                </strong>{' '}
                                · {service.duration} min
                              </span>
                            </span>
                            <ArrowRight size={16} aria-hidden="true" />
                          </button>
                        ))}
                      </div>

                      {selectedService && (
                        <div className="lp-scene-service-detail" aria-live="polite">
                          <div>
                            <p className="lp-scene-service-detail-kicker">Página do serviço</p>
                            <p className="lp-scene-service-detail-title">{selectedService.name}</p>
                            {selectedService.description && (
                              <p className="lp-scene-service-detail-desc">{selectedService.description}</p>
                            )}
                            {selectedService.includes.length > 0 && (
                              <ul className="lp-scene-includes">
                                {selectedService.includes.map(item => (
                                  <li key={item}>
                                    <Check size={14} aria-hidden="true" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="lp-scene-detail-foot">
                            <p className="lp-scene-detail-price">
                              {selectedService.priceFrom ? 'A partir de ' : ''}
                              {formatPrice(selectedService.price, data.region)}{' '}
                              <span>· {selectedService.duration} min</span>
                            </p>
                            <a className="lp-site-cta-pill" href={siteHref} target="_blank" rel="noopener noreferrer">
                              Abrir agendamento <ArrowUpRight size={14} aria-hidden="true" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lp-scene-team">
                      <div className="lp-scene-team-head">
                        <strong>Equipe da casa</strong>
                        <span>O cliente escolhe com quem quer agendar</span>
                      </div>
                      <div className="lp-scene-team-grid">
                        {data.team.slice(0, 3).map((member, index) => (
                          <div key={member.id} className="lp-scene-member">
                            <img
                              src={teamPhotos[index] ?? member.image ?? coverSrc}
                              alt={`Foto ilustrativa de ${member.name}`}
                              width="84"
                              height="84"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="lp-scene-member-copy">
                              <strong>{member.name}</strong>
                              <span>{member.bio}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {chapter === 'beforeAfter' && beforeAfter && (
                  <div key={`before-${niche}`} className="lp-pr-scene lp-scene-before">
                    <BeforeAfterComparator
                      key={`${niche}-comparator`}
                      before={beforeAfter.before}
                      after={beforeAfter.after}
                      caption={beforeAfter.caption}
                      showCaption
                    />
                    <div className="lp-scene-before-aside">
                      <div>
                        <p className="lp-scene-before-title">Resultado real, antes de marcar.</p>
                        <p className="lp-scene-before-hint">
                          Arraste o divisor para testar o comparador que seus clientes veem direto no seu site.
                        </p>
                      </div>

                      {featuredReview && (
                        <figure className="lp-scene-review-card">
                          <div className="lp-scene-review-stars" aria-label="5 de 5 estrelas">
                            {Array.from({ length: 5 }, (_, idx) => (
                              <Star key={idx} size={13} fill="currentColor" aria-hidden="true" />
                            ))}
                          </div>
                          <blockquote>“{featuredReview.comment}”</blockquote>
                          <figcaption>{featuredReview.name} · Depoimento ilustrativo</figcaption>
                        </figure>
                      )}

                      <ul className="lp-scene-diffs">
                        {SAFE_DIFFERENCES[niche].map(diff => (
                          <li key={diff}>
                            <Check size={15} aria-hidden="true" />
                            <span>{diff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {chapter === 'discovery' && (
                  <div key={`discovery-${niche}`} className="lp-pr-scene lp-scene-discovery">
                    <div className="lp-discovery-card">
                      <span className="lp-discovery-label">
                        <Globe size={14} aria-hidden="true" /> Busca local no Google
                      </span>
                      <div className="lp-google-result">
                        <div className="lp-google-site">
                          <span className="lp-google-favicon">
                            {logoSrc && <img src={logoSrc} alt="" width="20" height="20" loading="lazy" decoding="async" />}
                          </span>
                          <div>
                            <span className="lp-google-site-name">{data.name}</span>
                            <span className="lp-google-cite">agendixstudio.com › s › {publicSlug}</span>
                          </div>
                        </div>
                        <p className="lp-google-title">
                          {data.name} — {kindLabel} em Pinheiros, São Paulo
                        </p>
                        <p className="lp-google-desc">
                          {config.about} Serviços com preço transparente, equipe e agendamento online sem baixar aplicativo.
                        </p>
                        <div className="lp-google-sitelinks">
                          {data.services.slice(0, 2).map(service => (
                            <span key={service.id}>
                              {service.name} · {formatPrice(service.price, data.region)}
                            </span>
                          ))}
                          <span>Agendar horário</span>
                        </div>
                      </div>
                      <p className="lp-discovery-note">
                        Cada casa e cada serviço ganham endereço próprio e dados organizados para aparecer melhor nas buscas do bairro.
                      </p>
                    </div>

                    <div className="lp-discovery-card">
                      <span className="lp-discovery-label">
                        <MessageCircle size={14} aria-hidden="true" /> Link no WhatsApp e Instagram
                      </span>
                      <div className="lp-share-chat">
                        <p className="lp-share-bubble-in">Manda o site de vocês pra eu ver os valores e horários?</p>
                        <div className="lp-share-og">
                          <div className="lp-share-og-photo">
                            <img
                              src={coverSrc}
                              alt={`Prévia de compartilhamento de ${data.name}`}
                              style={{ objectPosition: photoObjectPosition(config) }}
                              width="800"
                              height="450"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="lp-share-og-body">
                            <span className="lp-share-og-domain">agendixstudio.com/s/{publicSlug}</span>
                            <strong className="lp-share-og-title">
                              {data.name} · {kindLabel} em Pinheiros
                            </strong>
                            <p>{config.headline}</p>
                          </div>
                        </div>
                      </div>
                      <p className="lp-discovery-note">
                        Na bio do Instagram, no WhatsApp ou no QR Code do balcão, quem abre vê a foto e a marca da sua casa.
                      </p>
                    </div>
                  </div>
                )}

                {viewport === 'mobile' && (
                  <div className="lp-site-mobile-sticky">
                    <div className="lp-site-mobile-sticky-meta">
                      <strong>{data.name}</strong>
                      <span>{data.hours[0]?.hours} · Pinheiros</span>
                    </div>
                    <a className="lp-site-cta-pill" href={siteHref} target="_blank" rel="noopener noreferrer">
                      Agendar agora
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lp-pr-dock-wrap">
          <div className="lp-pr-chapters" role="group" aria-label="O que o cliente vê no Site Presença">
            {CHAPTERS.map(item => (
              <button
                type="button"
                key={item.id}
                className="lp-pr-chapter-btn"
                aria-pressed={chapter === item.id}
                onClick={() => setChapter(item.id)}
              >
                <span className="lp-pr-chapter-index">{item.index}</span>
                <span className="lp-pr-chapter-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="lp-pr-stage-bar">
            <p className="lp-pr-caption">Site de exemplo · {data.name} · Dados fictícios</p>
            <div className="lp-pr-stage-actions">
              <a
                className="landing-button landing-button-light"
                href={siteHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver site completo <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <a
                className="landing-text-link"
                href={editorHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SlidersHorizontal size={15} aria-hidden="true" /> Testar o editor do site
              </a>
            </div>
          </div>
        </div>

        <ol className="lp-pr-pillars">
          {PILLARS.map(pillar => (
            <li key={pillar.index}>
              <span className="lp-pr-pillar-num" aria-hidden="true">{pillar.index}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </li>
          ))}
        </ol>

        <div className="lp-pr-conversion">
          <p>Quer ver como fica com o nome, as fotos e os serviços do seu espaço?</p>
          <a
            className="landing-text-link"
            href={signupHref}
            onClick={() => trackLandingCta('free_trial_presenca', trackingNiche, 'meio')}
          >
            Crie sua conta grátis <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};
