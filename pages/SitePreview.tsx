import React, { useEffect, useState } from 'react';
import { SiteView } from '../components/establishment/SiteView';
import { normalizeSiteConfig, type SiteConfig, type SiteData } from '../lib/establishment/model';
import { getDemoSite } from '../lib/establishment/demos';

export function SitePreview() {
  const [site, setSite] = useState<{ data: SiteData; config: SiteConfig } | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || window.parent === window) return;
      if (event.data?.type !== 'agendix:site-preview' || !event.data.data?.services || !event.data.config) return;
      const fallback = getDemoSite('demo-corte-fino')!.config;
      setSite({ data: event.data.data, config: normalizeSiteConfig(event.data.config, fallback) });
    };
    window.addEventListener('message', receive);
    if (window.parent !== window) window.parent.postMessage({ type: 'agendix:site-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.append(meta);
    return () => meta.remove();
  }, []);
  return site ? <SiteView data={site.data} config={site.config} preview /> : <p className="es-load">A prévia aparece enquanto você personaliza o site.</p>;
}
