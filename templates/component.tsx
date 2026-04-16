import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';

interface ComponentNameProps {
  className?: string;
  forceTheme?: 'barber' | 'beauty';
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  className = '',
  forceTheme,
}) => {
  const { userType } = useAuth();
  const { isMobile } = useUI();
  const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';

  return (
    <div className={`${isBeauty ? 'bg-white' : 'bg-gray-900'} ${className}`}>
    </div>
  );
};
