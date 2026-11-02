import { useEffect, useSyncExternalStore } from 'react';
import { metaTracker } from '../lib/metaTracking';
import { splitFullName } from '../lib/metaMatching';
import { readConsent, subscribeConsent } from '../lib/marketingConsent';

// Disparos passivos de engajamento (Meta). Nenhum hook altera a tela, o formulário ou a
// navegação: só observam. Tudo é descartado pelo tracker sem consentimento, fora da rota
// permitida ou depois do primeiro disparo da visita.

const SCROLL_THRESHOLD = 0.75;
const DWELL_SECONDS = 30;

/** Landing (/login): ViewContent do nicho, 75% de rolagem e 30 s de permanência. */
export function useMetaLandingEngagement(niche: string | null): void {
  // Reavalia quando o consentimento muda (quem aceita o banner depois de escolher o nicho).
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);

  useEffect(() => {
    if (consent === 'accepted' && niche) metaTracker.viewContent(niche);
  }, [consent, niche]);

  useEffect(() => {
    if (consent !== 'accepted') return undefined;
    let done = false;
    const onScroll = () => {
      if (done) return;
      const root = document.scrollingElement || document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if ((root.scrollTop + window.innerHeight) / root.scrollHeight >= SCROLL_THRESHOLD) {
        done = metaTracker.landingEngagement('Scroll75', niche);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [consent, niche]);

  useEffect(() => {
    if (consent !== 'accepted') return undefined;
    let seconds = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      seconds += 1;
      if (seconds >= DWELL_SECONDS && metaTracker.landingEngagement('TimeOnPage30s', niche)) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [consent, niche]);
}

const FORM_FIELDS = 'INPUT,SELECT,TEXTAREA';
const nicheOfPage = () => document.documentElement.getAttribute('data-theme');

/**
 * /register: primeiro foco ou digitação do visitante em um campo do formulário.
 * Escuta o documento (o formulário não é tocado) e ignora foco/eventos que não vieram de uma pessoa.
 */
export function useMetaRegistrationStart(pathname: string): void {
  useEffect(() => {
    if (pathname !== '/register') return undefined;
    let done = false;
    const onField = (event: Event) => {
      if (done || !event.isTrusted) return;
      const target = event.target as HTMLElement | null;
      if (!target || !FORM_FIELDS.includes(target.tagName) || !target.closest('form')) return;
      done = metaTracker.startRegistration(nicheOfPage());
    };
    document.addEventListener('focusin', onField, true);
    document.addEventListener('input', onField, true);
    return () => {
      document.removeEventListener('focusin', onField, true);
      document.removeEventListener('input', onField, true);
    };
  }, [pathname]);
}

interface OnboardingIdentity { email?: string | null; id?: string | null; fullName?: string | null; region?: string | null }

/** Onboarding: passo alcançado (1..N). Só dono; passos já enviados nesta visita não se repetem. */
export function useMetaOnboardingStep(step: number, totalSteps: number, who: OnboardingIdentity, enabled: boolean): void {
  const { email, id, fullName, region } = who;
  useEffect(() => {
    if (!enabled) return;
    metaTracker.onboardingStep(step, totalSteps, {
      ...(email ? { email } : {}),
      ...(id ? { external_id: id } : {}),
      ...splitFullName(fullName),
      ...(region && /^[A-Za-z]{2}$/.test(region) ? { country: region.toLowerCase() } : {}),
    });
  }, [step, totalSteps, enabled, email, id, fullName, region]);
}
