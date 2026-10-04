import React from 'react';
import type { PerformanceMetrics } from '../../types/staffPerformance';
import type { BusinessRemainderNoun } from '../../utils/businessCopy';
import { buildMetricAccount, TEAM_METRIC_IDS } from '../../utils/staffPerformanceAccount';
import { MetricCard } from './MetricCard';
import { PerformanceSection } from './PerformanceSection';

interface TeamOverviewProps {
    totals: PerformanceMetrics | null;
    previous: PerformanceMetrics | null;
    previousName: string | null;
    periodStart: string;
    periodEnd: string;
    formatMoney: (v: number) => string;
    remainder: BusinessRemainderNoun;
}

export const TeamOverview: React.FC<TeamOverviewProps> = ({
    totals,
    previous,
    previousName,
    periodStart,
    periodEnd,
    formatMoney,
    remainder,
}) => {
    if (!totals) return null;
    const accounts = TEAM_METRIC_IDS.map((id) =>
        buildMetricAccount(id, totals, {
            formatMoney,
            remainder,
            personName: 'a equipe',
            voice: 'team',
            previous,
            previousName,
            periodStart,
            periodEnd,
        }),
    );

    return (
        <PerformanceSection title="A equipe no período">
            <div data-testid="team-overview" className="grid grid-cols-2 gap-3">
                {accounts.map((account) => (
                    <div key={account.id} className={account.span === 'full' ? 'col-span-2' : undefined}>
                        <MetricCard account={account} />
                    </div>
                ))}
            </div>
        </PerformanceSection>
    );
};
