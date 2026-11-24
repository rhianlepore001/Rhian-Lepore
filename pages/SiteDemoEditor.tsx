import React from 'react';
import { useParams } from 'react-router-dom';
import { SiteEditor } from '../components/establishment/SiteEditor';
import { getDemoSite } from '../lib/establishment/demos';

export function SiteDemoEditor() {
  const { niche } = useParams();
  const site = getDemoSite(niche === 'beauty' ? 'demo-studio-aurora' : 'demo-corte-fino')!;
  return <SiteEditor key={site.data.id} data={site.data} initial={site.config} companyId={site.data.id} demo />;
}
