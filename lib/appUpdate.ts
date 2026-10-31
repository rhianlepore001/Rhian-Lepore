/**
 * Atualização do app (PWA) — lógica sem React.
 *
 * Por que existe: o Service Worker novo só era instalado quando o navegador decidia
 * checar, e mesmo instalado o app aberto continuava rodando o código antigo até alguém
 * recarregar. Aqui o app:
 *  1. procura versão nova ao abrir, a cada poucos minutos e quando volta para a frente
 *     (no iPhone o app fica "congelado" em segundo plano, então o visibilitychange é o
 *     gatilho que mais importa);
 *  2. confere /version.json (gerado no build) como segurança, caso o Service Worker trave;
 *  3. só AVISA — nunca recarrega sozinho (o usuário pode estar preenchendo um formulário);
 *  4. ao tocar em "Atualizar": pede SKIP_WAITING ao worker em espera e recarrega no
 *     controllerchange; sem worker em espera, limpa os caches e recarrega.
 *
 * Proteções contra loop: o reload só acontece depois de um toque em "Atualizar", no máximo
 * uma vez por página, e uma tentativa recente que não resolveu (mesma versão ainda velha)
 * muda para a limpeza completa e suprime o aviso por um tempo.
 */

export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;
/** Mensagens da ponte do Service Worker (public/sw-bridge.js). */
export const UPDATE_UI_PING = 'UPDATE_UI_PING';
export const UPDATE_UI_READY = 'UPDATE_UI_READY';
export const UPDATE_ATTEMPT_KEY = 'agendix:update-attempt';

export interface UpdateSnapshot {
  /** Há versão nova e o aviso deve aparecer agora. */
  visible: boolean;
  /** O usuário tocou em Atualizar e a troca está em andamento. */
  applying: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface UpdateManagerOptions {
  /** Versão do código que está rodando agora. */
  currentVersion: string;
  versionUrl?: string;
  swUrl?: string;
  /** Intervalo da checagem periódica (padrão 5 min). */
  intervalMs?: number;
  /** Intervalo mínimo entre checagens disparadas por eventos (foco, visibilidade...). */
  minGapMs?: number;
  /** Quanto esperar o controllerchange antes de cair na limpeza de caches. */
  controllerWaitMs?: number;
  /** Depois de uma tentativa, por quanto tempo não repetir o mesmo caminho nem reavisar. */
  retryCooldownMs?: number;
  /** "Agora não": por quanto tempo esconder o aviso. */
  snoozeMs?: number;
  serviceWorker?: ServiceWorkerContainer | null;
  cacheStorage?: CacheStorage | null;
  fetchImpl?: typeof fetch;
  reload?: () => void;
  now?: () => number;
  storage?: StorageLike | null;
  doc?: Document | null;
  win?: Window | null;
}

export interface UpdateManager {
  start(): void;
  stop(): void;
  checkNow(): Promise<void>;
  apply(): Promise<void>;
  dismiss(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): UpdateSnapshot;
}

interface Attempt {
  target: string;
  at: number;
}

export function parseVersionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const version = (payload as { version?: unknown }).version;
  return typeof version === 'string' && version.trim() !== '' ? version.trim() : null;
}

const NON_TEXT_INPUTS = new Set(['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image']);

/** Há algo digitado dentro de um formulário ou janela aberta? (para avisar antes de atualizar) */
export function hasUnsavedInput(doc: Document | null | undefined = typeof document === 'undefined' ? null : document): boolean {
  if (!doc) return false;
  const fields = doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  for (const el of Array.from(fields)) {
    if (el.closest('[data-update-prompt]')) continue;
    if (el instanceof HTMLInputElement && NON_TEXT_INPUTS.has(el.type)) continue;
    if (!el.closest('form, [role="dialog"]')) continue;
    if (el.value.trim() !== '') return true;
  }
  return false;
}

