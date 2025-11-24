
import React from 'react';

interface ScrewProps {
  className?: string;
}

export const Screw: React.FC<ScrewProps> = ({ className = '' }) => {
  return (
    <div className={`absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-neutral-700 border border-black flex items-center justify-center shadow-sm ${className}`}>
      {/* Screw head pattern - simple cross */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="text-neutral-900 opacity-70">
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="15" />
        <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="15" />
      </svg>
    </div>
  );
};
