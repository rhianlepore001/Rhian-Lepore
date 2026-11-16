/**
 * O token do convite (&invite=) não pode ir para logs nem para o relato de bug.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redactInviteToken } from '@/utils/redactUrl';
import { captureContext } from '@/lib/bugReport';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/Logger';

const TOKEN = 'ab'.repeat(32);
const INVITE_URL = `https://app.example.com/#/register?company=c1&member=m1&invite=${TOKEN}`;

describe('redactInviteToken', () => {
    it('troca o valor de invite= e mantém o resto do link', () => {
        expect(redactInviteToken(INVITE_URL)).toBe('https://app.example.com/#/register?company=c1&member=m1&invite=[redacted]');
        expect(redactInviteToken(`/#/register?invite=${TOKEN}&company=c1`)).toBe('/#/register?invite=[redacted]&company=c1');
        expect(redactInviteToken('https://app.example.com/#/agenda')).toBe('https://app.example.com/#/agenda');
        expect(redactInviteToken('')).toBe('');
    });

    it('não mexe em parâmetros parecidos (ex.: invited=)', () => {
        expect(redactInviteToken('/x?invited=1&invite=abc')).toBe('/x?invited=1&invite=[redacted]');
    });
});

describe('logs e relato de bug sem o token', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState(null, '', `/?invite=${TOKEN}#/register?company=c1&member=m1&invite=${TOKEN}`);
    });

    it('captureContext redige route, search, hash e url', () => {
        const ctx = captureContext();
        const all = [ctx.route, ctx.search, ctx.hash, ctx.url].join(' ');
        expect(all).not.toContain(TOKEN);
        expect(ctx.url).toContain('invite=[redacted]');
        expect(ctx.hash).toContain('member=m1');
    });

    it('Logger.error envia a url redigida', async () => {
        const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
        rpc.mockResolvedValue({ data: null, error: null });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await logger.error('falhou', new Error('x'));
        const call = rpc.mock.calls.find((c) => c[0] === 'log_error');
        expect(call).toBeTruthy();
        expect(JSON.stringify(call![1])).not.toContain(TOKEN);
        expect(call![1].p_context.url).toContain('invite=[redacted]');
    });
});
