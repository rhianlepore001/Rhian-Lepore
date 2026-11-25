import { normalizeSiteConfig, type SiteConfig } from './model';

export function siteDraftKey(companyId: string): string {
  if (!companyId.trim()) throw new Error('A empresa é necessária para salvar o rascunho.');
  return `agendix:presence:draft:v1:${encodeURIComponent(companyId)}`;
}

export function loadSiteDraft(companyId: string, fallback: SiteConfig): SiteConfig {
  try {
    const stored = localStorage.getItem(siteDraftKey(companyId));
    return stored ? normalizeSiteConfig(JSON.parse(stored), fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function saveSiteDraft(companyId: string, config: SiteConfig): void {
  localStorage.setItem(siteDraftKey(companyId), JSON.stringify(config));
}