export function createUpdateManager(options: UpdateManagerOptions): UpdateManager {
  const {
    currentVersion,
    versionUrl = '/version.json',
    swUrl = '/sw.js',
    intervalMs = 5 * 60_000,
    minGapMs = 3_000,
    controllerWaitMs = 4_000,
    retryCooldownMs = 2 * 60_000,
    snoozeMs = 15 * 60_000,
  } = options;
  const sw = options.serviceWorker === undefined ? (typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : null) : options.serviceWorker;
  const cacheStorage = options.cacheStorage === undefined ? (typeof caches !== 'undefined' ? caches : null) : options.cacheStorage;
  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  const doc = options.doc === undefined ? (typeof document === 'undefined' ? null : document) : options.doc;
  const win = options.win === undefined ? (typeof window === 'undefined' ? null : window) : options.win;
  const now = options.now ?? (() => Date.now());
  const reload = options.reload ?? (() => win?.location.reload());
  let storage: StorageLike | null = null;
  try {
    storage = options.storage === undefined ? (typeof sessionStorage === 'undefined' ? null : sessionStorage) : options.storage;
  } catch {
    storage = null; // Safari em modo restrito pode lançar ao acessar
  }

  const listeners = new Set<() => void>();
  let snapshot: UpdateSnapshot = { visible: false, applying: false };

  let started = false;
  let registration: ServiceWorkerRegistration | null = null;
  let hasWaiting = false;
  let latestVersion: string | null = null;
  let versionMismatch = false;
  let applying = false;
  let reloadOnControllerChange = false;
  let reloaded = false;
  let dismissedUntil = 0;
  let lastCheckAt = 0;
  let inFlight: Promise<void> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let controllerTimer: ReturnType<typeof setTimeout> | null = null;
  let snoozeTimer: ReturnType<typeof setTimeout> | null = null;
  let giveUpTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanups: Array<() => void> = [];

  const readAttempt = (): Attempt | null => {
    try {
      const raw = storage?.getItem(UPDATE_ATTEMPT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<Attempt>;
      if (typeof parsed.target === 'string' && typeof parsed.at === 'number') return { target: parsed.target, at: parsed.at };
    } catch { /* ignora */ }
    return null;
  };
  const writeAttempt = (attempt: Attempt) => {
    try { storage?.setItem(UPDATE_ATTEMPT_KEY, JSON.stringify(attempt)); } catch { /* ignora */ }
  };
  const clearAttempt = () => {
    try { storage?.removeItem(UPDATE_ATTEMPT_KEY); } catch { /* ignora */ }
  };
  const recentAttempt = (): Attempt | null => {
    const attempt = readAttempt();
    return attempt && now() - attempt.at < retryCooldownMs ? attempt : null;
  };

  const recompute = () => {
    const t = now();
    // Tentativa recente que não resolveu: não reavisar pela mesma versão durante a pausa.
    const attempt = recentAttempt();
    const suppressed = !hasWaiting && versionMismatch && attempt !== null && attempt.target === latestVersion;
    const available = (hasWaiting || versionMismatch) && !suppressed;
    const snoozed = t < dismissedUntil;
    // Enquanto aplica, o aviso continua na tela mostrando "Atualizando…".
    const next: UpdateSnapshot = { visible: applying || (available && !snoozed), applying };
    if (next.visible !== snapshot.visible || next.applying !== snapshot.applying) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
    if (snoozed && available && snoozeTimer === null) {
      snoozeTimer = setTimeout(() => {
        snoozeTimer = null;
        recompute();
      }, Math.max(0, dismissedUntil - t) + 5);
    }
  };

  const refreshWaiting = () => {
    const waiting = Boolean(registration?.waiting);
    if (waiting !== hasWaiting) {
      hasWaiting = waiting;
      recompute();
    }
  };

  const watchRegistration = (reg: ServiceWorkerRegistration) => {
    registration = reg;
    refreshWaiting();
    const onUpdateFound = () => {
      const installing = reg.installing;
      if (!installing) return;
      const onState = () => {
        if (installing.state === 'installed' || installing.state === 'redundant' || installing.state === 'activated') refreshWaiting();
      };
      installing.addEventListener('statechange', onState);
    };
    reg.addEventListener('updatefound', onUpdateFound);
    cleanups.push(() => reg.removeEventListener('updatefound', onUpdateFound));
  };

  const checkVersionFile = async () => {
    if (!fetchImpl) return;
    try {
      const res = await fetchImpl(`${versionUrl}?t=${now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const latest = parseVersionPayload(await res.json());
      if (!latest) return;
      latestVersion = latest;
      versionMismatch = latest !== currentVersion;
      if (!versionMismatch) clearAttempt();
      recompute();
    } catch {
      // Offline, resposta HTML (rewrite do SPA) ou JSON inválido: ignora e tenta de novo depois.
    }
  };

  const updateRegistration = async () => {
    if (!registration) return;
    try {
      await registration.update();
    } catch {
      // Sem rede ou sw.js indisponível: o /version.json cobre esse caso.
    }
    refreshWaiting();
  };

  const checkNow = (): Promise<void> => {
    if (inFlight) return inFlight;
    lastCheckAt = now();
    inFlight = Promise.allSettled([updateRegistration(), checkVersionFile()])
      .then(() => undefined)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const onForegroundSignal = () => {
    if (doc && doc.visibilityState === 'hidden') return;
    if (now() - lastCheckAt < minGapMs) return;
    void checkNow();
  };

  const hardRefresh = async () => {
    if (reloaded) return;
    reloaded = true;
    if (controllerTimer) { clearTimeout(controllerTimer); controllerTimer = null; }
    try {
      if (cacheStorage) {
        const keys = await cacheStorage.keys();
        await Promise.all(keys.map((key) => cacheStorage.delete(key)));
      }
    } catch { /* segue para o reload mesmo assim */ }
    try {
      if (sw) {
        const regs = await sw.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch { /* idem */ }
    reload();
  };

  const onControllerChange = () => {
    if (!reloadOnControllerChange || reloaded) return;
    reloaded = true;
    if (controllerTimer) { clearTimeout(controllerTimer); controllerTimer = null; }
    reload();
  };

  const apply = async () => {
    if (applying) return;
    applying = true;
    const retry = recentAttempt() !== null;
    writeAttempt({ target: latestVersion ?? 'desconhecida', at: now() });
    recompute();
    // Rede de segurança: se por algum motivo a página não recarregar, libera o botão de novo.
    giveUpTimer = setTimeout(() => {
      giveUpTimer = null;
      applying = false;
      reloaded = false;
      reloadOnControllerChange = false;
      recompute();
    }, 15_000);
    const waiting = registration?.waiting;
    if (waiting && !retry) {
      reloadOnControllerChange = true;
      waiting.postMessage(SKIP_WAITING_MESSAGE);
      // Se o worker não assumir a tempo (Safari às vezes demora), cai na limpeza de caches.
      controllerTimer = setTimeout(() => {
        controllerTimer = null;
        void hardRefresh();
      }, controllerWaitMs);
      return;
    }
    await hardRefresh();
  };

  const start = () => {
    if (started) return;
    started = true;
    reloaded = false;

    if (doc) doc.documentElement.dataset.appBuild = currentVersion;
    const attempt = readAttempt();
    if (attempt && attempt.target === currentVersion) clearAttempt(); // a tentativa anterior deu certo

    if (sw) {
      sw.addEventListener('controllerchange', onControllerChange);
      cleanups.push(() => sw.removeEventListener('controllerchange', onControllerChange));
      // O worker novo pergunta se esta janela sabe mostrar o aviso (ver public/sw-bridge.js).
      const onWorkerMessage = (event: Event) => {
        const message = event as MessageEvent;
        if (message.data?.type === UPDATE_UI_PING && message.ports?.[0]) {
          message.ports[0].postMessage({ type: UPDATE_UI_READY });
        }
      };
      sw.addEventListener('message', onWorkerMessage);
      cleanups.push(() => sw.removeEventListener('message', onWorkerMessage));
      sw.register(swUrl, { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          if (!started) return;
          watchRegistration(reg);
          return checkNow();
        })
        .catch(() => checkVersionFile());
    } else {
      void checkVersionFile();
    }

    if (doc) {
      doc.addEventListener('visibilitychange', onForegroundSignal);
      cleanups.push(() => doc.removeEventListener('visibilitychange', onForegroundSignal));
    }
    if (win) {
      const onPageShow = () => onForegroundSignal();
      const onOnline = () => onForegroundSignal();
      const onPreloadError = () => { void checkNow(); };
      win.addEventListener('pageshow', onPageShow);
      win.addEventListener('focus', onForegroundSignal);
      win.addEventListener('online', onOnline);
      // Pedaço da tela que não carrega costuma ser sinal de versão trocada no servidor.
      win.addEventListener('vite:preloadError', onPreloadError);
      cleanups.push(() => {
        win.removeEventListener('pageshow', onPageShow);
        win.removeEventListener('focus', onForegroundSignal);
        win.removeEventListener('online', onOnline);
        win.removeEventListener('vite:preloadError', onPreloadError);
      });
    }
    intervalId = setInterval(() => {
      if (doc && doc.visibilityState === 'hidden') return;
      void checkNow();
    }, intervalMs);
  };

  const stop = () => {
    started = false;
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (snoozeTimer) { clearTimeout(snoozeTimer); snoozeTimer = null; }
    if (giveUpTimer) { clearTimeout(giveUpTimer); giveUpTimer = null; }
    cleanups.splice(0).forEach((fn) => fn());
  };

  return {
    start,
    stop,
    checkNow,
    apply,
    dismiss() {
      dismissedUntil = now() + snoozeMs;
      if (snoozeTimer) { clearTimeout(snoozeTimer); snoozeTimer = null; }
      recompute();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
}
