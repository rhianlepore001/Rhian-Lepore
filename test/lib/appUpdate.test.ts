import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SKIP_WAITING_MESSAGE,
  UPDATE_ATTEMPT_KEY,
  createUpdateManager,
  hasUnsavedInput,
  parseVersionPayload,
  type UpdateManager,
} from '../../lib/appUpdate';

// ── Fakes ─────────────────────────────────────────────────────────────────────
class FakeWorker {
  postMessage = vi.fn();
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: (EventTarget & { state: string }) | null = null;
  update = vi.fn(async () => undefined);
  unregister = vi.fn(async () => true);
}

class FakeContainer extends EventTarget {
  reg = new FakeRegistration();
  register = vi.fn(async () => this.reg);
  getRegistrations = vi.fn(async () => [this.reg]);
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

function jsonResponse(version: string | null) {
  return async () => ({
    ok: true,
    json: async () => (version === null ? { nope: true } : { version }),
  }) as unknown as Response;
}

interface Harness {
  manager: UpdateManager;
  container: FakeContainer;
  caches: { keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  reload: ReturnType<typeof vi.fn>;
  fetchImpl: ReturnType<typeof vi.fn>;
  storage: ReturnType<typeof memoryStorage>;
  setLatest: (v: string | 'html' | 'offline') => void;
  clock: { t: number };
}

function setup(opts: { current?: string; latest?: string; withSw?: boolean } = {}): Harness {
  const { current = 'A', latest = 'A', withSw = true } = opts;
  const container = new FakeContainer();
  const caches = {
    keys: vi.fn(async () => ['workbox-precache-v2', 'runtime']),
    delete: vi.fn(async () => true),
  };
  const reload = vi.fn();
  const storage = memoryStorage();
  const clock = { t: 1_000_000 };
  let next: string = latest;
  const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    if (next === 'offline') throw new TypeError('offline');
    if (next === 'html') return { ok: true, json: async () => { throw new SyntaxError('html'); } } as unknown as Response;
    return jsonResponse(next)();
  });
  const manager = createUpdateManager({
    currentVersion: current,
    serviceWorker: withSw ? (container as unknown as ServiceWorkerContainer) : null,
    cacheStorage: caches as unknown as CacheStorage,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    reload,
    storage,
    now: () => clock.t,
    doc: document,
    win: window,
  });
  return { manager, container, caches, reload, fetchImpl, storage, clock, setLatest: (v) => { next = v; } };
}

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe('parseVersionPayload', () => {
  it('aceita só {version: string não vazia}', () => {
    expect(parseVersionPayload({ version: ' abc ' })).toBe('abc');
    expect(parseVersionPayload({ version: '' })).toBeNull();
    expect(parseVersionPayload({ version: 3 })).toBeNull();
    expect(parseVersionPayload(null)).toBeNull();
    expect(parseVersionPayload('<html>')).toBeNull();
  });
});

