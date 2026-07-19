import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ClientWhatsAppFABProps {
    phone: string;
    businessName: string;
    clientName: string;
    isBeauty: boolean;
}

export const ClientWhatsAppFAB: React.FC<ClientWhatsAppFABProps> = ({
    phone,
    businessName,
    clientName,
    isBeauty,
}) => {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Fade in after 1s
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(t);
    }, []);

    if (!phone) return null;

    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
        `Olá ${businessName}! Sou ${clientName} e gostaria de falar sobre meu agendamento.`
    );
    const url = `https://wa.me/${cleanPhone}?text=${message}`;

    return (
        <div
            className={`
                fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3
                transition-all duration-500
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}
            `}
        >
            {/* Tooltip label */}
            {expanded && (
                <div className={`
                    px-4 py-2.5 rounded-2xl text-xs font-semibold max-w-[200px] text-center leading-snug
                    animate-in fade-in slide-in-from-bottom-2 duration-200
                    ${isBeauty
                        ? 'bg-theme-card text-theme-text shadow-lg border border-theme-border'
                        : 'bg-theme-surface text-theme-text border border-theme-border'
                    }
                `}>
                    Falar com {businessName}
                </div>
            )}

            {/* FAB button group */}
            <div className="flex items-center gap-2">
                {expanded && (
                    <button
                        onClick={() => setExpanded(false)}
                        className={`
                            w-9 h-9 rounded-full flex items-center justify-center transition-all
                            animate-in fade-in duration-150
                            ${isBeauty
                                ? 'bg-theme-surface text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)]'
                                : 'bg-theme-surface text-theme-textSecondary hover:bg-[var(--color-card-hover)] border border-theme-border'
                            }
                        `}
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {expanded ? (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 bg-[#25D366] text-theme-text px-5 py-3.5 rounded-full shadow-2xl font-bold text-sm hover:bg-[#1ebe5a] transition-all hover:scale-105 animate-in zoom-in duration-200"
                        aria-label="Abrir WhatsApp"
                    >
                        <MessageCircle className="w-5 h-5 fill-[var(--color-text)]" />
                        Abrir WhatsApp
                    </a>
                ) : (
                    <button
                        onClick={() => setExpanded(true)}
                        className="w-14 h-14 rounded-full bg-[#25D366] text-theme-text shadow-2xl flex items-center justify-center hover:bg-[#1ebe5a] hover:scale-110 transition-all"
                        aria-label={`Falar com ${businessName} no WhatsApp`}
                    >
                        <MessageCircle className="w-7 h-7 fill-[var(--color-text)]" />
                    </button>
                )}
            </div>
        </div>
    );
};
