import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
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
  const { colors, accent } = useBrutalTheme({ override: themeOverride });
  const [categoryId, setCategoryId] = useState('all');

  const visible = useMemo(
    () => services.filter((service) => categoryId === 'all' || service.category_id === categoryId),
    [categoryId, services],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-xl font-bold ${colors.text}`}>Escolha o serviço</h2>
        <p className={`text-sm ${colors.textMuted}`}>Selecione um serviço para entrar na fila.</p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase ${
              categoryId === 'all' ? `${accent.bg} text-[var(--color-on-accent)]` : `${colors.card} ${colors.border} border ${colors.textMuted}`
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase whitespace-nowrap ${
                categoryId === category.id
                  ? `${accent.bg} text-[var(--color-on-accent)]`
                  : `${colors.card} ${colors.border} border ${colors.textMuted}`
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {visible.map((service) => {
          const selected = selectedServiceId === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className={`w-full min-h-[44px] text-left p-4 rounded-2xl border ${
                selected ? `${accent.border} ${colors.card}` : `${colors.border} ${colors.card}`
              }`}
            >
              <p className={`font-bold ${colors.text}`}>{service.name}</p>
              <p className={`text-xs mt-1 ${colors.textMuted} flex items-center gap-2`}>
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(service.duration_minutes)} · {formatCurrency(service.price, region)}
              </p>
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
