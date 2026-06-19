import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Link as LinkIcon, Copy, ExternalLink, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { supabase } from '../lib/supabase';

interface PublicLinkCardProps {
    businessSlug: string | null;
    publicBookingEnabled?: boolean;
    onSlugCreated?: () => void;
}

export const PublicLinkCard: React.FC<PublicLinkCardProps> = ({ businessSlug, publicBookingEnabled = true, onSlugCreated }) => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [slugInput, setSlugInput] = useState('');
    const [slugError, setSlugError] = useState<string | null>(null);
    const [slugAvailable, setSlugAvailable] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [saving, setSaving] = useState(false);

    const { colors, accent, font, status } = useBrutalTheme();

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
        value = value.replace(/[^a-z0-9-]/g, '');
        setSlugInput(value);
        setSlugError(validateSlug(value));
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
                setSlugAvailable(true);
            } else if (data) {
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

            if (onSlugCreated) onSlugCreated();
            window.location.reload();
        } catch (error) {
            console.error('Error saving slug:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!businessSlug) {
        return (
            <Card variant="outlined" className="mb-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-6 h-6 ${accent.text} flex-shrink-0 mt-1`} />
                        <div className="flex-1">
                            <h3 className={`${colors.text} ${font.heading} text-lg uppercase mb-1`}>
                                Configure seu Link de Agendamento
                            </h3>
                            <p className={`${colors.textSecondary} text-sm`}>
                                Crie um link personalizado para seus clientes agendarem online
                            </p>
                        </div>
                    </div>

                    <div className={`space-y-3 ${colors.surface} p-4 rounded-lg ${colors.border} border`}>
                        <label className={`${colors.text} ${font.mono} text-sm block`}>
                            Escolha seu identificador único
                        </label>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className={`${colors.textMuted} text-sm ${font.mono} whitespace-nowrap`}>
                                {window.location.origin}/#/book/
                            </span>
                            <input
                                type="text"
                                value={slugInput}
                                onChange={handleSlugChange}
                                placeholder="minha-barbearia"
                                className={`flex-1 w-full sm:w-auto p-3 ${colors.inputBg} ${colors.inputBorder} border rounded-lg ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)] ${font.mono} text-sm`}
                                disabled={saving}
                            />
                        </div>

                        {slugInput && !slugError && (
                            <div className={`${colors.card} p-3 rounded ${colors.border} border`}>
                                <p className={`text-xs ${colors.textMuted} mb-1`}>Preview do seu link:</p>
                                <code className={`text-sm ${accent.text} ${font.mono} break-all`}>
                                    {window.location.origin}/#/book/{slugInput}
                                </code>
                            </div>
                        )}

                        {checkingAvailability && (
                            <div className={`flex items-center gap-2 ${colors.textSecondary} text-sm`}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verificando disponibilidade...
                            </div>
                        )}

                        {slugError && !checkingAvailability && (
                            <p className={`${status.danger} text-sm flex items-center gap-2`}>
                                <span>❌</span> {slugError}
                            </p>
                        )}

                        {slugAvailable && !checkingAvailability && slugInput && (
                            <p className={`${status.success} text-sm flex items-center gap-2`}>
                                <Check className="w-4 h-4" />
                                Disponível! Este link pode ser usado.
                            </p>
                        )}

                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSaveSlug}
                            disabled={!slugAvailable || saving || checkingAvailability}
                            loading={saving}
                            icon={!saving ? <LinkIcon className="w-4 h-4" /> : undefined}
                        >
                            {saving ? 'Salvando...' : 'Criar Link'}
                        </Button>

                        <p className={`text-xs ${colors.textMuted} text-center`}>
                            Dica: Use o nome da sua barbearia/salão sem espaços
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    const publicLink = `${window.location.origin}/#/book/${businessSlug}`;

    const handleCopy = async () => {
        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: 'Meu Link de Agendamento - AgendiX',
                    text: 'Agende seu horário online:',
                    url: publicLink
                });
                return;
            } catch (error) {
                // Erro ao compartilhar
            }
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(publicLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = publicLink;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
        }
    };

    if (!publicBookingEnabled) {
        return (
            <Card variant="outlined" className="mb-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 ${accent.bgDim} rounded-lg`}>
                        <AlertTriangle className={`w-6 h-6 ${accent.text}`} />
                    </div>
                    <div>
                        <h3 className={`${colors.text} ${font.heading} text-lg uppercase mb-1`}>Agendamento Público Desativado</h3>
                        <p className={`${colors.textSecondary} text-sm`}>
                            Ative o agendamento público acima para permitir que clientes agendem através do seu link.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="outlined" className="mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 ${accent.bgDim} rounded-lg`}>
                        <LinkIcon className={`w-6 h-6 ${accent.text}`} />
                    </div>
                    <div>
                        <h3 className={`${colors.text} ${font.heading} text-lg uppercase mb-1`}>Seu Link de Agendamento</h3>
                        <p className={`${colors.textSecondary} text-sm mb-3`}>Compartilhe este link com seus clientes para agendamentos online.</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <code className={`${colors.surface} ${colors.border} border rounded-lg px-3 py-2 ${accent.text} text-sm ${font.mono} break-all`}>
                                {publicLink}
                            </code>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleCopy}
                                icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            >
                                {copied ? 'Copiado!' : 'Copiar'}
                            </Button>
                            <a
                                href={publicLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-4 py-2 ${colors.surfaceHover} ${colors.border} border ${colors.text} text-sm font-bold uppercase tracking-wider transition-all rounded-lg`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Visualizar
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
