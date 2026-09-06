import React, { useMemo, useState } from 'react';
import { Check, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '@/hooks/useBrutalTheme';
import { formatCurrency, formatDuration, type Region } from '@/utils/formatters';

export interface QueueCatalogService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category_id?: string;
}

export interface QueueCatalogCategory {
  id: string;
  name: string;
}

interface QueueServiceStepProps {
  services: QueueCatalogService[];
  categories: QueueCatalogCategory[];
  region: Region;
  themeOverride: ThemeVariant;
  selectedServiceId: string;
  onSelect: (serviceId: string) => void;
  onContinue: () => void;
}

export const QueueServiceStep: React.FC<QueueServiceStepProps> = ({
  services,
  categories,
  region,
  themeOverride,
  selectedServiceId,
  onSelect,
  onContinue,
}) => {
  const { colors, accent, shadow, font } = useBrutalTheme({ override: themeOverride });
  const [categoryId, setCategoryId] = useState('all');

  const visible = useMemo(
    () => services.filter((service) => categoryId === 'all' || service.category_id === categoryId),
    [categoryId, services],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${font.heading} ${colors.text}`}>
          Escolha o serviço
        </h2>
        <p className={`text-sm mt-1 ${colors.textMuted}`}>O tempo de espera usa a duração deste serviço.</p>
      </div>

      {categories.length > 0 && (
        <div className={`p-1.5 flex gap-1 overflow-x-auto ${colors.card} ${colors.border} border rounded-2xl`}>
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
              categoryId === 'all' ? `${accent.bg} text-[var(--color-on-accent)]` : colors.textMuted
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
                categoryId === category.id
                  ? `${accent.bg} text-[var(--color-on-accent)]`
                  : colors.textMuted
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((service) => {
          const selected = selectedServiceId === service.id;
          const categoryName = categories.find((category) => category.id === service.category_id)?.name;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className={`w-full text-left overflow-hidden rounded-2xl transition-all duration-200 ${
                selected
                  ? `${shadow.glow} ring-2 ${accent.ring}`
                  : `${colors.card} ${colors.border} border ${shadow.card}`
              }`}
            >
              <div className="flex gap-3 p-3">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${colors.surface}`}>
                  <Sparkles className={`w-6 h-6 opacity-20 ${accent.text}`} />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  {categoryName && (
                    <p className={`text-xs font-bold uppercase tracking-[0.12em] ${colors.textMuted}`}>
                      {categoryName}
                    </p>
                  )}
                  <p className={`font-bold tracking-tight ${colors.text}`}>{service.name}</p>
                  <p className={`text-xs mt-1 flex items-center gap-2 ${colors.textMuted}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(service.duration_minutes)}
                    <span className={`font-black tabular-nums ${accent.text}`}>
                      {formatCurrency(service.price, region)}
                    </span>
                  </p>
                </div>
                <span
                  className={`w-9 h-9 mt-3 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected
                      ? `${accent.bg} border-transparent text-[var(--color-on-accent)]`
                      : `${colors.border} ${colors.textMuted}`
                  }`}
                >
                  <Check className="w-4 h-4" />
                </span>
              </div>
              {selected && <div className={`h-1 ${accent.bg}`} />}
            </button>
          );
        })}
      </div>

      <Button
        variant="primary"
        className="w-full min-h-[44px]"
        disabled={!selectedServiceId}
        onClick={onContinue}
      >
        Continuar
      </Button>
    </div>
  );
};
