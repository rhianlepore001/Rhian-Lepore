import { supabase } from './supabase';

/**
 * Audit log entry for compliance and activity tracking
 * @interface AuditLog
 */
export interface AuditLog {
    /** Unique audit log ID */
    id: string;

    /** User who performed the action */
    user_id: string;

    /** User's display name */
    user_name?: string;

    /** Action performed (e.g., 'create', 'update', 'delete') */
    action: string;

    /** Type of resource affected (e.g., 'appointment', 'client', 'service') */
    resource_type: string;

    /** ID of the affected resource */
    resource_id?: string;

    /** Previous values before change */
    old_values?: Record<string, unknown>;

    /** New values after change */
    new_values?: Record<string, unknown>;

    /** IP address of request */
    ip_address?: string;

    /** User agent of request */
    user_agent?: string;

    /** Additional metadata */
    metadata?: Record<string, unknown>;

    /** Timestamp of the audit log */
    created_at: string;
}

/**
 * Filter options for audit log queries
 * @interface AuditLogFilters
 */
export interface AuditLogFilters {
    /** Maximum number of results to return */
    limit?: number;

    /** Offset for pagination */
    offset?: number;

    /** Filter by action type */
    action?: string;

    /** Filter by resource type */
    resource_type?: string;

    /** Start date for range filter (ISO format) */
    start_date?: string;

    /** End date for range filter (ISO format) */
    end_date?: string;
}

/**
 * Create an audit log entry
 * Records user actions for compliance and audit trail purposes
 *
 * @param {string} action - Action performed (create, update, delete, etc)
 * @param {string} resource_type - Type of resource affected
 * @param {string} [resource_id] - ID of the affected resource
 * @param {Record<string, unknown>} [old_values] - Previous values
 * @param {Record<string, unknown>} [new_values] - New values after change
 * @param {Record<string, unknown>} [metadata] - Additional context
 * @returns {Promise<AuditLog>} Created audit log entry
 * @throws {Error} If audit log creation fails
 *
 * @example
 * await createAuditLog('update', 'appointment', '123',
 *   { status: 'pending' },
 *   { status: 'confirmed' }
 * );
 */
export async function createAuditLog(
    action: string,
    resource_type: string,
    resource_id?: string,
    old_values?: Record<string, unknown>,
    new_values?: Record<string, unknown>,
    metadata?: Record<string, unknown>
) {
    const { data, error } = await supabase.rpc('create_audit_log', {
        p_action: action,
        p_resource_type: resource_type,
        p_resource_id: resource_id,
        p_old_values: old_values,
        p_new_values: new_values,
        p_metadata: metadata || {}
    });

    if (error) {
        console.error('Erro ao criar log de auditoria:', error);
        throw error;
    }

    return data;
}

/**
 * Fetch audit logs with optional filtering and pagination
 * Supports filtering by action, resource type, and date range
 *
 * @param {AuditLogFilters} [filters={}] - Query filters
 * @returns {Promise<AuditLog[]>} Array of matching audit logs
 * @throws {Error} If query fails
 *
 * @example
 * const logs = await getAuditLogs({
 *   resource_type: 'appointment',
 *   start_date: '2024-01-01',
 *   limit: 100
 * });
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
    const {
        limit = 50,
        offset = 0,
        action,
        resource_type,
        start_date,
        end_date
    } = filters;

    const { data, error } = await supabase.rpc('get_audit_logs', {
        p_limit: limit,
        p_offset: offset,
        p_action: action,
        p_resource_type: resource_type,
        p_start_date: start_date,
        p_end_date: end_date
    });

    if (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        throw error;
    }

    return data as AuditLog[];
}

/**
 * Formata a ação para exibição amigável
 */
export function formatAction(action: string): string {
    const actionMap: Record<string, string> = {
        'CREATE': 'Criou',
        'UPDATE': 'Atualizou',
        'DELETE': 'Deletou',
        'LOGIN': 'Fez login',
        'LOGOUT': 'Fez logout',
        'LOGIN_FAILED': 'Tentativa de login falhou',
        'PASSWORD_CHANGE': 'Alterou senha',
        'EMAIL_CHANGE': 'Alterou email',
        'EXPORT': 'Exportou dados',
        'IMPORT': 'Importou dados',
        'BACKUP': 'Criou backup'
    };

    return actionMap[action] || action;
}

/**
 * Formata o tipo de recurso para exibição amigável
 */
export function formatResourceType(resourceType: string): string {
    const resourceMap: Record<string, string> = {
        'appointments': 'Agendamento',
        'clients': 'Cliente',
        'financial_records': 'Registro Financeiro',
        'services': 'Serviço',
        'team_members': 'Membro da Equipe',
        'profiles': 'Perfil',
        'categories': 'Categoria'
    };

    return resourceMap[resourceType] || resourceType;
}

/**
 * Calcula o diff entre valores antigos e novos
 */
export function calculateDiff(
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
): { field: string; old: unknown; new: unknown }[] {
    if (!oldValues || !newValues) return [];

    const diff: { field: string; old: unknown; new: unknown }[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach(key => {
        if (oldValues[key] !== newValues[key]) {
            diff.push({
                field: key,
                old: oldValues[key],
                new: newValues[key]
            });
        }
    });

    return diff;
}

/**
 * Exporta logs para CSV
 */
export function exportLogsToCSV(logs: AuditLog[]): string {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Recurso', 'ID do Recurso'];
    const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.user_name || 'Sistema',
        formatAction(log.action),
        formatResourceType(log.resource_type),
        log.resource_id || '-'
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
}

/**
 * Baixa logs como arquivo CSV
 */
export function downloadLogsAsCSV(logs: AuditLog[], filename = 'audit_logs.csv') {
    const csv = exportLogsToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
