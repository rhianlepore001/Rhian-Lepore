import React, { useState } from 'react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useSmartNotifications, type SmartNotification } from '../hooks/useSmartNotifications';
import { useNavigate } from 'react-router-dom';
import {
    Bell, X, MessageCircle, ChevronDown, ChevronUp,
    Loader2, Send, Lightbulb, UserCheck, Clock
} from 'lucide-react';

const TYPE_CONFIG: Record<SmartNotification['type'], { icon: React.ElementType; color: string; bgColor: string }> = {
    reactivation: { icon: UserCheck, color: 'text-[var(--color-warning)]', bgColor: 'bg-orange-400/10' },
    gap: { icon: Clock, color: 'text-[var(--color-info)]', bgColor: 'bg-blue-400/10' },
    vip: { icon: MessageCircle, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
    upsell: { icon: Send, color: 'text-[var(--color-success)]', bgColor: 'bg-green-400/10' },
    tip: { icon: Lightbulb, color: 'text-[var(--color-warning)]', bgColor: 'bg-yellow-400/10' },
};

export const SmartNotificationsBanner: React.FC = () => {
    const { accent } = useBrutalTheme();
    const navigate = useNavigate();
    const { notifications, hasNotifications, sendingId, dismiss, dismissAll, sendWhatsApp } = useSmartNotifications();
    const [expanded, setExpanded] = useState(false);

    if (!hasNotifications) return null;

    const visibleNotifs = expanded ? notifications : notifications.slice(0, 2);
    const hasMore = notifications.length > 2;

    return (
        <div className="bg-[color-mix(in_srgb,var(--color-card)_80%,transparent)] backdrop-blur-sm border border-[var(--color-border)] rounded-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-divider)]">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${accent.bg} animate-pulse`} />
                    <span className="text-xs font-mono text-[var(--color-text)] uppercase tracking-wider">
                        {notifications.length} {notifications.length === 1 ? 'oportunidade' : 'oportunidades'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {hasMore && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
                            aria-label={expanded ? "Recolher notificações" : "Expandir notificações"}
                            title={expanded ? "Recolher" : "Expandir"}
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                    <button
                        onClick={dismissAll}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1 text-xs font-mono uppercase"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            {/* Notification Items */}
            <div className="divide-y divide-[var(--color-divider)]">
                {visibleNotifs.map((notif) => {
                    const config = TYPE_CONFIG[notif.type];
                    const Icon = config.icon;

                    return (
                        <div
                            key={notif.id}
                            className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-card-hover)] transition-colors group"
                        >
                            <div className={`p-2 rounded-lg ${config.bgColor} shrink-0 mt-0.5`}>
                                <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--color-text)] font-medium truncate">
                                    {notif.title}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                                    {notif.message}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {notif.client ? (
                                    <button
                                        onClick={() => sendWhatsApp(notif)}
                                        disabled={sendingId === notif.id}
                                        className={`${accent.bg} text-[var(--color-bg)] text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1`}
                                    >
                                        {sendingId === notif.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <MessageCircle className="w-3 h-3" />
                                                Enviar
                                            </>
                                        )}
                                    </button>
                                ) : notif.actionUrl ? (
                                    <button
                                        onClick={() => navigate(notif.actionUrl!)}
                                        className={`text-xs font-mono ${accent.text} hover:opacity-70 transition-opacity px-2 py-1`}
                                    >
                                        {notif.actionLabel} →
                                    </button>
                                ) : null}

                                <button
                                    onClick={() => dismiss(notif.id)}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-1 opacity-0 group-hover:opacity-100"
                                    aria-label="Dispensar notificação"
                                    title="Dispensar"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Expand hint */}
            {hasMore && !expanded && (
                <button
                    onClick={() => setExpanded(true)}
                    className="w-full py-2 text-center text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors bg-[var(--color-card-hover)]"
                >
                    + {notifications.length - 2} oportunidades →
                </button>
            )}
        </div>
    );
};

/**
 * Compact notification bell for the header.
 * Shows a badge with the count of active notifications.
 */
export const NotificationBell: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
    const { notifications } = useSmartNotifications();
    const { accent } = useBrutalTheme();

    if (notifications.length === 0) return null;

    return (
        <button
            onClick={onClick}
            className="relative p-2 hover:bg-[var(--color-card-hover)] rounded-lg transition-colors"
            aria-label={`${notifications.length} notificações`}
        >
            <Bell className="w-5 h-5 text-[var(--color-text-muted)]" />
            <span className={`absolute -top-0.5 -right-0.5 ${accent.bg} text-[var(--color-bg)] text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center`}>
                {notifications.length > 9 ? '9+' : notifications.length}
            </span>
        </button>
    );
};
