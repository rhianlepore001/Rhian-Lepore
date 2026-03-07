import React, { useState, useRef } from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { OpenRouterService } from '../../lib/openrouter';
import { ImageIcon, Wand2, Upload, Loader2, Check, Sparkles } from 'lucide-react';
import { logger } from '../../utils/Logger';

export const PhotoStudio: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [instruction, setInstruction] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApplyAI = async () => {
        if (!image || !instruction) return;
        setLoading(true);
        try {
            const feedback = await OpenRouterService.analyzeAndSuggestPhotoEdit(image, instruction);
            setResult(feedback);
        } catch (error) {
            logger.error('Erro no Estúdio Visual:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BrutalCard title="Visual Studio IA" className="bg-gradient-to-br from-neutral-900 to-black border-white/20">
            <div className="space-y-4">
                {!image ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <Upload className="w-10 h-10 text-neutral-700 mx-auto mb-3 group-hover:text-accent-gold transition-colors" />
                        <p className="text-xs font-mono text-text-secondary uppercase">Upload da Foto (Corte/Procedimento)</p>
                        <p className="text-[10px] text-neutral-600 mt-1">O Gemini Nano analisará e sugerirá melhorias premium.</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                            <img src={image} alt="Upload" className="max-h-full object-contain" />
                            <button
                                onClick={() => { setImage(null); setResult(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg backdrop-blur-md hover:bg-red-500/80 transition-all"
                            >
                                <Check className="w-4 h-4 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-text-secondary uppercase">Instrução para a IA</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="Ex: Deixar visual mais premium, corrigir brilho..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-accent-gold/50"
                                />
                                <BrutalButton
                                    variant="primary"
                                    size="sm"
                                    onClick={handleApplyAI}
                                    loading={loading}
                                    disabled={!instruction}
                                    icon={<Wand2 className="w-4 h-4" />}
                                >
                                    Aplicar
                                </BrutalButton>
                            </div>
                        </div>

                        {result && (
                            <div className="p-4 rounded-xl bg-accent-gold/5 border border-accent-gold/20 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-accent-gold" />
                                    <span className="text-[10px] font-mono text-accent-gold uppercase font-bold">Feedback do Nano Pro</span>
                                </div>
                                <p className="text-xs text-text-primary leading-relaxed">
                                    {result}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BrutalCard>
    );
};
