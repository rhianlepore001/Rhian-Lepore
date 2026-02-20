import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Terminal, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { parseDate } from '../../utils/date';

interface SystemError {
    id: string;
    error_message: string;
    stack_trace: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    context: any;
    resolved: boolean;
    created_at: string;
}

export const SystemLogs: React.FC = () => {
    const [logs, setLogs] = useState<SystemError[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<SystemError | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('system_errors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error('Erro ao carregar logs:', error);
        else setLogs(data || []);
        setLoading(false);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'error': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <SettingsLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                            Monitoramento de Erros
                        </h1>
                        <p className="text-neutral-500 text-sm font-mono mt-1">
                            Rastreamento de falhas e integridade do sistema
                        </p>
                    </div>
                    <button
                        onClick={loadLogs}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    {/* Lista de Logs */}
                    <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-neutral-800 bg-black/20">
                            <h3 className="font-mono text-xs text-neutral-400 uppercase tracking-widest">Últimos Eventos</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {logs.map(log => (
                                <button
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedLog?.id === log.id
                                            ? 'bg-neutral-800 border-neutral-600'
                                            : 'bg-transparent border-transparent hover:bg-neutral-800/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${getSeverityColor(log.severity)}`}>
                                            {log.severity}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-mono">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white line-clamp-2 font-mono leading-relaxed">
                                        {log.error_message}
                                    </p>
                                </button>
                            ))}
                            {logs.length === 0 && !loading && (
                                <div className="text-center py-12 text-neutral-600">
                                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs font-mono">Nenhum erro registrado</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalhes do Log */}
                    <div className="lg:col-span-2 bg-black border border-neutral-800 rounded-xl overflow-hidden flex flex-col relative">
                        {selectedLog ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertCircle className={`w-6 h-6 ${selectedLog.severity === 'critical' || selectedLog.severity === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
                                        <h2 className="text-lg font-bold text-white font-mono break-all">
                                            {selectedLog.error_message}
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                        <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                                            <span className="text-neutral-500 block mb-1">DATA/HORA</span>
                                            <span className="text-white">{new Date(selectedLog.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                                            <span className="text-neutral-500 block mb-1">ID DO EVENTO</span>
                                            <span className="text-white">{selectedLog.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Terminal className="w-4 h-4" /> Contexto
                                        </h3>
                                        <pre className="text-xs font-mono text-green-400 bg-neutral-900 p-4 rounded-lg border border-neutral-800 overflow-x-auto">
                                            {JSON.stringify(selectedLog.context, null, 2)}
                                        </pre>
                                    </div>
                                    {selectedLog.stack_trace && (
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Stack Trace</h3>
                                            <pre className="text-[10px] font-mono text-red-300 bg-red-950/20 p-4 rounded-lg border border-red-900/30 overflow-x-auto leading-relaxed">
                                                {selectedLog.stack_trace}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                                <div className="text-center">
                                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-mono uppercase tracking-widest">Selecione um evento para analisar</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SettingsLayout>
    );
};
