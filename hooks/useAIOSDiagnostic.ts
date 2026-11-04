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
    const { user } = useAuth();
    const [diagnostic, setDiagnostic] = useState<AIOSDiagnostic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // A função get_aios_diagnostic do banco hoje devolve outro formato (status/metrics)
    // e foi trocada por uma versão com tenant guard; chamá-la gerava 404 a cada carga.
    // Até existir uma versão compatível, o diagnóstico fica vazio e a interface o omite.
    const fetchDiagnostic = async () => {
        setDiagnostic(null);
        setError(null);
        setLoading(false);
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
    }, [user]);

    return { diagnostic, loading, error, refetch: fetchDiagnostic, logCampaignActivity };
};
