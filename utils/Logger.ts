/* eslint-disable no-console */
import { supabase } from '../lib/supabase';
import { errorRouteCategory, safeErrorMetadata } from './errorTelemetry';

// Níveis de Log
export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

// Interface para contexto extra
interface LogContext {
    [key: string]: any;
}

class LoggerService {
    private isDevelopment = import.meta.env.DEV;

    /**
     * Loga mensagem informativa
     */
    info(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.info(`[INFO] ${message}`, context || '');
        }
    }

    /**
     * Loga aviso (Warning)
     */
    warn(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.warn(`[WARN] ${message}`, context || '');
        }
        // Opcional: Enviar warnings críticos para o banco
    }

    /**
     * Loga erro (Error) e envia para o backend
     */
    async error(message: string, error?: unknown, context?: LogContext) {
        if (this.isDevelopment) console.error(`[ERROR] ${message}`, error, context);
        await this.report('error', error);
    }

    /**
     * Loga erro crítico (Critical) - sistema inoperante
     */
    async critical(message: string, error?: unknown, context?: LogContext) {
        if (this.isDevelopment) console.error(`[CRITICAL] ${message}`, error, context);
        await this.report('critical', error);
    }

    private async report(severity: 'error' | 'critical', error: unknown) {
        try {
            const { error: dbError } = await supabase.rpc('log_error', {
                p_message: 'client_error',
                p_severity: severity,
                p_context: {
                    route: typeof window === 'undefined' ? 'other' : errorRouteCategory(window.location),
                    ...safeErrorMetadata(error),
                },
            });
            if (dbError && this.isDevelopment) console.error('Falha ao enviar log para o banco');
        } catch {
            if (this.isDevelopment) console.error('Falha ao enviar log para o banco');
        }
    }
}

export const logger = new LoggerService();
