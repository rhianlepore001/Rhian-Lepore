import React, { useState } from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { OpenRouterService } from '../../lib/openrouter';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Instagram, Send, RefreshCw, Loader2, Check } from 'lucide-react';
import { logger } from '../../utils/Logger';

export const InstagramIdeas: React.FC = () => {
    const { businessName, userType } = useAuth();
    const [loading, setLoading] = useState(false);
    const [ideas, setIdeas] = useState<any[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const generateIdeas = async () => {
        setLoading(true);
        try {
            const data = await OpenRouterService.generateInstagramIdeas(
                businessName || 'Meu Negócio',
                userType || 'barber',
                userType === 'beauty' ? 'Estética e Bem-estar' : 'Barbearia Clássica'
            );
            setIdeas(data.ideas || []);
        } catch (error) {
            logger.error('Erro ao buscar ideias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <BrutalCard title="Ideias para Instagram" className="bg-neutral-900 border-white/10">
            {!ideas.length && !loading ? (
                <div className="text-center py-8">
                    <Instagram className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-sm text-text-secondary mb-4">Gerar pautas de conteúdo baseadas no seu perfil.</p>
                    <BrutalButton
                        variant="primary"
                        size="sm"
                        onClick={generateIdeas}
                        icon={<Sparkles className="w-4 h-4" />}
                    >
                        Gerar Ideias com IA
                    </BrutalButton>
                </div>
            ) : (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
                            <span className="text-xs font-mono text-text-secondary uppercase animate-pulse">Consultando Sócio Virtual...</span>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {ideas.map((idea, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-bold text-white uppercase">{idea.title}</h4>
                                            <span className="text-[10px] bg-accent-gold/20 text-accent-gold px-2 py-0.5 rounded uppercase font-bold">Post</span>
                                        </div>
                                        <p className="text-[11px] text-text-secondary italic">Visual: {idea.visual}</p>
                                        <div className="relative group">
                                            <p className="text-xs text-text-primary line-clamp-3 bg-black/30 p-2 rounded border border-white/5 font-sans">
                                                {idea.caption}
                                            </p>
                                            <button
                                                onClick={() => handleCopy(idea.caption, i)}
                                                className="absolute top-2 right-2 p-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                            >
                                                {copiedIndex === i ? <Check className="w-3 h-3 text-green-500" /> : <Send className="w-3 h-3 text-white" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <BrutalButton
                                variant="ghost"
                                size="sm"
                                fullWidth
                                onClick={generateIdeas}
                                icon={<RefreshCw className="w-3 h-3" />}
                                className="text-[10px] uppercase font-bold"
                            >
                                Gerar novas pautas
                            </BrutalButton>
                        </>
                    )}
                </div>
            )}
        </BrutalCard>
    );
};
