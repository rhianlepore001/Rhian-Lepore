import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

/** Dica do dia pela variação semanal. `null` = estatísticas ainda não carregadas. */
export function dailyTipText(weeklyGrowth: number | null): string | null {
  if (weeklyGrowth === null) return null;
  if (weeklyGrowth > 0) {
    return `Você está ${weeklyGrowth}% acima da média recente. Mantenha a agenda cheia nos horários de maior procura.`;
  }
  if (weeklyGrowth < 0) {
    return `Seu movimento caiu ${Math.abs(weeklyGrowth)}% em relação à média recente. Que tal avisar os clientes dos horários vagos de hoje?`;
  }
  return 'Seu movimento está estável. Preencha os horários vagos para crescer em relação à média recente.';
}

/**
 * Card "Dica para hoje". Enquanto as estatísticas não chegam mostra um placeholder
 * com a mesma altura (sem texto provisório), evitando a troca "estável" → "caiu 100%".
 */
export const DailyTipCard: React.FC<{ weeklyGrowth: number | null }> = ({ weeklyGrowth }) => {
  const { accent, colors } = useBrutalTheme();
  const text = dailyTipText(weeklyGrowth);
  return (
    <Card variant="outlined">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text} shrink-0`}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`font-heading text-base font-bold ${colors.text}`}>Dica para hoje</h2>
          <div
            data-testid="daily-tip-body"
            aria-busy={text === null ? 'true' : 'false'}
            aria-live="polite"
            className="mt-1 min-h-[5rem] sm:min-h-[3.75rem] md:min-h-[2.5rem]"
          >
            {text === null ? (
              <div className="space-y-2 pt-0.5">
                <Skeleton variant="text" className="w-full" />
                <Skeleton variant="text" className="w-2/3" />
              </div>
            ) : (
              <p className={`text-sm ${colors.textSecondary} text-pretty`}>{text}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
