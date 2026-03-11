import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

export interface CampaignRecord {
    id: string;
    clientName: string;
    clientPhone: string;
    campaignType: string;
    sentAt: string;
    hadReturn: boolean;
    returnRevenue: number;
}

export interface CampaignROI {
    totalSent: number;
    totalReturned: number;
    returnRate: number;
    totalRecoveredRevenue: number;
    avgRevenuePerCampaign: number;
    recentCampaigns: CampaignRecord[];
}

/**
 * Busca histórico de campanhas enviadas e calcula ROI.
 * Cruza aios_logs (campanhas) com appointments (retornos).
 */
export function useCampaignHistory() {
    const { user } = useAuth();
    const [roi, setRoi] = useState<CampaignROI>({
        totalSent: 0,
        totalReturned: 0,
        returnRate: 0,
        totalRecoveredRevenue: 0,
        avgRevenuePerCampaign: 0,
        recentCampaigns: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // Buscar logs de campanhas dos últimos 90 dias
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const { data: logs, error: logsError } = await supabase
                    .from('aios_logs')
                    .select('id, client_id, agent_name, campaign_type, created_at, metadata')
                    .eq('user_id', user.id)
                    .gte('created_at', ninetyDaysAgo.toISOString())
                    .order('created_at', { ascending: false });

                if (logsError) throw logsError;
                if (!logs || logs.length === 0) {
                    setRoi({
                        totalSent: 0,
                        totalReturned: 0,
                        returnRate: 0,
                        totalRecoveredRevenue: 0,
                        avgRevenuePerCampaign: 0,
                        recentCampaigns: []
                    });
                    return;
                }

                // Buscar clientes que tiveram campanhas
                const clientIds = [...new Set(logs.map(l => l.client_id).filter(Boolean))];

                const { data: clients } = await supabase
                    .from('clients')
                    .select('id, name, phone')
                    .in('id', clientIds);

                const clientMap = new Map((clients || []).map(c => [c.id, c]));

                // Buscar agendamentos completados nos últimos 90 dias para calcular retorno
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('client_id, total_price, appointment_time')
                    .eq('user_id', user.id)
                    .in('status', ['Completed', 'Done', 'Confirmed'])
                    .gte('appointment_time', ninetyDaysAgo.toISOString())
                    .in('client_id', clientIds);

                // Mapear: para cada campanha, verificar se o cliente agendou nos 30 dias seguintes
                const appointmentsByClient = new Map<string, Array<{ date: Date; price: number }>>();
                for (const apt of (appointments || [])) {
                    if (!apt.client_id) continue;
                    if (!appointmentsByClient.has(apt.client_id)) {
                        appointmentsByClient.set(apt.client_id, []);
                    }
                    appointmentsByClient.get(apt.client_id)!.push({
                        date: new Date(apt.appointment_time),
                        price: apt.total_price || 0
                    });
                }

                let totalReturned = 0;
                let totalRecovered = 0;

                const recentCampaigns: CampaignRecord[] = logs.slice(0, 20).map(log => {
                    const client = clientMap.get(log.client_id);
                    const sentDate = new Date(log.created_at);
                    const thirtyDaysLater = new Date(sentDate);
                    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

                    // Verificar se cliente voltou nos 30 dias após a campanha
                    const clientAppts = appointmentsByClient.get(log.client_id) || [];
                    const returnAppt = clientAppts.find(a =>
                        a.date > sentDate && a.date <= thirtyDaysLater
                    );

                    const hadReturn = !!returnAppt;
                    const returnRevenue = returnAppt?.price || 0;

                    if (hadReturn) {
                        totalReturned++;
                        totalRecovered += returnRevenue;
                    }

                    return {
                        id: log.id,
                        clientName: client?.name || 'Cliente',
                        clientPhone: client?.phone || '',
                        campaignType: log.campaign_type || 'reactivation',
                        sentAt: log.created_at,
                        hadReturn,
                        returnRevenue
                    };
                });

                // Calcular totais com TODOS os logs (não só os 20 recentes)
                for (const log of logs.slice(20)) {
                    const sentDate = new Date(log.created_at);
                    const thirtyDaysLater = new Date(sentDate);
                    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

                    const clientAppts = appointmentsByClient.get(log.client_id) || [];
                    const returnAppt = clientAppts.find(a =>
                        a.date > sentDate && a.date <= thirtyDaysLater
                    );

                    if (returnAppt) {
                        totalReturned++;
                        totalRecovered += returnAppt.price || 0;
                    }
                }

                const totalSent = logs.length;
                setRoi({
                    totalSent,
                    totalReturned,
                    returnRate: totalSent > 0 ? Math.round((totalReturned / totalSent) * 100) : 0,
                    totalRecoveredRevenue: totalRecovered,
                    avgRevenuePerCampaign: totalSent > 0 ? Math.round(totalRecovered / totalSent) : 0,
                    recentCampaigns
                });
            } catch (err) {
                logger.error('Error fetching campaign history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    return { roi, loading };
}
