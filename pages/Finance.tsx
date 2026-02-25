import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, Users, History, Trash2, Plus, X, Loader2, Clock, Check } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { CommissionsManagement } from '../components/CommissionsManagement';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { MonthlyHistory } from '../components/MonthlyHistory';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';

type FinanceTabType = 'overview' | 'commissions' | 'history';

interface Transaction {
  id: string;
  serviceName: string;
  professionalName: string;
  clientName: string;
  amount: number;
  expense: number;
  date: string;
  time: string;
  rawDate: Date;
  type: 'revenue' | 'expense';
  payment_method: string | null;
  commission_paid: boolean;
  status: 'paid' | 'pending';
}

interface MonthlyHistoryItem {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
}

export const Finance: React.FC = () => {
  const { user, userType, region } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    commissionsPending: 0,
    profit: 0,
    growth: 0,
    previousMonthRevenue: 0,
    revenueByMethod: { pix: 0, dinheiro: 0, cartao: 0 },
    pendingExpenses: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<FinanceTabType>('overview');

  // New Transaction Modal State
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('income');
  const [newTransactionDescription, setNewTransactionDescription] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTransactionTime, setNewTransactionTime] = useState('');
  const [newTransactionStatus, setNewTransactionStatus] = useState<'paid' | 'pending'>('paid');
  const [newTransactionDueDate, setNewTransactionDueDate] = useState('');
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

  useEffect(() => {
    const isNewQuery = searchParams.get('new') === 'true';
    if (isNewQuery && user) {
      handleOpenNewTransaction();
      // Limpar o parâmetro da URL para evitar reabrir ao atualizar
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, user]);

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
          previousMonthRevenue: prevData?.revenue || 0,
          revenueByMethod: data.revenue_by_method || { pix: 0, dinheiro: 0, cartao: 0 },
          pendingExpenses: data.pendingExpenses || 0
        });

        setChartData(data.chart_data || []);

        const formattedTransactions = (data.transactions || []).map((item: any) => {
          const createdAt = new Date(item.created_at);
          const isExpense = item.type === 'expense';
          const isPaid = isExpense
            ? item.commission_paid === true
            : (item.status ? item.status === 'paid' : true);
          return {
            id: item.id,
            serviceName: item.service_name || item.description || 'Serviço',
            professionalName: item.barber_name || 'Manual',
            clientName: item.client_name || '',
            amount: item.amount || 0,
            expense: item.expense || 0,
            date: createdAt.toLocaleDateString('pt-BR'),
            time: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            rawDate: createdAt,
            type: item.type,
            payment_method: item.payment_method,
            commission_paid: item.commission_paid,
            status: isPaid ? 'paid' : 'pending'
          };
        });
        const filtered = formattedTransactions.filter((t: any) => {
          const matchesType = filterType === 'all' || (filterType === 'revenue' ? t.type === 'revenue' : t.type === 'expense');
          const matchesPayment = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;
          return matchesType && matchesPayment;
        });

        setTransactions(filtered);
      }
    } catch (error) {
      logger.error('Error fetching finance data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_monthly_finance_history', {
        p_user_id: user.id,
        p_months_count: 12
      });

      if (error) throw error;

      if (data) {
        const history = data.map((item: any, index: number, arr: any[]) => {
          let growth = 0;
          if (index > 0) {
            const prevRevenue = arr[index - 1].revenue;
            growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
          }

          return {
            month: item.month_name.trim(),
            year: item.year_num,
            revenue: parseFloat(item.revenue),
            expenses: parseFloat(item.expenses),
            profit: parseFloat(item.profit),
            growth: growth
          };
        });

        setMonthlyHistory(history.reverse()); // Recentes primeiro para a lista
      }
    } catch (error) {
      logger.error('Error fetching monthly history', error);
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
          await supabase.from('appointments').delete().eq('id', record.appointment_id).eq('user_id', user.id);
        }
      }

      const { error } = await supabase.from('finance_records').delete().eq('id', transactionId).eq('user_id', user.id);
      if (error) throw error;

      alert('Transação excluída com sucesso!');
      fetchFinanceData(); // Refresh finance data
    } catch (error) {
      logger.error('Error deleting transaction', error);
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
    setFilterPaymentMethod('all');
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
      logger.error('Error fetching dropdown data', error);
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
      const transactionDateTime = new Date(newTransactionDate);
      if (newTransactionTime) {
        const [hours, minutes] = newTransactionTime.split(':');
        transactionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const isExpense = newTransactionType === 'expense';
      const isPaid = newTransactionStatus === 'paid';
      const transactionData: any = {
        user_id: user.id,
        barber_name: professionalName,
        professional_id: newTransactionProfessional || null,
        revenue: newTransactionType === 'income' ? amount : 0,
        commission_value: newTransactionType === 'expense' ? amount : 0,
        commission_rate: 0,
        type: newTransactionType === 'income' ? 'revenue' : 'expense',
        description: newTransactionDescription,
        created_at: transactionDateTime.toISOString(),
        payment_method: newTransactionType === 'income' ? 'Dinheiro' : null, // Default for manual income
        status: newTransactionStatus,
        due_date: newTransactionStatus === 'pending' ? (newTransactionDueDate ? new Date(newTransactionDueDate).toISOString() : transactionDateTime.toISOString()) : null,
        commission_paid: isExpense ? isPaid : true,
        commission_paid_at: isExpense && isPaid ? transactionDateTime.toISOString() : null
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
      logger.error('Error creating transaction', error);
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
          <BrutalButton variant="secondary" size="sm" icon={<Filter />} onClick={() => setShowFilterModal(true)}>
            Filtrar
          </BrutalButton>
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
                <InfoButton text="O valor que sobra após subtrair as despesas pagas da receita. Seu lucro real no período." />
              </div>
              <h3 className={`text-2xl md:text-3xl font-heading ${accentText}`}>
                {formatCurrency(summary.profit || 0, currencyRegion)}
              </h3>
              <div className={`flex items-center gap-1 ${accentText} text-xs font-mono mt-2`}>
                <Wallet className="w-3 h-3" />
                <span>Margem: {summary.revenue > 0 ? Math.round(((summary.profit || 0) / summary.revenue) * 100) : 0}%</span>
              </div>
            </BrutalCard>

            <BrutalCard className="border-l-4 border-yellow-600 bg-yellow-500/5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-yellow-500 font-mono text-xs uppercase tracking-widest">A Pagar (Pendente)</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">Total de despesas não liquidadas</p>
                </div>
                <InfoButton text="Despesas registradas como 'Pendentes' que ainda não saíram do seu caixa." />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-yellow-500 font-bold">
                {formatCurrency(summary.pendingExpenses || 0, currencyRegion)}
              </h3>
              <div className="flex items-center gap-1 text-yellow-500/70 text-xs font-mono mt-2">
                <Clock className="w-3 h-3 text-yellow-500" />
                <span>Impacto futuro no fluxo</span>
              </div>
            </BrutalCard>
          </div>

          {/* Detailed Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <BrutalCard className="border-l-4 border-green-400 bg-green-500/5">
              <p className="text-text-secondary font-mono text-[10px] uppercase tracking-tighter">Receita via Pix</p>
              <h4 className="text-xl font-heading text-white mt-1">
                {formatCurrency(summary.revenueByMethod.pix || 0, currencyRegion)}
              </h4>
            </BrutalCard>
            <BrutalCard className="border-l-4 border-emerald-400 bg-emerald-500/5">
              <p className="text-text-secondary font-mono text-[10px] uppercase tracking-tighter">Receita via Dinheiro</p>
              <h4 className="text-xl font-heading text-white mt-1">
                {formatCurrency(summary.revenueByMethod.dinheiro || 0, currencyRegion)}
              </h4>
            </BrutalCard>
            <BrutalCard className="border-l-4 border-teal-400 bg-teal-500/5">
              <p className="text-text-secondary font-mono text-[10px] uppercase tracking-tighter">Receita via Cartão</p>
              <h4 className="text-xl font-heading text-white mt-1">
                {formatCurrency(summary.revenueByMethod.cartao || 0, currencyRegion)}
              </h4>
            </BrutalCard>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6">
            <BrutalCard title={`Fluxo de Caixa - ${months[selectedMonth]} ${selectedYear}`}>
              <div className="h-[350px] min-h-[300px] w-full mt-4">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          </div>

          {/* Recent Transactions */}
          {/* Recent Transactions */}
          <BrutalCard title="Transações Recentes">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-800 text-text-secondary font-mono text-xs uppercase">
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Descrição / Serviço</th>
                    <th className="p-3">Profissional</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-center">Pagamento</th>
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
                          {t.serviceName}
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
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {t.type === 'expense' ? 'Despesa' : 'Receita'}
                          </span>
                          {t.status === 'pending' && (
                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              Pendente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-white text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 uppercase">
                          {t.payment_method || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          {t.type === 'expense' && t.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (confirm(`Deseja marcar "${t.serviceName || 'Despesa'}" como paga?`)) {
                                  try {
                                    const { error } = await supabase.rpc('mark_expense_as_paid', {
                                      p_record_id: t.id,
                                      p_user_id: user?.id
                                    });
                                    if (error) throw error;
                                    fetchFinanceData();
                                  } catch (err) {
                                    console.error('Erro ao liquidar despesa:', err);
                                    alert('Erro ao liquidar despesa.');
                                  }
                                }
                              }}
                              className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-all"
                              title="Marcar como Pago"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Excluir transação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border-l-4 transition-all ${t.type === 'expense'
                    ? 'bg-red-500/5 border-red-500/50 hover:bg-red-500/10'
                    : 'bg-green-500/5 border-green-500/50 hover:bg-green-500/10'
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-white font-heading text-base">{t.serviceName}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-neutral-500 text-xs font-mono">{t.date}</span>
                        <span className="text-neutral-700 text-xs">•</span>
                        <span className="text-neutral-500 text-xs font-mono">{t.time}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-mono font-bold text-lg ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                        {t.type === 'expense' ? '-' : '+'}{formatCurrency((t.type === 'expense' ? (t.expense || 0) : (t.amount || 0)), currencyRegion, false)}
                      </span>
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${t.type === 'expense'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-green-500/10 text-green-500'
                          }`}>
                          {t.type === 'expense' ? 'Despesa' : 'Receita'}
                        </span>
                        {t.status === 'pending' && (
                          <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            Pendente
                          </span>
                        )}
                      </div>
                      {t.payment_method && (
                        <span className="text-[10px] text-white/40 font-mono mt-1">
                          PAG: {t.payment_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/5 my-3">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">Profissional</p>
                      <p className={`text-sm font-medium ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}>{t.professionalName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">Cliente</p>
                      <p className="text-sm text-neutral-300 truncate">{t.clientName || '—'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {t.type === 'expense' && t.status === 'pending' && (
                      <button
                        onClick={async () => {
                          if (confirm(`Deseja marcar "${t.serviceName || 'Despesa'}" como paga?`)) {
                            try {
                              const { error } = await supabase.rpc('mark_expense_as_paid', {
                                p_record_id: t.id,
                                p_user_id: user?.id
                              });
                              if (error) throw error;
                              fetchFinanceData();
                            } catch (err) {
                              console.error('Erro ao liquidar despesa:', err);
                              alert('Erro ao liquidar despesa.');
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-green-500 text-xs font-bold uppercase bg-green-500/10 rounded-lg active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Liquidar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-500 text-xs font-bold uppercase bg-red-500/10 rounded-lg active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {transactions.length === 0 && (
              <div className="p-12 text-center">
                <div className="bg-neutral-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-neutral-500" />
                </div>
                <p className="text-text-secondary font-medium">Nenhuma transação encontrada</p>
                <p className="text-neutral-500 text-sm mt-1">Registre uma nova transação ou mude o filtro.</p>
              </div>
            )}
          </BrutalCard>
        </>
      )
      }

      {
        activeTab === 'history' && (
          <BrutalCard title="Histórico Mensal - Últimos 12 Meses">
            <MonthlyHistory
              data={monthlyHistory}
              currencySymbol={currencySymbol}
              accentColor={accentColor}
              isBeauty={isBeauty}
            />
          </BrutalCard>
        )
      }

      {
        activeTab === 'commissions' && (
          <CommissionsManagement
            accentColor={accentColor}
            currencySymbol={currencySymbol}
            onPaymentSuccess={fetchFinanceData}
          />
        )
      }

      {/* New Transaction Modal */}
      {
        showNewTransactionModal && (
          <Modal
            isOpen={showNewTransactionModal}
            onClose={() => setShowNewTransactionModal(false)}
            title="Nova Transação"
            size="lg"
            footer={
              <div className="flex gap-3 w-full">
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
            }
          >
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

              {/* Status and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Status</label>
                  <select
                    value={newTransactionStatus}
                    onChange={(e) => setNewTransactionStatus(e.target.value as 'paid' | 'pending')}
                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                      ${isBeauty
                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                        : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                  `}
                  >
                    <option value="paid">Pago / Recebido</option>
                    <option value="pending">Pendente / Agendado</option>
                  </select>
                </div>
                {newTransactionStatus === 'pending' && (
                  <div>
                    <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-neutral-400'}`}>Vencimento</label>
                    <input
                      type="date"
                      value={newTransactionDueDate}
                      onChange={(e) => setNewTransactionDueDate(e.target.value)}
                      className={`w-full p-3 rounded-lg text-white transition-all outline-none
                        ${isBeauty
                          ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                          : `bg-black border border-neutral-700 focus:border-${accentColor}`}
                      `}
                    />
                  </div>
                )}
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
            </div>
          </Modal>
        )
      }

      {/* Filter Modal */}
      {
        showFilterModal && (
          <Modal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            title="Filtrar Transações"
            size="md"
            footer={
              <div className="flex gap-3 w-full">
                <BrutalButton variant="secondary" className="flex-1" onClick={handleClearFilter}>
                  Limpar
                </BrutalButton>
                <BrutalButton variant="primary" className="flex-1" onClick={handleApplyFilter}>
                  Aplicar
                </BrutalButton>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70' : 'text-neutral-400'}`}>Tipo de Transação</label>
                <div className="flex gap-2">
                  {(['all', 'revenue', 'expense'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all
                      ${filterType === type
                          ? `${accentBg} text-black`
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {type === 'all' ? 'Tudo' : type === 'revenue' ? 'Entradas' : 'Saídas'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70' : 'text-neutral-400'}`}>Forma de Pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'Dinheiro', 'Pix', 'Cartão'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setFilterPaymentMethod(method)}
                      className={`px-3 py-2 rounded-lg font-bold text-xs uppercase transition-all
                      ${filterPaymentMethod === method
                          ? `${accentBg} text-black`
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {method === 'all' ? 'Todas' : method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )
      }
    </div >
  );
};