import React from 'react';
import { NavLink } from 'react-router-dom';
import { CLUB_OWNER_NAV } from '../../constants';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export const ClubOwnerNav: React.FC = () => {
  const { accent, colors } = useBrutalTheme();

  return (
    <nav
      aria-label="Seções do clube"
      className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      data-testid="club-owner-nav"
    >
      {CLUB_OWNER_NAV.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          end
          className={({ isActive }) =>
            [
              'inline-flex items-center justify-center shrink-0 px-4 min-h-[44px] rounded-full text-sm font-semibold whitespace-nowrap',
              'border transition-colors active:animate-haptic-click',
              isActive
                ? `${accent.bgDim} ${accent.text} ${accent.border}`
                : `${colors.card} ${colors.border} ${colors.textSecondary}`,
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
