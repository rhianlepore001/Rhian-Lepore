const ROUTE_CATEGORIES = new Set([
    'agenda', 'book', 'clientes', 'clube', 'configuracoes', 'demo', 'demo-preview',
    'fila', 'financeiro', 'forgot-password', 'insights', 'landing', 'login',
    'meus-insights', 'minha-area', 'onboarding', 'onboarding-wizard', 'pro',
    'produtos', 'queue', 'queue-status', 'register', 'resultados-por-hora',
    'staff-onboarding', 'update-password',
]);

const ERROR_NAMES = new Set([
    'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'AbortError',
    'AuthApiError', 'AuthRetryableFetchError', 'AuthSessionMissingError',
]);

const ERROR_CODES = new Set([
    'P0001', '22P02', '23502', '23503', '23505', '23514', '40001', '42501',
    '42703', '42P01', '55P03', '57014', 'XX000', 'PGRST116', 'PGRST202',
    'unexpected_failure', 'unexpected_error',
]);

export function errorRouteCategory(location: Pick<Location, 'hash' | 'pathname'>): string {
    const path = location.hash.startsWith('#/') ? location.hash.slice(1) : location.pathname;
    const [segment] = path.slice(1).split(/[/?#]/, 1);
    if (!segment) return '/';
    return ROUTE_CATEGORIES.has(segment) ? `/${segment}` : 'other';
}

export function safeErrorMetadata(error: unknown) {
    const raw = error && typeof error === 'object'
        ? error as { name?: unknown; code?: unknown; error_code?: unknown; status?: unknown }
        : {};
    const code = raw.code ?? raw.error_code;
    const status = raw.status;

    return {
        error_name: typeof raw.name === 'string' && ERROR_NAMES.has(raw.name) ? raw.name : undefined,
        error_code: typeof code === 'string' && ERROR_CODES.has(code) ? code : undefined,
        error_status: typeof status === 'number' && Number.isInteger(status)
            && (status === 0 || (status >= 400 && status <= 599)) ? status : undefined,
    };
}
