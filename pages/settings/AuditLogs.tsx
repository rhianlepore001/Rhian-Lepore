import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import {
    Shield, Download, Filter, Calendar,
    User, Activity, RefreshCw, ChevronDown,
    ChevronUp, Eye, FileText, Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    AuditLog,
    getAuditLogs,
    formatAction,
    formatResourceType,
    downloadLogsAsCSV,
    calculateDiff
} from '../../lib/auditLogs';

export const AuditLogs: React.FC = () => {
    const { userType } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    // Filtros
    const [actionFilter, setActionFilter] = useState<string>('');
    const [resourceFilter, setResourceFilter] = useState<string>('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: ''
    });

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs({
                action: actionFilter || undefined,
                resource_type: resourceFilter || undefined,
                start_date: dateRange.start || undefined,
                end_date: dateRange.end || undefined,
                limit: 100
            });
            setLogs(data);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        downloadLogsAsCSV(logs, `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const toggleLogDetails = (logId: string) => {
        setExpandedLog(expandedLog === logId ? null : logId);
    };

    const getActionColor = (action: string) => {
        const colorMap: Record<string, string> = {
            'CREATE': 'text-green-500',
            'UPDATE': 'text-blue-500',
            'DELETE': 'text-red-500',
            'LOGIN': 'text-purple-500',
            'LOGOUT': 'text-gray-500',
            'LOGIN_FAILED': 'text-orange-500'
        };
        return colorMap[action] || 'text-neutral-400';
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'LOGIN':
            case 'LOGOUT':
                return <User className="w-4 h-4" />;
            case 'CREATE':
            case 'UPDATE':
            case 'DELETE':
                return <FileText className="w-4 h-4" />;
            default:
                return <Activity className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading text-white uppercase flex items-center gap-3">
                        <Shield className={`w-8 h-8 ${accentText}`} />
                        Logs de Auditoria
                    </h2>
                    <p className="text-text-secondary font-mono mt-2 text-sm">
                        Rastreamento completo de todas as ações no sistema
                    </p>
                </div>
                <div className="flex gap-2">
                    <BrutalButton
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCw />}
                        onClick={loadLogs}
                        disabled={loading}
                    >
                        Atualizar
                    </BrutalButton>
                    <BrutalButton
                        variant="primary"
                        size="sm"
                        icon={<Download />}
                        onClick={handleExport}
                        disabled={logs.length === 0}
                    >
                        Exportar CSV
                    </BrutalButton>
                </div>
            </div>

            {/* Filtros */}
            <BrutalCard>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-neutral-400" />
                    <h3 className="text-white font-bold">Filtros</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Ação</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="">Todas</option>
                            <option value="CREATE">Criar</option>
                            <option value="UPDATE">Atualizar</option>
                            <option value="DELETE">Deletar</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Recurso</label>
                        <select
                            value={resourceFilter}
                            onChange={(e) => setResourceFilter(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="">Todos</option>
                            <option value="appointments">Agendamentos</option>
                            <option value="clients">Clientes</option>
                            <option value="financial_records">Financeiro</option>
                            <option value="services">Serviços</option>
                            <option value="team_members">Equipe</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Data Início</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Data Fim</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                        />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <BrutalButton
                        variant="primary"
                        size="sm"
                        onClick={loadLogs}
                    >
                        Aplicar Filtros
                    </BrutalButton>
                </div>
            </BrutalCard>

            {/* Lista de Logs */}
            <BrutalCard noPadding>
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400 mb-2" />
                        <p className="text-neutral-400">Carregando logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center">
                        <Activity className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
                        <p className="text-neutral-400">Nenhum log encontrado</p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800">
                        {logs.map((log) => {
                            const isExpanded = expandedLog === log.id;
                            const diff = calculateDiff(log.old_values, log.new_values);

                            return (
                                <div key={log.id} className="hover:bg-white/5 transition-colors">
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() => toggleLogDetails(log.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`p-2 rounded-lg bg-neutral-800 ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${getActionColor(log.action)}`}>
                                                            {formatAction(log.action)}
                                                        </span>
                                                        <span className="text-neutral-400">•</span>
                                                        <span className="text-white">
                                                            {formatResourceType(log.resource_type)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {log.user_name || 'Sistema'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                        {log.resource_id && (
                                                            <span className="font-mono">
                                                                ID: {log.resource_id.substring(0, 8)}...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Detalhes Expandidos */}
                                        {isExpanded && (
                                            <div className="mt-4 pl-12 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {diff.length > 0 && (
                                                    <div className="p-3 bg-neutral-900 rounded-lg">
                                                        <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">
                                                            Mudanças
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {diff.map((change, idx) => (
                                                                <div key={idx} className="text-sm">
                                                                    <span className="text-neutral-500 font-mono">
                                                                        {change.field}:
                                                                    </span>
                                                                    <div className="flex gap-2 mt-1">
                                                                        <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                                                                            <span className="text-red-400 text-xs">Antes: </span>
                                                                            <span className="text-white text-xs">
                                                                                {JSON.stringify(change.old)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                                                                            <span className="text-green-400 text-xs">Depois: </span>
                                                                            <span className="text-white text-xs">
                                                                                {JSON.stringify(change.new)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <div className="p-3 bg-neutral-900 rounded-lg">
                                                        <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">
                                                            Metadados
                                                        </h4>
                                                        <pre className="text-xs text-neutral-300 font-mono overflow-x-auto">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                                {(log.ip_address || log.user_agent) && (
                                                    <div className="p-3 bg-neutral-900 rounded-lg">
                                                        <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">
                                                            Informações Técnicas
                                                        </h4>
                                                        {log.ip_address && (
                                                            <p className="text-xs text-neutral-300">
                                                                <span className="text-neutral-500">IP:</span> {log.ip_address}
                                                            </p>
                                                        )}
                                                        {log.user_agent && (
                                                            <p className="text-xs text-neutral-300 mt-1">
                                                                <span className="text-neutral-500">User Agent:</span>{' '}
                                                                {log.user_agent.substring(0, 100)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </BrutalCard>

            {/* Rodapé com Estatísticas */}
            {logs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Total de Eventos</p>
                        <p className={`text-3xl font-bold ${accentText}`}>{logs.length}</p>
                    </BrutalCard>
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Período</p>
                        <p className="text-white text-sm font-mono">
                            {logs.length > 0 && new Date(logs[logs.length - 1].created_at).toLocaleDateString('pt-BR')}
                            {' - '}
                            {logs.length > 0 && new Date(logs[0].created_at).toLocaleDateString('pt-BR')}
                        </p>
                    </BrutalCard>
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Retenção</p>
                        <p className="text-white text-sm">180 dias</p>
                    </BrutalCard>
                </div>
            )}
        </div>
    );
};
