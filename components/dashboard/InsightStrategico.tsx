import React from 'react';
import { TrendingUp, Calendar, Users, Scissors, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface InsightStrategicoProps {
  currentMonthRevenue: number;
  monthlyGoal: number;
  appointmentsToday: number;
  repeatClientRate: number;
  topService: string;
  weeklyGrowth: number;
  isBeauty: boolean;
  currencyRegion: 'BR' | 'PT';
}

export const InsightStrategico: React.FC<InsightStrategicoProps> = ({
  currentMonthRevenue,
  monthlyGoal,
  appointmentsToday,
  repeatClientRate,
  topService,
  weeklyGrowth,
  isBeauty,
  currencyRegion,
}) => {
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBorder = isBeauty ? 'border-beauty-neon/30' : 'border-accent-gold/30';
  const accentBg = isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10';

  const goalPercent = monthlyGoal > 0 ? Math.min(Math.round((currentMonthRevenue / monthlyGoal) * 100), 100) : 0;

  const GrowthIcon = weeklyGrowth > 0 ? ArrowUp : weeklyGrowth < 0 ? ArrowDown : Minus;
  const growthColor = weeklyGrowth > 0 ? 'text-green-400' : weeklyGrowth < 0 ? 'text-red-400' : 'text-neutral-500';

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} p-4 md:p-5`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
          Visão Geral
        </span>
        <span className={`text-[10px] font-mono uppercase tracking-widest ${accentText}`}>
          Hoje
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Receita do mês */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className={`w-3.5 h-3.5 ${accentText}`} />
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Receita</span>
          </div>
          <p className={`text-lg md:text-xl font-heading ${accentText} leading-none`}>
            {formatCurrency(currentMonthRevenue, currencyRegion)}
          </p>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} transition-all duration-700`}
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-text-secondary">{goalPercent}%</span>
          </div>
        </div>

        {/* Agendamentos hoje */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Hoje</span>
          </div>
          <p className="text-lg md:text-xl font-heading text-white leading-none">
            {appointmentsToday}
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {appointmentsToday === 1 ? 'agendamento' : 'agendamentos'}
          </p>
        </div>

        {/* Taxa de retorno */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Retorno</span>
          </div>
          <p className="text-lg md:text-xl font-heading text-white leading-none">
            {repeatClientRate}%
          </p>
          <div className="flex items-center gap-0.5">
            <GrowthIcon className={`w-3 h-3 ${growthColor}`} />
            <span className={`text-[9px] font-mono ${growthColor}`}>{Math.abs(weeklyGrowth)}% semana</span>
          </div>
        </div>

        {/* Top serviço */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Top Serviço</span>
          </div>
          <p className="text-sm md:text-base font-heading text-white leading-snug truncate" title={topService}>
            {topService || '—'}
          </p>
          <p className="text-[10px] text-text-secondary font-mono">mais popular</p>
        </div>
      </div>
    </div>
  );
};
