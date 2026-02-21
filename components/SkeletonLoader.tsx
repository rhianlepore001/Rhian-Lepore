import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
    const baseClasses = "animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]";

    const variantClasses = {
        rect: "rounded-xl",
        circle: "rounded-full",
        text: "rounded-md h-4 w-3/4"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
    );
};

export const SkeletonCard: React.FC = () => (
    <div className="p-6 rounded-[24px] border border-white/5 bg-white/5 space-y-4 overflow-hidden relative">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent bg-[length:200%_100%]"></div>
        <Skeleton variant="text" className="w-1/2 mb-6" />
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
        </div>
    </div>
);
