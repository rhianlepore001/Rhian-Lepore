import React, { useMemo, useState } from 'react';
import { Check, Clock } from 'lucide-react';
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
  const { colors, accent, font, radius } = useBrutalTheme({ override: themeOverride });
  const [categoryId, setCategoryId] = useState('all');

  const visible = useMemo(
    () => services.filter((service) => categoryId === 'all' || service.category_id === categoryId),
    [categoryId, services],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl md:text-[22px] font-semibold tracking-tight ${font.heading} ${colors.text}`}>
          Qual serviço você quer hoje?
        </h2>
        <p className={`text-sm mt-1.5 leading-relaxed ${colors.textMuted}`}>
          O tempo de espera é calculado com base na duração dos serviços.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className={`min-h-[44px] px-4 ${radius.badge} text-sm font-semibold whitespace-nowrap transition-colors ${
              categoryId === 'all'
                ? `${accent.bg} text-[var(--color-on-accent)]`
                : `${colors.card} ${colors.border} border ${colors.textSecondary}`
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`min-h-[44px] px-4 ${radius.badge} text-sm font-semibold whitespace-nowrap transition-colors ${
                categoryId === category.id
                  ? `${accent.bg} text-[var(--color-on-accent)]`
                  : `${colors.card} ${colors.border} border ${colors.textSecondary}`
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {visible.length === 0 ? (
          <p className={`text-sm py-8 text-center ${colors.textMuted}`}>
            {services.length === 0
              ? 'Nenhum serviço disponível no momento. Fale com a equipe no balcão.'
              : 'Nenhum serviço nesta categoria.'}
          </p>
        ) : (
          visible.map((service) => {
            const selected = selectedServiceId === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelect(service.id)}
                aria-pressed={selected}
                className={`w-full text-left ${radius.card} border px-4 py-3.5 min-h-[72px] transition-colors ${
                  selected
                    ? `${accent.border} ${accent.bgDim} border`
                    : `${colors.card} ${colors.border}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold tracking-tight ${colors.text}`}>{service.name}</p>
                    <p className={`text-sm mt-1 flex items-center gap-2 ${colors.textMuted}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold tabular-nums ${accent.text}`}>
                        {formatCurrency(service.price, region)}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                      selected
                        ? `${accent.bg} border-transparent text-[var(--color-on-accent)]`
                        : `${colors.border} ${colors.textMuted}`
                    }`}
                    aria-hidden="true"
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-theme-bg">
        <Button
          variant="primary"
          className="w-full min-h-[48px]"
          disabled={!selectedServiceId}
          onClick={onContinue}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};
