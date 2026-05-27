import React from 'react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface SettingsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  checked,
  onChange,
  id,
  ariaLabel,
  size = 'md'
}) => {
  const { accent } = useBrutalTheme();

  const sizeClasses = {
    sm: 'w-9 h-5 after:h-3.5 after:w-3.5 after:top-[3px] after:left-[3px]',
    md: 'w-11 h-6 after:h-5 after:w-5 after:top-0.5 after:left-[2px]',
    lg: 'w-14 h-7 after:h-6 after:w-6 after:top-[2px] after:left-[2px]'
  };

  return (
    <label
      htmlFor={id}
      className="relative inline-flex items-center cursor-pointer flex-shrink-0"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        aria-label={ariaLabel}
      />
      <div
        className={`
          ${sizeClasses[size]}
          bg-white/[0.04] border border-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:${accent.ring} rounded-full peer
          peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
          after:absolute after:bg-white after:rounded-full after:transition-all after:duration-200 after:ease-out
          peer-checked:${accent.bg}
          shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]
          transition-colors duration-200
        `}
      />
    </label>
  );
};
