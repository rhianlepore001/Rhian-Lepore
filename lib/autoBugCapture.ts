/**
 * Captura automática de erros → bug_reports.
 *
 * Quando algo quebra durante o uso real (erro de runtime, promise rejeitada,
 * crash de tela pego pelo ErrorBoundary), o app registra um bug sozinho —
 * sem o cliente precisar clicar em nada. O agente de triagem depois classifica
 * o nível 1-5 e escreve o plano (ver docs/features/bug-triage-agent.md).
 *
 * Anti-spam em 3 camadas:
 *   1. Assinatura (dedupKey) que agrupa erros parecidos (números/ids viram '#').
 *   2. Cooldown por assinatura no localStorage (não reenvia o mesmo erro < 1h).
 *   3. Teto de envios distintos por sessão (evita tempestade de erros novos).
 * Além disso, a RPC no banco incrementa a contagem em vez de duplicar.
 */
import { supabase } from './supabase';
import { captureContext, reportAutoBug } from './bugReport';

const COOLDOWN_MS = 60 * 60 * 1000; // 1h por assinatura
const MAX_PER_SESSION = 20; // teto de erros distintos por sessão
const STORAGE_KEY = 'agendix.autoBug.cooldown';
const MAX_TITLE = 90;

let initialized = false;
let inFlight = false; // re-entrância: não capturar erro gerado pela própria captura
let sessionCount = 0;
const sessionKeys = new Set<string>();

/** Normaliza a mensagem pra agrupar erros parecidos numa única assinatura. */
function buildDedupKey(route: string, message: string): string {
  const normalized = message
    .replace(/[0-9a-f]{8,}/gi, '#') // hashes/uuids/hex
    .replace(/\d+/g, '#') // números variáveis
    .slice(0, 200)
    .trim();
  return `${route}::${normalized}`;
}

function readCooldownMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCooldownMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage indisponível (modo privado / quota) — segue sem cooldown persistente.
  }
}

/** Retorna true se a assinatura ainda está no cooldown (não deve reenviar). */
function isOnCooldown(key: string): boolean {
  const now = Date.now();
  const map = readCooldownMap();
  // limpa entradas expiradas de quebra
  let changed = false;
  for (const k of Object.keys(map)) {
    if (now - map[k] > COOLDOWN_MS) {
      delete map[k];
      changed = true;
    }
  }
  const onCooldown = map[key] != null && now - map[key] <= COOLDOWN_MS;
  if (!onCooldown) {
    map[key] = now;
    changed = true;
  }
  if (changed) writeCooldownMap(map);
  return onCooldown;
}

function truncateTitle(message: string): string {
  const firstLine = (message || 'Erro inesperado').split('\n')[0].trim();
  return firstLine.length > MAX_TITLE ? `${firstLine.slice(0, MAX_TITLE - 1)}…` : firstLine;
}

interface CaptureInput {
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  origin: 'window.error' | 'unhandledrejection' | 'react.errorBoundary';
}

async function capture(input: CaptureInput): Promise<void> {
  if (inFlight) return;
  if (sessionCount >= MAX_PER_SESSION) return;

  const message = (input.message || '').trim() || 'Erro inesperado';
  const context = captureContext();
  const route = context.route || context.pathname || '';
  const key = buildDedupKey(route, message);

  // já registrado nesta sessão? incrementa só no banco (a RPC cuida disso),
  // mas evita reprocessar localmente repetidas vezes.
  if (sessionKeys.has(key)) return;
  if (isOnCooldown(key)) {
    sessionKeys.add(key);
    return;
  }

  inFlight = true;
  try {
    // Só registra com sessão ativa (RLS exige tenant; páginas públicas ignoram).
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const descriptionParts = [
      `[captura automática · ${input.origin}]`,
      message,
    ];
    if (input.stack) descriptionParts.push('\nStack:\n' + input.stack);
    if (input.componentStack) {
      descriptionParts.push('\nComponente:\n' + input.componentStack);
    }

    const result = await reportAutoBug({
      supabase,
      title: truncateTitle(message),
      description: descriptionParts.join('\n').slice(0, 4000),
      context,
      dedupKey: key,
    });

    if (!result.error) {
      sessionKeys.add(key);
      sessionCount += 1;
    }
  } catch {
    // nunca deixar a captura derrubar o app
  } finally {
    inFlight = false;
  }
}

/** Chamado pelo ErrorBoundary quando uma tela quebra (crash de render). */
export function captureRenderError(error: Error, componentStack?: string | null): void {
  void capture({
    message: error?.message || String(error),
    stack: error?.stack ?? null,
    componentStack: componentStack ?? null,
    origin: 'react.errorBoundary',
  });
}

/** Registra os listeners globais. Idempotente — pode chamar mais de uma vez. */
export function initAutoBugCapture(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    // ignora erros de carregamento de recurso (img/script) sem mensagem útil
    if (!event.message && !event.error) return;
    void capture({
      message: event.message || (event.error?.message ?? 'Erro inesperado'),
      stack: event.error?.stack ?? null,
      origin: 'window.error',
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Promise rejeitada sem tratamento';
    void capture({
      message,
      stack: reason instanceof Error ? (reason.stack ?? null) : null,
      origin: 'unhandledrejection',
    });
  });
}

/** Exposto para testes — limpa o estado em memória. */
export function __resetAutoBugCaptureForTests(): void {
  initialized = false;
  inFlight = false;
  sessionCount = 0;
  sessionKeys.clear();
}
