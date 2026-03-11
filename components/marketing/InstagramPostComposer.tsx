import React, { useState } from 'react';
import { Instagram, Sparkles, Copy, Check, RefreshCw, Loader2, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Image } from 'lucide-react';
import { OpenRouterService } from '../../lib/openrouter';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/Logger';

interface PostIdea {
    title: string;
    visual: string;
    caption: string;
}

const GRADIENT_PRESETS = [
    'from-pink-500 via-purple-500 to-indigo-500',
    'from-amber-500 via-orange-500 to-red-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-violet-500 via-fuchsia-500 to-pink-500',
    'from-blue-500 via-indigo-500 to-purple-500',
    'from-rose-400 via-pink-500 to-fuchsia-500',
];

export const InstagramPostComposer: React.FC = () => {
    const { businessName, userType } = useAuth();
    const [loading, setLoading] = useState(false);
    const [ideas, setIdeas] = useState<PostIdea[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [editedCaption, setEditedCaption] = useState('');

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const generateIdeas = async () => {
        setLoading(true);
        try {
            const data = await OpenRouterService.generateInstagramIdeas(
                businessName || 'Meu Negócio',
                userType || 'barber',
                isBeauty ? 'Estética e Bem-estar' : 'Barbearia Clássica'
            );
            const newIdeas = data.ideas || [];
            setIdeas(newIdeas);
            setSelectedIndex(0);
            if (newIdeas[0]) setEditedCaption(newIdeas[0].caption);
        } catch (error) {
            logger.error('Erro ao gerar ideias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSelectIdea = (index: number) => {
        setSelectedIndex(index);
        setEditedCaption(ideas[index].caption);
    };

    const selectedIdea = ideas[selectedIndex];
    const gradient = GRADIENT_PRESETS[selectedIndex % GRADIENT_PRESETS.length];

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md p-8">
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                    <span className="text-xs font-mono text-text-secondary uppercase animate-pulse">
                        Criando posts incríveis...
                    </span>
                </div>
            </div>
        );
    }

    if (ideas.length === 0) {
        return (
            <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <Instagram className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold font-heading text-white">Compositor de Posts</h3>
                        <p className="text-[11px] text-text-secondary font-mono">Crie posts prontos com prévia visual</p>
                    </div>
                </div>
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
                        <Image className="w-8 h-8 text-pink-400/50" />
                    </div>
                    <p className="text-sm text-text-secondary mb-4">
                        Gere ideias de posts com legenda, visual e prévia para Instagram.
                    </p>
                    <button
                        onClick={generateIdeas}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Sparkles className="w-4 h-4" />
                        Gerar posts com IA
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <Instagram className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold font-heading text-white">Compositor de Posts</h3>
                        <p className="text-[11px] text-text-secondary font-mono">{ideas.length} ideias geradas</p>
                    </div>
                </div>
                <button
                    onClick={generateIdeas}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
                    title="Gerar novos"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Idea selector tabs */}
            <div className="px-5 pb-3 flex gap-2">
                {ideas.map((idea, i) => (
                    <button
                        key={i}
                        onClick={() => handleSelectIdea(i)}
                        className={`
                            flex-1 px-3 py-2 rounded-lg text-[10px] font-mono uppercase transition-all truncate
                            ${i === selectedIndex
                                ? 'bg-white/10 text-white border border-white/15'
                                : 'bg-white/[0.02] text-text-secondary border border-white/5 hover:bg-white/5'
                            }
                        `}
                    >
                        {idea.title}
                    </button>
                ))}
            </div>

            {/* Main content: Preview + Editor */}
            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone mockup preview */}
                <div className="flex justify-center">
                    <div className="w-[260px] bg-black rounded-[28px] border-2 border-neutral-700 overflow-hidden shadow-2xl">
                        {/* Phone notch */}
                        <div className="h-6 bg-black flex items-center justify-center">
                            <div className="w-16 h-3 bg-neutral-800 rounded-full" />
                        </div>

                        {/* Instagram header */}
                        <div className="bg-black px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">
                                        {(businessName || 'MN').substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-white truncate max-w-[120px]">
                                    {businessName || 'meunegocio'}
                                </span>
                            </div>
                            <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                        </div>

                        {/* Post image area */}
                        <div className={`aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}>
                            <p className="text-white text-center font-bold text-sm leading-tight drop-shadow-lg">
                                {selectedIdea.visual}
                            </p>
                        </div>

                        {/* Action bar */}
                        <div className="bg-black px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Heart className="w-4 h-4 text-white" />
                                <MessageCircle className="w-4 h-4 text-white" />
                                <Send className="w-4 h-4 text-white" />
                            </div>
                            <Bookmark className="w-4 h-4 text-white" />
                        </div>

                        {/* Caption preview */}
                        <div className="bg-black px-3 pb-3">
                            <p className="text-[8px] text-white leading-relaxed line-clamp-3">
                                <span className="font-bold">{businessName || 'meunegocio'}</span>{' '}
                                {editedCaption.substring(0, 120)}...
                            </p>
                        </div>

                        {/* Phone bottom bar */}
                        <div className="h-4 bg-black flex items-center justify-center">
                            <div className="w-20 h-1 bg-neutral-700 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Editor panel */}
                <div className="space-y-3">
                    {/* Visual description */}
                    <div>
                        <label className="text-[9px] font-mono uppercase text-text-secondary mb-1 block">
                            Descrição visual
                        </label>
                        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                            <p className="text-xs text-text-secondary italic">{selectedIdea.visual}</p>
                        </div>
                    </div>

                    {/* Editable caption */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[9px] font-mono uppercase text-text-secondary">
                                Legenda
                            </label>
                            <button
                                onClick={() => handleCopy(editedCaption, 'caption')}
                                className="flex items-center gap-1 text-[9px] font-mono text-text-secondary hover:text-white transition-colors"
                            >
                                {copiedField === 'caption'
                                    ? <><Check className="w-3 h-3 text-green-400" /> Copiado</>
                                    : <><Copy className="w-3 h-3" /> Copiar</>
                                }
                            </button>
                        </div>
                        <textarea
                            value={editedCaption}
                            onChange={e => setEditedCaption(e.target.value)}
                            rows={5}
                            className="w-full p-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white resize-none focus:outline-none focus:border-white/15 transition-colors"
                        />
                        <p className="text-[9px] text-text-secondary font-mono mt-1">{editedCaption.length} caracteres</p>
                    </div>

                    {/* Copy full post button */}
                    <button
                        onClick={() => handleCopy(
                            `${editedCaption}\n\n📸 Visual: ${selectedIdea.visual}`,
                            'full'
                        )}
                        className={`
                            w-full py-2.5 rounded-xl text-xs font-semibold transition-all
                            ${copiedField === 'full'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                                : 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 text-white border border-pink-500/20 hover:border-pink-500/30'
                            }
                        `}
                    >
                        {copiedField === 'full' ? 'Post copiado!' : 'Copiar post completo'}
                    </button>
                </div>
            </div>
        </div>
    );
};
