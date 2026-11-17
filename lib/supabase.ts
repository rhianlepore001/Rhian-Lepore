import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { captureRecoveryCallback } from '../utils/authRecoveryLink';
import { isDemoMode } from './demo/mode';
import { createDemoClient } from './demo/client';

if (!isDemoMode()) captureRecoveryCallback();

let realClient: SupabaseClient | undefined;
let demoClient: ReturnType<typeof createDemoClient> | undefined;

function getClient(): SupabaseClient {
    syncSupabaseMode();
    if (isDemoMode()) {
        return (demoClient ??= createDemoClient()) as unknown as SupabaseClient;
    }
    if (!realClient) {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!url || !key) throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. Configure-as no arquivo .env.local.');
        realClient = createClient(url, key, {
            global: { fetch: (input, init) => {
                if (isDemoMode()) return Promise.reject(new Error('Rede indisponível na simulação.'));
                return globalThis.fetch(input, init);
            } },
        });
    }
    return realClient;
}

let previousDemoMode = false;
export function syncSupabaseMode(): void {
    const demo = isDemoMode();
    if (realClient && demo && !previousDemoMode) {
        void realClient.auth.stopAutoRefresh?.();
        void realClient.removeAllChannels?.();
    } else if (realClient && !demo && previousDemoMode) {
        void realClient.auth.startAutoRefresh?.();
    }
    previousDemoMode = demo;
}

if (typeof window !== 'undefined') window.addEventListener('hashchange', syncSupabaseMode);

function namespace(property: string): object {
    return new Proxy({}, {
        get(_target, method) {
            const section = Reflect.get(getClient(), property);
            const value = Reflect.get(section, method);
            if (typeof value !== 'function') return value;
            return new Proxy(value, { apply(_target, _this, args) {
                const current = Reflect.get(getClient(), property);
                return Reflect.get(current, method).apply(current, args);
            } });
        },
    });
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, property) {
        if (['auth', 'storage', 'functions'].includes(String(property))) return namespace(String(property));
        const client = getClient();
        const value = Reflect.get(client, property);
        if (typeof value !== 'function') return value;
        return new Proxy(value, { apply(_target, _this, args) {
            const current = getClient();
            return Reflect.get(current, property).apply(current, args);
        } });
    },
});
