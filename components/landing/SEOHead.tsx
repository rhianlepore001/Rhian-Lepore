import { useEffect, type FC } from 'react';
import type { LandingNiche } from '../../hooks/useNiche';
import { FAQ_CONTENT, TRAIL_CONTENT } from './content';

interface SEOHeadProps {
  niche: LandingNiche | null;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export const SEOHead: FC<SEOHeadProps> = ({ niche }) => {
  useEffect(() => {
    const content = niche ? TRAIL_CONTENT[niche] : null;
    const title = content ? `AgendiX para ${content.publicLabel} — gestão sem planilha` : 'AgendiX — Gestão para quem faz acontecer';
    const description = content
      ? `${content.headline} ${content.description}`
      : 'Agenda, equipe, fila e caixa em um fluxo simples para barbearias e salões.';
    const canonicalUrl = new URL('/', window.location.origin).toString();
    const faqItems = Object.values(FAQ_CONTENT).flat();
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'AgendiX',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: canonicalUrl,
          description,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'BRL',
            description: '20 dias de teste grátis, sem cartão.',
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        },
      ],
    };

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', new URL('/logo-agendix-app.png', window.location.origin).toString());
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let jsonLd = document.getElementById('agendix-landing-jsonld') as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'agendix-landing-jsonld';
      jsonLd.type = 'application/ld+json';
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);
  }, [niche]);

  return null;
};
