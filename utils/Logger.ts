/* eslint-disable no-console */
import { supabase } from '../lib/supabase';

/** Log level type for logging severity */
export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * Additional context information for log entries
 * @interface LogContext
 */
interface LogContext {
    [key: string]: any;
}

/**
 * Logging service for application-wide logging and error tracking
 * Logs to console in development and to Supabase in production for audit trail
 * @class LoggerService
 */
class LoggerService {
    private isDevelopment = import.meta.env.DEV;

    /**
     * Log informational message
     * @param {string} message - Log message
     * @param {LogContext} [context] - Additional context data
     */
    info(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.info(`[INFO] ${message}`, context || '');
        }
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {LogContext} [context] - Additional context data
     */
    warn(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.warn(`[WARN] ${message}`, context || '');
        }
        // Opcional: Enviar warnings críticos para o banco
    }

    /**
     * Log error message and send to Supabase for audit trail
     * @async
     * @param {string} message - Error message
     * @param {any} [error] - Error object/exception
     * @param {LogContext} [context] - Additional context data
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
     * Log critical error (system-critical level)
     * Used when system functionality is impaired or unavailable
     * @async
     * @param {string} message - Critical error message
     * @param {any} [error] - Error object/exception
     * @param {LogContext} [context] - Additional context data
     */
    async critical(message: string, error?: any, context?: LogContext) {
        console.error(`[CRITICAL] ${message}`, error || '', context || '');
        await this.error(message, error, { ...context, severity: 'critical' });
    }
}

/**
 * Global logger instance for application-wide use
 * @type {LoggerService}
 */
export const logger = new LoggerService();
