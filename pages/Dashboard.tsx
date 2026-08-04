import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { Activity, Calendar, CheckCircle2, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMembershipStats } from '../hooks/useMemberships';
import { useTodayAgenda, useQueueWaitingCount } from '../hooks/useTodayAgenda';
import { useOccupancyRate } from '../hooks/useOccupancyRate';
import { useStaffEarnings } from '../hooks/useStaffEarnings';
import { SetupCopilot } from '../components/dashboard/SetupCopilot';
import { SmartNotificationsBanner } from '../components/SmartNotifications';
import { NextAppointmentHero } from '../components/dashboard/NextAppointmentHero';
import { AttentionInbox, type AttentionItem } from '../components/dashboard/AttentionInbox';
import { TodayKpiStrip, type TodayKpi } from '../components/dashboard/TodayKpiStrip';
import { TodayAgendaList } from '../components/dashboard/TodayAgendaList';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDateLong } from '../utils/formatters';
import { useTenantLocale } from '../hooks/useTenantLocale';
import {
  countActiveToday,
  countRemainingFreeHours,
} from '../utils/dashboardCockpit';
import type { ActionItem } from '../types/dashboard';

const GoalSettingsModal = lazy(() =>
  import('../components/dashboard/modals/GoalSettingsModal').then((m) => ({
    default: m.GoalSettingsModal,
  })),
);
const GoalHistoryModal = lazy(() =>
  import('../components/dashboard/modals/GoalHistoryModal').then((m) => ({
    default: m.GoalHistoryModal,
  })),
);

