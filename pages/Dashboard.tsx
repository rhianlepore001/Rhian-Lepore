import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Wallet, TrendingUp, Clock, AlertTriangle, ExternalLink, Settings, Edit2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate } from 'react-router-dom';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { GoalHistory } from '../components/GoalHistory';

import { formatCurrency } from '../utils/formatters';
import { useAppTour } from '../hooks/useAppTour';

export const Dashboard: React.FC = () => {
  const { userType, region, user } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const { startTour } = useAppTour();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profit, setProfit] = useState(0);
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState(15000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [goalHistory, setGoalHistory] = useState<any[]>([]);

  const isBeauty = userType === 'beauty';
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';
  const currencySymbol = region === 'PT' ? '€' : 'R$';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        let userCreatedAt: Date | null = null;

        if (user) {
          if (user.created_at) {
            userCreatedAt = new Date(user.created_at);
            setAccountCreatedAt(userCreatedAt);
          }

          const { data: profileData } = await supabase
            .from('profiles')
            .select('business_slug, monthly_goal')
            .eq('id', user.id)
            .single();

          if (profileData?.business_slug) {
            setBusinessSlug(profileData.business_slug);
          }
          if (profileData?.monthly_goal) {
            setMonthlyGoal(profileData.monthly_goal);
            setNewGoal(profileData.monthly_goal.toString());
          }
        }

        const now = new Date().toISOString();
        const { data: aptData, error: aptError } = await supabase
          .from('appointments')
          .select('*, clients(name)')
          .eq('user_id', user.id)
          .eq('status', 'Confirmed')
          .gte('appointment_time', now)
          .order('appointment_time', { ascending: true })
          .limit(5);

        if (aptError) throw aptError;

        if (aptData) {
          setAppointments(aptData.map((apt: any) => ({
            id: apt.id,
            clientName: apt.clients?.name || 'Cliente Desconhecido',
            service: apt.service,
            time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            rawDate: new Date(apt.appointment_time).toISOString().split('T')[0], // Para navegação
            status: apt.status,
            price: apt.price,
            appointment_time: apt.appointment_time
          })));
        }

        const { data: statsData, error: statsError } = await supabase
          .rpc('get_dashboard_stats', { p_user_id: user.id });

        if (statsError) throw statsError;

        if (statsData) {
          setProfit(statsData.total_profit);
          setCurrentMonthRevenue(statsData.current_month_revenue);
          setWeeklyGrowth(statsData.weekly_growth);
          if (statsData.monthly_goal) {
            setMonthlyGoal(statsData.monthly_goal);
            setNewGoal(statsData.monthly_goal.toString());
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchGoalHistory = async () => {
      if (!user) return;
      try {
        const history = [];
        const months = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.getMonth();
          const year = date.getFullYear();

          const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
          const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

          const { data } = await supabase.rpc('get_finance_stats', {
            p_user_id: user.id,
            p_start_date: startOfMonth,
            p_end_date: endOfMonth
          });

          if (data) {
            const percentage = monthlyGoal > 0 ? Math.round((data.revenue / monthlyGoal) * 100) : 0;
            history.push({
              month: months[month],
              year: year,
              goal: monthlyGoal,
              achieved: data.revenue,
              percentage: percentage,
              success: percentage >= 100
            });
          }
        }

        setGoalHistory(history);
      } catch (error) {
        console.error('Error fetching goal history:', error);
      }
    };

    fetchData();
    fetchGoalHistory();
  }, [user, monthlyGoal]);

  const handleSaveGoal = async () => {
    if (!user || !newGoal) return;
    const goalValue = parseFloat(newGoal);
    if (isNaN(goalValue)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ monthly_goal: goalValue })
      .eq('id', user.id);

    if (error) {
      console.error("Error updating goal:", error);
      alert("Erro ao atualizar a meta.");
    } else {
      setMonthlyGoal(goalValue);
      setIsEditingGoal(false);
    }
  };

  // Removed manual formatting variables in favor of direct formatCurrency usage

  return (
    <div className="space-y-4 md:space-y-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Resumo Diário</h2>
            <button
              onClick={startTour}
              className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Iniciar Tour Guiado"
            >
              <InfoButton text="Clique para ver o tutorial do sistema" />
            </button>
            <AIAssistantButton context="o painel geral e suas métricas diárias" />
          </div>
          <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <BrutalButton
          id="dashboard-new-appointment"
          variant="primary"
          size="md"
          icon={<Clock />}
          className="w-full md:w-auto"
          onClick={() => navigate('/agenda')}
        >
          Novo Agendamento
        </BrutalButton>
      </div>

      {/* ROW 1: Priority Overview (Appointments & Profit) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <BrutalCard
          id="dashboard-appointments-list"
          title={
            <div className="flex items-center gap-2">
              <span>Próximos Agendamentos</span>
              <InfoButton text="Lista dos seus próximos 5 compromissos agendados." />
            </div>
          }
          className="h-full"
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
          <div className="p-4 border-t-2 border-dashed border-neutral-700">
            <button
              onClick={() => navigate('/agenda')}
              className={`w-full py-2 text-center text-xs font-mono text-text-secondary hover:${accentText} uppercase tracking-widest transition-colors`}
            >
              Ver Agenda Completa →
            </button>
          </div>
        </BrutalCard>

        <BrutalCard id="dashboard-profit-card" className="h-full">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center">
                <p className="text-text-secondary font-mono text-xs md:text-sm uppercase tracking-widest mb-1">Lucro Total</p>
                <InfoButton text="O lucro total (Receita - Despesas) acumulado desde o início do seu negócio." />
              </div>
              <h3 className={`text-3xl sm:text-4xl md:text-5xl font-heading ${accentText} tracking-tighter`}>
                {formatCurrency(profit, currencyRegion)}
              </h3>
            </div>
            <div className="p-3 md:p-4 bg-neutral-900 border-2 border-neutral-800 rounded-full">
              <Wallet className={`w-6 h-6 md:w-8 md:h-8 ${accentIcon}`} />
            </div>
          </div>
          <div className={`text-xs md:text-sm ${weeklyGrowth >= 0 ? (isBeauty ? 'text-beauty-acid' : 'text-green-500') : 'text-red-500'} font-mono flex items-center gap-2`}>
            <TrendingUp className="w-4 h-4" />
            <span>{weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}% vs. semana passada</span>
          </div>
        </BrutalCard>
      </div>

      {/* ROW 2: Performance & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <BrutalCard
          title={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full pr-2">
              <div className="flex items-center gap-2">
                <span>Performance de Metas</span>
                <InfoButton text="Acompanhe sua meta mensal e histórico." />
              </div>
              {isEditingGoal ? (
                <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-700 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] uppercase text-text-secondary font-bold pl-1 hidden sm:inline">Nova:</span>
                  <input
                    type="number"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                    className="w-20 bg-black/50 border border-neutral-600 focus:border-white text-white p-1 text-right text-xs outline-none font-mono rounded"
                    autoFocus
                    placeholder="Valor"
                  />
                  <button onClick={handleSaveGoal} className={`text-xs px-2 py-1 rounded ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'} font-bold hover:brightness-110 transition-all`}>OK</button>
                  <button onClick={() => setIsEditingGoal(false)} className="text-xs px-2 py-1 rounded text-neutral-400 hover:bg-white/10 hover:text-white transition-all">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end hidden xs:flex">
                    <span className="text-[10px] uppercase text-text-secondary tracking-wider font-bold">Meta Atual</span>
                    <span className={`text-sm font-mono font-bold ${accentText}`}>{formatCurrency(monthlyGoal, currencyRegion)}</span>
                  </div>
                  <button
                    onClick={() => setIsEditingGoal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 hover:border-neutral-500 transition-all group`}
                    title="Alterar Meta Mensal"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-text-secondary group-hover:text-white transition-colors" />
                    <span className="text-xs font-bold text-text-secondary group-hover:text-white uppercase tracking-wider hidden sm:inline-block">Editar</span>
                  </button>
                </div>
              )}
            </div>
          }
          className="h-full"
          noPadding
        >
          <div className="p-4">
            {goalHistory.length > 0 ? (
              <GoalHistory
                history={goalHistory}
                currencySymbol={currencySymbol}
                isBeauty={isBeauty}
              />
            ) : (
              <div className="p-8 text-center text-text-secondary">
                <p>Sem histórico suficiente para exibir gráficos.</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t-2 border-dashed border-neutral-700">
            <button
              onClick={() => navigate('/financeiro')}
              className={`w-full py-2 text-center text-xs font-mono text-text-secondary hover:${accentText} uppercase tracking-widest transition-colors flex items-center justify-center gap-2`}
            >
              Ver Relatório Financeiro Completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </BrutalCard>

        <BrutalCard
          title={
            <div className="flex items-center gap-2">
              <span>Avisos Importantes</span>
              <InfoButton text="Alertas automáticos sobre o status do seu negócio e ações recomendadas." />
            </div>
          }
          className="h-full"
        >
          {loading ? (
            <div className="p-4 text-center text-text-secondary">Carregando avisos...</div>
          ) : alerts.length === 0 ? (
            <div className="p-4 text-center text-text-secondary">
              <p className="text-sm">Tudo certo! Nenhum aviso no momento. ✅</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 md:p-4 border-l-4 flex items-center justify-between gap-3 bg-neutral-900/50 ${alert.type === 'danger' ? 'border-red-600' :
                    alert.type === 'warning' ? 'border-yellow-500' : 'border-green-500'
                    } ${alert.actionPath ? 'cursor-pointer hover:bg-neutral-800 transition-colors group' : ''}`}
                  onClick={() => alert.actionPath && navigate(alert.actionPath)}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                    <div>
                      <p className="text-text-primary font-medium text-sm md:text-base leading-tight">{alert.text}</p>
                      <p className="text-[10px] md:text-xs text-text-secondary mt-1 font-mono uppercase">
                        {alert.type === 'success' ? 'Parabéns!' : 'Ação Necessária'}
                      </p>
                    </div>
                  </div>

                  {alert.actionPath && (
                    <div className={`p-2 rounded-full ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon' : 'bg-accent-gold/10 text-accent-gold'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <BrutalButton variant="secondary" className="w-full" onClick={() => navigate('/clientes')}>
              Gerenciar Clientes
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>

      {/* ROW 3: Goal History (Moved Down) */}

    </div>
  );
};