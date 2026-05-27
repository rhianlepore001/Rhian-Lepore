import React from 'react';

type SkeletonVariant = 'rect' | 'circle' | 'text';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string | number;
  height?: string | number;
  count?: number;
}

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'rounded-md h-4 w-3/4',
};

const SingleSkeleton: React.FC<Omit<SkeletonProps, 'count'>> = ({
  variant = 'rect', className = '', width, height,
}) => (
  <div
    className={[
      'animate-pulse bg-[var(--color-card-hover)]',
      VARIANT_CLASSES[variant],
      className,
    ].join(' ')}
    style={{ width, height }}
    role="status"
    aria-label="Carregando"
  >
    <span className="sr-only">Carregando...</span>
  </div>
);

export const Skeleton: React.FC<SkeletonProps> = ({ count = 1, ...props }) => {
  if (count <= 1) return <SingleSkeleton {...props} />;

  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <SingleSkeleton key={i} {...props} />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={[
      'p-5 rounded-2xl border border-[var(--color-border)]',
      'bg-[var(--color-card)] space-y-4',
      className,
    ].join(' ')}
    role="status"
    aria-label="Carregando"
  >
    <Skeleton variant="text" className="w-1/3 h-5 mb-4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-2/3" />
    <span className="sr-only">Carregando...</span>
  </div>
);
