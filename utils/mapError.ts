/**
 * Mapa de erro: traduz exceções do Supabase/JS em copy humana PT-BR + código curto
 * para suporte. Nunca renderize `error.message` cru no JSX — passe por aqui.
 *
 * DS Lock §9 (voz/copy) + SPEC §7.3 (tratamento de erro humano).
 */

export interface UserFacingError {
  /** Mensagem curta e acionável em PT-BR (não técnica). */
  message: string;
  /** Código curto exibido como suffix para suporte rastrear. */
  code: string;
  /** Erro original preservado para Logger. Nunca renderize. */
  originalError: unknown;
}

interface RawErrorShape {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}

// PostgREST/Supabase + códigos comuns → copy curta
const CODE_MAP: Record<string, string> = {
  // Rede / Auth
  network_error: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  auth_expired: 'Sua sessão expirou. Faça login novamente.',
  permission_denied: 'Você não tem permissão para essa ação.',
  invalid_login: 'E-mail ou senha incorretos. Verifique e tente de novo.',
  rate_limit_login: 'Muitas tentativas de login. Por segurança, aguarde 1 minuto.',

  // Postgres
  '23505': 'Esse registro já existe.',
  '23503': 'Não foi possível concluir: existe um vínculo com outro registro.',
  '22P02': 'Algum campo está em formato inválido. Revise e tente de novo.',
  '42501': 'Você não tem permissão para essa ação.',

  // PostgREST
  PGRST116: 'Não encontramos esse registro.',
  PGRST301: 'A sessão expirou. Faça login novamente.',
};

function pickCode(raw: RawErrorShape): string {
  const msg = (raw.message ?? '').toLowerCase();

  if (raw.code && CODE_MAP[raw.code]) return raw.code;
  if (msg.includes('invalid login credentials') || msg.includes('credenciais inválidas')) {
    return 'invalid_login';
  }
  if (msg.includes('muitas tentativas')) return 'rate_limit_login';
  if (raw.status === 401) return 'auth_expired';
  if (raw.status === 403) return 'permission_denied';
  if (raw.name === 'TypeError' && msg.includes('failed to fetch')) return 'network_error';
  return raw.code ?? raw.status?.toString() ?? 'unknown';
}

function shortRef(code: string): string {
  // Code visível para suporte (não exibe stack, só um marcador curto).
  return `#${code.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'ERR'}`;
}

/**
 * Converte qualquer erro capturado em uma `UserFacingError` segura para exibir.
 *
 * @param error o erro original (de try/catch)
 * @param fallback copy padrão quando o código não estiver mapeado. Não exponha `error.message`.
 */
export function mapError(error: unknown, fallback: string): UserFacingError {
  const raw: RawErrorShape =
    error && typeof error === 'object'
      ? (error as RawErrorShape)
      : { message: String(error ?? '') };

  const code = pickCode(raw);
  const human = CODE_MAP[code] ?? fallback;

  return {
    message: human,
    code: shortRef(code),
    originalError: error,
  };
}

/** Combina message + código em uma única string para toasts simples. */
export function formatUserFacingError(err: UserFacingError): string {
  return `${err.message} (${err.code})`;
}
