import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { RankingItem } from '@/types/insights';

interface RankingListProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: RankingItem[];
  currencyRegion: Region;
  emptyTitle: string;
  emptyDescription: string;
  countLabel: (item: RankingItem) => string;
  showMargin?: boolean;
}

export const RankingList: React.FC<RankingListProps> = ({
  title,
  subtitle,
  icon: Icon,
  items,
  currencyRegion,
  emptyTitle,
  emptyDescription,
  countLabel,
  showMargin = false,
}) => {
  const { colors, accent, font } = useBrutalTheme();

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className={`text-sm md:text-base font-heading ${colors.text} uppercase tracking-wide`}>
              {title}
            </h3>
          </div>
          <p className={`text-xs ${colors.textMuted} pl-11`}>{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription}
          bordered
          className="!py-8"
        />
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${font.mono} ${
                      index === 0
                        ? `${accent.bg} text-[var(--color-bg)]`
                        : `${colors.surface} ${colors.textSecondary} ${colors.border} border`
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`${colors.text} font-semibold truncate`}>{item.name}</p>
                    <p className={`text-xs ${colors.textMuted} ${font.mono}`}>
                      {countLabel(item)}
                      {showMargin && item.margin !== undefined
                        ? ` · margem ${formatCurrency(item.margin, currencyRegion)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`${accent.text} font-bold ${font.mono} text-sm md:text-base`}>
                    {formatCurrency(item.revenue, currencyRegion)}
                  </p>
                  <p className={`text-xs ${colors.textMuted} ${font.mono}`}>{item.share}%</p>
                </div>
              </div>
              <div className={`h-1.5 rounded-full ${colors.surface} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${accent.bg}`}
                  style={{ width: `${Math.max(item.share, item.share > 0 ? 4 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};
