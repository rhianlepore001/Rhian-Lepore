import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Wallet, TrendingUp, Clock, AlertTriangle, Link as LinkIcon, Copy, ExternalLink, Check, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';

interface Alert {
  id: string;
  text: string;
  type: 'warning' | 'danger' | 'success';
  actionPath?: string;
}

export const Dashboard: React.FC = () => {
  const { userType, region } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);

  const [monthlyGoal, setMonthlyGoal] = useState(15000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('15000');

  const isBeauty = userType === 'beauty';
  const currencySymbol = region === 'PT' ? '€' : 'R$';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch business slug for public link and account creation date
        const { data: { user } } = await supabase.auth.getUser();
        let userCreatedAt: Date | null = null;

        if (user) {
          // Use auth user's created_at for more accurate account age
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
            setTempGoal(profileData.monthly_goal.toString());
          }
        }

        // Fetch Appointments
        const { data: aptData, error: aptError } = await supabase
          .from('appointments')
          .select('*, clients(name)')
          .eq('user_id', user.id)
          .order('appointment_time', { ascending: true })
          .limit(5);

        if (aptError) throw aptError;

        if (aptData) {
          setAppointments(aptData.map((apt: any) => ({
            id: apt.id,
            clientName: apt.clients?.name || 'Cliente Desconhecido',
            service: apt.service,
            time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: apt.status,
            price: apt.price
          })));
        }

        // Fetch Dashboard Stats (Server-side calculation)
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_dashboard_stats', { p_user_id: user.id });

        if (statsError) throw statsError;

        if (statsData) {
          setRevenue(statsData.total_revenue);
          setWeeklyGrowth(statsData.weekly_growth);
          setMonthlyGoal(statsData.monthly_goal);
          setTempGoal(statsData.monthly_goal.toString());
        }

        // Generate Smart Alerts
        await generateSmartAlerts(userCreatedAt);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const generateSmartAlerts = async (createdAt: Date | null) => {
    const generatedAlerts: Alert[] = [];

    try {
      // Check if account is new (less than 7 days old)
      const isNewAccount = createdAt &&
        (new Date().getTime() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000);

      if (isNewAccount) {
        // ONBOARDING ALERTS for new accounts

        // Check if services are configured
        const { data: services } = await supabase
          .from('services')
          .select('id');

        if (!services || services.length === 0) {
          generatedAlerts.push({
            id: 'setup-services',
            text: '📋 Configure seus serviços e preços para começar',
            type: 'warning',
            actionPath: '/configuracoes/servicos'
          });
        } else if (services.length < 3) {
          generatedAlerts.push({
            id: 'add-more-services',
            text: `✨ ${services.length} serviço${services.length > 1 ? 's' : ''} cadastrado${services.length > 1 ? 's' : ''}! Adicione mais para oferecer variedade`,
            type: 'success',
            actionPath: '/configuracoes/servicos'
          });
        }

        // Check if team members are added
        const { data: team } = await supabase
          .from('team_members')
          .select('id');

        if (!team || team.length === 0) {
          generatedAlerts.push({
            id: 'setup-team',
            text: '👥 Adicione membros da equipe para gerenciar agendamentos',
            type: 'warning',
            actionPath: '/configuracoes/equipe'
          });
        }

        // Check if business slug is set (for public booking)
        if (!businessSlug) {
          generatedAlerts.push({
            id: 'setup-slug',
            text: '🔗 Configure seu link público de agendamento',
            type: 'warning',
            actionPath: '/configuracoes/agendamento'
          });
        } else {
          generatedAlerts.push({
            id: 'share-link',
            text: '🎉 Link público pronto! Compartilhe com seus clientes',
            type: 'success',
            actionPath: '/configuracoes/agendamento'
          });
        }

        // Check for first appointments
        const { data: allAppointments } = await supabase
          .from('appointments')
          .select('id');

        if (!allAppointments || allAppointments.length === 0) {
          generatedAlerts.push({
            id: 'first-appointment',
            text: '📅 Crie seu primeiro agendamento para testar o sistema',
            type: 'warning',
            actionPath: '/agenda'
          });
        } else if (allAppointments.length < 5) {
          generatedAlerts.push({
            id: 'growing-appointments',
            text: `🚀 ${allAppointments.length} agendamento${allAppointments.length > 1 ? 's' : ''} criado${allAppointments.length > 1 ? 's' : ''}! Continue assim!`,
            type: 'success',
            actionPath: '/agenda'
          });
        }

      } else {
        // REGULAR ALERTS for established accounts

        // Alert 1: Absent Clients (45+ days)
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, last_visit');

        if (!clientsError && clients) {
          const now = new Date();
          const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

          const absentClients = clients.filter((client: any) => {
            if (!client.last_visit) return false;
            return new Date(client.last_visit) < fortyFiveDaysAgo;
          });

          if (absentClients.length > 0) {
            generatedAlerts.push({
              id: 'absent-clients',
              text: `${absentClients.length} Cliente${absentClients.length > 1 ? 's' : ''} ausente${absentClients.length > 1 ? 's' : ''} há 45 dias`,
              type: 'warning',
              actionPath: '/clientes'
            });
          }
        }

        // Alert 2: Weekly Goal Achievement
        const { data: financeData } = await supabase
          .from('finance_records')
          .select('revenue, created_at');

        if (financeData && financeData.length > 0) {
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const weeklyRevenue = financeData
            .filter((r: any) => new Date(r.created_at) >= oneWeekAgo)
            .reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);

          const weeklyGoal = 3500; // R$ 3.500 weekly goal
          if (weeklyRevenue >= weeklyGoal) {
            generatedAlerts.push({
              id: 'weekly-goal',
              text: 'Meta semanal atingida! 🎉',
              type: 'success',
              actionPath: '/relatorios'
            });
          }
        }

        // Alert 3: Low Appointments (if less than 3 appointments today)
        const { data: todayApts } = await supabase
          .from('appointments')
          .select('id')
          .gte('appointment_time', new Date().toISOString().split('T')[0]);

        if (todayApts && todayApts.length < 3) {
          generatedAlerts.push({
            id: 'low-appointments',
            text: `Apenas ${todayApts.length} agendamento${todayApts.length !== 1 ? 's' : ''} hoje`,
            type: 'danger',
            actionPath: '/marketing'
          });
        }

        // Fallback: If no alerts and no data, show motivational message
        if (generatedAlerts.length === 0) {
          const { data: hasAnyData } = await supabase
            .from('appointments')
            .select('id')
            .limit(1);

          if (!hasAnyData || hasAnyData.length === 0) {
            generatedAlerts.push({
              id: 'get-started',
              text: '🎯 Comece criando agendamentos e registrando atendimentos',
              type: 'warning',
              actionPath: '/agenda'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error generating alerts:', error);
    }

    setAlerts(generatedAlerts);
  };

  const handleSaveGoal = async () => {
    try {
      const newGoal = parseInt(tempGoal.replace(/\D/g, ''));
      if (isNaN(newGoal) || newGoal <= 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ monthly_goal: newGoal })
          .eq('id', user.id);

        if (!error) {
          setMonthlyGoal(newGoal);
          setIsEditingGoal(false);
        }
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  // Mock values adjustment for currency
  const profitValue = revenue.toLocaleString(region === 'PT' ? 'pt-PT' : 'pt-BR', { minimumFractionDigits: 2 });
  const goalValue = monthlyGoal.toLocaleString(region === 'PT' ? 'pt-PT' : 'pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Resumo Diário</h2>
            <AIAssistantButton context="o painel geral e suas métricas diárias" />
          </div>
          <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <BrutalButton
          variant="primary"
          size="md"
          icon={<Clock />}
          className="w-full md:w-auto"
          onClick={() => navigate('/agenda')}
        >
          Novo Agendamento
        </BrutalButton>
      </div>

      {/* Hero Cards - Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <BrutalCard className="h-full">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center">
                <p className="text-text-secondary font-mono text-xs md:text-sm uppercase tracking-widest mb-1">Lucro Total</p>
                <InfoButton text="Soma de todas as receitas registradas no período selecionado." />
              </div>
              <h3 className={`text-3xl sm:text-4xl md:text-5xl font-heading ${accentText} tracking-tighter`}>
                {currencySymbol} {profitValue}
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

        <BrutalCard className="h-full flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <p className="text-text-secondary font-mono text-xs md:text-sm uppercase tracking-widest">Meta Mensal</p>
              <InfoButton text="Sua meta de faturamento mensal. Você pode alterá-la clicando no ícone de engrenagem." />
            </div>
            <span className="font-bold text-white font-mono">
              {Math.min(Math.round((revenue / monthlyGoal) * 100), 100)}%
            </span>
          </div>

          <div className="space-y-4">
            <div className="relative h-6 md:h-8 bg-neutral-900 border-2 border-neutral-700 w-full skew-x-[-10deg]">
              <div
                className={`absolute top-0 left-0 h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} border-r-2 border-black transition-all duration-1000`}
                style={{ width: `${Math.min((revenue / monthlyGoal) * 100, 100)}%` }}
              >
                {/* Striped pattern for progress bar */}
                <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_10px)]"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs md:text-sm font-mono text-text-muted items-center">
              <span>Atual: {currencySymbol} {profitValue}</span>

              {isEditingGoal ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="w-24 bg-neutral-800 border border-neutral-600 text-white px-2 py-1 text-xs rounded"
                    autoFocus
                  />
                  <button onClick={handleSaveGoal} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingGoal(true)}>
                  <span>Meta: {currencySymbol} {goalValue}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary">
                    <Settings className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </BrutalCard>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Schedule */}
        <BrutalCard
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
                <li key={apt.id} className="p-3 md:p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`font-mono text-base md:text-xl font-bold ${accentText} bg-neutral-900 px-2 py-1 md:px-3 md:py-2 border border-neutral-700`}>
                      {apt.time}
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

        {/* Alerts */}
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
    </div>
  );
};