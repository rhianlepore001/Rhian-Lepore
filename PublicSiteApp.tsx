import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import './styles/establishment-entry.css';

const Site = lazy(() => import('./pages/EstablishmentSite').then(m => ({ default: m.EstablishmentSite })));
const Editor = lazy(() => import('./pages/SiteDemoEditor').then(m => ({ default: m.SiteDemoEditor })));
const Preview = lazy(() => import('./pages/SitePreview').then(m => ({ default: m.SitePreview })));

export default function PublicSiteApp() {
  const clean = window.location.pathname.startsWith('/s/');
  const Router = clean ? BrowserRouter : HashRouter;
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.establishment = html.dataset.establishment || 'dark';
    const disabled = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter(link => /tokens\.css|fonts\.googleapis|fonts\.gstatic/.test(link.href));
    disabled.forEach(link => { link.disabled = true; });
    return () => {
      delete html.dataset.establishment;
      html.style.removeProperty('--es-page');
      disabled.forEach(link => { link.disabled = false; });
    };
  }, []);
  return <Router><Suspense fallback={<div className="es-load" role="status">Preparando sua visita…</div>}><Routes>
    <Route path="/site/:slug" element={<Site />} />
    <Route path="/site/:slug/servico/:serviceId" element={<Site />} />
    <Route path="/s/:slug" element={<Site />} />
    <Route path="/s/:slug/servico/:serviceId" element={<Site />} />
    <Route path="/site-demo/editor/:niche" element={<Editor />} />
    <Route path="/site-preview" element={<Preview />} />
  </Routes></Suspense></Router>;
}
