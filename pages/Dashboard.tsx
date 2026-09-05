import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { Calendar, Sparkles, Target } from 'lucide-react';
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
import { lazyWithChunkReload } from '../utils/lazyWithChunkReload';
import {
  countActiveToday,
  countRemainingFreeHours,
} from '../utils/dashboardCockpit';
import type { ActionItem } from '../types/dashboard';

const GoalSettingsModal = lazyWithChunkReload(() =>
  import('../components/dashboard/modals/GoalSettingsModal').then((m) => ({
    default: m.GoalSettingsModal,
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
  const [isEditingDailyGoal, setIsEditingDailyGoal] = useState(false);

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
    loading: statsLoading,
    dailyGoal,
    updateDailyGoal,
    profitMetrics,
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
  const weeklyGrowth = Math.round(profitMetrics.weeklyGrowth || 0);
  const dailyGoalProgress =
    dailyGoal != null && dailyGoal > 0
      ? Math.min(100, Math.round((todayRevenue / dailyGoal) * 100))
      : null;
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;

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
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      Ativos
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-black tabular-nums ${status.success}`}
                    >
                      {clubStats.totalActive}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      Pendentes
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-black tabular-nums ${status.warning}`}
                    >
                      {clubStats.totalPending}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>
                      MRR
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-sm sm:text-xl font-black tabular-nums leading-tight ${accent.text}`}
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
                      Meta do dia
                    </h2>
                    <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                      {dailyGoal != null && dailyGoal > 0
                        ? `${formatCurrency(todayRevenue, currencyRegion)} de ${formatCurrency(dailyGoal, currencyRegion)}`
                        : 'Defina quanto quer faturar hoje'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingDailyGoal(true)}>
                  {dailyGoal != null && dailyGoal > 0 ? 'Ajustar' : 'Definir'}
                </Button>
              </div>
              {dailyGoalProgress != null && (
                <>
                  <div className={`mt-4 h-2 overflow-hidden rounded-full ${colors.surface}`}>
                    <div
                      className={`h-full transition-all duration-700 ${
                        todayRevenue >= dailyGoal! ? 'bg-[var(--color-success)]' : accent.bg
                      }`}
                      style={{ width: `${Math.min(dailyGoalProgress, 100)}%` }}
                    />
                  </div>
                  <p className={`mt-2 font-mono text-xs ${colors.textSecondary}`}>
                    {dailyGoalProgress}%
                    {todayRevenue >= dailyGoal! ? ' · meta atingida' : ' do dia'}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => navigate('/insights')}
                className={`mt-3 min-h-[44px] text-sm font-semibold ${accent.text}`}
              >
                Meta do mês e saúde em Insights →
              </button>
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
          isOpen={isEditingDailyGoal}
          onClose={() => setIsEditingDailyGoal(false)}
          currentGoal={dailyGoal ?? 0}
          onSave={async (value) => {
            await updateDailyGoal(value);
          }}
          isBeauty={isBeauty}
          goalKind="daily"
          currencyRegion={currencyRegion}
        />
      </Suspense>
    </div>
  );
};
