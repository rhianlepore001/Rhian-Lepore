import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Clock, AlertTriangle, Target, Bell, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProfitMetrics } from '../components/dashboard/ProfitMetrics';
import { ActionCenter } from '../components/dashboard/ActionCenter';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate } from 'react-router-dom';
import { InfoButton } from '../components/HelpButtons';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { MeuDiaWidget } from '../components/dashboard/MeuDiaWidget';
import { SetupCopilot } from '../components/dashboard/SetupCopilot';
import { BusinessHealthCard } from '../components/dashboard/BusinessHealthCard';
import { StaffEarningsCard } from '../components/StaffEarningsCard';
import { EmptyState } from '../components/EmptyState';

// Lazy loading para modais pesados
const GoalSettingsModal = lazy(() => import('../components/dashboard/modals/GoalSettingsModal').then(m => ({ default: m.GoalSettingsModal })));
const AllAppointmentsModal = lazy(() => import('../components/dashboard/modals/AllAppointmentsModal').then(m => ({ default: m.AllAppointmentsModal })));
const MonthlyProfitModal = lazy(() => import('../components/dashboard/modals/MonthlyProfitModal').then(m => ({ default: m.MonthlyProfitModal })));
const GoalHistoryModal = lazy(() => import('../components/dashboard/modals/GoalHistoryModal').then(m => ({ default: m.GoalHistoryModal })));

import { formatCurrency } from '../utils/formatters';
import { useDashboardData } from '../hooks/useDashboardData';
import { logger } from '../utils/Logger';
import { Skeleton } from '../components/SkeletonLoader';
import { SmartNotificationsBanner } from '../components/SmartNotifications';

