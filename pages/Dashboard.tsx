import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Activity, AlertTriangle, Bell, Calendar, CheckCircle2, Clock, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useDashboardData } from '../hooks/useDashboardData';
import { MeuDiaWidget } from '../components/dashboard/MeuDiaWidget';
import { SetupCopilot } from '../components/dashboard/SetupCopilot';
import { StaffEarningsCard } from '../components/StaffEarningsCard';
import { SmartNotificationsBanner } from '../components/SmartNotifications';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatCurrency, formatDateLong } from '../utils/formatters';

const GoalSettingsModal = lazy(() => import('../components/dashboard/modals/GoalSettingsModal').then(m => ({ default: m.GoalSettingsModal })));
const GoalHistoryModal = lazy(() => import('../components/dashboard/modals/GoalHistoryModal').then(m => ({ default: m.GoalHistoryModal })));

export const Dashboard: React.FC = () => {
  const { region, role, user, fullName } = useAuth();
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
    financialDoctor,
    actionItems,
  } = useDashboardData();

  const { accent, colors, density, status, isBeauty } = useBrutalTheme();
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const firstName = fullName?.split(' ')[0] || 'Profissional';
  const todayLabel = formatDateLong(new Date(), currencyRegion);
  const todayRevenue = profitMetrics.todayRevenue ?? 0;
  const goalProgress = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;
  const vsYesterday = Math.max(profitMetrics.weeklyGrowth || 0, 0);
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;
  const healthScore = Math.min(100, Math.max(0, Math.round(
    (financialDoctor.repeatClientRate || 0) +
    (financialDoctor.avgTicket > 0 ? 25 : 0) +
    (financialDoctor.topService ? 25 : 0) -
    Math.min(financialDoctor.churnRiskCount || 0, 25)
  )));
  const healthSummary = financialDoctor.avgTicket || financialDoctor.topService || financialDoctor.repeatClientRate
    ? [
        financialDoctor.avgTicket > 0 ? `Ticket médio ${formatCurrency(financialDoctor.avgTicket, currencyRegion)}` : null,
        financialDoctor.topService ? `Mais pedido: ${financialDoctor.topService}` : null,
        financialDoctor.repeatClientRate > 0 ? `${Math.round(financialDoctor.repeatClientRate)}% dos clientes voltam` : null,
      ].filter(Boolean)
    : ['Seus indicadores aparecem após o primeiro mês.', 'Continue registrando atendimentos para liberar os insights.'];

  return (
    <div className={`space-y-6 md:space-y-8 ${density.pagePadding} md:px-0`}>
      {!isStaff && (
        <PageHeader
          title={`Olá, ${firstName}`}
          subtitle={todayLabel}
          action={
            <Button variant="primary" icon={<Calendar className="h-4 w-4" />} onClick={() => navigate('/agenda')}>
              Agendar
            </Button>
          }
        />
      )}

      {redirectToast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lite-glass border ${status.dangerBg.replace('/10', '/90').replace('/20', '/90')} ${status.dangerBorder.replace('/20', '/70')} ${status.danger.replace('text-', 'text-').replace('400', '100').replace('600', '100')}`} role="status">
          <span className="text-sm font-medium">{redirectToast}</span>
        </div>
      )}

      <SmartNotificationsBanner />

      {isStaff ? (
        <div className="space-y-4">
          <MeuDiaWidget />
          <StaffEarningsCard />
        </div>
      ) : (
        <>
          {loading ? (
            <SkeletonCard className={density.kpiMinHeight} />
          ) : (
            <Card variant="elevated" className={density.kpiMinHeight}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${colors.textSecondary}`}>Faturamento hoje</p>
                  <p className={`mt-2 font-mono text-3xl font-black tracking-tight tabular-nums md:text-4xl ${colors.text}`}>
                    {formatCurrency(todayRevenue, currencyRegion)}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.successBg} ${status.successBorder} ${status.success}`}>
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {vsYesterday}% vs ontem
                </span>
              </div>
            </Card>
          )}

          <section className="grid grid-cols-2 gap-3">
            {loading ? (
              <>
                <SkeletonCard className="min-h-[88px]" />
                <SkeletonCard className="min-h-[88px]" />
              </>
            ) : (
              <>
                <Card variant="outlined" className="p-4">
                  <p className={`text-sm font-semibold ${colors.textSecondary}`}>Agenda de hoje</p>
                  <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${colors.text}`}>{appointments.length}</p>
                  <p className={`mt-0.5 text-xs ${colors.textMuted}`}>
                    {appointments.length === 1 ? '1 agendamento' : `${appointments.length} agendamentos`}
                  </p>
                </Card>
                <Card variant="outlined" className="p-4">
                  <p className={`text-sm font-semibold ${colors.textSecondary}`}>Oportunidades</p>
                  <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${colors.text}`}>{actionItems.length}</p>
                  <p className={`mt-0.5 text-xs ${colors.textMuted}`}>
                    {actionItems.length === 1 ? '1 ação em aberto' : `${actionItems.length} ações em aberto`}
                  </p>
                </Card>
              </>
            )}
          </section>

          <SetupCopilot />

          {!commissionBannerDismissed && commissionBanner && (
            <Card variant="outlined">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Bell className={`h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
                  <span className={colors.textSecondary}>Amanhã é dia de pagar as comissões.</span>
                  <button
                    type="button"
                    onClick={() => navigate('/financeiro')}
                    className={`underline underline-offset-2 ${accent.text} hover:opacity-70 transition-opacity min-h-[44px] px-2`}
                  >
                    Ver equipe
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCommissionBannerDismissed(true)}
                  className={`${colors.textMuted} transition-opacity hover:opacity-70 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center`}
                  aria-label="Fechar aviso de comissões"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          {unfinishedCount > 0 && !unfinishedBannerDismissed && (
            <Card variant="outlined">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className={`h-4 w-4 shrink-0 ${status.danger}`} aria-hidden="true" />
                  <span className={colors.textSecondary}>
                    {unfinishedCount} atendimento{unfinishedCount > 1 ? 's' : ''} não{' '}
                    {unfinishedCount > 1 ? 'foram confirmados' : 'foi confirmado'} hoje.
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/agenda')}
                    className={`underline underline-offset-2 ${status.danger} hover:opacity-70 transition-opacity min-h-[44px] px-2`}
                  >
                    Ver agendamentos
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setUnfinishedBannerDismissed(true)}
                  className={`${status.danger} opacity-60 hover:opacity-100 transition-opacity shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center`}
                  aria-label="Fechar aviso de atendimentos"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          {alerts.length > 0 && (
            <Card variant="outlined">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={`h-4 w-4 ${accent.text}`} aria-hidden="true" />
                <span className={`text-sm font-semibold ${colors.text}`}>Avisos importantes</span>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className={`text-sm ${colors.textSecondary} pl-1`}>
                    {alert.text}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)]">
            <Card variant="outlined">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className={iconClass}><Target className="h-5 w-5" /></div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>Meta mensal</h2>
                    <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                      Você já fez {formatCurrency(currentMonthRevenue, currencyRegion)} de {formatCurrency(monthlyGoal, currencyRegion)}.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingGoal(true)}>
                  Ajustar meta
                </Button>
              </div>
              <div className={`mt-6 h-3 rounded-full ${colors.surface} overflow-hidden`}>
                <div className={`h-full ${accent.bg} transition-all duration-1000`} style={{ width: `${Math.min(goalProgress, 100)}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`font-mono text-xs ${colors.textSecondary}`}>{goalProgress}% atingido</span>
                <button
                  type="button"
                  onClick={() => setShowGoalHistory(true)}
                  className={`min-h-[44px] text-sm font-semibold ${accent.text} transition-opacity hover:opacity-70`}
                >
                  Ver histórico
                </button>
              </div>
            </Card>

            <Card variant="outlined">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={iconClass}><Activity className="h-5 w-5" /></div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>Saúde do negócio</h2>
                    <p className={`text-sm ${colors.textSecondary}`}>Leitura rápida do momento.</p>
                  </div>
                </div>
                <span className={`font-mono text-2xl font-black tabular-nums ${accent.text}`}>{healthScore}</span>
              </div>
              <div className="mt-5 space-y-3">
                {healthSummary.map((item) => (
                  <div key={String(item)} className={`flex items-start gap-3 rounded-2xl p-3 ${colors.surface}`}>
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
                    <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <Card variant="outlined">
            <div className="flex items-start gap-4">
              <div className={iconClass}><Sparkles className="h-5 w-5" /></div>
              <div>
                <h2 className={`font-heading text-base font-bold ${colors.text}`}>Dica para hoje</h2>
                <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                  Você está {vsYesterday}% acima da média recente. Mantenha a agenda cheia nos horários de maior procura.
                </p>
              </div>
            </div>
          </Card>
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
