import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Opportunity {
    time_slot?: string;
    reason: string;
    suggested_clients: { name: string; phone: string }[];
}

export interface HighValueClient {
    id: string;
    name: string;
    phone: string;
    total_spent: number;
    days_missing: number;
    last_service: string;
}

export interface MarketingInsights {
    empty_slots: Opportunity[];
    high_value_clients: HighValueClient[];
    generated_at: string;
}

export function useMarketingOpportunities() {
    const { user } = useAuth();
    const [insights, setInsights] = useState<MarketingInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOpportunities = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const { data, error: rpcError } = await supabase.rpc('get_marketing_opportunities', {
                p_user_id: user.id
            });

            if (rpcError) throw rpcError;
            setInsights(data);
        } catch (err: any) {
            console.error('Error fetching marketing opportunities:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
    }, [user]);

    return { insights, loading, error, refresh: fetchOpportunities };
}
