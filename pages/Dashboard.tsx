import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Calendar, CheckCircle2, ChevronRight, Clock, DollarSign, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { MeuDiaWidget } from '../components/dashboard/MeuDiaWidget';
import { SetupCopilot } from '../components/dashboard/SetupCopilot';
import { StaffEarningsCard } from '../components/StaffEarningsCard';
import { EmptyState } from '../components/EmptyState';
import { MiniSparkline } from '../components/dashboard/MiniSparkline';
import { InfoButton } from '../components/HelpButtons';
import { Skeleton } from '../components/SkeletonLoader';
import { SmartNotificationsBanner } from '../components/SmartNotifications';
import { formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';

const GoalSettingsModal = lazy(() => import('../components/dashboard/modals/GoalSettingsModal').then(m => ({ default: m.GoalSettingsModal })));
const AllAppointmentsModal = lazy(() => import('../components/dashboard/modals/AllAppointmentsModal').then(m => ({ default: m.AllAppointmentsModal })));
const MonthlyProfitModal = lazy(() => import('../components/dashboard/modals/MonthlyProfitModal').then(m => ({ default: m.MonthlyProfitModal })));
const GoalHistoryModal = lazy(() => import('../components/dashboard/modals/GoalHistoryModal').then(m => ({ default: m.GoalHistoryModal })));

const buildSparkline = (base: number, count = 10): number[] => {
  const seed = Math.max(base, 8);
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 1.35) * seed * 0.16;
    const climb = index * seed * 0.035;
    return Math.max(1, Math.round(seed * 0.72 + wave + climb));
  });
};

const DashboardPanel: React.FC<React.PropsWithChildren<{ panelClass: string; className?: string; id?: string }>> = ({ children, panelClass, className = '', id }) => (
  <div id={id} className={`${panelClass} ${className}`}>
    {children}
  </div>
);

interface PremiumKpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  sparkline: number[];
  accentHex: string;
  panelClass: string;
  iconClass: string;
  textClass: string;
  secondaryTextClass: string;
  accentBgClass: string;
  successClass: string;
  successBgClass: string;
  successBorderClass: string;
  progress?: number;
}

