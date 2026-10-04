import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

interface PerformanceSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ title, description, children, className = '' }) => {
    const { colors, font } = useBrutalTheme();
    return (
        <section className={`space-y-3 ${className}`}>
            <div className="space-y-1">
                <h2 className={`${font.heading} text-lg lg:text-xl font-semibold tracking-tight ${colors.text}`}>{title}</h2>
                {description && <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{description}</p>}
            </div>
            {children}
        </section>
    );
};

export const MetricGrid: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => (
    <div data-testid={testId} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {children}
    </div>
);
