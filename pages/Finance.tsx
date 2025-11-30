import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import { CommissionsManagement } from '../components/CommissionsManagement'; // Import the new component

type FinanceTabType = 'overview' | 'commissions'; // New type for tabs

export const Finance: React.FC = () => {
  const { user, userType, region } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    growth: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [activeTab, setActiveTab] = useState<FinanceTabType>('overview'); // New state for active tab

  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold'; // Adicionado: Definição de accentColor
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const currencySymbol = region === 'PT' ? '€' : 'R$';

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchFinanceData();
    }
  }, [activeTab, user]); // Refetch data when tab changes or user changes

  const fetchFinanceData = async (customStartDate?: string, customEndDate?: string) => {
    try {
      const startDateParam = customStartDate || null;
      const endDateParam = customEndDate || null;

      const { data, error } = await supabase.rpc('get_finance_stats', {
        p_user_id: user.id,
        p_start_date: startDateParam,
        p_end_date: endDateParam
      });

      if (error) throw error;

      if (data) {
        setSummary({
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.profit,
          growth: 12.5 // Still mock for now, or could calculate in RPC
        });

        setChartData(data.chart_data || []);

        const formattedTransactions = (data.transactions || []).map((item: any) => ({
          id: item.id,
          description: item.barber_name ? `Comissão - ${item.barber_name}` : 'Serviço',
          amount: item.amount || 0, // Use item.amount from RPC, default to 0
          expense: item.expense || 0, // Use item.expense from RPC, default to 0
          date: new Date(item.created_at).toLocaleDateString('pt-BR'),
          rawDate: new Date(item.created_at),
          type: item.expense > 0 && !item.commission_paid ? 'pending_expense' : (item.expense > 0 ? 'expense' : 'revenue') // Use item.expense for type determination
        }));

        // Apply filter type
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
    link.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleApplyFilter = () => {
    fetchFinanceData(startDate || undefined, endDate || undefined);
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
          <BrutalButton variant="primary" size="sm" icon={<Filter />} onClick={() => setShowFilterModal(true)}>
            Filtrar
          </BrutalButton>
        </div>
      </div>

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
                <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Receita (30d)</p>
                <InfoButton text="Total de vendas e serviços faturados nos últimos 30 dias." />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {currencySymbol} {summary.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center gap-1 text-green-500 text-xs font-mono mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+15% este mês</span>
              </div>
            </BrutalCard>

            <BrutalCard className="border-l-4 border-red-500">
              <div className="flex justify-between items-start mb-2">
                <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Despesas (30d)</p>
                <InfoButton text="Soma de todos os custos, como comissões de profissionais, nos últimos 30 dias." />
              </div>
              <h3 className="text-2xl md:text-3xl font-heading text-white">
                {currencySymbol} {summary.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center gap-1 text-red-500 text-xs font-mono mt-2">
                <TrendingDown className="w-3 h-3" />
                <span>-5% este mês</span>
              </div>
            </BrutalCard>

            <BrutalCard className={`border-l-4 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Lucro Líquido</p>
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
            <BrutalCard title="Fluxo de Caixa (Últimos 30 dias)" className="h-[400px]">
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
            </BrutalCard>

            <BrutalCard title="Receita vs Despesas" className="h-[400px]">
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
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-secondary">
                        Nenhuma transação registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </BrutalCard>
        </>
      )}

      {activeTab === 'commissions' && (
        <CommissionsManagement accentColor={accentColor} currencySymbol={currencySymbol} />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <BrutalCard className="w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading text-white uppercase">Filtrar Transações</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-2 uppercase">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-accent-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-2 uppercase">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-accent-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-2 uppercase">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'revenue' | 'expense')}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-accent-gold outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="revenue">Receitas</option>
                  <option value="expense">Despesas</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <BrutalButton
                  variant="secondary"
                  className="flex-1"
                  onClick={handleClearFilter}
                >
                  Limpar
                </BrutalButton>
                <BrutalButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleApplyFilter}
                >
                  Aplicar
                </BrutalButton>
              </div>
            </div>
          </BrutalCard>
        </div>
      )}
    </div>
  );
};