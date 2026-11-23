import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/Logger';

const rpc = vi.mocked(supabase.rpc);

describe('Telemetria de erros do navegador', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        window.history.replaceState(null, '', '/');
    });

    it('agrupa a rota e envia somente códigos reconhecidos e severidade', async () => {
        window.history.replaceState(null, '', '/?token=ficticio#/book/salao-fixture?invite=valor-ficticio');
        const error = Object.assign(new TypeError('cliente@example.invalid'), {
            code: 'PGRST202',
            status: 404,
        });

        await logger.error('contato cliente@example.invalid', error, {
            componentStack: 'https://example.invalid/path?contato=cliente@example.invalid',
            userAgent: 'navegador-ficticio',
            context: { token: 'valor-ficticio' },
            route: 'outra-rota',
        });

        expect(rpc).toHaveBeenCalledTimes(1);
        expect(rpc).toHaveBeenCalledWith('log_error', {
            p_message: 'client_error',
            p_severity: 'error',
            p_context: {
                route: '/book',
                error_name: 'TypeError',
                error_code: 'PGRST202',
                error_status: 404,
            },
        });
    });

    it('reduz rotas e códigos desconhecidos e registra a severidade crítica', async () => {
        window.history.replaceState(null, '', '/#/cliente@example.invalid');

        await logger.critical('falha', { code: '123456', name: 'identificador-ficticio', status: 123456 });

        expect(rpc).toHaveBeenCalledTimes(1);
        expect(rpc).toHaveBeenCalledWith('log_error', {
            p_message: 'client_error',
            p_severity: 'critical',
            p_context: { route: 'other' },
        });
    });

    it('trata falha de transporte sem propagar a rejeição', async () => {
        rpc.mockRejectedValueOnce(new Error('rede indisponível'));

        await expect(logger.error('falha')).resolves.toBeUndefined();
    });
});
