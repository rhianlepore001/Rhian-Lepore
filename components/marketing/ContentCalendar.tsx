import React, { useState, useEffect, useRef } from 'react';
import { BrutalButton } from '../BrutalButton';
import { useAuth } from '../../contexts/AuthContext';
import { useContentCalendar, type CalendarPost } from '../../hooks/useContentCalendar';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles,
    Copy, Check, Loader2, X, Download, Star
} from 'lucide-react';

export const ContentCalendar: React.FC = () => {
    const { userType } = useAuth();
    const { posts, loading, generatePosts } = useContentCalendar();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const templateRef = useRef<HTMLDivElement>(null);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    useEffect(() => {
        generatePosts(year, month);
    }, [year, month]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDownload = async () => {
        if (!templateRef.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(templateRef.current, {
                backgroundColor: null,
                scale: 2,
            });
            const link = document.createElement('a');
            link.download = `post-dia-${selectedPost?.day}-${monthName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch {
            // Fallback: copiar texto
            if (selectedPost) handleCopy(selectedPost.caption + '\n\n' + selectedPost.hashtags, 'all');
        }
    };

    const prevMonth = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
    };

    const nextMonth = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10'}`}>
                        <CalendarIcon className={`w-5 h-5 ${accentText}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-heading text-white uppercase leading-none">{monthName}</h3>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            {posts.length} posts gerados por IA
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg text-text-secondary">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg text-text-secondary">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <BrutalButton variant="ghost" size="sm" onClick={() => generatePosts(year, month)} className="ml-2">
                        <Sparkles className="w-4 h-4 mr-1" /> Gerar Novos
                    </BrutalButton>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className={`w-10 h-10 animate-spin ${accentText}`} />
                    <p className="text-xs font-mono text-text-secondary uppercase animate-pulse">
                        Gerando 30 posts com IA...
                    </p>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-neutral-700 rounded-xl">
                    <CalendarIcon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400 mb-4">Nenhum post gerado ainda para este mês.</p>
                    <BrutalButton variant="primary" onClick={() => generatePosts(year, month)}>
                        <Sparkles className="w-4 h-4 mr-2" /> Gerar Posts com IA
                    </BrutalButton>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {posts.map((post) => (
                        <button
                            key={post.day}
                            onClick={() => setSelectedPost(post)}
                            className={`relative p-3 rounded-xl border border-white/5 hover:border-white/20 transition-all text-left group bg-gradient-to-br ${post.bgGradient} min-h-[100px]`}
                        >
                            <span className="text-xs font-mono font-bold text-white/80">
                                Dia {post.day}
                            </span>
                            {post.holiday && (
                                <span className="absolute top-2 right-2">
                                    <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                </span>
                            )}
                            <p className="text-[10px] text-white/90 mt-1 line-clamp-2 font-medium">
                                {post.theme}
                            </p>
                            <p className="text-[9px] text-white/60 mt-1 line-clamp-1">
                                {post.caption.substring(0, 40)}...
                            </p>
                        </button>
                    ))}
                </div>
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Template Preview */}
                        <div
                            ref={templateRef}
                            className={`bg-gradient-to-br ${selectedPost.bgGradient} p-8 rounded-t-2xl min-h-[200px] flex flex-col justify-center items-center text-center`}
                        >
                            <span className="text-white/60 text-xs font-mono mb-2">
                                Dia {selectedPost.day} • {monthName}
                            </span>
                            <h3 className="text-2xl font-heading text-white uppercase mb-2">
                                {selectedPost.theme}
                            </h3>
                            {selectedPost.holiday && (
                                <span className="bg-yellow-400/20 text-yellow-300 text-xs px-3 py-1 rounded-full font-mono">
                                    {selectedPost.holiday}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-neutral-400 text-xs font-mono uppercase">Legenda</label>
                                    <button
                                        onClick={() => handleCopy(selectedPost.caption, 'caption')}
                                        className={`text-xs flex items-center gap-1 ${accentText}`}
                                    >
                                        {copiedField === 'caption' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedField === 'caption' ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                                <p className="text-white text-sm leading-relaxed bg-neutral-800 p-3 rounded-lg">
                                    {selectedPost.caption}
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-neutral-400 text-xs font-mono uppercase">Hashtags</label>
                                    <button
                                        onClick={() => handleCopy(selectedPost.hashtags, 'hashtags')}
                                        className={`text-xs flex items-center gap-1 ${accentText}`}
                                    >
                                        {copiedField === 'hashtags' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedField === 'hashtags' ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                                <p className="text-neutral-300 text-xs bg-neutral-800 p-3 rounded-lg font-mono">
                                    {selectedPost.hashtags}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <BrutalButton variant="primary" fullWidth onClick={handleDownload}>
                                    <Download className="w-4 h-4 mr-2" /> Baixar Imagem
                                </BrutalButton>
                                <BrutalButton
                                    variant="ghost"
                                    onClick={() => handleCopy(selectedPost.caption + '\n\n' + selectedPost.hashtags, 'all')}
                                >
                                    {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </BrutalButton>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedPost(null)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
