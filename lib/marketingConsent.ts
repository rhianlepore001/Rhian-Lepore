export const CONSENT_KEY = 'agendix:marketing-consent:v1';
const CHANGE_EVENT = 'agendix:marketing-consent-change';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export type ConsentChoice = 'accepted' | 'rejected';

export function readConsent(): ConsentChoice | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
    if (value?.version !== 1 || !['accepted', 'rejected'].includes(value.choice)) return null;
    const age = Date.now() - value.savedAt;
    return Number.isFinite(age) && age >= 0 && age < MAX_AGE ? value.choice : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, choice, savedAt: Date.now() }));
  } catch {
    return;
  } finally {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function clearMetaCookies(): void {
  const domains = window.location.hostname.split('.');
  for (const name of ['_fbp', '_fbc']) {
    document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
    for (let i = 0; i < domains.length - 1; i += 1) {
      document.cookie = name + '=; Max-Age=0; path=/; domain=.' + domains.slice(i).join('.') + '; SameSite=Lax';
    }
  }
}
