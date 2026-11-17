export function isDemoMode(hash = typeof window === 'undefined' ? '' : window.location.hash): boolean {
  return /^#\/demo(?:\/|\?|$)/.test(hash);
}

export function getDemoNiche(): 'barber' | 'beauty' {
  return typeof window !== 'undefined' && /^#\/demo\/beauty(?:\/|\?|$)/.test(window.location.hash) ? 'beauty' : 'barber';
}

export const demoCompanyId = (niche = getDemoNiche()) => niche === 'beauty'
  ? 'd0000000-0000-4000-8000-000000000002'
  : 'd0000000-0000-4000-8000-000000000001';

export function demoPath(path: string, niche = getDemoNiche()): string {
  return path.startsWith('/') && !path.startsWith('/demo/') ? `/demo/${niche}${path}` : path;
}
