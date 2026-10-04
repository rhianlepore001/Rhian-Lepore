import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { logger } from '../utils/Logger';
import { generateCommissionReminders } from '../services/commissionSchedule';

export interface Alert {
    id: string;
    text: string;
    type: 'warning' | 'danger' | 'success';
    actionPath?: string;
}

export interface AppNotification {
    id: string;
    title: string | null;
    message: string | null;
    type: string | null;
    read: boolean;
    link: string | null;
    booking_id: string | null;
    event_key?: string | null;
    created_at: string;
}

interface AlertsContextType {
    alerts: Alert[];
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    refreshAlerts: () => Promise<void>;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const AlertsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, role, companyId, loading: authLoading } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    const generateSmartAlerts = async (createdAt: Date | null) => {
        if (!user) return [];
        const tenantId = companyId || user.id;
        const generatedAlerts: Alert[] = [];

        try {
            const now = new Date().toISOString();
            const { data: overdueApts } = await supabase
                .from('appointments')
                .select('id')
                .eq('user_id', tenantId)
                .in('status', ['Confirmed', 'Pending'])
                .lt('appointment_time', now);

            if (overdueApts && overdueApts.length > 0) {
                generatedAlerts.push({
                    id: 'overdue-appointments',
                    text: overdueApts.length === 1
                        ? '1 agendamento pendente de conclusão/cancelamento.'
                        : `${overdueApts.length} agendamentos pendentes de conclusão/cancelamento.`,
                    type: 'danger',
                    actionPath: '/agenda?filter=overdue'
                });
            }

            const [{ data: onboardingProgress }] = await Promise.all([
                supabase
                    .from('onboarding_progress')
                    .select('is_completed')
                    .eq('company_id', tenantId)
                    .maybeSingle()
            ]);

            const onboardingCompleted = onboardingProgress?.is_completed ?? false;

            const isNewAccount = createdAt &&
                (new Date().getTime() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000);

            if (isNewAccount) {
                const [
                    { count: servicesCount, error: servicesError },
                    { count: teamCount, error: teamError },
                    { data: profile, error: profileError }
                ] = await Promise.all([
                    supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', tenantId),
                    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', tenantId),
                    supabase.from('profiles').select('business_name, logo_url').eq('id', tenantId).maybeSingle()
                ]);

                if (!servicesError && (servicesCount === 0 || servicesCount === null) && !onboardingCompleted) {
                    generatedAlerts.push({
                        id: 'setup-services',
                        text: 'Configure seus serviços e preços para começar',
                        type: 'warning',
                        actionPath: '/configuracoes/servicos'
                    });
                }

                if (!teamError && (teamCount === 0 || teamCount === null) && !onboardingCompleted) {
                    generatedAlerts.push({
                        id: 'setup-team',
                        text: 'Adicione membros da equipe para gerenciar agendamentos',
                        type: 'warning',
                        actionPath: '/configuracoes/equipe'
                    });
                }

                if (!profileError && profile) {
                    if (!profile.business_name && !onboardingCompleted) {
                        generatedAlerts.push({
                            id: 'setup-profile',
                            text: 'Configure seu perfil',
                            type: 'warning',
                            actionPath: '/configuracoes/geral'
                        });
                    }

                    if (!profile.logo_url) {
                        generatedAlerts.push({
                            id: 'setup-business',
                            text: 'Adicione foto e capa do seu estabelecimento',
                            type: 'warning',
                            actionPath: '/configuracoes/geral'
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Error generating alerts', error);
        }

        return generatedAlerts;
    };

    const fetchNotifications = useCallback(async (): Promise<AppNotification[]> => {
        if (!user) return [];
        const { data, error } = await supabase
            .from('notifications')
            .select('id, title, message, type, read, link, booking_id, event_key, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);
        if (error) {
            logger.error('Error loading notifications', error);
            return [];
        }
        return (data ?? []) as AppNotification[];
    }, [user]);

    const refreshAlerts = useCallback(async () => {
        if (!user || authLoading) {
            setAlerts([]);
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            if (companyId && role === 'owner') {
                try {
                    await generateCommissionReminders();
                } catch (error) {
                    logger.warn('Commission reminder generate skipped', { error });
                }
            }

            const nextNotifications = await fetchNotifications();
            setNotifications(nextNotifications);

            if (!companyId || role !== 'owner') {
                setAlerts([]);
                return;
            }

            let userCreatedAt: Date | null = null;
            if (user.created_at) {
                userCreatedAt = new Date(user.created_at);
            }

            const newAlerts = await generateSmartAlerts(userCreatedAt);
            setAlerts(newAlerts);
        } catch (error) {
            logger.error('Error refreshing alerts', error);
        } finally {
            setLoading(false);
        }
    }, [user, role, companyId, authLoading, fetchNotifications]);

    const markNotificationRead = useCallback(async (id: string) => {
        if (!user) return;
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('user_id', user.id);
        if (error) {
            logger.error('Error marking notification read', error);
            const restored = await fetchNotifications();
            setNotifications(restored);
        }
    }, [user, fetchNotifications]);

    const markAllNotificationsRead = useCallback(async () => {
        if (!user) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
        if (error) {
            logger.error('Error marking all notifications read', error);
            const restored = await fetchNotifications();
            setNotifications(restored);
        }
    }, [user, fetchNotifications]);

    useEffect(() => {
        void refreshAlerts();

        const interval = setInterval(() => { void refreshAlerts(); }, 5 * 60 * 1000);

        const ownerSoundFilter = user?.id ? `business_id=eq.${user.id}` : undefined;
        const bookingInsertChannel = supabase
            .channel('public_bookings_alerts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'public_bookings',
                ...(ownerSoundFilter ? { filter: ownerSoundFilter } : {}),
            }, () => {
                if (role === 'owner') {
                    try {
                        const audio = new Audio(NOTIFICATION_SOUND);
                        audio.play().catch((e) => logger.warn('Audio play failed (interaction needed?)', { error: e }));
                    } catch (e) {
                        logger.error('Error playing sound', e);
                    }
                }
                void refreshAlerts();
            })
            .subscribe();

        const bookingUpdateChannel = supabase
            .channel('public_bookings_updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'public_bookings',
                ...(ownerSoundFilter ? { filter: ownerSoundFilter } : {}),
            }, () => {
                void refreshAlerts();
            })
            .subscribe();

        const notificationsFilter = user?.id ? `user_id=eq.${user.id}` : undefined;
        const notificationsChannel = supabase
            .channel('notifications_bell')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                ...(notificationsFilter ? { filter: notificationsFilter } : {}),
            }, () => {
                void fetchNotifications().then(setNotifications);
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(bookingInsertChannel);
            supabase.removeChannel(bookingUpdateChannel);
            supabase.removeChannel(notificationsChannel);
        };
    }, [user, role, companyId, authLoading, refreshAlerts, fetchNotifications]);

    const unreadCount = notifications.filter((n) => !n.read).length + alerts.length;

    return (
        <AlertsContext.Provider value={{
            alerts,
            notifications,
            unreadCount,
            loading,
            refreshAlerts,
            markNotificationRead,
            markAllNotificationsRead,
        }}>
            {children}
        </AlertsContext.Provider>
    );
};

export const useAlerts = () => {
    const context = useContext(AlertsContext);
    if (context === undefined) {
        throw new Error('useAlerts must be used within an AlertsProvider');
    }
    return context;
};
