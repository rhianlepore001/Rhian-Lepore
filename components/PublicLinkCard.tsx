import React, { useState } from 'react';
import { BrutalCard } from './BrutalCard';
import { Link as LinkIcon, Copy, ExternalLink, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PublicLinkCardProps {
    businessSlug: string | null;
}

export const PublicLinkCard: React.FC<PublicLinkCardProps> = ({ businessSlug }) => {
    const { userType } = useAuth();
    const [copied, setCopied] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    if (!businessSlug) {
        return (
            <BrutalCard className="bg-gradient-to-r from-neutral-900 to-neutral-800 mb-6">
                <p className="text-neutral-400 text-center">Seu link público aparecerá aqui assim que seu perfil for configurado.</p>
            </BrutalCard>
        );
    }

    const publicLink = `${window.location.origin}/#/book/${businessSlug}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(publicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                            <code className={`${isBeauty ? 'bg-white/5 border border-white/10 rounded-lg' : 'bg-black/40 border-2 border-neutral-800'} px-3 py-2 text-${accentText} text-sm font-mono`}>
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