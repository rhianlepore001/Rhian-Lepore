/**
 * Gera um txid (Transaction ID) Pix válido conforme BACEN:
 * - 26 caracteres (max oficial)
 * - Alfanumérico (A-Z, 0-9)
 * - Sem caracteres especiais
 *
 * Usa crypto.getRandomValues quando disponível, senão Math.random (fallback).
 */
export function generatePixTxid(prefix = 'AGX'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const maxLen = 26;
    const prefixLen = Math.min(prefix.length, 4);
    const randomLen = maxLen - prefixLen;
    let result = prefix.slice(0, prefixLen).toUpperCase();
    const buf = new Uint8Array(randomLen);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(buf);
    } else {
        for (let i = 0; i < randomLen; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < randomLen; i++) {
        result += chars[buf[i] % chars.length];
    }
    return result;
}
