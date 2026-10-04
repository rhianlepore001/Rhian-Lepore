import React from 'react';
import { Skeleton } from '../ui';

/** Mesma altura dos cards para CLS baixo; usado no Suspense e no loading da página. */
export const PerformancePageSkeleton: React.FC = () => (
    <div data-testid="performance-loading" aria-busy="true" aria-label="Carregando a performance" className="max-w-[1120px]">
        <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-11 w-full lg:h-10" />
        </div>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-[136px] col-span-2" />
            <Skeleton className="h-[136px]" />
            <Skeleton className="h-[136px]" />
            <Skeleton className="h-[136px] col-span-2" />
        </div>
        <Skeleton className="mt-8 h-72 w-full" />
    </div>
);
