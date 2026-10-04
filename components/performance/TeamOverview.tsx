import React from 'react';
import type { PerformanceMetrics } from '../../types/staffPerformance';
import type { BusinessRemainderNoun } from '../../utils/businessCopy';
import { buildMetricAccount, TEAM_METRIC_IDS, metricCellClass } from '../../utils/staffPerformanceAccount';
import { MetricCard } from './MetricCard';
import { MetricGrid, PerformanceSection } from './PerformanceSection';

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
            <MetricGrid testId="team-overview">
                {accounts.map((account) => (
                    <div key={account.id} className={metricCellClass(account.span)}>
                        <MetricCard account={account} />
                    </div>
                ))}
            </MetricGrid>
        </PerformanceSection>
    );
};
