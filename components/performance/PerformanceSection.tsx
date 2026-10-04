import React, { useCallback, useState } from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { metricRestLgCols, type MetricAccount } from '../../utils/staffPerformanceAccount';
import { MetricCard } from './MetricCard';

interface PerformanceSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ title, description, children, className = '' }) => {
    const { colors, font } = useBrutalTheme();
    return (
        <section className={`space-y-2 lg:space-y-3 ${className}`}>
            <div className="space-y-1">
                <h2 className={`${font.heading} text-lg font-semibold lg:text-xl lg:font-bold tracking-tight ${colors.text}`}>{title}</h2>
                {description && <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{description}</p>}
            </div>
            {children}
        </section>
    );
};

export const MetricGrid: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => (
    <div data-testid={testId} className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        {children}
    </div>
);

function MetricCell({ account }: { account: MetricAccount }) {
    const [overflow, setOverflow] = useState(false);
    const onValueOverflow = useCallback(() => setOverflow(true), []);
    const wideMobile = account.span !== 'narrow' || overflow;
    return (
        <div className={wideMobile ? 'col-span-2 lg:col-span-1 min-w-0' : 'min-w-0'}>
            <MetricCard
                account={account}
                fluidValue={account.span === 'narrow'}
                onValueOverflow={onValueOverflow}
            />
        </div>
    );
}

interface MetricClusterProps {
    accounts: MetricAccount[];
    testId?: string;
}

/** Hero numa linha (cheia ou 1/2 + comparação). O resto em colunas iguais, sem card órfão. */
export const MetricCluster: React.FC<MetricClusterProps> = ({ accounts, testId }) => {
    const { colors } = useBrutalTheme();
    const hero = accounts.find((a) => a.span === 'hero') ?? null;
    const rest = hero ? accounts.filter((a) => a.id !== hero.id) : accounts;
    const lgCols = metricRestLgCols(rest.length);
    const showCompare = Boolean(hero?.comparison);

    return (
        <div data-testid={testId} className="flex flex-col gap-3">
            {hero && (
                <div
                    data-testid="performance-hero-row"
                    className={`grid grid-cols-1 gap-3 items-stretch ${showCompare ? 'lg:grid-cols-2' : ''}`}
                >
                    <MetricCard account={hero} />
                    {showCompare && (
                        <aside
                            data-testid="performance-hero-compare"
                            className="hidden lg:flex items-center min-w-0 px-1 lg:px-5"
                        >
                            <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>
                                {hero.comparisonCaption && (
                                    <span className={colors.textMuted}>{hero.comparisonCaption}: </span>
                                )}
                                {hero.comparison}
                            </p>
                        </aside>
                    )}
                </div>
            )}
            {rest.length > 0 && (
                <div
                    data-testid="performance-rest-grid"
                    className={`grid grid-cols-2 gap-3 items-stretch ${lgCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
                >
                    {rest.map((account) => (
                        <MetricCell key={account.id} account={account} />
                    ))}
                </div>
            )}
        </div>
    );
};

