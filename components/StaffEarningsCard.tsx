import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStaffEarnings } from '../hooks/useStaffEarnings';
import { DashboardKpiCard } from './dashboard/DashboardKpiCard';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { formatCurrency } from '../utils/formatters';

export const StaffEarningsCard: React.FC = () => {
    const { region } = useAuth();
    const { earnings, loading } = useStaffEarnings();

    const currencyRegion = region === 'PT' ? 'PT' : 'BR';
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

    if (loading) {
        return (
            <Card variant="elevated" className="h-full" noPadding>
                <div className="p-4 md:p-6 flex flex-col justify-between h-full">
                    <Skeleton variant="text" className="w-1/2 mb-3" />
                    <Skeleton className="h-8 w-32" />
                </div>
            </Card>
        );
    }

    return (
        <DashboardKpiCard
            title="Comissões a receber"
            subtitle={monthName}
            value={formatCurrency(earnings, currencyRegion)}
            variant="accent"
            icon={<TrendingUp className="w-4 h-4" />}
        />
    );
};
