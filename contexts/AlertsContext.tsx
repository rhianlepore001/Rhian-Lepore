import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Alert {
    id: string;
    text: string;
    type: 'warning' | 'danger' | 'success';
    actionPath?: string;
}

interface AlertsContextType {
    alerts: Alert[];
    loading: boolean;
    refreshAlerts: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const generateSmartAlerts = async (createdAt: Date | null) => {
        if (!user) return [];
        const generatedAlerts: Alert[] = [];

        try {
            // --- ALERTA: Agendamentos Atrasados ---
            const now = new Date().toISOString();
            const { data: overdueApts } = await supabase
                .from('appointments')
                .select('id')
                .eq('user_id', user.id)
                .in('status', ['Confirmed', 'Pending'])
                .lt('appointment_time', now);

            if (overdueApts && overdueApts.length > 0) {
                generatedAlerts.push({
                    id: 'overdue-appointments',
                    text: `⚠️ ${overdueApts.length} agendamento(s) pendente(s) de conclusão/cancelamento.`,
                    type: 'danger',
                    actionPath: '/agenda?filter=overdue'
                });
            }

            // --- ALERTA: Acerto de Comissões ---
            const { data: settings } = await supabase
                .from('business_settings')
                .select('commission_settlement_day_of_month')
                .eq('user_id', user.id)
                .single();

            if (settings?.commission_settlement_day_of_month) {
                const settlementDay = settings.commission_settlement_day_of_month;
                const today = new Date();
                const currentDay = today.getDate();

                // Calculate days remaining until the settlement day
                let daysRemaining = settlementDay - currentDay;

                // If the settlement day has passed this month, calculate for next month
                if (daysRemaining < 0) {
                    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, settlementDay);
                    daysRemaining = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }

                // Check if there are commissions due
                const { data: commissionsDue } = await supabase.rpc('get_commissions_due', { p_user_id: user.id });
                const totalDue = (commissionsDue || []).reduce((sum: number, r: any) => sum + (r.total_due || 0), 0);

                if (totalDue > 0) {
                    if (daysRemaining <= 2 && daysRemaining > 0) {
                        generatedAlerts.push({
                            id: 'commission-settlement-warning',
                            text: `⚠️ Acerto de comissões se aproxima! Dia ${settlementDay} será o dia do acerto de comissões.`,
                            type: 'warning',
                            actionPath: '/financeiro?tab=commissions'
                        });
                    } else if (daysRemaining === 0) {
                        generatedAlerts.push({
                            id: 'commission-settlement-today',
                            text: `💰 Hoje é dia de acerto de comissões! Total pendente: R$ ${totalDue.toFixed(2)}`,
                            type: 'danger',
                            actionPath: '/financeiro?tab=commissions'
                        });
                    }
                }
            }

            // --- ALERTA DE SETUP (Lógica existente) ---
            const isNewAccount = createdAt &&
                (new Date().getTime() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000);

            if (isNewAccount) {
                const { data: services } = await supabase.from('services').select('id').eq('user_id', user.id);
                if (!services || services.length === 0) {
                    generatedAlerts.push({
                        id: 'setup-services',
                        text: '📋 Configure seus serviços e preços para começar',
                        type: 'warning',
                        actionPath: '/configuracoes/servicos'
                    });
                }

                const { data: team } = await supabase.from('team_members').select('id').eq('user_id', user.id);
                if (!team || team.length === 0) {
                    generatedAlerts.push({
                        id: 'setup-team',
                        text: '👥 Adicione membros da equipe para gerenciar agendamentos',
                        type: 'warning',
                        actionPath: '/configuracoes/equipe'
                    });
                }

                const { data: profile } = await supabase.from('profiles').select('business_name, logo_url').eq('id', user.id).single();
                if (!profile?.business_name) {
                    generatedAlerts.push({
                        id: 'setup-profile',
                        text: '👤 Configure seu perfil',
                        type: 'warning',
                        actionPath: '/configuracoes/geral'
                    });
                }

                if (!profile?.logo_url) {
                    generatedAlerts.push({
                        id: 'setup-business',
                        text: '🏪 Adicione foto e capa do seu estabelecimento',
                        type: 'warning',
                        actionPath: '/configuracoes/geral'
                    });
                }
            }
        } catch (error) {
            console.error('Error generating alerts:', error);
        }

        return generatedAlerts;
    };

    const refreshAlerts = async () => {
        if (!user) {
            setAlerts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            let userCreatedAt: Date | null = null;
            if (user.created_at) {
                userCreatedAt = new Date(user.created_at);
            }

            const newAlerts = await generateSmartAlerts(userCreatedAt);
            setAlerts(newAlerts);
        } catch (error) {
            console.error('Error refreshing alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshAlerts();

        // Refresh alerts every 5 minutes
        const interval = setInterval(refreshAlerts, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user]);

    return (
        <AlertsContext.Provider value={{ alerts, loading, refreshAlerts }}>
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