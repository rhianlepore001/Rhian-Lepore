
import React from 'react';
import { Screw } from './Screw';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

import { useAuth } from '../contexts/AuthContext';

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  className = '',
  title,
  action,
  noPadding = false
}) => {
  const { userType } = useAuth();
  const isBeauty = userType === 'beauty';

  // Styles
  const containerClass = isBeauty
    ? `relative bg-beauty-card/80 backdrop-blur-md border border-white/10 shadow-soft rounded-2xl overflow-hidden ${className}`
    : `relative bg-brutal-card border-4 border-brutal-border shadow-heavy ${className}`;

  const headerClass = isBeauty
    ? "flex justify-between items-center px-6 py-4 border-b border-white/5"
    : "flex justify-between items-center px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 border-b-2 border-brutal-border border-dashed mx-2 mb-2";

  return (
    <div className={containerClass}>
      {/* Decorative Screws (Only for Barber) */}
      {!isBeauty && (
        <>
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
        </>
      )}

      {/* Header Area if title exists */}
      {(title || action) && (
        <div className={headerClass}>
          {title && <h3 className={`font-heading text-lg md:text-xl ${isBeauty ? 'text-white tracking-normal' : 'text-text-primary uppercase tracking-wider'}`}>{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className={`${noPadding ? '' : 'p-4 md:p-6'} text-text-secondary relative z-10`}>
        {children}
      </div>
    </div>
  );
};