const PremiumKpiCard: React.FC<PremiumKpiCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  trend,
  sparkline,
  accentHex,
  panelClass,
  iconClass,
  textClass,
  secondaryTextClass,
  accentBgClass,
  successClass,
  successBgClass,
  successBorderClass,
  progress
}) => (
  <DashboardPanel panelClass={panelClass} className="min-h-[178px] p-5 transition-transform duration-200 hover:-translate-y-0.5 md:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={iconClass}>{icon}</div>
        <p className={`text-sm font-semibold ${textClass}`}>{title}</p>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_108px] items-end gap-4">
      <div className="min-w-0">
        <p className={`font-mono text-2xl font-black tracking-tight tabular-nums md:text-3xl ${textClass}`}>{value}</p>
        <p className={`mt-1 text-sm ${secondaryTextClass}`}>{subtitle}</p>
        <span className={`mt-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${successBgClass} ${successBorderClass} ${successClass}`}>
          <TrendingUp className="h-3.5 w-3.5" />
          {trend}
        </span>
      </div>
      <div className="min-w-0">
        <MiniSparkline data={sparkline} color={accentHex} height={54} showArea />
      </div>
    </div>
    {typeof progress === 'number' && (
      <div className={accentBgClass}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: accentHex }} />
      </div>
    )}
  </DashboardPanel>
);

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
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showProfitHistory, setShowProfitHistory] = useState(false);
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
    dataMaturity,
    financialDoctor,
    actionItems,
    fetchAllAppointments
  } = useDashboardData();

  const { accent, colors, isBeauty, shadow, status } = useBrutalTheme();
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const currencySymbol = region === 'PT' ? '€' : 'R$';
  const todayRevenue = profitMetrics.todayRevenue ?? 0;
  const goalProgress = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;
  const dailyGoal = monthlyGoal > 0 ? monthlyGoal / 22 : 0;
  const dailyGoalProgress = dailyGoal > 0 ? Math.round((todayRevenue / dailyGoal) * 100) : 0;
  const topActions = actionItems.slice(0, 4);
  const panelClass = `${colors.card} ${colors.border} ${shadow.card} rounded-[1.5rem] border overflow-hidden transition-all duration-300`;
  const subtlePanelClass = `${colors.surface} ${colors.border} rounded-[1.5rem] border overflow-hidden`;
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;
  const progressTrackClass = `mt-4 h-2 rounded-full ${colors.surface} overflow-hidden`;
  const healthScore = Math.min(100, Math.max(0, Math.round(
    (financialDoctor.repeatClientRate || 0) +
    (financialDoctor.avgTicket > 0 ? 25 : 0) +
    (financialDoctor.topService ? 25 : 0) -
    Math.min(financialDoctor.churnRiskCount || 0, 25)
  )));
  const healthSummary = financialDoctor.avgTicket || financialDoctor.topService || financialDoctor.repeatClientRate
    ? [
        financialDoctor.avgTicket > 0 ? `Ticket medio ${currencySymbol} ${financialDoctor.avgTicket.toFixed(2).replace('.', ',')}` : null,
        financialDoctor.topService ? `Mais pedido: ${financialDoctor.topService}` : null,
        financialDoctor.repeatClientRate > 0 ? `${Math.round(financialDoctor.repeatClientRate)}% dos clientes voltam` : null,
      ].filter(Boolean)
    : ['Seus indicadores aparecem apos o primeiro mes.', 'Continue registrando atendimentos para liberar os insights.'];

  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0">
      <DashboardHero isBeauty={isBeauty} isStaff={isStaff} />

      {redirectToast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${status.dangerBg.replace('/10', '/90').replace('/20', '/90')} ${status.dangerBorder.replace('/20', '/70')} ${status.danger.replace('text-', 'text-').replace('400', '100').replace('600', '100')} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
          <span className="text-sm font-medium">{redirectToast}</span>
        </div>
      )}

      <SmartNotificationsBanner />

      {!isStaff && commissionBanner && !commissionBannerDismissed && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${colors.card} ${accent.borderDim} ${colors.textSecondary}`}>
          <div className="flex items-center gap-2 text-sm">
            <Bell className={`w-4 h-4 shrink-0 ${accent.text}`} />
            <span>Amanha e dia de pagar as comissoes.</span>
            <button onClick={() => navigate('/finance')} className={`underline underline-offset-2 ${accent.text} hover:opacity-70 transition-opacity`}>
              Ver equipe
            </button>
          </div>
          <button onClick={() => setCommissionBannerDismissed(true)} className={`${colors.textMuted} transition-opacity hover:opacity-70 shrink-0`}>
            <span className="sr-only">Fechar</span>x
          </button>
        </div>
      )}

      {unfinishedCount > 0 && !unfinishedBannerDismissed && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${colors.card} ${status.dangerBorder} border`}>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`w-4 h-4 shrink-0 ${status.danger}`} />
            <span className={colors.textSecondary}>{unfinishedCount} atendimento{unfinishedCount > 1 ? 's' : ''} nao {unfinishedCount > 1 ? 'foram confirmados' : 'foi confirmado'} hoje.</span>
            <button onClick={() => navigate('/agenda')} className={`underline underline-offset-2 ${status.danger} hover:opacity-70 transition-opacity`}>
              Ver agendamentos
            </button>
          </div>
          <button onClick={() => setUnfinishedBannerDismissed(true)} className={`${status.danger} opacity-60 hover:opacity-100 transition-opacity shrink-0`}>
            <span className="sr-only">Fechar</span>x
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SetupCopilot isBeauty={isBeauty} />
          </div>

          {alerts.length > 0 && (
            <DashboardPanel panelClass={panelClass} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-5">
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
            </DashboardPanel>
          )}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <PremiumKpiCard icon={<DollarSign className="h-5 w-5" />} title="Receita do Dia" value={formatCurrency(todayRevenue, currencyRegion)} subtitle={`${Math.min(dailyGoalProgress, 100)}% da meta diaria`} trend={`${Math.max(profitMetrics.weeklyGrowth || 0, 0)}% vs ontem`} sparkline={buildSparkline(todayRevenue || 120)} accentHex={accent.hex} panelClass={panelClass} iconClass={iconClass} textClass={colors.text} secondaryTextClass={colors.textSecondary} accentBgClass={progressTrackClass} successClass={status.success} successBgClass={status.successBg} successBorderClass={status.successBorder} progress={dailyGoalProgress} />
            <PremiumKpiCard icon={<Calendar className="h-5 w-5" />} title="Agenda de hoje" value={String(appointments.length)} subtitle={appointments.length === 1 ? 'agendamento proximo' : 'agendamentos proximos'} trend={`${Math.max(profitMetrics.weeklyGrowth || 0, 0)}% vs ontem`} sparkline={buildSparkline(appointments.length || dataMaturity.appointmentsThisMonth || 12)} accentHex={accent.hex} panelClass={panelClass} iconClass={iconClass} textClass={colors.text} secondaryTextClass={colors.textSecondary} accentBgClass={progressTrackClass} successClass={status.success} successBgClass={status.successBg} successBorderClass={status.successBorder} />
            <PremiumKpiCard icon={<Users className="h-5 w-5" />} title="Oportunidades" value={String(actionItems.length)} subtitle={actionItems.length === 1 ? 'acao em aberto' : 'acoes em aberto'} trend={`${profitMetrics.recoveredRevenue > 0 ? 14 : 0}% vs ontem`} sparkline={buildSparkline(actionItems.length || profitMetrics.recoveredRevenue || 8)} accentHex={accent.hex} panelClass={panelClass} iconClass={iconClass} textClass={colors.text} secondaryTextClass={colors.textSecondary} accentBgClass={progressTrackClass} successClass={status.success} successBgClass={status.successBg} successBorderClass={status.successBorder} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <DashboardPanel panelClass={panelClass} className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className={iconClass}><BarChart3 className="h-5 w-5" /></div>
                <div>
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>Receita do Dia</h2>
                  <p className={`text-sm ${colors.textSecondary}`}>Acompanhe o ritmo da meta.</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-[116px_minmax(0,1fr)] items-center gap-5">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full" style={{ background: `conic-gradient(${accent.hex} ${Math.min(dailyGoalProgress, 100) * 3.6}deg, rgba(127,127,127,0.16) 0deg)` }}>
                  <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full ${colors.card}`}>
                    <span className={`font-mono text-2xl font-black ${colors.text}`}>{Math.min(dailyGoalProgress, 100)}%</span>
                    <span className={`text-xs ${colors.textSecondary}`}>da meta</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className={`text-xs ${colors.textMuted}`}>Receita</p>
                    <p className={`font-mono text-lg font-bold ${colors.text}`}>{formatCurrency(todayRevenue, currencyRegion)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${colors.textMuted}`}>Meta diaria</p>
                    <p className={`font-mono text-sm font-bold ${colors.textSecondary}`}>{formatCurrency(dailyGoal, currencyRegion)}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowProfitHistory(true)} className={`mt-8 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border ${colors.border} ${colors.surface} ${accent.text} text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80`}>
                <BarChart3 className="h-4 w-4" />
                Ver relatorio
              </button>
            </DashboardPanel>

            <DashboardPanel id="dashboard-appointments-list" panelClass={panelClass} className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>Agenda de hoje</h2>
                  <p className={`text-sm ${colors.textSecondary}`}>Proximos atendimentos em ordem.</p>
                </div>
                <InfoButton text="Seus proximos compromissos para hoje." />
              </div>
              {loading ? (
                <div className="mt-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full opacity-60" />
                  <Skeleton className="h-12 w-full opacity-30" />
                </div>
              ) : (
                <ul className="mt-6 space-y-4">
                  {appointments.slice(0, 5).map((apt) => (
                    <li key={apt.id} className={`group flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-2.5 transition-colors ${colors.surfaceHover}`} onClick={() => navigate(`/agenda?date=${apt.rawDate}`)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.bgDim} ${accent.text} text-sm font-bold`}>{apt.clientName.charAt(0)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${colors.textSecondary}`}>{apt.time}</span>
                            <p className={`truncate text-sm font-semibold ${colors.text}`}>{apt.clientName}</p>
                          </div>
                          <p className={`truncate text-xs ${colors.textSecondary}`}>{apt.service}</p>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 ${colors.textMuted} transition-transform group-hover:translate-x-0.5`} />
                    </li>
                  ))}
                  {appointments.length === 0 && (
                    <li>
                      <EmptyState icon={Clock} message="Sua agenda esta livre hoje." ctaLabel="Criar primeiro agendamento" onCta={() => navigate('/agenda')} />
                    </li>
                  )}
                </ul>
              )}
              <button onClick={() => setShowAllAppointments(true)} className={`mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border ${colors.border} ${colors.surface} ${accent.text} text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80`}>
                <Calendar className="h-4 w-4" />
                Ver agenda completa
              </button>
            </DashboardPanel>

            <DashboardPanel panelClass={panelClass} className="p-5 md:p-6">
              <div>
                <h2 className={`font-heading text-base font-bold ${colors.text}`}>Oportunidades</h2>
                <p className={`text-sm ${colors.textSecondary}`}>Acoes sugeridas para hoje.</p>
              </div>
              <div className="mt-6 space-y-4">
                {topActions.length > 0 ? topActions.map((action) => (
                  <button key={action.id} onClick={() => logger.info('Action clicked', { action })} className={`flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors ${colors.surfaceHover}`}>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${colors.text}`}>{action.title}</p>
                      <p className={`truncate text-xs ${colors.textSecondary}`}>{action.description}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${accent.bgDim} ${accent.text}`}>Abrir</span>
                  </button>
                )) : (
                  <div className="py-8 text-center">
                    <Sparkles className={`mx-auto mb-3 h-9 w-9 ${colors.textMuted} opacity-40`} />
                    <p className={`text-sm font-semibold ${colors.text}`}>Operacao otimizada</p>
                    <p className={`mx-auto mt-1 max-w-[220px] text-xs leading-relaxed ${colors.textSecondary}`}>Novas oportunidades surgirao conforme a agenda se movimentar.</p>
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/crm')} className={`mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border ${colors.border} ${colors.surface} ${accent.text} text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80`}>
                <Sparkles className="h-4 w-4" />
                Ver todas oportunidades
              </button>
            </DashboardPanel>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <DashboardPanel panelClass={subtlePanelClass} className="p-5 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className={iconClass}><Target className="h-5 w-5" /></div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>Meta mensal</h2>
                    <p className={`mt-1 text-sm ${colors.textSecondary}`}>Voce ja fez {formatCurrency(currentMonthRevenue, currencyRegion)} de {formatCurrency(monthlyGoal, currencyRegion)}.</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingGoal(true)} className={`min-h-[44px] rounded-2xl border px-4 text-sm font-semibold ${colors.border} ${colors.card} ${accent.text} transition-opacity hover:opacity-80`}>Ajustar meta</button>
              </div>
              <div className={`mt-6 h-3 rounded-full ${colors.card} overflow-hidden`}>
                <div className={`h-full ${accent.bg} transition-all duration-1000`} style={{ width: `${Math.min(goalProgress, 100)}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`font-mono text-xs ${colors.textSecondary}`}>{goalProgress}% atingido</span>
                <button onClick={() => setShowGoalHistory(true)} className={`min-h-[44px] text-xs font-bold uppercase tracking-wider ${accent.text} transition-opacity hover:opacity-70`}>Ver historico</button>
              </div>
            </DashboardPanel>

            <DashboardPanel panelClass={panelClass} className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={iconClass}><Activity className="h-5 w-5" /></div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>Saude do negocio</h2>
                    <p className={`text-sm ${colors.textSecondary}`}>Leitura rapida do momento.</p>
                  </div>
                </div>
                <span className={`font-mono text-2xl font-black ${accent.text}`}>{healthScore}</span>
              </div>
              <div className="mt-5 space-y-3">
                {healthSummary.map((item) => (
                  <div key={String(item)} className={`flex items-start gap-3 rounded-2xl p-3 ${colors.surface}`}>
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} />
                    <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{item}</p>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </section>

          <DashboardPanel panelClass={subtlePanelClass} className="p-5 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] md:items-center">
              <div className="flex items-start gap-4">
                <div className={iconClass}><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>Dica para hoje</h2>
                  <p className={`mt-1 text-sm ${colors.textSecondary}`}>Voce esta {Math.max(profitMetrics.weeklyGrowth || 0, 0)}% acima da media recente. Mantenha a agenda cheia nos horarios de maior procura.</p>
                </div>
              </div>
              <div className={`rounded-2xl border ${colors.border} ${colors.card} p-4`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`font-heading text-sm font-bold ${colors.text}`}>Insights do salao</p>
                    <p className={`mt-1 text-xs ${colors.textSecondary}`}>Mostre seus resultados e evolua cada vez mais.</p>
                  </div>
                  <MiniSparkline data={buildSparkline(currentMonthRevenue || 160)} color={accent.hex} height={54} showArea />
                </div>
              </div>
            </div>
          </DashboardPanel>
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
