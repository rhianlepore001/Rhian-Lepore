import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, Users, History, Trash2, Plus, X, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { CommissionsManagement } from '../components/CommissionsManagement';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { MonthlyHistory } from '../components/MonthlyHistory';
import { formatCurrency } from '../utils/formatters';

type FinanceTabType = 'overview' | 'commissions' | 'history';

export const Finance: React.FC = () => {
  const { user, userType, region } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    commissionsPending: 0,
    profit: 0,
    growth: 0,
    previousMonthRevenue: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [activeTab, setActiveTab] = useState<FinanceTabType>('overview');

  // New Transaction Modal State
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('income');
  const [newTransactionDescription, setNewTransactionDescription] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTransactionTime, setNewTransactionTime] = useState('');
  const [newTransactionService, setNewTransactionService] = useState('');
  const [newTransactionClient, setNewTransactionClient] = useState('');
  const [newTransactionProfessional, setNewTransactionProfessional] = useState('');
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);

  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const currencySymbol = region === 'PT' ? '€' : 'R$';
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchFinanceData();
    } else if (activeTab === 'history') {
      fetchMonthlyHistory();
    }
  }, [activeTab, selectedMonth, selectedYear, user]);

  const fetchFinanceData = async () => {
    try {
      // Calculate start and end dates for the selected month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

      const startDateParam = startOfMonth.toISOString().split('T')[0];
      const endDateParam = endOfMonth.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_finance_stats', {
        p_user_id: user.id,
        p_start_date: startDateParam,
        p_end_date: endDateParam
      });

      if (error) throw error;

      if (data) {
        // Calculate growth vs previous month
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const prevStartDate = new Date(prevYear, prevMonth, 1).toISOString().split('T')[0];
        const prevEndDate = new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0];

        const { data: prevData } = await supabase.rpc('get_finance_stats', {
          p_user_id: user.id,
          p_start_date: prevStartDate,
          p_end_date: prevEndDate
        });

        const growth = prevData && prevData.revenue > 0
          ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100
          : 0;

        setSummary({
          revenue: data.revenue || 0,
          expenses: data.expenses || 0,
          commissionsPending: data.commissions_pending || 0,
          profit: data.profit || 0,
          growth: growth || 0,
          previousMonthRevenue: prevData?.revenue || 0
        });

        setChartData(data.chart_data || []);

        const formattedTransactions = (data.transactions || []).map((item: any) => {
          const createdAt = new Date(item.created_at);
          return {
            id: item.id,
            serviceName: item.service_name || 'Serviço',
            professionalName: item.barber_name || 'Manual',
            clientName: item.client_name || '',
            amount: item.amount || 0,
            expense: item.expense || 0,
            date: createdAt.toLocaleDateString('pt-BR'),
            time: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            rawDate: createdAt,
            type: item.type,
            commission_paid: item.commission_paid
          };
        });

        const filtered = filterType === 'all'
          ? formattedTransactions
          : formattedTransactions.filter(t => {
            if (filterType === 'revenue') return t.type === 'revenue';
            if (filterType === 'expense') return t.type === 'expense'; // Only show actual expense payments
            return true;
          });

        setTransactions(filtered);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyHistory = async () => {
    try {
      const history = [];

      // Get last 12 months
      for (let i = 11; i >= 0; i--) {
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
          // Calculate growth vs previous month
          let growth = 0;
          if (i < 11 && history.length > 0) {
            const prevRevenue = history[history.length - 1].revenue;
            growth = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;
          }

          history.push({
            month: months[month],
            year: year,
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.profit,
            growth: growth
          });
        }
      }

      setMonthlyHistory(history.reverse()); // Most recent first
    } catch (error) {
      console.error('Error fetching monthly history:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação? Esta ação é irreversível.')) return;

    try {
      // Check if this transaction is linked to an appointment
      const { data: record } = await supabase
        .from('finance_records')
        .select('appointment_id')
        .eq('id', transactionId)
        .single();

      if (record?.appointment_id) {
        if (confirm('Esta transação está vinculada a um agendamento. Deseja excluir o agendamento também?')) {
          await supabase.from('appointments').delete().eq('id', record.appointment_id);
        }
      }

      const { error } = await supabase.from('finance_records').delete().eq('id', transactionId);
      if (error) throw error;

      alert('Transação excluída com sucesso!');
      fetchFinanceData(); // Refresh finance data
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir transação.');
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleExport = () => {
    const csvContent = [
      ['Data', 'Descrição', 'Tipo', 'Valor'],
      ...transactions.map(t => [
        t.date,
        t.description,
        t.type === 'expense' ? 'Despesa Paga' : 'Receita',
        t.type === 'expense' ? -t.expense : t.amount
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro_${months[selectedMonth]}_${selectedYear}.csv`;
    link.click();
  };

  const handleApplyFilter = () => {
    fetchFinanceData();
    setShowFilterModal(false);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
    fetchFinanceData();
    setShowFilterModal(false);
  };

  // Fetch dropdown data for new transaction modal
  const fetchDropdownData = async () => {
    if (!user) return;
    try {
      const [servicesRes, clientsRes, professionalsRes] = await Promise.all([
        supabase.from('services').select('id, name').eq('user_id', user.id),
        supabase.from('clients').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('team_members').select('id, name').eq('user_id', user.id).eq('active', true).order('name')
      ]);

      setServices(servicesRes.data || []);
      setClients(clientsRes.data || []);
      setProfessionals(professionalsRes.data || []);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleOpenNewTransaction = () => {
    fetchDropdownData();
    setNewTransactionType('income');
    setNewTransactionDescription('');
    setNewTransactionAmount('');
    setNewTransactionDate(new Date().toISOString().split('T')[0]);
    setNewTransactionTime('');
    setNewTransactionService('');
    setNewTransactionClient('');
    setNewTransactionProfessional('');
    setShowNewTransactionModal(true);
  };

  const handleCreateTransaction = async () => {
    if (!user || !newTransactionAmount || !newTransactionDescription) {
      alert('Por favor, preencha pelo menos a descrição e o valor.');
      return;
    }

    setSavingTransaction(true);
    try {
      const amount = parseFloat(newTransactionAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        setSavingTransaction(false);
        return;
      }

      // Find selected names for display
      const serviceName = services.find(s => s.id === newTransactionService)?.name || '';
      const clientName = clients.find(c => c.id === newTransactionClient)?.name || '';
      const professionalName = professionals.find(p => p.id === newTransactionProfessional)?.name || 'Manual';

      // Create date with time if provided
      let transactionDateTime = new Date(newTransactionDate);
      if (newTransactionTime) {
        const [hours, minutes] = newTransactionTime.split(':');
        transactionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const transactionData: any = {
        user_id: user.id,
        barber_name: professionalName,
        professional_id: newTransactionProfessional || null,
        revenue: newTransactionType === 'income' ? amount : 0,
        commission_value: newTransactionType === 'expense' ? amount : 0,
        commission_rate: 0,
        type: newTransactionType === 'income' ? 'revenue' : 'expense',
        created_at: transactionDateTime.toISOString()
      };

      // Add optional fields if they have values
      if (newTransactionService) {
        transactionData.service_name = serviceName;
      }
      if (newTransactionClient) {
        transactionData.client_name = clientName;
      }

      const { error } = await supabase
        .from('finance_records')
        .insert(transactionData);

      if (error) throw error;

      alert(`✅ ${newTransactionType === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso!`);
      setShowNewTransactionModal(false);
      fetchFinanceData();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      alert(`❌ Erro ao registrar transação: ${error.message || JSON.stringify(error)}`);
    } finally {
      setSavingTransaction(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Financeiro</h2>
            <AIAssistantButton context="suas finanças, fluxo de caixa e relatórios" />
          </div>
          <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
            Gestão completa do seu fluxo de caixa
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <BrutalButton variant="primary" size="sm" icon={<Plus />} onClick={handleOpenNewTransaction}>
            Nova Transação
          </BrutalButton>
          <BrutalButton variant="secondary" size="sm" icon={<Download />} onClick={handleExport}>
            Exportar
          </BrutalButton>
        </div>
      </div>

      {/* Month/Year Selector */}
      {activeTab === 'overview' && (
        <MonthYearSelector
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChange={handleMonthChange}
          accentColor={accentColor}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase whitespace-nowrap transition-colors ${activeTab === 'overview'
            ? `${accentBg} text-black`
            : 'bg-neutral-800 text-white hover:bg-neutral-700'
            }`}
        >
          <Calendar className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase whitespace-nowrap transition-colors ${activeTab === 'history'
            ? `${accentBg} text-black`
            : 'bg-neutral-800 text-white hover:bg-neutral-700'
            }`}
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase whitespace-nowrap transition-colors ${activeTab === 'commissions'
            ? `${accentBg} text-black`
            : 'bg-neutral-800 text-white hover:bg-neutral-700'
            }`}
        >
          <Users className="w-4 h-4" />
          Comissões
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BrutalCard className="border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Receita</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{months[selectedMonth]} {selectedYear}</p>
                </div>
                <InfoButton text={`Total de vendas e serviços faturados em ${months[selectedMonth]} ${selectedYear}.`} />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {formatCurrency(summary.revenue || 0, currencyRegion)}
              </h3>
              <div className={`flex items-center gap-1 ${summary.growth >= 0 ? 'text-green-500' : 'text-red-500'} text-xs font-mono mt-2`}>
                {summary.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs mês anterior</span>
              </div>
            </BrutalCard>

            <BrutalCard className="border-l-4 border-yellow-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Comissões Pendentes</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">Estimativa de repasse futuro</p>
                </div>
                <InfoButton text={`Total de comissões calculadas em serviços concluídos que ainda não foram pagas.`} />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {formatCurrency(summary.commissionsPending || 0, currencyRegion)}
              </h3>
              <div className="flex items-center gap-1 text-neutral-500 text-xs font-mono mt-2">
                <Clock className="w-3 h-3" />
                <span>A pagar aos profissionais</span>
              </div>
            </BrutalCard>

            <BrutalCard className="border-l-4 border-red-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Despesas Pagas</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{months[selectedMonth]} {selectedYear}</p>
                </div>
                <InfoButton text={`Soma de todos os custos efetivamente pagos (saída de caixa).`} />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {formatCurrency(summary.expenses || 0, currencyRegion)}
              </h3>
              <div className="flex items-center gap-1 text-neutral-500 text-xs font-mono mt-2">
                <DollarSign className="w-3 h-3" />
                <span>Comissões e custos liquidados</span>
              </div>
            </BrutalCard>

            <BrutalCard className={`border-l-4 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Lucro Líquido</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{months[selectedMonth]} {selectedYear}</p>
                </div>
                <InfoButton text="O valor que sobra após subtrair as despesas da receita. Seu lucro real." />
              </div>
              <h3 className={`text-2xl md:text-3xl font-heading ${accentText}`}>
                {formatCurrency(summary.profit || 0, currencyRegion)}
              </h3>
              <div className={`flex items-center gap-1 ${accentText} text-xs font-mono mt-2`}>
                <Wallet className="w-3 h-3" />
                <span>Margem: {summary.revenue > 0 ? Math.round(((summary.profit || 0) / summary.revenue) * 100) : 0}%</span>
              </div>
            </BrutalCard>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalCard title={`Fluxo de Caixa - ${months[selectedMonth]} ${selectedYear}`}>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" name="Receita" />
                    <Area type="monotone" dataKey="despesas" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" name="Despesas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BrutalCard>

            <BrutalCard title="Receita vs Despesas">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend />
                    <Bar dataKey="receita" fill="#10B981" name="Receita" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BrutalCard>
          </div>

          {/* Recent Transactions */}
          <BrutalCard title="Transações Recentes">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-800 text-text-secondary font-mono text-xs uppercase">
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Serviço</th>
                    <th className="p-3">Profissional</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm">{t.date}</span>
                          <span className="text-neutral-500 text-xs font-mono">{t.time}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-white font-medium">
                          {t.type === 'expense' ? 'Pagamento de Comissão' : t.serviceName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}>
                          {t.professionalName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-neutral-300">
                          {t.clientName || <span className="text-neutral-600 italic">—</span>}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className={t.type === 'expense' ? 'text-red-500' : 'text-green-500'}>
                          {t.type === 'expense' ? '-' : '+'}{formatCurrency((t.type === 'expense' ? (t.expense || 0) : (t.amount || 0)), currencyRegion, false)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'expense' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                          {t.type === 'expense' ? 'Despesa' : 'Receita'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir transação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary">
                        Nenhuma transação registrada em {months[selectedMonth]} {selectedYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </BrutalCard>
        </>
      )}

      {activeTab === 'history' && (
        <BrutalCard title="Histórico Mensal - Últimos 12 Meses">
          <MonthlyHistory
            data={monthlyHistory}
            currencySymbol={currencySymbol}
            accentColor={accentColor}
            isBeauty={isBeauty}
          />
        </BrutalCard>
      )}

      {activeTab === 'commissions' && (
        <CommissionsManagement
          accentColor={accentColor}
          currencySymbol={currencySymbol}
          onPaymentSuccess={fetchFinanceData}
        />
      )}

      {/* New Transaction Modal */}
      {showNewTransactionModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isBeauty ? 'bg-beauty-dark/80 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'}`}>
          <div className={`w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh] transition-all
              ${isBeauty
              ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
              : 'bg-neutral-900 border-2 border-neutral-800 rounded-xl'}
          `}>
            <div className={`flex items-center justify-between mb-6 ${isBeauty ? 'border-b border-beauty-neon/20 pb-4' : ''}`}>
              <h3 className={`font-heading text-xl uppercase flex items-center gap-2 ${isBeauty ? 'text-white' : 'text-white'}`}>
                <DollarSign className={`w-6 h-6 ${accentText}`} />
                Nova Transação
              </h3>
              <button
                onClick={() => setShowNewTransactionModal(false)}
                className={`transition-colors p-1 rounded-full
                    ${isBeauty
                    ? 'text-beauty-neon/60 hover:text-beauty-neon hover:bg-beauty-neon/10'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}
                `}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selector */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTransactionType('income')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors border-2 ${newTransactionType === 'income'
                      ? 'bg-green-500/20 border-green-500 text-green-500'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                  >
                    + Receita
                  </button>
                  <button
                    onClick={() => setNewTransactionType('expense')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors border-2 ${newTransactionType === 'expense'
                      ? 'bg-red-500/20 border-red-500 text-red-500'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                  >
                    - Despesa
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Descrição *</label>
                <input
                  type="text"
                  value={newTransactionDescription}
                  onChange={(e) => setNewTransactionDescription(e.target.value)}
                  className={`w-full p-3 rounded-lg text-white transition-all outline-none
                      ${isBeauty
                      ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon placeholder-beauty-neon/30'
                      : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                  placeholder="Ex: Venda de produto, Pagamento de aluguel..."
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Valor ({currencySymbol}) *</label>
                <input
                  type="number"
                  value={newTransactionAmount}
                  onChange={(e) => setNewTransactionAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className={`w-full p-3 rounded-lg text-white font-mono text-lg transition-all outline-none
                      ${isBeauty
                      ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon placeholder-beauty-neon/30'
                      : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Data</label>
                  <input
                    type="date"
                    value={newTransactionDate}
                    onChange={(e) => setNewTransactionDate(e.target.value)}
                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                        ${isBeauty
                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                        : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                    `}
                  />
                </div>
                <div>
                  <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Horário (opcional)</label>
                  <input
                    type="time"
                    value={newTransactionTime}
                    onChange={(e) => setNewTransactionTime(e.target.value)}
                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                        ${isBeauty
                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                        : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                    `}
                  />
                </div>
              </div>

              {/* Service */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Serviço (opcional)</label>
                <select
                  value={newTransactionService}
                  onChange={(e) => setNewTransactionService(e.target.value)}
                  className={`w-full p-3 rounded-lg text-white transition-all outline-none
                      ${isBeauty
                      ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                      : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                >
                  <option value="">Selecione um serviço</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Cliente (opcional)</label>
                <select
                  value={newTransactionClient}
                  onChange={(e) => setNewTransactionClient(e.target.value)}
                  className={`w-full p-3 rounded-lg text-white transition-all outline-none
                      ${isBeauty
                      ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                      : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Professional */}
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Profissional (opcional)</label>
                <select
                  value={newTransactionProfessional}
                  onChange={(e) => setNewTransactionProfessional(e.target.value)}
                  className={`w-full p-3 rounded-lg text-white transition-all outline-none
                      ${isBeauty
                      ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                      : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <BrutalButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowNewTransactionModal(false)}
                >
                  Cancelar
                </BrutalButton>
                <BrutalButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreateTransaction}
                  disabled={savingTransaction}
                  icon={savingTransaction ? <Loader2 className="animate-spin" /> : undefined}
                >
                  {savingTransaction ? 'Salvando...' : 'Registrar'}
                </BrutalButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};