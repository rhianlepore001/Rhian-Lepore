import { supabase } from '@/lib/supabase';
import { loadSiteDraft, saveSiteDraft, siteDraftKey } from '@/lib/establishment/draft';
import { defaultConfig, isReservedSiteSlug, normalizeSiteConfig, safeImageUrl, sanitizePublicData, type SiteConfig, type SiteData } from '@/lib/establishment/model';

export { loadSiteDraft, saveSiteDraft };

export async function loadSite(slug: string, options: { preview?: boolean } = {}): Promise<SiteData | null> {
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(slug) || (!options.preview && isReservedSiteSlug(slug))) return null;
  let publishedConfig: unknown;
  if (!options.preview) {
    const published = await supabase.rpc('get_public_establishment_site', { p_slug: slug });
    if (published.error) {
      if (published.error.code === 'PGRST202' || published.error.code === '42883') return null;
      throw published.error;
    }
    if (!published.data) return null;
    publishedConfig = published.data.config;
  }
  const profileResult = await supabase.rpc('get_public_profile_by_slug', { p_slug: slug });
  if (profileResult.error) throw profileResult.error;
  const profile = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;
  if (!profile?.id) return null;
  const businessId = profile.id;
  const results = await Promise.allSettled([
    supabase.rpc('get_public_business_settings_json', { p_business_id: businessId }),
    supabase.rpc('get_public_services_catalog', { p_business_id: businessId }),
    supabase.rpc('get_public_categories_catalog', { p_business_id: businessId }),
    supabase.rpc('get_public_team_catalog', { p_business_id: businessId }),
    supabase.rpc('get_public_gallery_catalog', { p_business_id: businessId }),
    supabase.rpc('get_public_customer_reviews', { p_business_id: businessId, p_offset: 0 }),
    supabase.rpc('get_public_membership_plans', { p_business_id: businessId }),
  ]);
  const publicValue = (index: number) => {
    const result = results[index];
    return result.status === 'fulfilled' && !result.value.error ? result.value.data : undefined;
  };
  const data = sanitizePublicData({ profile, settings: publicValue(0), services: publicValue(1), categories: publicValue(2), team: publicValue(3), gallery: publicValue(4), reviews: publicValue(5), clubPlans: publicValue(6) });
  return { ...data, config: publishedConfig ? normalizeSiteConfig(publishedConfig, defaultConfig(data)) : undefined };
}

export interface OwnerSiteDraft {
  config: SiteConfig;
  storage: 'local' | 'remote';
  published: boolean;
  presenceEnabled: boolean;
  publishedLogo?: string;
}

function missingSiteTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function activePublishedLogo(publishedConfig: unknown, fallbackLogo?: string): string | undefined {
  if (!publishedConfig || typeof publishedConfig !== 'object' || Array.isArray(publishedConfig)) {
    return safeImageUrl(fallbackLogo);
  }
  const record = publishedConfig as Record<string, unknown>;
  if (record.logoRemoved === true) return undefined;
  return safeImageUrl(record.logo) || safeImageUrl(fallbackLogo);
}

export async function loadOwnerSite(companyId: string, fallback: SiteConfig): Promise<OwnerSiteDraft> {
  siteDraftKey(companyId);
  const { data, error } = await supabase
    .from('establishment_sites')
    .select('draft_config,published_config,published,presence_enabled')
    .eq('company_id', companyId)
    .maybeSingle();
  if (missingSiteTable(error)) return { config: loadSiteDraft(companyId, fallback), storage: 'local', published: false, presenceEnabled: false };
  if (error) throw error;
  if (!data) return { config: loadSiteDraft(companyId, fallback), storage: 'remote', published: false, presenceEnabled: false };
  const published = data.published === true;
  return {
    config: normalizeSiteConfig(data.draft_config, fallback),
    storage: 'remote',
    published,
    presenceEnabled: data.presence_enabled === true,
    publishedLogo: published ? activePublishedLogo(data.published_config, fallback.logo) : undefined,
  };
}

export async function saveOwnerSiteDraft(companyId: string, config: SiteConfig): Promise<{ storage: 'local' | 'remote' }> {
  siteDraftKey(companyId);
  const existing = await supabase.from('establishment_sites').update({ draft_config: config }).eq('company_id', companyId).select('company_id').maybeSingle();
  if (missingSiteTable(existing.error)) {
    saveSiteDraft(companyId, config);
    return { storage: 'local' };
  }
  if (existing.error) throw existing.error;
  if (!existing.data) {
    const inserted = await supabase.from('establishment_sites').insert({ company_id: companyId, draft_config: config }).select('company_id').single();
    if (inserted.error?.code === '23505') {
      const retry = await supabase.from('establishment_sites').update({ draft_config: config }).eq('company_id', companyId).select('company_id').single();
      if (retry.error) throw retry.error;
    } else if (inserted.error) throw inserted.error;
  }
  saveSiteDraft(companyId, config);
  return { storage: 'remote' };
}

export interface PublicationResult {
  published: boolean;
  sharePageSynced: boolean;
}

export async function publishOwnerSite(companyId: string, config: SiteConfig): Promise<PublicationResult> {
  siteDraftKey(companyId);
  const existing = await supabase
    .from('establishment_sites')
    .update({ draft_config: config, published_config: config, published: true })
    .eq('company_id', companyId)
    .select('company_id')
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) {
    const inserted = await supabase
      .from('establishment_sites')
      .insert({ company_id: companyId, draft_config: config })
      .select('company_id')
      .single();
    if (inserted.error) throw inserted.error;
    const retry = await supabase
      .from('establishment_sites')
      .update({ draft_config: config, published_config: config, published: true })
      .eq('company_id', companyId)
      .select('company_id')
      .single();
    if (retry.error) throw retry.error;
    if (!retry.data) throw new Error('O site não foi publicado. Confira a liberação do plano Presença.');
  }
  saveSiteDraft(companyId, config);
  const rawAddress = config.contact?.address?.replace(/<[^>]*>/g, '');
  const publishedAddress = rawAddress
    ? Array.from(rawAddress)
        .filter(char => {
          const code = char.charCodeAt(0);
          return code > 31 && code !== 127;
        })
        .join('')
        .trim()
        .slice(0, 300)
    : undefined;
  if (publishedAddress) {
    try {
      await supabase
        .from('profiles')
        .update({ address_street: publishedAddress })
        .eq('id', companyId);
    } catch {
      // Sincronização secundária do cadastro geral não deve impedir a publicação do site
    }
  }
  let sharePageSynced = true;
  if (supabase.functions?.invoke) {
    const refreshed = await Promise.resolve(
      supabase.functions.invoke('publish-establishment-site', { body: { action: 'publish' } }),
    ).catch(() => ({ error: true }));
    if (refreshed?.error) sharePageSynced = false;
  }
  return { published: true, sharePageSynced };
}

export async function unpublishOwnerSite(companyId: string): Promise<PublicationResult> {
  siteDraftKey(companyId);
  const { data, error } = await supabase.from('establishment_sites').update({ published: false }).eq('company_id', companyId).select('company_id').single();
  if (error) throw error;
  if (!data) throw new Error('Não foi possível despublicar o site. Tente novamente.');
  let sharePageSynced = true;
  if (supabase.functions?.invoke) {
    const refreshed = await Promise.resolve(
      supabase.functions.invoke('publish-establishment-site', { body: { action: 'unpublish' } }),
    ).catch(() => ({ error: true }));
    if (refreshed?.error) sharePageSynced = false;
  }
  return { published: false, sharePageSynced };
}
