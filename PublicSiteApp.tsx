import React, { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

const Site = lazy(() => import('./pages/EstablishmentSite').then(m => ({ default: m.EstablishmentSite })));
const Editor = lazy(() => import('./pages/SiteDemoEditor').then(m => ({ default: m.SiteDemoEditor })));
const Preview = lazy(() => import('./pages/SitePreview').then(m => ({ default: m.SitePreview })));

export default function PublicSiteApp() {
  const clean = window.location.pathname.startsWith('/s/');
  const Router = clean ? BrowserRouter : HashRouter;
  return <Router><Suspense fallback={<div className="es-load" role="status">Preparando sua visita…</div>}><Routes>
    <Route path="/site/:slug" element={<Site />} />
    <Route path="/site/:slug/servico/:serviceId" element={<Site />} />
    <Route path="/s/:slug" element={<Site />} />
    <Route path="/s/:slug/servico/:serviceId" element={<Site />} />
    <Route path="/site-demo/editor/:niche" element={<Editor />} />
    <Route path="/site-preview" element={<Preview />} />
  </Routes></Suspense></Router>;
}