describe('createUpdateManager', () => {
  let h: Harness;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    h?.manager.stop();
    vi.useRealTimers();
  });

  it('sem versão nova: não mostra aviso e registra o service worker', async () => {
    h = setup();
    h.manager.start();
    await flush();
    expect(h.container.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(h.container.reg.update).toHaveBeenCalledTimes(1);
    expect(h.manager.getSnapshot()).toEqual({ visible: false, applying: false });
    expect(document.documentElement.dataset.appBuild).toBe('A');
  });

  it('mostra o aviso quando o /version.json traz outra versão (rede de segurança)', async () => {
    h = setup({ latest: 'B' });
    const listener = vi.fn();
    h.manager.subscribe(listener);
    h.manager.start();
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
    expect(listener).toHaveBeenCalled();
    const url = String(h.fetchImpl.mock.calls[0][0]);
    expect(url.startsWith('/version.json?t=')).toBe(true);
    expect(h.fetchImpl.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('ignora /version.json inválido (HTML do rewrite) ou sem rede', async () => {
    h = setup({ latest: 'html' });
    h.manager.start();
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(false);
    h.setLatest('offline');
    await h.manager.checkNow();
    expect(h.manager.getSnapshot().visible).toBe(false);
  });

  it('mostra o aviso quando há service worker em espera (já no registro)', async () => {
    h = setup();
    h.container.reg.waiting = new FakeWorker();
    h.manager.start();
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
  });

  it('detecta worker novo instalado depois (updatefound → installed)', async () => {
    h = setup();
    h.manager.start();
    await flush();
    const installing = Object.assign(new EventTarget(), { state: 'installing' });
    h.container.reg.installing = installing;
    h.container.reg.dispatchEvent(new Event('updatefound'));
    installing.state = 'installed';
    h.container.reg.waiting = new FakeWorker();
    installing.dispatchEvent(new Event('statechange'));
    expect(h.manager.getSnapshot().visible).toBe(true);
  });

  it('checa a cada 5 min, mas não com o app em segundo plano', async () => {
    h = setup();
    h.manager.start();
    await flush();
    const base = h.fetchImpl.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(h.fetchImpl.mock.calls.length).toBe(base + 1);
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(h.fetchImpl.mock.calls.length).toBe(base + 1);
    vis.mockRestore();
  });

  it('checa quando o app volta para a frente (visibilitychange) e respeita o intervalo mínimo', async () => {
    h = setup();
    h.manager.start();
    await flush();
    const base = h.fetchImpl.mock.calls.length;
    h.clock.t += 10_000;
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(h.fetchImpl.mock.calls.length).toBe(base + 1);
    // rajada de eventos (focus + pageshow + visibilitychange) vira uma checagem só
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    await flush();
    expect(h.fetchImpl.mock.calls.length).toBe(base + 1);
    // e a checagem depois de um tempo funciona de novo
    h.clock.t += 10_000;
    h.setLatest('B');
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
  });

  it('falha de carregamento de tela (vite:preloadError) dispara checagem', async () => {
    h = setup();
    h.manager.start();
    await flush();
    h.clock.t += 10_000;
    h.setLatest('B');
    window.dispatchEvent(new Event('vite:preloadError'));
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
  });

  it('Atualizar com worker em espera: SKIP_WAITING e reload só no controllerchange', async () => {
    h = setup();
    const waiting = new FakeWorker();
    h.container.reg.waiting = waiting;
    h.manager.start();
    await flush();

    await h.manager.apply();
    expect(waiting.postMessage).toHaveBeenCalledWith(SKIP_WAITING_MESSAGE);
    expect(h.manager.getSnapshot()).toEqual({ visible: true, applying: true });
    expect(h.reload).not.toHaveBeenCalled();

    h.container.dispatchEvent(new Event('controllerchange'));
    expect(h.reload).toHaveBeenCalledTimes(1);
    // controllerchange repetido não recarrega de novo (sem loop)
    h.container.dispatchEvent(new Event('controllerchange'));
    expect(h.reload).toHaveBeenCalledTimes(1);
    expect(h.caches.delete).not.toHaveBeenCalled();
  });

  it('controllerchange sem toque em Atualizar nunca recarrega (não perde formulário)', async () => {
    h = setup();
    h.manager.start();
    await flush();
    h.container.dispatchEvent(new Event('controllerchange'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.reload).not.toHaveBeenCalled();
  });

  it('se o worker não assumir a tempo, limpa os caches e recarrega', async () => {
    h = setup();
    h.container.reg.waiting = new FakeWorker();
    h.manager.start();
    await flush();
    await h.manager.apply();
    await vi.advanceTimersByTimeAsync(4_100);
    expect(h.caches.delete).toHaveBeenCalledTimes(2);
    expect(h.container.reg.unregister).toHaveBeenCalled();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('Atualizar sem worker em espera: limpa caches antigos, remove o worker e recarrega', async () => {
    h = setup({ latest: 'B' });
    h.manager.start();
    await flush();
    await h.manager.apply();
    expect(h.caches.keys).toHaveBeenCalled();
    expect(h.caches.delete).toHaveBeenCalledWith('workbox-precache-v2');
    expect(h.caches.delete).toHaveBeenCalledWith('runtime');
    expect(h.container.reg.unregister).toHaveBeenCalled();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('funciona sem service worker (ex.: navegador sem suporte): só /version.json + limpeza', async () => {
    h = setup({ latest: 'B', withSw: false });
    h.manager.start();
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
    await h.manager.apply();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('dois toques seguidos em Atualizar recarregam uma vez só', async () => {
    h = setup({ latest: 'B' });
    h.manager.start();
    await flush();
    await Promise.all([h.manager.apply(), h.manager.apply()]);
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('anti-loop: depois de tentar e a versão continuar velha, não reavisa na hora; volta depois da pausa', async () => {
    h = setup({ latest: 'B' });
    h.manager.start();
    await flush();
    await h.manager.apply();
    expect(JSON.parse(h.storage.data.get(UPDATE_ATTEMPT_KEY) as string)).toMatchObject({ target: 'B' });
    h.manager.stop();

    // "Recarregou" e a página continua na versão A (ex.: CDN ainda entregando o HTML antigo)
    const again = createUpdateManager({
      currentVersion: 'A',
      serviceWorker: null,
      cacheStorage: h.caches as unknown as CacheStorage,
      fetchImpl: (async () => jsonResponse('B')()) as unknown as typeof fetch,
      reload: h.reload,
      storage: h.storage,
      now: () => h.clock.t,
    });
    again.start();
    await flush();
    expect(again.getSnapshot().visible).toBe(false);

    h.clock.t += 3 * 60_000;
    await again.checkNow();
    expect(again.getSnapshot().visible).toBe(true);
    again.stop();
  });

  it('tentativa que deu certo (versão nova rodando) limpa o registro', async () => {
    h = setup({ current: 'B', latest: 'B' });
    h.storage.setItem(UPDATE_ATTEMPT_KEY, JSON.stringify({ target: 'B', at: h.clock.t }));
    h.manager.start();
    await flush();
    expect(h.storage.data.has(UPDATE_ATTEMPT_KEY)).toBe(false);
    expect(h.manager.getSnapshot().visible).toBe(false);
  });

  it('segunda tentativa logo em seguida pula o SKIP_WAITING e vai direto na limpeza completa', async () => {
    h = setup({ latest: 'B' });
    const waiting = new FakeWorker();
    h.container.reg.waiting = waiting;
    h.storage.setItem(UPDATE_ATTEMPT_KEY, JSON.stringify({ target: 'B', at: h.clock.t - 1000 }));
    h.manager.start();
    await flush();
    await h.manager.apply();
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(h.caches.delete).toHaveBeenCalled();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('"Agora não" esconde o aviso e ele volta sozinho depois de 15 min', async () => {
    h = setup({ latest: 'B' });
    h.manager.start();
    await flush();
    expect(h.manager.getSnapshot().visible).toBe(true);
    h.manager.dismiss();
    expect(h.manager.getSnapshot().visible).toBe(false);
    h.clock.t += 15 * 60_000;
    await vi.advanceTimersByTimeAsync(15 * 60_000 + 10);
    expect(h.manager.getSnapshot().visible).toBe(true);
  });

  it('se a página não recarregar, libera o botão de novo', async () => {
    h = setup({ latest: 'B' });
    h.reload.mockImplementation(() => undefined);
    h.manager.start();
    await flush();
    await h.manager.apply();
    expect(h.manager.getSnapshot().applying).toBe(true);
    await vi.advanceTimersByTimeAsync(15_100);
    expect(h.manager.getSnapshot().applying).toBe(false);
  });

  it('stop remove os ouvintes', async () => {
    h = setup();
    h.manager.start();
    await flush();
    h.manager.stop();
    const base = h.fetchImpl.mock.calls.length;
    h.clock.t += 60_000;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(h.fetchImpl.mock.calls.length).toBe(base);
  });
  it('responde ao worker novo que esta janela sabe mostrar o aviso', async () => {
    const h = setup();
    h.manager.start();
    await flush();
    const port = { postMessage: vi.fn() };
    const event = new MessageEvent('message', { data: { type: 'UPDATE_UI_PING' }, ports: [port as unknown as MessagePort] });
    h.container.dispatchEvent(event);
    expect(port.postMessage).toHaveBeenCalledWith({ type: 'UPDATE_UI_READY' });
  });

});

describe('hasUnsavedInput', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detecta texto digitado dentro de formulário ou janela', () => {
    document.body.innerHTML = '<form><input id="a" type="text" /></form>';
    expect(hasUnsavedInput(document)).toBe(false);
    (document.getElementById('a') as HTMLInputElement).value = 'Maria';
    expect(hasUnsavedInput(document)).toBe(true);
  });

  it('ignora campos soltos, checkboxes, ocultos e o próprio aviso', () => {
    document.body.innerHTML = `
      <input type="text" value="busca solta" />
      <form><input type="checkbox" value="x" checked /><input type="hidden" value="x" />
        <div data-update-prompt><input value="x" /></div></form>`;
    expect(hasUnsavedInput(document)).toBe(false);
  });

  it('detecta textarea em dialog', () => {
    document.body.innerHTML = '<div role="dialog"><textarea>obs</textarea></div>';
    expect(hasUnsavedInput(document)).toBe(true);
  });

});
