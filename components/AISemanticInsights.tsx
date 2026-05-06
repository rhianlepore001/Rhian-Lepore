
import React, { useEffect, useState } from 'react';
import { Sparkles, Brain, Lightbulb, History } from 'lucide-react';
import { useSemanticMemory, SemanticMemory } from '../hooks/useSemanticMemory';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface AISemanticInsightsProps {
    clientId: string;
    clientName: string;
}

export const AISemanticInsights: React.FC<AISemanticInsightsProps> = ({ clientId, clientName }) => {
    const { searchMemories } = useSemanticMemory();
    const { accent } = useBrutalTheme();
    const [insights, setInsights] = useState<SemanticMemory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadInsights() {
            setLoading(true);
            try {
                // Buscamos memórias genéricas e relacionadas a estilo/preferência
                const results = await searchMemories(clientId, 'preferências, estilo, gostos, hábitos', 3, 0.4);
                setInsights(results);
            } catch (error) {
                console.error('Error loading AI insights:', error);
            } finally {
                setLoading(false);
            }
        }

        if (clientId) {
            loadInsights();
        }
    }, [clientId]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                <div className={`h-4 w-32 ${accent.bgDim} rounded`}></div>
                <div className={`h-20 w-full ${accent.bgDim} rounded`}></div>
            </div>
        );
    }

    if (insights.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-neutral-800 rounded-lg">
                <Brain className="w-8 h-8 text-neutral-700 mb-2" />
                <p className="text-xs text-neutral-500 font-mono uppercase">Sem memórias profundas ainda para {clientName.split(' ')[0]}</p>
                <p className="text-[10px] text-neutral-600 mt-1">Anote preferências nas notas para ativar a IA.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${accent.text}`}>
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-heading text-sm uppercase tracking-wider">Memória da IA</h3>
                </div>
                <span className="text-[8px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-700 font-mono">EMBEDDINGS-004</span>
            </div>

            <div className="grid gap-3">
                {insights.map((insight, idx) => (
                    <div
                        key={insight.id}
                        className={`p-3 border-l-4 ${accent.border} ${accent.bgDim} relative group overflow-hidden`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 ${accent.text}`}>
                                {insight.context_type === 'style' ? <History className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-white/90 leading-relaxed italic">
                                    &quot;{insight.observation}&quot;
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] text-neutral-500 font-mono uppercase">
                                        {insight.context_type === 'style' ? 'Estilo' : 'Preferência'}
                                    </span>
                                    <span className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Match: {Math.round((insight.similarity || 0) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Subtle bg icon */}
                        <Brain className={`absolute -bottom-2 -right-2 w-12 h-12 opacity-[0.03] ${accent.text}`} />
                    </div>
                ))}
            </div>

            <div className={`mt-2 p-2 rounded ${accent.bgDim} border border-dashed ${accent.border}`}>
                <p className="text-[10px] text-neutral-400 text-center">
                    A IA está relacionando notas passadas para este atendimento.
                </p>
            </div>
        </div>
    );
};
