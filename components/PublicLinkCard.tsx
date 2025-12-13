import React, { useState, useEffect } from 'react';
import { BrutalCard } from './BrutalCard';
import { Link as LinkIcon, Copy, ExternalLink, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PublicLinkCardProps {
    businessSlug: string | null;
    publicBookingEnabled?: boolean;
    onSlugCreated?: () => void;
}

export const PublicLinkCard: React.FC<PublicLinkCardProps> = ({ businessSlug, publicBookingEnabled = true, onSlugCreated }) => {
    const { userType, user } = useAuth();
    const [copied, setCopied] = useState(false);

    // Slug configuration states
    const [slugInput, setSlugInput] = useState('');
    const [slugError, setSlugError] = useState<string | null>(null);
    const [slugAvailable, setSlugAvailable] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [saving, setSaving] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    // Debounced availability check
    useEffect(() => {
        if (!slugInput || slugError) {
            setSlugAvailable(false);
            return;
        }

        const timer = setTimeout(() => {
            checkSlugAvailability(slugInput);
        }, 500);

        return () => clearTimeout(timer);
    }, [slugInput, slugError]);

    const validateSlug = (slug: string): string | null => {
        if (slug.length < 3) return "Mínimo 3 caracteres";
        if (slug.length > 50) return "Máximo 50 caracteres";
        if (!/^[a-z0-9-]+$/.test(slug)) return "Apenas letras minúsculas, números e hífens";
        if (slug.startsWith('-') || slug.endsWith('-')) return "Não pode começar ou terminar com hífen";
        if (slug.includes('--')) return "Não pode ter hífens consecutivos";
        return null;
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toLowerCase();
        // Remove caracteres inválidos
        value = value.replace(/[^a-z0-9-]/g, '');
        setSlugInput(value);

        const error = validateSlug(value);
        setSlugError(error);
    };

    const checkSlugAvailability = async (slug: string) => {
        setCheckingAvailability(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('business_slug', slug)
                .single();

            if (error && error.code === 'PGRST116') {
                // No rows found - slug is available
                setSlugAvailable(true);
            } else if (data) {
                // Slug already exists
                setSlugError('Este link já está em uso');
                setSlugAvailable(false);
            }
        } catch (error) {
            console.error('Error checking slug availability:', error);
        } finally {
            setCheckingAvailability(false);
        }
    };

    const handleSaveSlug = async () => {
        if (!user || !slugAvailable || !slugInput) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ business_slug: slugInput })
                .eq('id', user.id);

            if (error) throw error;

            alert('✅ Link criado com sucesso!');
            if (onSlugCreated) onSlugCreated();
            window.location.reload(); // Reload to update the UI
        } catch (error) {
            console.error('Error saving slug:', error);
            alert('❌ Erro ao criar link. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    // Configuration form when no slug exists
    if (!businessSlug) {
        return (
            <BrutalCard className="bg-gradient-to-r from-neutral-900 to-neutral-800 mb-6 border-l-4 border-yellow-500">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-white font-heading text-lg uppercase mb-1">
                                Configure seu Link de Agendamento
                            </h3>
                            <p className="text-neutral-400 text-sm">
                                Crie um link personalizado para seus clientes agendarem online
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 bg-neutral-800/50 p-4 rounded-lg border border-neutral-700">
                        <label className="text-white font-mono text-sm block">
                            Escolha seu identificador único
                        </label>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className="text-neutral-500 text-sm font-mono whitespace-nowrap">
                                {window.location.origin}/#/book/
                            </span>
                            <input
                                type="text"
                                value={slugInput}
                                onChange={handleSlugChange}
                                placeholder="minha-barbearia"
                                className="flex-1 w-full sm:w-auto p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold font-mono text-sm"
                                disabled={saving}
                            />
                        </div>

                        {/* Preview */}
                        {slugInput && !slugError && (
                            <div className="bg-neutral-900 p-3 rounded border border-neutral-700">
                                <p className="text-xs text-neutral-500 mb-1">Preview do seu link:</p>
                                <code className={`text-sm ${accentText} font-mono break-all`}>
                                    {window.location.origin}/#/book/{slugInput}
                                </code>
                            </div>
                        )}

                        {/* Validation feedback */}
                        {checkingAvailability && (
                            <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verificando disponibilidade...
                            </div>
                        )}

                        {slugError && !checkingAvailability && (
                            <p className="text-red-500 text-sm flex items-center gap-2">
                                <span>❌</span> {slugError}
                            </p>
                        )}

                        {slugAvailable && !checkingAvailability && slugInput && (
                            <p className="text-green-500 text-sm flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Disponível! Este link pode ser usado.
                            </p>
                        )}

                        <button
                            onClick={handleSaveSlug}
                            disabled={!slugAvailable || saving || checkingAvailability}
                            className={`w-full ${accentBg} text-black font-bold py-3 px-4 rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="w-4 h-4" />
                                    Criar Link
                                </>
                            )}
                        </button>

                        <p className="text-xs text-neutral-500 text-center">
                            💡 Dica: Use o nome da sua barbearia/salão sem espaços
                        </p>
                    </div>
                </div>
            </BrutalCard>
        );
    }

    // Existing link display
    const publicLink = `${window.location.origin}/#/book/${businessSlug}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(publicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Show disabled state when public booking is off
    if (!publicBookingEnabled) {
        return (
            <BrutalCard className="bg-gradient-to-r from-neutral-900 to-neutral-800 mb-6 border-l-4 border-yellow-500">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-heading text-lg uppercase mb-1">Agendamento Público Desativado</h3>
                        <p className="text-neutral-400 text-sm">
                            Ative o agendamento público acima para permitir que clientes agendem através do seu link.
                        </p>
                    </div>
                </div>
            </BrutalCard>
        );
    }

    return (
        <BrutalCard className="bg-gradient-to-r from-neutral-900 to-neutral-800 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 ${isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10'} rounded-lg`}>
                        <LinkIcon className={`w-6 h-6 ${accentIcon}`} />
                    </div>
                    <div>
                        <h3 className="text-white font-heading text-lg uppercase mb-1">Seu Link de Agendamento</h3>
                        <p className="text-neutral-400 text-sm mb-3">Compartilhe este link com seus clientes para agendamentos online.</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <code className={`${isBeauty ? 'bg-white/5 border border-white/10 rounded-lg' : 'bg-black/40 border-2 border-neutral-800'} px-3 py-2 ${accentText} text-sm font-mono break-all`}>
                                {publicLink}
                            </code>
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-4 py-2 ${isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover rounded-lg' : 'bg-accent-gold hover:bg-accent-goldHover'} text-black text-sm font-bold uppercase tracking-wider transition-all`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copiado!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copiar
                                    </>
                                )}
                            </button>
                            <a
                                href={publicLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-bold uppercase tracking-wider transition-all rounded-lg"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Visualizar
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </BrutalCard>
    );
};