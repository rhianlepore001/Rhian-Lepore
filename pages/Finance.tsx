import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, Users, History, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { CommissionsManagement } from '../components/CommissionsManagement';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { MonthlyHistory } from '../components/MonthlyHistory';

type FinanceTabType = 'overview' | 'commissions' | 'history';

export const Finance: React.FC = () => {
  const { user, userType, region } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
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

  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const currencySymbol = region === 'PT' ? '€' : 'R$';

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
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.profit,
          growth: growth,
          previousMonthRevenue: prevData?.revenue || 0
        });

        setChartData(data.chart_data || []);

        const formattedTransactions = (data.transactions || []).map((item: any) => ({
          id: item.id,
          description: item.barber_name ? `Comissão - ${item.barber_name}` : 'Serviço',
          amount: item.amount || 0,
          expense: item.expense || 0,
          date: new Date(item.created_at).toLocaleDateString('pt-BR'),
          rawDate: new Date(item.created_at),
          type: item.expense > 0 && !item.commission_paid ? 'pending_expense' : (item.expense > 0 ? 'expense' : 'revenue')
        }));

        const filtered = filterType === 'all'
          ? formattedTransactions
          : formattedTransactions.filter(t => {
            if (filterType === 'revenue') return t.type === 'revenue';
            if (filterType === 'expense') return t.type === 'expense' || t.type === 'pending_expense';
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
        await supabase.from('finance_records').delete().eq('id', transactionId);
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
        t.type === 'expense' ? 'Despesa Paga' : (t.type === 'pending_expense' ? 'Comissão Pendente' : 'Receita'),
        t.type === 'expense' ? -t.expense : (t.type === 'pending_expense' ? -t.expense : t.amount)
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
                {currencySymbol} {summary.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className={`flex items-center gap-1 ${summary.growth >= 0 ? 'text-green-500' : 'text-red-500'} text-xs font-mono mt-2`}>
                {summary.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs mês anterior</span>
              </div>
            </BrutalCard>

            <BrutalCard className="border-l-4 border-red-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Despesas</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{months[selectedMonth]} {selectedYear}</p>
                </div>
                <InfoButton text={`Soma de todos os custos, como comissões de profissionais, em ${months[selectedMonth]} ${selectedYear}.`} />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {currencySymbol} {summary.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center gap-1 text-neutral-500 text-xs font-mono mt-2">
                <DollarSign className="w-3 h-3" />
                <span>Comissões e custos</span>
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
                {currencySymbol} {summary.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className={`flex items-center gap-1 ${accentText} text-xs font-mono mt-2`}>
                <Wallet className="w-3 h-3" />
                <span>Margem: {summary.revenue > 0 ? Math.round((summary.profit / summary.revenue) * 100) : 0}%</span>
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
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-right">Tipo</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-sm text-text-secondary">{t.date}</td>
                      <td className="p-3 text-white font-medium">{t.description}</td>
                      <td className="p-3 text-right font-mono">
                        <span className={t.type === 'expense' ? 'text-red-500' : (t.type === 'pending_expense' ? 'text-yellow-500' : 'text-green-500')}>
                          {t.type === 'expense' || t.type === 'pending_expense' ? '-' : '+'}{currencySymbol} {(t.type === 'expense' || t.type === 'pending_expense' ? t.expense : t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'expense' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : (t.type === 'pending_expense' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20')}`}>
                          {t.type === 'expense' ? 'Despesa Paga' : (t.type === 'pending_expense' ? 'Comissão Pendente' : 'Receita')}
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
                      <td colSpan={5} className="p-8 text-center text-text-secondary">
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
        <CommissionsManagement accentColor={accentColor} currencySymbol={currencySymbol} />
      )}
    </div>
  );
};