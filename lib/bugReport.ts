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

function getTopModalElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [role="alertdialog"], [data-modal="true"], [data-sheet="true"], .modal-container, .sheet-container'
  ));
  if (candidates.length === 0) return null;

  let best: HTMLElement | null = null;
  let bestZ = -Infinity;
  for (const el of candidates) {
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.hasAttribute('data-bug-report-dialog')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    const z = parseInt(style.zIndex || '0', 10) || 0;
    if (z > bestZ) {
      bestZ = z;
      best = el;
    }
  }
  return best;
}

export interface CaptureScreenshotOptions {
  /** Alvo específico; se omitido, usa o viewport atual (com fallback para o body). */
  target?: HTMLElement | null;
  /** Padding em pixels ao redor do alvo quando se captura um modal/card. */
  padding?: number;
}

export async function captureScreenshot(options?: CaptureScreenshotOptions): Promise<string | null> {
  if (typeof document === 'undefined' || !document.body) return null;
  try {
    const mod = await import('html2canvas');
    const render = (mod as unknown as {
      default: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => PromiseLike<HTMLCanvasElement>;
    }).default;

    const modal = options?.target ?? getTopModalElement();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    if (modal) {
      const rect = modal.getBoundingClientRect();
      const padding = options?.padding ?? 16;
      const x = Math.max(0, rect.left - padding);
      const y = Math.max(0, rect.top - padding);
      const width = Math.min(window.innerWidth - x, rect.width + padding * 2);
      const height = Math.min(window.innerHeight - y, rect.height + padding * 2);

      const canvas = await render(document.documentElement, {
        x,
        y,
        width,
        height,
        useCORS: true,
        logging: false,
        scale: dpr,
        ignoreElements: (el: Element) => el.closest('[data-bug-report-dialog]') !== null,
      });
      return canvas.toDataURL('image/png');
    }

    const x = typeof window !== 'undefined' ? window.scrollX : 0;
    const y = typeof window !== 'undefined' ? window.scrollY : 0;
    const width = typeof window !== 'undefined' ? window.innerWidth : document.documentElement.clientWidth;
    const height = typeof window !== 'undefined' ? window.innerHeight : document.documentElement.clientHeight;

    const canvas = await render(document.documentElement, {
      x,
      y,
      width,
      height,
      useCORS: true,
      logging: false,
      scale: dpr,
      ignoreElements: (el: Element) => el.closest('[data-bug-report-dialog]') !== null,
    });
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
  /** Gravidade 1-5. Quando omitido fica nulo (a triagem classifica). */
  level?: number | null;
  /** Área do app. Quando omitido, é derivada da rota. */
  category?: BugCategory;
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
  const { supabase: db, companyId, userId, type, description, context, screenshotPath, mode, isDev, level, category } = params;
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
        category: category ?? categoryFromRoute(route),
        mode: mode ?? 'simple',
        is_dev: isDev ?? null,
        level: level ?? null,
        title,
        description: desc || title,
        context,
        screenshot_url: screenshotPath ?? null,
        // Sem isto, reportes manuais (last_seen_at nulo) afundariam abaixo dos
        // automáticos na ordenação da Auditoria. Carimba o "visto agora".
        last_seen_at: new Date().toISOString(),
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

// ─────────────────────────────────────────────────────────────────────────────
// Auditoria — leitura/escrita usadas pela tela única de Auditoria
// ─────────────────────────────────────────────────────────────────────────────

/** Origem visível na auditoria. 'admin' = adicionado na mão pelo adm (is_dev=true). */
export type AuditSource = 'auto' | 'user' | 'admin';

export interface AuditEntry {
  id: string;
  source: AuditSource;
  level: number | null;
  category: string | null;
  type: string | null;
  status: string | null;
  title: string;
  description: string | null;
  context: BugContext | null;
  screenshot_url: string | null;
  occurrences: number | null;
  last_seen_at: string | null;
  created_at: string;
  triage_summary: string | null;
  triage_plan: string | null;
}

/** Estado de tratamento do problema (agrupa os status do banco em 3). */
export type AuditStatusGroup = 'open' | 'progress' | 'done';

/** Agrupa os 6 status do banco nos 3 estados visíveis. */
export function statusGroup(status: string | null): AuditStatusGroup {
  if (status === 'in_progress') return 'progress';
  if (status === 'fixed' || status === 'wontfix') return 'done';
  return 'open';
}

export interface ListAuditEntriesParams {
  supabase: SupabaseClient;
  /** Filtro por origem ('auto' | 'user' | 'admin'). */
  source?: AuditSource;
  /** Filtro por gravidade 1-5. */
  level?: number;
  /** Filtro por estado (aberto / em andamento / resolvido). */
  status?: AuditStatusGroup;
  limit?: number;
}

interface RawBugRow {
  id: string;
  source: string | null;
  is_dev: boolean | null;
  level: number | null;
  category: string | null;
  type: string | null;
  status: string | null;
  title: string;
  description: string | null;
  context: BugContext | null;
  screenshot_url: string | null;
  occurrences: number | null;
  last_seen_at: string | null;
  created_at: string;
  triage_summary: string | null;
  triage_plan: string | null;
}

function mapSource(row: Pick<RawBugRow, 'source' | 'is_dev'>): AuditSource {
  if (row.source === 'auto') return 'auto';
  return row.is_dev ? 'admin' : 'user';
}

/**
 * Lista entradas da auditoria a partir de bug_reports (RLS limita ao tenant).
 * Unifica as 3 origens: automático, reportado por usuário e adicionado pelo adm.
 */
export async function listAuditEntries(
  params: ListAuditEntriesParams
): Promise<{ entries: AuditEntry[]; error: string | null }> {
  const { supabase: db, source, level, status, limit } = params;
  let query = db
    .from('bug_reports')
    .select(
      'id, source, is_dev, level, category, type, status, title, description, context, screenshot_url, occurrences, last_seen_at, created_at, triage_summary, triage_plan'
    )
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit ?? 100);

  if (source === 'auto') query = query.eq('source', 'auto');
  if (source === 'user') query = query.eq('source', 'manual').or('is_dev.is.null,is_dev.eq.false');
  if (source === 'admin') query = query.eq('source', 'manual').eq('is_dev', true);
  if (typeof level === 'number') query = query.eq('level', level);
  if (status === 'open') query = query.in('status', ['new', 'triaged', 'planned']);
  if (status === 'progress') query = query.eq('status', 'in_progress');
  if (status === 'done') query = query.in('status', ['fixed', 'wontfix']);

  const { data, error } = await query;
  if (error) return { entries: [], error: error.message };

  const entries = ((data as RawBugRow[]) ?? []).map((row) => ({
    id: row.id,
    source: mapSource(row),
    level: row.level,
    category: row.category,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    context: row.context,
    screenshot_url: row.screenshot_url,
    occurrences: row.occurrences,
    last_seen_at: row.last_seen_at,
    created_at: row.created_at,
    triage_summary: row.triage_summary,
    triage_plan: row.triage_plan,
  }));
  return { entries, error: null };
}

/**
 * Sobe uma imagem escolhida pelo adm (arquivo do PC/celular) pro bucket
 * bug-screenshots, respeitando o isolamento por pasta (company/user).
 */
export async function uploadBugImageFile(params: {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  file: File;
}): Promise<{ path: string | null; error: string | null }> {
  const { supabase: db, companyId, userId, file } = params;
  if (!file.type.startsWith('image/')) {
    return { path: null, error: 'O arquivo precisa ser uma imagem.' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${companyId}/${userId}/admin-${Date.now()}.${ext}`;
  try {
    const { error } = await db.storage
      .from('bug-screenshots')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (err) {
    return {
      path: null,
      error: err instanceof Error ? err.message : 'Falha no upload da imagem.',
    };
  }
}

/**
 * Gera uma URL temporária (assinada) pra exibir o print/imagem de um bug.
 * O bucket é privado e isolado por tenant, então precisa de URL assinada.
 */
export async function getBugScreenshotUrl(
  db: SupabaseClient,
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  try {
    const { data, error } = await db.storage
      .from('bug-screenshots')
      .createSignedUrl(path, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export type AuditStatusValue = 'new' | 'in_progress' | 'fixed';

/**
 * Atualiza o estado de um problema. 'fixed' carimba resolved_at; os demais
 * limpam o carimbo (caso tenha sido reaberto).
 */
export async function updateAuditStatus(
  db: SupabaseClient,
  id: string,
  status: AuditStatusValue
): Promise<{ error: string | null }> {
  const { error } = await db
    .from('bug_reports')
    .update({
      status,
      resolved_at: status === 'fixed' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** Remove um problema (e tenta apagar o print do storage). */
export async function deleteAuditEntry(
  db: SupabaseClient,
  id: string,
  screenshotPath?: string | null
): Promise<{ error: string | null }> {
  if (screenshotPath) {
    try {
      await db.storage.from('bug-screenshots').remove([screenshotPath]);
    } catch {
      // imagem órfã é inofensiva — não impede a remoção do registro
    }
  }
  const { error } = await db.from('bug_reports').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Apaga de uma vez todos os problemas resolvidos (status 'fixed') do tenant. */
export async function deleteResolvedAuditEntries(
  db: SupabaseClient
): Promise<{ count: number; error: string | null }> {
  const { data, error: selErr } = await db
    .from('bug_reports')
    .select('id, screenshot_url')
    .eq('status', 'fixed');
  if (selErr) return { count: 0, error: selErr.message };

  const rows = (data as Array<{ id: string; screenshot_url: string | null }>) ?? [];
  const paths = rows.map((r) => r.screenshot_url).filter((p): p is string => !!p);
  if (paths.length > 0) {
    try {
      await db.storage.from('bug-screenshots').remove(paths);
    } catch {
      // ignora falha de storage — o que importa é limpar os registros
    }
  }

  const { error } = await db.from('bug_reports').delete().eq('status', 'fixed');
  if (error) return { count: 0, error: error.message };
  return { count: rows.length, error: null };
}