export const Dashboard: React.FC = () => {
  const { region, role, user } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();

  const isStaff = role === 'staff';

  const [redirectToast, setRedirectToast] = useState<string | null>(null);
  const [commissionBanner, setCommissionBanner] = useState(false);
  const [commissionBannerDismissed, setCommissionBannerDismissed] = useState(false);
  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [unfinishedBannerDismissed, setUnfinishedBannerDismissed] = useState(false);

  useEffect(() => {
    const msg = sessionStorage.getItem('ownerRouteToast');
    if (msg) {
      sessionStorage.removeItem('ownerRouteToast');
      setRedirectToast(msg);
      setTimeout(() => setRedirectToast(null), 4000);
    }
  }, []);

  useEffect(() => {
    if (!user || commissionBannerDismissed) return;
    const fetchCommissionBanner = async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('commission_settlement_day_of_month')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data?.commission_settlement_day_of_month) return;
      const today = new Date();
      const settlementDay = data.commission_settlement_day_of_month;
      if (today.getDate() === settlementDay - 1 || (settlementDay === 1 && today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())) {
        setCommissionBanner(true);
      }
    };
    if (!isStaff) fetchCommissionBanner();
  }, [user, isStaff, commissionBannerDismissed]);

  useEffect(() => {
    if (!user || unfinishedBannerDismissed) return;
    const now = new Date();
    if (now.getHours() < 20) return;
    const fetchUnfinished = async () => {
      const todayStr = now.toISOString().split('T')[0];
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('appointment_time', todayStr + 'T00:00:00')
        .lte('appointment_time', todayStr + 'T23:59:59')
        .neq('status', 'Completed')
        .neq('status', 'Cancelled');
      if (count && count > 0) setUnfinishedCount(count);
    };
    fetchUnfinished();
  }, [user, unfinishedBannerDismissed]);

  const {
    appointments,
    currentMonthRevenue,
    loading,
    monthlyGoal,
    goalHistory,
    updateGoal,
    profitMetrics,
    dataMaturity,
    financialDoctor,
    actionItems,
    fetchAllAppointments
  } = useDashboardData();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showProfitHistory, setShowProfitHistory] = useState(false);
  const [showGoalHistory, setShowGoalHistory] = useState(false);

  const { accent, colors, isBeauty, font, classes, shadow, status } = useBrutalTheme();
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const currencySymbol = region === 'PT' ? '€' : 'R$';

  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0">
      {/* 1. Header */}
      <DashboardHero isBeauty={isBeauty} isStaff={isStaff} />

      {/* Toast: rota bloqueada para staff */}
      {redirectToast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${status.dangerBg.replace('/10', '/90').replace('/20', '/90')} ${status.dangerBorder.replace('/20', '/70')} ${status.danger.replace('text-', 'text-').replace('400', '100').replace('600', '100')} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
          <span className="text-sm font-medium">{redirectToast}</span>
        </div>
      )}

      {/* Smart Notifications */}
      <SmartNotificationsBanner />

      {/* Banner: véspera de pagamento de comissões (apenas owner) */}
      {!isStaff && commissionBanner && !commissionBannerDismissed && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${colors.card} ${accent.borderDim} ${colors.textSecondary}`}>
          <div className="flex items-center gap-2 text-sm">
            <Bell className={`w-4 h-4 shrink-0 ${accent.text}`} />
            <span>Amanhã é dia de pagar as comissões.</span>
            <button
              onClick={() => navigate('/finance')}
              className={`underline underline-offset-2 ${accent.text} hover:opacity-70 transition-opacity`}
            >
              Ver equipe →
            </button>
          </div>
          <button onClick={() => setCommissionBannerDismissed(true)} className={`${colors.textMuted} hover:${colors.text} transition-colors shrink-0`}>
            <span className="sr-only">Fechar</span>✕
          </button>
        </div>
      )}

      {/* Banner: atendimentos não concluídos após 20h */}
      {unfinishedCount > 0 && !unfinishedBannerDismissed && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${colors.card} ${status.dangerBorder} border`}>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`w-4 h-4 shrink-0 ${status.danger}`} />
            <span className={colors.textSecondary}>{unfinishedCount} atendimento{unfinishedCount > 1 ? 's' : ''} não {unfinishedCount > 1 ? 'foram confirmados' : 'foi confirmado'} hoje.</span>
            <button
              onClick={() => navigate('/agenda')}
              className={`underline underline-offset-2 ${status.danger} hover:opacity-70 transition-opacity`}
            >
              Ver agendamentos →
            </button>
          </div>
          <button onClick={() => setUnfinishedBannerDismissed(true)} className={`${status.danger} opacity-60 hover:opacity-100 transition-opacity shrink-0`}>
            <span className="sr-only">Fechar</span>✕
          </button>
        </div>
      )}

      {isStaff ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <MeuDiaWidget />
          <StaffEarningsCard />
        </div>
      ) : (
        <>
          {/* Setup Copilot — guia o usuário nos próximos passos */}
          <SetupCopilot isBeauty={isBeauty} />

          {/* 2. Avisos do Sistema — imediatamente após a saudação, só se houver */}
          {alerts.length > 0 && (
            <BrutalCard className="brutal-card-enhanced animate-in fade-in slide-in-from-bottom-4 duration-500" noPadding>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className={`w-4 h-4 ${accent.text}`} />
                  <span className={`text-xs font-bold uppercase ${colors.text}`}>Avisos do Sistema</span>
                </div>
                <div className="space-y-2">
                  {alerts.slice(0, 2).map(alert => (
                    <div key={alert.id} className={`text-xs ${colors.textSecondary} border-l-2 ${accent.border} pl-2`}>
                      {alert.text}
                    </div>
                  ))}
                </div>
              </div>
            </BrutalCard>
          )}

          {/* 3. Receita do Dia */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <ProfitMetrics
              metrics={profitMetrics}
              dataMaturity={dataMaturity}
              currencySymbol={currencySymbol}
              currencyRegion={currencyRegion}
              isBeauty={isBeauty}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowProfitHistory(true)}
                className={`py-3 px-2 -mr-2 text-xs font-mono uppercase tracking-widest ${accent.text} hover:opacity-70 transition-opacity flex items-center gap-1 min-h-[44px]`}
              >
                Ver histórico de lucros →
              </button>
            </div>
          </div>

          {/* 4. Agenda de Hoje */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <BrutalCard
              id="dashboard-appointments-list"
              title={
                <div className="flex items-center gap-2">
                  <span>Agenda de hoje</span>
                  <InfoButton text="Seus próximos compromissos para hoje." />
                </div>
              }
              className="brutal-card-enhanced"
            >
              {loading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full opacity-60" />
                  <Skeleton className="h-12 w-full opacity-30" />
                </div>
              ) : (
                <ul className={`divide-y ${colors.divider}`}>
                  {appointments.map((apt) => (
                    <li
                      key={apt.id}
                      className="p-3 md:p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                      onClick={() => navigate(`/agenda?date=${apt.rawDate}`)}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`font-mono text-base md:text-xl font-bold ${accent.text} ${colors.card} px-2 py-1 md:px-3 md:py-2 border ${colors.border} rounded-xl flex flex-col items-center min-w-[70px]`}>
                          <span>{apt.time}</span>
                          <span className={`text-[10px] md:text-xs ${colors.textMuted} mt-1`}>
                            {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <p className={`font-heading text-sm md:text-lg ${colors.text}`}>{apt.clientName}</p>
                          <p className={`text-[10px] md:text-sm ${colors.textSecondary} font-mono`}>{apt.service}</p>
                        </div>
                      </div>
                      <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <BrutalButton size="sm" variant="ghost">Ver</BrutalButton>
                      </div>
                    </li>
                  ))}
                  {appointments.length === 0 && (
                    <li className="p-2">
                      <EmptyState
                        icon={Clock}
                        message="Sua agenda está livre hoje."
                        ctaLabel="Criar primeiro agendamento"
                        onCta={() => navigate('/agenda')}
                      />
                    </li>
                  )}
                </ul>
              )}
              <div className={`p-4 border-t ${colors.divider}`}>
                <button
                  onClick={() => setShowAllAppointments(true)}
                  className={`w-full py-3 text-center text-xs font-mono ${accent.text} opacity-60 hover:opacity-100 uppercase tracking-[0.2em] transition-colors ${colors.surface} rounded-lg min-h-[44px] flex items-center justify-center`}
                >
                  Ver Agenda Completa →
                </button>
              </div>
            </BrutalCard>
          </div>

          {/* Centro de Ações */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-250">
            <ActionCenter
              actions={actionItems}
              onActionClick={(action) => logger.info('Action clicked', { action })}
              isBeauty={isBeauty}
            />
          </div>

          {/* 5 + 6. Meta Mensal + Saúde do Negócio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">

            {/* 5. Meta Mensal */}
            <BrutalCard className="h-full brutal-card-enhanced gold-accent-border group" noPadding>
              <div className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${colors.textSecondary}`}>Meta Mensal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${accent.text}`}>{formatCurrency(monthlyGoal, currencyRegion)}</span>
                    <button
                      onClick={() => setIsEditingGoal(true)}
                      className={`p-1.5 rounded-md hover:bg-white/10 ${colors.textMuted} hover:${colors.text} transition-all opacity-0 group-hover:opacity-100`}
                      title="Editar Meta"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className={`w-full ${colors.surface} h-2 rounded-full overflow-hidden mt-2 border ${colors.border}`}>
                  <div
                    className={`h-full ${accent.bg} ${accent.shadow} transition-all duration-1000`}
                    style={{ width: `${Math.min((currentMonthRevenue / (monthlyGoal || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-[10px] ${colors.textSecondary} font-mono`}>
                    {formatCurrency(currentMonthRevenue, currencyRegion)}
                  </p>
                  <p className={`text-[10px] ${colors.textSecondary}`}>
                    {monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0}% atingido
                  </p>
                </div>

                <button
                  onClick={() => setShowGoalHistory(true)}
                  className={`mt-3 py-3 px-2 -ml-2 text-xs font-mono uppercase tracking-widest ${accent.text} hover:opacity-70 transition-opacity relative z-10 min-h-[44px] flex items-center`}
                >
                  Ver histórico →
                </button>

                <button
                  onClick={() => setIsEditingGoal(true)}
                  className="absolute inset-0 z-0 sm:hidden"
                  aria-label="Editar Meta"
                />
              </div>
            </BrutalCard>

            {/* 6. Saúde do Negócio */}
            <BusinessHealthCard
              data={financialDoctor}
              isBeauty={isBeauty}
              currencySymbol={currencySymbol}
            />
          </div>
        </>
      )}

      <Suspense fallback={null}>
        <GoalSettingsModal
          isOpen={isEditingGoal}
          onClose={() => setIsEditingGoal(false)}
          currentGoal={monthlyGoal}
          onSave={updateGoal}
          isBeauty={isBeauty}
        />
        <AllAppointmentsModal
          isOpen={showAllAppointments}
          onClose={() => setShowAllAppointments(false)}
          fetchAllAppointments={fetchAllAppointments}
          isBeauty={isBeauty}
        />
        <MonthlyProfitModal
          isOpen={showProfitHistory}
          onClose={() => setShowProfitHistory(false)}
          isBeauty={isBeauty}
          currencyRegion={currencyRegion}
        />
        <GoalHistoryModal
          isOpen={showGoalHistory}
          onClose={() => setShowGoalHistory(false)}
          history={goalHistory}
          isBeauty={isBeauty}
          currencyRegion={currencyRegion}
        />
      </Suspense>
    </div>
  );
};
