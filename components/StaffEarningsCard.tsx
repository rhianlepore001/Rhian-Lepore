import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { BrutalCard } from './BrutalCard';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from './SkeletonLoader';

export const StaffEarningsCard: React.FC = () => {
    const { teamMemberId, region } = useAuth();
    const [earnings, setEarnings] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const currencyRegion = region === 'PT' ? 'PT' : 'BR';
    const { accent } = useBrutalTheme();

    useEffect(() => {
        if (!teamMemberId) {
            setLoading(false);
            return;
        }

        const fetchEarnings = async () => {
            try {
                const { data, error } = await supabase
                    .from('finance_records')
                    .select('commission_value')
                    .eq('professional_id', teamMemberId)
                    .eq('commission_paid', false);

                if (error) {
                    console.error('Erro ao buscar comissões do colaborador:', error);
                    setEarnings(0);
                    return;
                }

                const total = (data || []).reduce((sum, r) => sum + (Number(r.commission_value) || 0), 0);
                setEarnings(total);
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [teamMemberId]);

    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

    return (
        <BrutalCard className="brutal-card-enhanced gold-accent-border" noPadding>
            <div className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${accent.bgDim} ${accent.border} shadow-gold shrink-0`}>
                    <TrendingUp className={`w-5 h-5 ${accent.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-mono uppercase text-text-secondary tracking-widest">
                            Comissões a receber
                        </p>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-600 capitalize shrink-0">
                            {monthName}
                        </span>
                    </div>
                    {loading ? (
                        <Skeleton className="h-8 w-32 mt-1" />
                    ) : (
                        <p className={`text-3xl font-bold font-mono ${accent.text}`}>
                            {formatCurrency(earnings ?? 0, currencyRegion)}
                        </p>
                    )}
                    <p className="text-[10px] text-text-secondary mt-0.5">
                        Ainda não liquidadas pelo salão
                    </p>
                </div>
            </div>
        </BrutalCard>
    );
};
