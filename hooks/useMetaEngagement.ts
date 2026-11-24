import { useEffect, useSyncExternalStore } from 'react';
import {
  META_LANDING_PATH,
  metaTracker,
  type MetaCtaPosition,
  type MetaDwellEvent,
  type MetaScrollEvent,
} from '../lib/metaTracking';
import { splitFullName } from '../lib/metaMatching';
import { readConsent, subscribeConsent } from '../lib/marketingConsent';
import { demoPathToScreen, isMetaDemoMessage, type MetaDemoScreen } from '../lib/metaDemoBridge';

// Disparos passivos de engajamento (Meta). Nenhum hook altera a tela, o formulário ou a
// navegação: só observam. Tudo é descartado pelo tracker sem consentimento, fora da rota
// permitida ou depois do primeiro disparo da visita.

const SCROLL_MARKS: ReadonlyArray<{ ratio: number; event: MetaScrollEvent }> = [
  { ratio: 0.25, event: 'Scroll25' },
  { ratio: 0.5, event: 'Scroll50' },
  { ratio: 0.75, event: 'Scroll75' },
  { ratio: 0.9, event: 'Scroll90' },
];

const DWELL_MARKS: ReadonlyArray<{ seconds: number; event: MetaDwellEvent }> = [
  { seconds: 15, event: 'TimeOnPage15s' },
  { seconds: 30, event: 'TimeOnPage30s' },
  { seconds: 60, event: 'TimeOnPage60s' },
  { seconds: 120, event: 'TimeOnPage120s' },
];

const SECTION_VISIBLE_RATIO = 0.5;
const SECTION_DWELL_MS = 1000;

/** HashRouter: rota atual sem query (ex.: /landing). Scroll/tempo só nesta rota. */
export function isMetaLandingHashRoute(hash = window.location.hash): boolean {
  if (!hash.startsWith('#/')) return false;
  const route = hash.slice(1);
  if (route.includes('#')) return false;
  const path = route.split('?')[0] || '';
  return path === META_LANDING_PATH;
}

/** Landing (/landing): ViewContent, scrolls, tempos e seções (IntersectionObserver).
 *  Em /login (gateway) só ViewContent — Scroll e TimeOnPage ficam bloqueados por rota
 *  aqui e em metaTracker.landingEngagement (LANDING_ONLY). */
export function useMetaLandingEngagement(niche: string | null): void {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);

  useEffect(() => {
    if (consent !== 'accepted' || !niche) return undefined;
    if (metaTracker.viewContent(niche)) return undefined;
    // pageView trata Auth ainda em loading como autenticado, então a landing só fica
    // elegível depois. Sem retry, ViewContent dispara uma vez e se perde.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (metaTracker.viewContent(niche) || ++tries > 60) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [consent, niche]);

  useEffect(() => {
    if (consent !== 'accepted' || !isMetaLandingHashRoute()) return undefined;
    const pending = new Set(SCROLL_MARKS.map(mark => mark.event));
    const onScroll = () => {
      if (!pending.size || !isMetaLandingHashRoute()) return;
      const root = document.scrollingElement || document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = (root.scrollTop + window.innerHeight) / root.scrollHeight;
      for (const mark of SCROLL_MARKS) {
        if (!pending.has(mark.event) || progress < mark.ratio) continue;
        if (metaTracker.landingEngagement(mark.event, niche)) pending.delete(mark.event);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [consent, niche]);

  useEffect(() => {
    if (consent !== 'accepted' || !isMetaLandingHashRoute()) return undefined;
    let seconds = 0;
    const pending = new Set(DWELL_MARKS.map(mark => mark.event));
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !pending.size || !isMetaLandingHashRoute()) return;
      seconds += 1;
      for (const mark of DWELL_MARKS) {
        if (!pending.has(mark.event) || seconds < mark.seconds) continue;
        if (metaTracker.landingEngagement(mark.event, niche)) pending.delete(mark.event);
      }
      if (!pending.size) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [consent, niche]);
}

/**
 * Landing: SectionView quando um nó `[data-meta-section]` fica ≥50% visível por 1 s.
 * O valor do atributo é o token enviado (já sanitizado pelo tracker).
 */
export function useMetaSectionViews(niche: string | null, rootSelector = '.landing'): void {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);

  useEffect(() => {
    if (consent !== 'accepted' || typeof IntersectionObserver === 'undefined') return undefined;
    const root = document.querySelector(rootSelector);
    if (!root) return undefined;
    const timers = new Map<Element, number>();
    const seen = new Set<string>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const section = (entry.target as HTMLElement).dataset.metaSection;
        if (!section || seen.has(section)) continue;
        const existing = timers.get(entry.target);
        if (entry.isIntersecting && entry.intersectionRatio >= SECTION_VISIBLE_RATIO) {
          if (existing) continue;
          timers.set(entry.target, window.setTimeout(() => {
            timers.delete(entry.target);
            if (metaTracker.sectionView(section, niche)) {
              seen.add(section);
              observer.unobserve(entry.target);
            }
          }, SECTION_DWELL_MS));
        } else if (existing) {
          window.clearTimeout(existing);
          timers.delete(entry.target);
        }
      }
    }, { threshold: [0, SECTION_VISIBLE_RATIO, 1] });

    root.querySelectorAll<HTMLElement>('[data-meta-section]').forEach(node => observer.observe(node));

    return () => {
      observer.disconnect();
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, [consent, niche, rootSelector]);
}

/** Landing: escuta postMessage seguro da demo embutida (mesma origem). */
export function useMetaDemoBridge(niche: string | null, enabled: boolean): void {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);

  useEffect(() => {
    if (!enabled || consent !== 'accepted') return undefined;
    const onMessage = (event: MessageEvent) => {
      if (!isMetaDemoMessage(event.data, event.origin, window.location.origin)) return;
      if (event.data.action === 'start') {
        metaTracker.demoStart(niche);
        return;
      }
      // screen ≠ start: DemoStart só chega via action 'start' (interação real no iframe).
      metaTracker.demoScreenView(event.data.screen, niche);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [consent, niche, enabled]);
}

/** Converte a tela da landing (tabs / rota) para token Meta, se aplicável. */
export function landingViewToDemoScreen(viewId: string): MetaDemoScreen | null {
  switch (viewId) {
    case 'dashboard': return 'inicio';
    case 'agenda': return 'agenda';
    case 'fila': return 'fila';
    case 'finance': return 'financeiro';
    case 'clientes': return 'clientes';
    default: return null;
  }
}

export function trackLandingDemoScreen(viewIdOrRoute: string, niche: string | null, search = ''): void {
  const fromTabs = landingViewToDemoScreen(viewIdOrRoute);
  const screen = fromTabs ?? demoPathToScreen(viewIdOrRoute.startsWith('/') ? viewIdOrRoute : '/' + viewIdOrRoute, search);
  if (screen) metaTracker.demoScreenView(screen, niche);
}

export function trackLandingCta(
  ctaId: string,
  niche: string | null,
  position: MetaCtaPosition,
): void {
  metaTracker.ctaClick(ctaId, niche, position);
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
