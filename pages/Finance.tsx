import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';

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

  const isBeauty = userType === 'beauty';
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const currencySymbol = region === 'PT' ? '€' : 'R$';

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_finance_stats', {
        p_user_id: user.id,
        p_start_date: null, // Defaults to last 30 days in RPC
        p_end_date: null
      });

      if (error) throw error;

      if (data) {
        setSummary({
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.profit,
          growth: 12.5 // Still mock for now, or could calculate in RPC
        });

        setChartData(data.chart_data);

        const formattedTransactions = data.transactions.map((item: any) => ({
          id: item.id,
          description: item.barber_name ? `Comissão - ${item.barber_name}` : 'Serviço',
          amount: item.amount,
          expense: item.expense || 0,
          date: new Date(item.created_at).toLocaleDateString('pt-BR'),
          rawDate: new Date(item.created_at)
        }));

        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
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
          <BrutalButton variant="secondary" size="sm" icon={<Download />}>
            Exportar
          </BrutalButton>
          <BrutalButton variant="primary" size="sm" icon={<Filter />}>
            Filtrar
          </BrutalButton>
        </div>
      </div>

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
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono text-sm text-text-secondary">{t.date}</td>
                  <td className="p-3 text-white font-medium">{t.description}</td>
                  <td className="p-3 text-right font-mono text-white">
                    {currencySymbol} {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                      Confirmado
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
    </div>
  );
};