export const Dashboard: React.FC = () => {
  const { role, user, fullName, companyId } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const isStaff = role === 'staff';

  const [redirectToast, setRedirectToast] = useState<string | null>(null);
  const [commissionBanner, setCommissionBanner] = useState(false);
  const [commissionBannerDismissed, setCommissionBannerDismissed] = useState(false);
  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [unfinishedBannerDismissed, setUnfinishedBannerDismissed] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showGoalHistory, setShowGoalHistory] = useState(false);

  useEffect(() => {
    const msg = sessionStorage.getItem('ownerRouteToast');
    if (msg) {
      sessionStorage.removeItem('ownerRouteToast');
      setRedirectToast(msg);
      setTimeout(() => setRedirectToast(null), 4000);
    }
  }, []);

  useEffect(() => {
    if (!user || commissionBannerDismissed || isStaff) return;
    const fetchCommissionBanner = async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('commission_settlement_day_of_month')
        .eq('user_id', companyId ?? user.id)
        .maybeSingle();
      if (!data?.commission_settlement_day_of_month) return;
      const today = new Date();
      const settlementDay = data.commission_settlement_day_of_month;
      if (
        today.getDate() === settlementDay - 1 ||
        (settlementDay === 1 &&
          today.getDate() ===
            new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())
      ) {
        setCommissionBanner(true);
      }
    };
    fetchCommissionBanner();
  }, [user, isStaff, commissionBannerDismissed, companyId]);

  useEffect(() => {
    if (!user || unfinishedBannerDismissed) return;
    const now = new Date();
    if (now.getHours() < 20 || isStaff) return;
    const fetchUnfinished = async () => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', companyId ?? user.id)
        .gte('appointment_time', `${todayStr}T00:00:00`)
        .lte('appointment_time', `${todayStr}T23:59:59`)
        .neq('status', 'Completed')
        .neq('status', 'Cancelled');
      if (count && count > 0) setUnfinishedCount(count);
    };
    fetchUnfinished();
  }, [user, unfinishedBannerDismissed, isStaff, companyId]);

  const {
    currentMonthRevenue,
    loading: statsLoading,
    monthlyGoal,
    dailyGoal,
    goalHistory,
    updateGoal,
    profitMetrics,
    financialDoctor,
    actionItems,
  } = useDashboardData();

  const { appointments, next, upcoming, loading: agendaLoading } = useTodayAgenda();
  const { data: queueWaiting = 0 } = useQueueWaitingCount();
  const { data: occupancy } = useOccupancyRate('today');
  const { earnings: staffEarnings, loading: staffEarningsLoading } = useStaffEarnings();
  const { accent, colors, font, status, isBeauty } = useBrutalTheme();
  const { data: clubStats } = useMembershipStats();
  const { region: currencyRegion } = useTenantLocale();

  const firstName = fullName?.split(' ')[0] || 'Profissional';
  const todayLabel = formatDateLong(new Date(), currencyRegion);
  const todayRevenue = profitMetrics.todayRevenue ?? 0;
  const goalProgress =
    monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;
  const weeklyGrowth = Math.round(profitMetrics.weeklyGrowth || 0);
  const dailyGoalProgress =
    dailyGoal != null && dailyGoal > 0
      ? Math.min(100, Math.round((todayRevenue / dailyGoal) * 100))
      : null;
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (financialDoctor.repeatClientRate || 0) +
          (financialDoctor.avgTicket > 0 ? 25 : 0) +
          (financialDoctor.topService ? 25 : 0) -
          Math.min(financialDoctor.churnRiskCount || 0, 25),
      ),
    ),
  );
  const healthSummary =
    financialDoctor.avgTicket ||
    financialDoctor.topService ||
    financialDoctor.repeatClientRate
      ? [
          financialDoctor.avgTicket > 0
            ? `Ticket médio ${formatCurrency(financialDoctor.avgTicket, currencyRegion)}`
            : null,
          financialDoctor.topService
            ? `Mais pedido: ${financialDoctor.topService}`
            : null,
          financialDoctor.repeatClientRate > 0
            ? `${Math.round(financialDoctor.repeatClientRate)}% dos clientes voltam`
            : null,
        ].filter(Boolean)
      : [
          'Seus indicadores aparecem após o primeiro mês.',
          'Continue registrando atendimentos para liberar os insights.',
        ];

  const freeSlots = countRemainingFreeHours(occupancy?.hourlySlots);
  const agendaCount = countActiveToday(appointments);
  const completedToday = appointments.filter((a) => {
    const s = a.status.toLowerCase();
    return s === 'completed' || s === 'concluído' || s === 'concluido';
  }).length;
  const pendingToday = appointments.filter((a) => {
    const s = a.status.toLowerCase();
    return s === 'pending' || s === 'pendente' || s === 'confirmed' || s === 'confirmado';
  }).length;

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];

    if (!isStaff && !commissionBannerDismissed && commissionBanner) {
      items.push({
        id: 'commission-due',
        text: 'Amanhã é dia de pagar as comissões da equipe.',
        tone: 'info',
        onClick: () => navigate('/financeiro'),
      });
    }

    if (!isStaff && unfinishedCount > 0 && !unfinishedBannerDismissed) {
      items.push({
        id: 'unfinished-today',
        text: `${unfinishedCount} atendimento${unfinishedCount > 1 ? 's' : ''} ainda não ${
          unfinishedCount > 1 ? 'foram concluídos' : 'foi concluído'
        } hoje.`,
        tone: 'danger',
        onClick: () => navigate('/agenda'),
      });
    }

    alerts.slice(0, 3).forEach((alert) => {
      items.push({
        id: alert.id,
        text: alert.text.replace(/^⚠️\s*/, ''),
        tone: alert.type === 'danger' ? 'danger' : alert.type === 'success' ? 'info' : 'warning',
        onClick: alert.actionPath ? () => navigate(alert.actionPath!) : undefined,
      });
    });

    return items.slice(0, 4);
  }, [
    alerts,
    commissionBanner,
    commissionBannerDismissed,
    unfinishedCount,
    unfinishedBannerDismissed,
    isStaff,
    navigate,
  ]);

  const ownerKpis = useMemo((): TodayKpi[] => {
    return [
      {
        id: 'revenue',
        label: 'Receita',
        value: formatCurrency(todayRevenue, currencyRegion),
        hint:
          dailyGoal != null && dailyGoal > 0
            ? `Meta ${formatCurrency(dailyGoal, currencyRegion)}`
            : 'Hoje',
        progress: dailyGoalProgress,
        onClick: () => navigate('/financeiro'),
      },
      {
        id: 'agenda',
        label: 'Agenda',
        value: String(agendaCount),
        hint: agendaCount === 1 ? '1 agendamento' : `${agendaCount} agendamentos`,
        onClick: () => navigate('/agenda'),
      },
      {
        id: 'queue',
        label: 'Na fila',
        value: String(queueWaiting),
        hint: queueWaiting === 0 ? 'Fila vazia' : 'Aguardando',
        onClick: () => navigate('/fila'),
      },
      {
        id: 'free',
        label: 'Livres',
        value: String(freeSlots),
        hint: freeSlots === 1 ? '1 hora livre' : 'horas livres hoje',
        onClick: () => navigate('/agenda'),
      },
    ];
  }, [
    todayRevenue,
    currencyRegion,
    dailyGoal,
    dailyGoalProgress,
    agendaCount,
    queueWaiting,
    freeSlots,
    navigate,
  ]);

  const staffKpis = useMemo((): TodayKpi[] => {
    return [
      {
        id: 'done',
        label: 'Concluídos',
        value: String(completedToday),
        hint: 'Hoje',
      },
      {
        id: 'pending',
        label: 'Pendentes',
        value: String(pendingToday),
        hint: 'Ainda na agenda',
        onClick: () => navigate('/agenda'),
      },
      {
        id: 'commission',
        label: 'Comissões',
        value: formatCurrency(staffEarnings, currencyRegion),
        hint: 'A receber',
        onClick: () => navigate('/meus-insights'),
      },
      {
        id: 'agenda',
        label: 'Na agenda',
        value: String(agendaCount),
        hint: 'Hoje',
        onClick: () => navigate('/agenda'),
      },
    ];
  }, [
    completedToday,
    pendingToday,
    staffEarnings,
    currencyRegion,
    agendaCount,
    navigate,
  ]);

  const openAgenda = () => navigate('/agenda');
  const loadingStrip = isStaff
    ? agendaLoading || staffEarningsLoading
    : statsLoading || agendaLoading;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={`Olá, ${firstName}`}
        subtitle={todayLabel}
        action={
          !isStaff ? (
            <Button
              variant="primary"
              icon={<Calendar className="h-4 w-4" />}
              onClick={openAgenda}
            >
              Agendar
            </Button>
          ) : undefined
        }
      />

      {redirectToast && (
        <div
          className={`fixed bottom-24 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-lite-glass ${status.dangerBg.replace('/10', '/90').replace('/20', '/90')}`}
          role="status"
        >
          <span className="text-sm font-medium">{redirectToast}</span>
        </div>
      )}

      <SmartNotificationsBanner />

      <NextAppointmentHero
        next={next}
        upcoming={upcoming}
        loading={agendaLoading}
        showPrice={!isStaff}
        priceLabel={
          next && !isStaff ? formatCurrency(next.price, currencyRegion) : undefined
        }
        onPrimaryAction={openAgenda}
        onOpenAgenda={openAgenda}
      />

      <TodayKpiStrip items={isStaff ? staffKpis : ownerKpis} loading={loadingStrip} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="space-y-4">
          <TodayAgendaList
            appointments={appointments}
            nextId={next?.id ?? null}
            loading={agendaLoading}
            showPrice={!isStaff}
            formatPrice={(p) => formatCurrency(p, currencyRegion)}
            onOpenAll={openAgenda}
          />

          {!isStaff && <SetupCopilot />}

          {!isStaff &&
            clubStats &&
            (clubStats.totalActive > 0 || clubStats.totalPending > 0) && (
              <Card
                variant="outlined"
                className="p-4"
                onClick={() => navigate('/clube/assinantes')}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`font-heading text-sm font-bold uppercase tracking-wide ${colors.text}`}
                  >
                    Clube de Assinatura
                  </h3>
                  <span className={`text-xs ${colors.textMuted}`}>ver →</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      Ativos
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-black tabular-nums ${status.success}`}
                    >
                      {clubStats.totalActive}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      Pendentes
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-black tabular-nums ${status.warning}`}
                    >
                      {clubStats.totalPending}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      MRR
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-black tabular-nums ${accent.text}`}
                    >
                      {formatCurrency(
                        clubStats.monthlyRecurringRevenueCents / 100,
                        currencyRegion,
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            )}
        </div>

        <div className="space-y-4">
          <AttentionInbox items={attentionItems} />

          {!isStaff && (
            <Card variant="outlined">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className={`text-sm font-semibold ${colors.text}`}>Oportunidades</h2>
                <button
                  type="button"
                  onClick={() => navigate('/insights')}
                  className={`min-h-[44px] px-2 text-xs font-semibold ${accent.text}`}
                >
                  Insights →
                </button>
              </div>
              {actionItems.length === 0 ? (
                <p className={`text-sm ${colors.textSecondary}`}>
                  Nenhuma ação urgente agora. Mantenha a agenda cheia.
                </p>
              ) : (
                <ul className="space-y-2">
                  {actionItems.slice(0, 3).map((action: ActionItem) => (
                    <li key={action.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/insights')}
                        className={`flex w-full flex-col items-start gap-0.5 rounded-2xl p-3 text-left ${colors.surface} min-h-[44px] hover:opacity-90`}
                      >
                        <span className={`text-sm font-semibold ${colors.text}`}>
                          {action.title}
                        </span>
                        <span className={`text-xs ${colors.textSecondary} text-pretty`}>
                          {action.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {!isStaff && (
            <Card variant="outlined">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`${iconClass} shrink-0`}>
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                      Metas
                    </h2>
                    <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                      Dia{' '}
                      {dailyGoal != null
                        ? `${formatCurrency(todayRevenue, currencyRegion)} / ${formatCurrency(dailyGoal, currencyRegion)}`
                        : 'sem meta diária'}
                    </p>
                    <p className={`text-sm ${colors.textSecondary}`}>
                      Mês {formatCurrency(currentMonthRevenue, currencyRegion)} /{' '}
                      {formatCurrency(monthlyGoal, currencyRegion)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingGoal(true)}>
                  Ajustar
                </Button>
              </div>
              <div className={`mt-4 h-2 overflow-hidden rounded-full ${colors.surface}`}>
                <div
                  className={`h-full ${accent.bg} transition-all duration-700`}
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`font-mono text-xs ${colors.textSecondary}`}>
                  {goalProgress}% no mês
                </span>
                <button
                  type="button"
                  onClick={() => setShowGoalHistory(true)}
                  className={`min-h-[44px] text-sm font-semibold ${accent.text}`}
                >
                  Histórico
                </button>
              </div>
            </Card>
          )}

          {!isStaff && (
            <Card variant="outlined">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`${iconClass} shrink-0`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                      Saúde do negócio
                    </h2>
                    <p className={`text-sm ${colors.textSecondary} text-pretty`}>
                      Retorno, ticket e risco de perda.
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-2xl font-black tabular-nums ${accent.text}`}
                >
                  {healthScore}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {healthSummary.slice(0, 2).map((item) => (
                  <div
                    key={String(item)}
                    className={`flex items-start gap-3 rounded-2xl p-3 ${colors.surface}`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`}
                      aria-hidden="true"
                    />
                    <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!isStaff && (
            <Card variant="outlined">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`${iconClass} shrink-0`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                    Dica para hoje
                  </h2>
                  <p className={`mt-1 text-sm ${colors.textSecondary} text-pretty`}>
                    {weeklyGrowth > 0
                      ? `Você está ${weeklyGrowth}% acima da média recente. Mantenha a agenda cheia nos horários de maior procura.`
                      : weeklyGrowth < 0
                        ? `Seu movimento caiu ${Math.abs(weeklyGrowth)}% em relação à média recente. Que tal avisar os clientes dos horários vagos de hoje?`
                        : 'Seu movimento está estável. Preencha os horários vagos para crescer em relação à média recente.'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <GoalSettingsModal
          isOpen={isEditingGoal}
          onClose={() => setIsEditingGoal(false)}
          currentGoal={monthlyGoal}
          onSave={updateGoal}
          isBeauty={isBeauty}
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
