import React, { useState } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Clock, AlertTriangle, ArrowRight, Target } from 'lucide-react';
import { ProfitMetrics } from '../components/dashboard/ProfitMetrics';
import { ActionCenter } from '../components/dashboard/ActionCenter';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate } from 'react-router-dom';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { GoalHistory } from '../components/GoalHistory';
import { GoalSettingsModal } from '../components/dashboard/GoalSettingsModal';

import { formatCurrency } from '../utils/formatters';
import { useAppTour } from '../hooks/useAppTour';
import { useDashboardData } from '../hooks/useDashboardData';
import { logger } from '../utils/Logger';

export const Dashboard: React.FC = () => {
  const { userType, region, businessName } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const { startTour } = useAppTour();

  const {
    appointments,
    currentMonthRevenue,
    loading,
    monthlyGoal,
    goalHistory,
    updateGoal,
    profitMetrics,
    actionItems
  } = useDashboardData();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(monthlyGoal.toString());

  const isBeauty = userType === 'beauty';
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const currencySymbol = region === 'PT' ? '€' : 'R$';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

  const handleSaveGoal = async () => {
    const goalValue = parseFloat(newGoal);
    if (isNaN(goalValue)) return;

    const { error } = await updateGoal(goalValue);

    if (error) {
      logger.error('Error updating goal', error);
      alert("Erro ao atualizar a meta.");
    } else {
      setIsEditingGoal(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-6 md:pb-8 gap-4 md:gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex-1">
          <h1 className="text-4xl md:text-7xl font-heading text-white mt-2 leading-tight tracking-tight">
            {businessName || 'Seu '}<span className={accentText}>{businessName ? '' : 'Negócio'}</span>
          </h1>
          <p className="text-xs md:text-sm text-text-secondary font-mono mt-3 uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
            <span className={`w-8 h-[1px] ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`}></span>
            Acompanhe a gestão do seu negócio
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <InfoButton text="Assista ao tutorial guiado do sistema para aprender a usar todas as funcionalidades do seu painel e otimizar seu tempo." />
          <BrutalButton
            id="dashboard-new-appointment"
            variant="primary"
            size="md"
            icon={<Clock />}
            className="w-full md:w-auto flex-1 text-sm md:text-base h-11 md:h-auto"
            onClick={() => navigate('/agenda')}
          >
            Novo Agendamento
          </BrutalButton>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <ProfitMetrics
          metrics={profitMetrics}
          currencySymbol={currencySymbol}
          currencyRegion={currencyRegion}
          isBeauty={isBeauty}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        <div className="lg:col-span-1 h-full">
          <ActionCenter
            actions={actionItems}
            onActionClick={(action) => logger.info('Action clicked', { action })}
            isBeauty={isBeauty}
          />
        </div>

        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <BrutalCard
            id="dashboard-appointments-list"
            title={
              <div className="flex items-center gap-2">
                <span>Próximos Atendimentos</span>
                <InfoButton text="Seus próximos compromissos para hoje." />
              </div>
            }
            className="brutal-card-enhanced"
            noPadding
          >
            {loading ? (
              <div className="p-4 text-center text-text-secondary">Carregando agendamentos...</div>
            ) : (
              <ul className="divide-y-2 divide-neutral-800">
                {appointments.map((apt) => (
                  <li
                    key={apt.id}
                    className="p-3 md:p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() => navigate(`/agenda?date=${apt.rawDate}`)}
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`font-mono text-base md:text-xl font-bold ${accentText} bg-neutral-900 px-2 py-1 md:px-3 md:py-2 border border-neutral-700 flex flex-col items-center min-w-[70px]`}>
                        <span>{apt.time}</span>
                        <span className="text-[10px] md:text-xs opacity-70 mt-1">
                          {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <p className="font-heading text-sm md:text-lg text-white">{apt.clientName}</p>
                        <p className="text-[10px] md:text-sm text-text-secondary font-mono">{apt.service}</p>
                      </div>
                    </div>
                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <BrutalButton size="sm" variant="ghost">Ver</BrutalButton>
                    </div>
                  </li>
                ))}
                {appointments.length === 0 && (
                  <li className="p-4 text-center text-text-secondary">Nenhum agendamento encontrado.</li>
                )}
              </ul>
            )}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={() => navigate('/agenda')}
                className={`w-full py-2 text-center text-[10px] md:text-xs font-mono text-text-secondary hover:${accentText} uppercase tracking-[0.2em] transition-colors bg-white/5 rounded-lg`}
              >
                Ver Agenda Completa →
              </button>
            </div>
          </BrutalCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrutalCard className="h-full brutal-card-enhanced gold-accent-border group" noPadding>
              <div className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-text-secondary">Meta Mensal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${accentText}`}>{formatCurrency(monthlyGoal, currencyRegion)}</span>
                    <button
                      onClick={() => setIsEditingGoal(true)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      title="Editar Meta"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mt-2 border border-white/5">
                  <div
                    className={`h-full ${isBeauty ? 'bg-beauty-neon shadow-[0_0_10px_rgba(255,0,255,0.5)]' : 'bg-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'} transition-all duration-1000`}
                    style={{ width: `${Math.min((currentMonthRevenue / (monthlyGoal || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] text-text-secondary font-mono">
                    {formatCurrency(currentMonthRevenue, currencyRegion)}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    {monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0}% atingido
                  </p>
                </div>

                <button
                  onClick={() => setIsEditingGoal(true)}
                  className="absolute inset-0 z-0 sm:hidden"
                  aria-label="Editar Meta"
                />
              </div>
            </BrutalCard>

            <BrutalCard className="h-full brutal-card-enhanced" noPadding>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold uppercase text-white">Avisos do Sistema</span>
                </div>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 2).map(alert => (
                      <div key={alert.id} className="text-xs text-text-secondary border-l-2 border-yellow-500 pl-2">
                        {alert.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">Tudo operando normalmente.</p>
                )}
              </div>
            </BrutalCard>
          </div>
        </div>
      </div>
      <GoalSettingsModal
        isOpen={isEditingGoal}
        onClose={() => setIsEditingGoal(false)}
        currentGoal={monthlyGoal}
        onSave={updateGoal}
        isBeauty={isBeauty}
      />
    </div >
  );
};
