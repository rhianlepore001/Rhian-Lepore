/**
 * Remove o token do convite de colaborador (&invite=<token>) de URLs antes de
 * gravar em logs ou relatos de bug. Vale para a query normal e para a query
 * dentro do hash (/#/register?...&invite=...).
 */
const INVITE_PARAM_RE = /([?&]invite=)[^&#\s]*/gi;

export function redactInviteToken(value: string): string {
    if (!value) return value;
    return value.replace(INVITE_PARAM_RE, '$1[redacted]');
}
