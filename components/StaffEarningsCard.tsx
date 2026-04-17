import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from './SkeletonLoader';

export const StaffEarningsCard: React.FC = () => {
    const { teamMemberId, region, userType } = useAuth();
    const [earnings, setEarnings] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const currencyRegion = region === 'PT' ? 'PT' : 'BR';
    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

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

    return (
        <BrutalCard className="brutal-card-enhanced gold-accent-border" noPadding>
            <div className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-neutral-900 border border-white/10`}>
                    <TrendingUp className={`w-5 h-5 ${accentText}`} />
                </div>
                <div>
                    <p className="text-xs font-mono uppercase text-text-secondary tracking-widest">
                        Seu faturamento líquido
                    </p>
                    {loading ? (
                        <Skeleton className="h-7 w-28 mt-1" />
                    ) : (
                        <p className={`text-2xl font-bold font-heading ${accentText}`}>
                            {formatCurrency(earnings ?? 0, currencyRegion)}
                        </p>
                    )}
                    <p className="text-[10px] text-text-secondary mt-0.5">
                        Comissões pendentes de recebimento
                    </p>
                </div>
            </div>
        </BrutalCard>
    );
};
