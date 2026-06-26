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

export function inferType(reportType: BugReportType): BugReportType {
  if (reportType === 'idea' || reportType === 'question') return reportType;
  return 'bug';
}

export function inferCategory(reportType: BugReportType): string {
  switch (reportType) {
    case 'idea':
      return 'feature_request';
    case 'question':
      return 'support';
    case 'bug':
    default:
      return 'bug_report';
  }
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
      .from('bug-reports')
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
  category: string;
  description?: string | null;
  context: BugContext;
  screenshotPath?: string | null;
}

export interface BugReportResult {
  id: string | null;
  error: string | null;
}

export async function createBugReport(
  params: CreateBugReportParams
): Promise<BugReportResult> {
  const {
    supabase: db,
    companyId,
    userId,
    type,
    category,
    description,
    context,
    screenshotPath,
  } = params;
  try {
    const { data, error } = await db
      .from('bug_reports')
      .insert({
        company_id: companyId,
        user_id: userId,
        type,
        category,
        description: description ?? null,
        context,
        screenshot_path: screenshotPath ?? null,
        status: 'open',
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