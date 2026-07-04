import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Calendar, Clock, Crown, Target, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMembershipStats } from '../hooks/useMemberships';
import { useAgendaTeamMembers } from '../hooks/useScheduling';
import { MeuDiaWidget } from '../components/dashboard/MeuDiaWidget';
import { SetupCopilot } from '../components/dashboard/SetupCopilot';
import { StaffEarningsCard } from '../components/StaffEarningsCard';
import { SmartNotificationsBanner } from '../components/SmartNotifications';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatCurrency, formatDateLong } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const { region, role, user, fullName, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id ?? '';
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
    loading,
    dailyGoal,
    profitMetrics,
  } = useDashboardData();

  const { accent, colors, density, font, status } = useBrutalTheme();
  const { data: clubStats } = useMembershipStats();
  const { data: teamMembers } = useAgendaTeamMembers(effectiveUserId);
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const firstName = fullName?.split(' ')[0] || 'Profissional';
  const todayLabel = formatDateLong(new Date(), currencyRegion);
  const todayRevenue = profitMetrics.todayRevenue ?? 0;
  const vsYesterday = Math.max(profitMetrics.weeklyGrowth || 0, 0);
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;
  const dayProgress = dailyGoal && dailyGoal > 0 ? Math.round((todayRevenue / dailyGoal) * 100) : 0;

  const professionalName = (id: string | null) =>
    id ? teamMembers?.find((m) => m.id === id)?.name ?? null : null;

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
          {/* Avisos importantes */}
          {(commissionBanner && !commissionBannerDismissed) && (
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

          {/* KPIs do dia: faturamento + meta do dia */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {loading ? (
              <>
                <SkeletonCard className={density.kpiMinHeight} />
                <SkeletonCard className={density.kpiMinHeight} />
              </>
            ) : (
              <>
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

                <Card variant="outlined" className={density.kpiMinHeight}>
                  <div className="flex items-start gap-3">
                    <div className={iconClass}><Target className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${colors.textSecondary}`}>Meta do dia</p>
                      {dailyGoal && dailyGoal > 0 ? (
                        <>
                          <p className={`mt-1 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
                            {formatCurrency(todayRevenue, currencyRegion)}
                            <span className={`ml-1 text-sm font-semibold ${colors.textMuted}`}>de {formatCurrency(dailyGoal, currencyRegion)}</span>
                          </p>
                          <div className={`mt-3 h-2.5 rounded-full ${colors.surface} overflow-hidden`}>
                            <div className={`h-full ${accent.bg} transition-all duration-1000`} style={{ width: `${Math.min(dayProgress, 100)}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`font-mono text-xs ${colors.textSecondary}`}>{dayProgress}% da meta</span>
                            <button
                              type="button"
                              onClick={() => navigate('/configuracoes/geral')}
                              className={`min-h-[44px] text-xs font-semibold ${accent.text} transition-opacity hover:opacity-70`}
                            >
                              Ajustar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                            Defina uma meta diária pra acompanhar seu ritmo ao longo do dia.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/configuracoes/geral')}
                            className={`mt-3 min-h-[44px] text-sm font-semibold ${accent.text} transition-opacity hover:opacity-70`}
                          >
                            Definir meta do dia
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </section>

          {/* Próximos agendamentos — coração da tela */}
          <Card variant="outlined">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={iconClass}><Clock className="h-5 w-5" /></div>
                <div>
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>Próximos agendamentos</h2>
                  <p className={`text-sm ${colors.textSecondary}`}>Quem chega a seguir</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/agenda')}>
                Ver agenda
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <SkeletonCard className="min-h-[64px]" />
                <SkeletonCard className="min-h-[64px]" />
              </div>
            ) : appointments.length === 0 ? (
              <div className={`rounded-2xl p-6 text-center ${colors.surface}`}>
                <p className={`text-sm font-semibold ${colors.text}`}>Nenhum atendimento à frente</p>
                <p className={`mt-1 text-sm ${colors.textSecondary}`}>Assim que houver agendamentos, eles aparecem aqui.</p>
                <Button variant="primary" size="sm" className="mt-4" icon={<Calendar className="h-4 w-4" />} onClick={() => navigate('/agenda')}>
                  Novo agendamento
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {appointments.map((apt) => {
                  const professional = professionalName(apt.professional_id);
                  const description = [apt.service, professional].filter(Boolean).join(' · ');
                  return (
                    <li
                      key={apt.id}
                      className={`flex items-center gap-3 rounded-2xl p-3 ${colors.surface}`}
                    >
                      <div className={`flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${accent.bgDim} ${accent.text}`}>
                        <span className={`font-mono text-sm font-bold tabular-nums`}>{apt.time}</span>
                        <span className={`text-[10px] ${font.mono} uppercase tracking-wider opacity-70`}>{apt.date}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${colors.text}`}>{apt.clientName}</p>
                        <p className={`text-xs truncate ${colors.textMuted}`}>{description || 'Atendimento'}</p>
                      </div>
                      {apt.price > 0 && (
                        <span className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${colors.textSecondary}`}>
                          {formatCurrency(apt.price, currencyRegion)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {clubStats && (clubStats.totalActive > 0 || clubStats.totalPending > 0) && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/clube/assinantes')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/clube/assinantes')}
              className={`${colors.card} ${colors.border} border rounded-2xl p-4 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-600/10 flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h3 className={`font-heading text-base font-bold ${colors.text} uppercase tracking-wide`}>
                      Clube de Assinatura
                    </h3>
                    <span className={`text-xs ${colors.textMuted} ${font.mono} uppercase tracking-wider`}>
                      ver detalhes →
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <p className={`text-[10px] ${colors.textMuted} ${font.mono} uppercase tracking-widest`}>
                        Ativos
                      </p>
                      <p className="mt-0.5 font-mono text-2xl font-black tabular-nums text-green-400">
                        {clubStats.totalActive}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${colors.textMuted} ${font.mono} uppercase tracking-widest`}>
                        Pendentes
                      </p>
                      <p className="mt-0.5 font-mono text-2xl font-black tabular-nums text-amber-400">
                        {clubStats.totalPending}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${colors.textMuted} ${font.mono} uppercase tracking-widest`}>
                        MRR
                      </p>
                      <p className="mt-0.5 font-mono text-2xl font-black tabular-nums text-yellow-300">
                        {formatCurrency(clubStats.monthlyRecurringRevenueCents / 100, currencyRegion)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SetupCopilot />
        </>
      )}
    </div>
  );
};
