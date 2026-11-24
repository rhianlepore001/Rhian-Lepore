import React, { useEffect, useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SiteEditor } from '../../components/establishment/SiteEditor';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileFields } from '../../hooks/useSettings';
import { loadSite } from '../../services/establishmentSite';
import { defaultConfig, type SiteData } from '../../lib/establishment/model';

export function SiteSettings() {
  const { companyId } = useAuth();
  const { data: profile, isLoading } = useProfileFields();
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    if (profile?.business_slug) void loadSite(profile.business_slug, { preview: true }).then(value => { if (active) { setData(value); setError(!value); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [profile?.business_slug, companyId]);
  return <SettingsLayout>{data && companyId ? <SiteEditor key={companyId} data={data} initial={data.config || defaultConfig(data)} companyId={companyId} embedded /> : <div className="es-load"><h1>Meu site</h1><p>{error ? 'Não foi possível carregar o cadastro. Tente abrir esta página novamente.' : isLoading || profile?.business_slug ? 'Preparando seu site com o cadastro da casa…' : 'Defina o endereço de agendamento em Ajustes → Geral para pré-visualizar seu site.'}</p></div>}</SettingsLayout>;
}
