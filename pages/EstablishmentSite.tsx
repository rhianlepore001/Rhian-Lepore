import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SiteView } from '../components/establishment/SiteView';
import { getDemoSite } from '../lib/establishment/demos';
import { buildSeo, defaultConfig, serializeJsonLd, type SiteConfig, type SiteData } from '../lib/establishment/model';

export function EstablishmentSite() {
  const { slug = '', serviceId } = useParams();
  const [site, setSite] = useState<{ data: SiteData; config: SiteConfig } | null>(() => getDemoSite(slug));
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>(site ? 'ready' : 'loading');
  useEffect(() => {
    let active = true;
    const demo = getDemoSite(slug);
    setSite(demo);
    if (demo) { setStatus('ready'); return; }
    setStatus('loading');
    void import('../services/establishmentSite').then(m => m.loadSite(slug)).then(data => {
      if (!active) return;
      setSite(data ? { data, config: data.config || defaultConfig(data) } : null);
      setStatus(data ? 'ready' : 'missing');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [slug]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!site) return;
    const seo = buildSeo(site.data, site.config, window.location.origin);
    const currentService = site.data.services.find(s => s.id === serviceId);
    const previousTitle = document.title;
    document.title = currentService ? `${currentService.name} — ${site.data.name}` : seo.title;
    const cleanups: Array<() => void> = [];
    const meta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      const previous = element?.content;
      const created = !element;
      if (!element) { element = document.createElement('meta'); element.setAttribute(attr, name); document.head.append(element); }
      element.content = content;
      cleanups.push(() => { if (created) element?.remove(); else if (element) element.content = previous || ''; });
    };
    const ogImage = (!site.config.coverRemoved && (site.config.cover || site.data.cover)) || (!site.config.logoRemoved && (site.config.logo || site.data.logo));
    meta('description', seo.description); meta('og:title', document.title, true); meta('og:description', seo.description, true); meta('og:url', window.location.href, true); meta('og:type', 'website', true);
    meta('twitter:card', 'summary_large_image'); meta('twitter:title', document.title); meta('twitter:description', seo.description);
    if (ogImage) meta('og:image', new URL(ogImage, window.location.origin).href, true);
    if (site.data.demo) meta('robots', 'noindex, nofollow');
    const previousCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = `${window.location.origin}/s/${encodeURIComponent(slug)}${serviceId ? `/servico/${encodeURIComponent(serviceId)}` : ''}`;
    const previousHref = previousCanonical?.href;
    if (previousCanonical) previousCanonical.href = canonical.href;
    else document.head.append(canonical);
    const json = document.createElement('script'); json.type = 'application/ld+json'; json.textContent = serializeJsonLd(seo.jsonLd); document.head.append(json);
    return () => { document.title = previousTitle; json.remove(); cleanups.forEach(fn => fn()); if (previousCanonical) previousCanonical.href = previousHref || ''; else canonical.remove(); };
  }, [site, serviceId, slug]);
  if (status !== 'ready' || !site) return <div className="es-load" role="status"><h1>{status === 'loading' ? 'Preparando sua visita…' : status === 'error' ? 'Não foi possível abrir o site.' : 'Este site ainda não está disponível.'}</h1>{status === 'error' && <button onClick={() => window.location.reload()}>Tentar novamente</button>}{status === 'missing' && <a href={`/#/book/${encodeURIComponent(slug)}`}>Ir para o agendamento</a>}</div>;
  return <SiteView data={site.data} config={site.config} serviceId={serviceId} />;
}
