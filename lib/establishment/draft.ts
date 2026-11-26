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

export function staleLogosKey(companyId: string): string {
  if (!companyId.trim()) throw new Error('A empresa é necessária para salvar o rascunho.');
  return `agendix:presence:stale-logos:v1:${encodeURIComponent(companyId)}`;
}

export function loadStaleLogos(companyId: string): string[] {
  try {
    const stored = localStorage.getItem(staleLogosKey(companyId));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
      : [];
  } catch {
    return [];
  }
}

export function saveStaleLogos(companyId: string, urls: string[]): void {
  const key = staleLogosKey(companyId);
  const clean = Array.from(new Set(urls.map(item => item.trim()).filter(Boolean)));
  if (!clean.length) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(clean));
}
