import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AIOSDiagnostic {
    recoverable_revenue: number;
    at_risk_clients: Array<{
        id: string;
        name: string;
        phone: string;
        last_visit: string;
        total_visits: number;
        avg_ticket: number;
        days_since_last_visit: any;
    }>;
    agenda_gaps: Array<{
        date: string;
        appointments_count: number;
        gap_type: string;
    }>;
    diagnostic_date: string;
}

export const useAIOSDiagnostic = () => {
    const { user, aiosEnabled } = useAuth();
    const [diagnostic, setDiagnostic] = useState<AIOSDiagnostic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDiagnostic = async () => {
        if (!user || !aiosEnabled) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_aios_diagnostic', {
                p_establishment_id: user.id
            });

            if (error) throw error;
            setDiagnostic(data as AIOSDiagnostic);
        } catch (err: any) {
            console.error('Error fetching AIOS diagnostic:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const logCampaignActivity = async (clientId: string, agentName: string, campaignType: string) => {
        if (!user) return;
        try {
            const { data, error } = await supabase.rpc('log_aios_campaign', {
                p_client_id: clientId,
                p_agent_name: agentName,
                p_campaign_type: campaignType
            });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error logging campaign activity:', err);
            return null;
        }
    };

    useEffect(() => {
        fetchDiagnostic();
    }, [user, aiosEnabled]);

    return { diagnostic, loading, error, refetch: fetchDiagnostic, logCampaignActivity };
};
