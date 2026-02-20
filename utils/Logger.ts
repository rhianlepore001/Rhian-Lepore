/* eslint-disable no-console */
import { supabase } from '../lib/supabase';

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
    async error(message: string, error?: any, context?: LogContext) {
        // 1. Console local
        console.error(`[ERROR] ${message}`, error || '', context || '');

        // 2. Enviar para Supabase (System Errors)
        try {
            const errorData = {
                p_message: message,
                p_stack: error?.stack || null,
                p_component_stack: context?.componentStack || null,
                p_severity: 'error',
                p_context: {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    ...context,
                    rawError: error?.toString()
                }
            };

            // Fire and forget (não aguardar para não bloquear UI)
            supabase.rpc('log_error', errorData).then(({ error: dbError }) => {
                if (dbError) console.error('Falha ao enviar log para o banco:', dbError);
            });

        } catch (loggingError) {
            console.error('Erro crítico no logger:', loggingError);
        }

        // 3. Integração Futura com Sentry
        // if (Sentry) Sentry.captureException(error);
    }

    /**
     * Loga erro crítico (Critical) - sistema inoperante
     */
    async critical(message: string, error?: any, context?: LogContext) {
        console.error(`[CRITICAL] ${message}`, error || '', context || '');
        await this.error(message, error, { ...context, severity: 'critical' });
    }
}

export const logger = new LoggerService();
