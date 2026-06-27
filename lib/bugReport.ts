import type { SupabaseClient } from '@supabase/supabase-js';

export type BugReportType = 'bug' | 'idea' | 'question';

export interface BugContext {
  route: string;
  pathname: string;
  search: string;
  hash: string;
  url: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  language: string;
  timestamp: string;
  theme: string | null;
  mode: string | null;
  consoleErrors: ReadonlyArray<string>;
}

const MAX_CONSOLE_ERRORS = 10;
const consoleErrorBuffer: string[] = [];
const originalConsoleError = console.error;

export function startCapturing(): void {
  if (consoleErrorBuffer.length === 0 && originalConsoleError === console.error) {
    console.error = (...args: unknown[]) => {
      try {
        const msg = args
          .map(a => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack ?? ''}` : String(a)))
          .join(' ');
        consoleErrorBuffer.push(msg);
        if (consoleErrorBuffer.length > MAX_CONSOLE_ERRORS) {
          consoleErrorBuffer.shift();
        }
      } catch {
        // ignore serialization errors
      }
      originalConsoleError(...(args as Parameters<typeof originalConsoleError>));
    };
  }
}

export function getConsoleErrors(): ReadonlyArray<string> {
  return consoleErrorBuffer.slice();
}

export function stopCapturing(): void {
  if (originalConsoleError !== console.error) {
    console.error = originalConsoleError;
  }
}

startCapturing();

export function captureContext(): BugContext {
  const doc = typeof document !== 'undefined' ? document.documentElement : null;
  return {
    route:
      typeof window !== 'undefined'
        ? window.location.hash || window.location.pathname
        : '',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    search: typeof window !== 'undefined' ? window.location.search : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    timestamp: new Date().toISOString(),
    theme: doc ? doc.getAttribute('data-theme') : null,
    mode: doc ? doc.getAttribute('data-mode') : null,
    consoleErrors: getConsoleErrors(),
  };
}

export async function captureScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined' || !document.body) return null;
  try {
    const mod = await import('html2canvas');
    const render = (mod as unknown as {
      default: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => PromiseLike<HTMLCanvasElement>;
    }).default;
    const canvas = await render(document.body, { useCORS: true, logging: false });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export type BugCategory =
  | 'agenda'
  | 'login'
  | 'clients'
  | 'finance'
  | 'queue'
  | 'settings'
  | 'modal'
  | 'other';

const TYPE_LABEL: Record<BugReportType, string> = {
  bug: 'Problema',
  idea: 'Sugestão',
  question: 'Dúvida',
};

export function inferType(reportType: BugReportType): BugReportType {
  if (reportType === 'idea' || reportType === 'question') return reportType;
  return 'bug';
}

/**
 * Deriva a área do app a partir da rota (hash do HashRouter).
 * Os valores precisam casar com o CHECK de `category` da tabela bug_reports.
 */
export function categoryFromRoute(route: string): BugCategory {
  const r = (route || '').toLowerCase();
  if (r.includes('agenda')) return 'agenda';
  if (r.includes('financ')) return 'finance';
  if (r.includes('client')) return 'clients';
  if (r.includes('fila') || r.includes('queue')) return 'queue';
  if (r.includes('config') || r.includes('settings')) return 'settings';
  if (
    r.includes('login') ||
    r.includes('register') ||
    r.includes('password') ||
    r.includes('forgot')
  ) {
    return 'login';
  }
  return 'other';
}

const MAX_TITLE = 90;

/**
 * Título é obrigatório no banco. Usa a 1ª linha da descrição quando há texto;
 * senão, gera um padrão a partir do tipo + área da rota.
 */
export function buildTitle(
  reportType: BugReportType,
  description: string | null | undefined,
  route: string
): string {
  const desc = (description ?? '').trim();
  if (desc) {
    const firstLine = desc.split('\n')[0].trim();
    return firstLine.length > MAX_TITLE
      ? `${firstLine.slice(0, MAX_TITLE - 1)}…`
      : firstLine;
  }
  return `${TYPE_LABEL[reportType]} em ${categoryFromRoute(route)}`;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface UploadBugScreenshotParams {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  dataUrl: string;
  fileName?: string;
}

export async function uploadBugScreenshot(
  params: UploadBugScreenshotParams
): Promise<{ path: string | null; error: string | null }> {
  const { supabase: db, companyId, userId, dataUrl, fileName } = params;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return { path: null, error: 'Screenshot inválido.' };
  const path = `${companyId}/${userId}/${fileName ?? `screenshot-${Date.now()}.png`}`;
  try {
    const { error } = await db.storage
      .from('bug-screenshots')
      .upload(path, decodeBase64(base64), {
        contentType: 'image/png',
        upsert: false,
      });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (err) {
    return {
      path: null,
      error: err instanceof Error ? err.message : 'Falha no upload do screenshot.',
    };
  }
}

export interface CreateBugReportParams {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  type: BugReportType;
  description?: string | null;
  context: BugContext;
  screenshotPath?: string | null;
  /** 'advanced' = report do admin com marcações no print. Default 'simple'. */
  mode?: 'simple' | 'advanced';
  /** Marca o report como feito pelo admin/dev. */
  isDev?: boolean;
}

export interface BugReportResult {
  id: string | null;
  error: string | null;
}

/**
 * Report manual (cliente clicou no "?"). Monta um insert que respeita o schema
 * de bug_reports: title/description NOT NULL, status 'new', category pela rota,
 * source 'manual'. `level` fica nulo — quem classifica 1-5 é o agente de triagem.
 */
export async function createBugReport(
  params: CreateBugReportParams
): Promise<BugReportResult> {
  const { supabase: db, companyId, userId, type, description, context, screenshotPath, mode, isDev } = params;
  const route = context.route || context.pathname || '';
  const desc = (description ?? '').trim();
  const title = buildTitle(type, desc, route);
  try {
    const { data, error } = await db
      .from('bug_reports')
      .insert({
        company_id: companyId,
        user_id: userId,
        type,
        source: 'manual',
        status: 'new',
        category: categoryFromRoute(route),
        mode: mode ?? 'simple',
        is_dev: isDev ?? null,
        title,
        description: desc || title,
        context,
        screenshot_url: screenshotPath ?? null,
      })
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    return { id: (data as { id: string }).id, error: null };
  } catch (err) {
    return {
      id: null,
      error: err instanceof Error ? err.message : 'Falha ao registrar o report.',
    };
  }
}

export interface ReportAutoBugParams {
  supabase: SupabaseClient;
  title: string;
  description: string;
  context: BugContext;
  dedupKey: string;
  screenshotUrl?: string | null;
}

/**
 * Report automático (o app capturou um erro sozinho). Usa a RPC
 * upsert_auto_bug_report, que faz o anti-spam: se já existe um bug automático
 * aberto com a mesma assinatura (dedupKey) naquele tenant, só incrementa a
 * contagem de ocorrências em vez de criar duplicata.
 */
export async function reportAutoBug(
  params: ReportAutoBugParams
): Promise<BugReportResult> {
  const { supabase: db, title, description, context, dedupKey, screenshotUrl } = params;
  const route = context.route || context.pathname || '';
  try {
    const { data, error } = await db.rpc('upsert_auto_bug_report', {
      p_title: title,
      p_description: description,
      p_category: categoryFromRoute(route),
      p_context: context,
      p_dedup_key: dedupKey,
      p_screenshot_url: screenshotUrl ?? null,
    });
    if (error) return { id: null, error: error.message };
    return { id: (data as string | null) ?? null, error: null };
  } catch (err) {
    return {
      id: null,
      error: err instanceof Error ? err.message : 'Falha ao registrar erro automático.',
    };
  }
}