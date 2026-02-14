import { supabase } from './supabase';

export interface AuditLog {
    id: string;
    user_id: string;
    user_name?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface AuditLogFilters {
    limit?: number;
    offset?: number;
    action?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
}

/**
 * Cria um log de auditoria manualmente
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
 * Busca logs de auditoria com filtros opcionais
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
