import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAIOSDiagnostic } from './useAIOSDiagnostic';
import { generateReactivationMessage, getWhatsAppUrl } from '../utils/aiosCopywriter';

export interface SmartNotification {
    id: string;
    type: 'reactivation' | 'gap' | 'vip' | 'upsell' | 'tip';
    priority: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    actionLabel: string;
    actionUrl?: string;
    client?: {
        id: string;
        name: string;
        phone: string;
        daysMissing: number;
        avgTicket: number;
        lastService?: string;
        totalSpent?: number;
    };
    dismissed: boolean;
    createdAt: Date;
}

const DISMISSED_KEY = 'smart_notifications_dismissed';

function getDismissedIds(): string[] {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        // Clean entries older than 24h
        const now = Date.now();
        const valid = parsed.filter((entry: { id: string; at: number }) => now - entry.at < 86400000);
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid));
        return valid.map((e: { id: string }) => e.id);
    } catch {
        return [];
    }
}

function persistDismiss(id: string) {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ id, at: Date.now() });
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
    } catch { /* ignore */ }
}

export function useSmartNotifications() {
    const { userType, businessName, role } = useAuth();
    const { diagnostic, loading, logCampaignActivity, refetch } = useAIOSDiagnostic();
    const [notifications, setNotifications] = useState<SmartNotification[]>([]);
    const [sendingId, setSendingId] = useState<string | null>(null);

    const isStaff = role === 'staff';

    // Build notifications from diagnostic data
    useEffect(() => {
        if (loading || isStaff || !diagnostic) return;

        const dismissedIds = getDismissedIds();
        const notifs: SmartNotification[] = [];

        // At-risk clients → reactivation notifications
        const atRisk = diagnostic.at_risk_clients || [];
        atRisk.slice(0, 5).forEach((client: any, i: number) => {
            const days = typeof client.days_since_last_visit === 'object'
                ? client.days_since_last_visit?.days || 30
                : parseInt(client.days_since_last_visit) || 30;

            const id = `reactivation-${client.id}`;
            notifs.push({
                id,
                type: 'reactivation',
                priority: days > 60 ? 'high' : 'medium',
                title: `${client.name.split(' ')[0]} não aparece há ${days} dias`,
                message: `Valor médio R$ ${(client.avg_ticket || 0).toFixed(0)} por visita. Envie uma mensagem personalizada pelo WhatsApp.`,
                actionLabel: 'Enviar WhatsApp',
                client: {
                    id: client.id,
                    name: client.name,
                    phone: client.phone,
                    daysMissing: days,
                    avgTicket: client.avg_ticket || 0,
                    lastService: client.last_service,
                    totalSpent: client.total_spent,
                },
                dismissed: dismissedIds.includes(id),
                createdAt: new Date(),
            });
        });

        // Weekly tip based on data
        const recoverable = diagnostic.recoverable_revenue || 0;
        if (recoverable > 0) {
            const tipId = `tip-recoverable-${new Date().toISOString().slice(0, 10)}`;
            notifs.push({
                id: tipId,
                type: 'tip',
                priority: 'low',
                title: `R$ ${recoverable.toLocaleString()} em oportunidades hoje`,
                message: 'Clientes que não voltaram recentemente podem ser recuperados com uma mensagem personalizada.',
                actionLabel: 'Ver Marketing',
                actionUrl: '/marketing',
                dismissed: dismissedIds.includes(tipId),
                createdAt: new Date(),
            });
        }

        setNotifications(notifs);
    }, [diagnostic, loading, isStaff]);

    const dismiss = useCallback((id: string) => {
        persistDismiss(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    }, []);

    const dismissAll = useCallback(() => {
        notifications.filter(n => !n.dismissed).forEach(n => persistDismiss(n.id));
        setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })));
    }, [notifications]);

    const sendWhatsApp = useCallback(async (notification: SmartNotification) => {
        if (!notification.client || sendingId) return;
        setSendingId(notification.id);

        try {
            const message = generateReactivationMessage({
                name: notification.client.name,
                businessName: businessName || 'nosso estabelecimento',
                userType: userType || 'barber',
                daysMissing: notification.client.daysMissing,
                lastService: notification.client.lastService,
                ltv: notification.client.totalSpent,
            });

            await logCampaignActivity(notification.client.id, 'SmartNotification', 'whatsapp_reactivation');

            const url = getWhatsAppUrl(notification.client.phone, message);
            window.open(url, '_blank');

            // Auto-dismiss after sending
            dismiss(notification.id);
            setTimeout(() => refetch(), 2000);
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
        } finally {
            setSendingId(null);
        }
    }, [businessName, userType, sendingId, logCampaignActivity, dismiss, refetch]);

    const activeNotifications = notifications.filter(n => !n.dismissed);
    const hasNotifications = activeNotifications.length > 0;

    return {
        notifications: activeNotifications,
        allNotifications: notifications,
        hasNotifications,
        loading,
        sendingId,
        dismiss,
        dismissAll,
        sendWhatsApp,
    };
}
