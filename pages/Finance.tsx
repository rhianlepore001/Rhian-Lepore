import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, Modal, Table, Badge, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Wallet, TrendingUp, TrendingDown, Calendar, Download, Filter, Users, History, Trash2, Plus, Check, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { AIAssistantButton } from '../components/HelpButtons';
import { CommissionsManagement } from '../components/CommissionsManagement';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { MonthlyHistory } from '../components/MonthlyHistory';
import { TabNav } from '../components/TabNav';
import { FinanceInsights } from '../components/FinanceInsights';
import { formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';
import { mapError, formatUserFacingError } from '../utils/mapError';
import { fetchFinanceStats, filterStaffTransactions, mapFinanceTransaction } from '../services/finance';
import { useMonthlyHistory, useFinanceDropdowns, useDeleteFinanceTransaction, useMarkExpenseAsPaid, useCreateFinanceRecord } from '../hooks/useFinance';
import { useTenantLocale } from '../hooks/useTenantLocale';

type FinanceTabType = 'overview' | 'commissions' | 'history' | 'insights';

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  mbway: 'MBWay',
  membership: 'Clube',
};

interface MonthlyHistoryItem {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
}

interface FinanceKpiProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
  minHeightClass: string;
}

const FinanceKpi: React.FC<FinanceKpiProps> = ({
  title, value, subtitle, icon, iconClass, minHeightClass,
}) => {
  const { colors } = useBrutalTheme();
  return (
    <Card variant="outlined" className={minHeightClass}>
      <div className="flex items-start gap-3">
        <div className={iconClass}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>{title}</p>
          <p className={`mt-3 font-mono text-2xl font-black tracking-tight tabular-nums ${colors.text}`}>{value}</p>
          <p className={`mt-1 text-sm ${colors.textSecondary}`}>{subtitle}</p>
        </div>
      </div>
    </Card>
  );
};

export const Finance: React.FC = () => {
  const { user, region, role, companyId, teamMemberId } = useAuth();
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
    revenueByMethod: { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
    pendingExpenses: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  // Staff não vê aba de comissões nem histórico
  const isStaff = role === 'staff';
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
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [pendingMarkPaid, setPendingMarkPaid] = useState<{ id: string; name: string } | null>(null);

  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { accent, colors, isBeauty, isDark, classes, font, density, status } = useBrutalTheme();

  const chartTheme = useMemo(() => ({
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    axis: isDark ? '#A0A0A0' : '#6B5E45',
    tooltipBg: isDark ? '#1E1E1E' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    tooltipText: isDark ? '#EAEAEA' : '#1A1A1A',
    revenueStroke: '#34d399',
    revenueFill: '#10B981',
    expenseStroke: '#f87171',
    expenseFill: '#EF4444',
  }), [isDark]);
  const { showToast } = useToast();
  const { region: currencyRegion, currencySymbol } = useTenantLocale();

  const queryUserId = isStaff && companyId ? companyId : (user?.id || '');
  const { data: monthlyHistoryData, refetch: refetchMonthlyHistory } = useMonthlyHistory(user?.id || '', 12);
  const monthlyHistory = React.useMemo(() => {
    if (!monthlyHistoryData) return [];
    const translateMonth = (m: string) => {
      const map: Record<string, string> = {
        'January': 'Janeiro', 'February': 'Fevereiro', 'March': 'Março',
        'April': 'Abril', 'May': 'Maio', 'June': 'Junho',
        'July': 'Julho', 'August': 'Agosto', 'September': 'Setembro',
        'October': 'Outubro', 'November': 'Novembro', 'December': 'Dezembro'
      };
      return map[m] || m;
    };
    return monthlyHistoryData.map((item: any, index: number, arr: any[]) => {
      let growth = 0;
      if (index > 0) {
        const prevRevenue = arr[index - 1].revenue;
        growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      }
      return {
        month: translateMonth(item.month_name?.trim() || ''),
        year: item.year_num,
        revenue: parseFloat(item.revenue),
        expenses: parseFloat(item.expenses),
        profit: parseFloat(item.profit),
        growth,
      };
    }).reverse();
  }, [monthlyHistoryData]);

  const { data: dropdownData } = useFinanceDropdowns(queryUserId);
  const dropdownServices = dropdownData?.services || [];
  const dropdownClients = dropdownData?.clients || [];
  const dropdownProfessionals = dropdownData?.professionals || [];

  const deleteTransactionMutation = useDeleteFinanceTransaction();
  const markExpensePaidMutation = useMarkExpenseAsPaid();
  const createRecordMutation = useCreateFinanceRecord();

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

useEffect(() => {
    if (isStaff && activeTab !== 'overview') {
      setActiveTab('overview');
      return;
    }

    if (activeTab === 'overview') {
      fetchFinanceData();
    } else if (activeTab === 'history') {
      refetchMonthlyHistory();
    } else if (activeTab === 'insights') {
      if (!monthlyHistoryData || monthlyHistoryData.length === 0) refetchMonthlyHistory();
      if (transactions.length === 0) fetchFinanceData();
    }
  }, [activeTab, selectedMonth, selectedYear, user, isStaff]);

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
    if (!user) return;

    try {
      // Calculate start and end dates for the selected month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

      const startDateParam = startOfMonth.toISOString().split('T')[0];
      const endDateParam = endOfMonth.toISOString().split('T')[0];

      const queryUserId = isStaff && companyId ? companyId : user.id;

      const data = await fetchFinanceStats({
        companyId: queryUserId,
        startDate: startDateParam,
        endDate: endDateParam,
        professionalId: isStaff ? teamMemberId : null,
      });

      if (data) {
        // Calculate growth vs previous month
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const prevStartDate = new Date(prevYear, prevMonth, 1).toISOString().split('T')[0];
        const prevEndDate = new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0];

        const prevData = await fetchFinanceStats({
          companyId: queryUserId,
          startDate: prevStartDate,
          endDate: prevEndDate,
          professionalId: isStaff ? teamMemberId : null,
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
          revenueByMethod: data.revenue_by_method || { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
          pendingExpenses: data.pendingExpenses || 0
        });

        setChartData(data.chart_data || []);

        const formattedTransactions = (data.transactions || []).map(mapFinanceTransaction);
        const staffFiltered = isStaff
          ? filterStaffTransactions(formattedTransactions, teamMemberId)
          : formattedTransactions;

        const filtered = staffFiltered.filter((t: any) => {
          const matchesType = filterType === 'all' || (filterType === 'revenue' ? t.type === 'revenue' : t.type === 'expense');
          const matchesPayment = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;
          return matchesType && matchesPayment;
        });

        setTransactions(filtered);

        // Recalcula resumo para staff (apenas os próprios atendimentos)
        if (isStaff) {
          const staffRevenue = staffFiltered
            .filter((t: any) => t.type === 'revenue')
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          setSummary({
            revenue: staffRevenue,
            expenses: 0,
            commissionsPending: 0,
            profit: staffRevenue,
            growth: 0,
            previousMonthRevenue: 0,
            revenueByMethod: { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
            pendingExpenses: 0
          });
          return;
        }
      }
    } catch (error) {
      logger.error('Error fetching finance data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyHistory = useCallback(async () => {
    await refetchMonthlyHistory();
  }, [refetchMonthlyHistory]);

  const handleDeleteTransaction = (t: Transaction) => {
    setPendingDelete(t);
  };

  const confirmDeleteTransaction = async () => {
    if (!pendingDelete) return;
    const t = pendingDelete;
    try {
      await deleteTransactionMutation.mutateAsync({ transactionId: t.id, companyId: queryUserId });
      showToast('Transação excluída com sucesso!', 'success');
      fetchFinanceData();
    } catch (error: unknown) {
      logger.error('Erro ao excluir transação', error);
      const ui = mapError(error, 'Não foi possível excluir a transação. Tente de novo.');
      showToast(formatUserFacingError(ui), 'error');
    } finally {
      setPendingDelete(null);
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
  const handleOpenNewTransaction = () => {
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
      showToast('Por favor, preencha pelo menos a descrição e o valor.', 'warning');
      return;
    }

    setSavingTransaction(true);
    try {
      const amount = parseFloat(newTransactionAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast('Por favor, insira um valor válido.', 'warning');
        setSavingTransaction(false);
        return;
      }

      const serviceName = dropdownServices.find(s => s.id === newTransactionService)?.name || '';
      const clientName = dropdownClients.find(c => c.id === newTransactionClient)?.name || '';
      const professionalName = dropdownProfessionals.find(p => p.id === newTransactionProfessional)?.name || 'Manual';

      const transactionDateTime = new Date(newTransactionDate);
      if (newTransactionTime) {
        const [hours, minutes] = newTransactionTime.split(':');
        transactionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const isPaid = newTransactionStatus === 'paid';

      await createRecordMutation.mutateAsync({
        companyId: queryUserId,
        type: newTransactionType === 'income' ? 'revenue' : 'expense',
        amount: newTransactionType === 'income' ? amount : 0,
        expense: newTransactionType === 'expense' ? amount : 0,
        description: newTransactionDescription,
        paymentMethod: newTransactionType === 'income' ? 'Dinheiro' : null,
        professionalId: newTransactionProfessional || null,
        professionalName,
        clientId: newTransactionClient || null,
        clientName,
        serviceName,
        appointmentId: null,
        dueDate: newTransactionStatus === 'pending'
          ? (newTransactionDueDate ? new Date(newTransactionDueDate).toISOString() : transactionDateTime.toISOString())
          : null,
        commissionPaid: newTransactionType === 'expense' ? isPaid : true,
      });

      showToast(`${newTransactionType === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso!`, 'success');
      setShowNewTransactionModal(false);
      fetchFinanceData();
    } catch (error: unknown) {
      logger.error('Error creating transaction', error);
      const ui = mapError(error, 'Não foi possível registrar a transação. Verifique os dados e tente de novo.');
      showToast(formatUserFacingError(ui), 'error');
    } finally {
      setSavingTransaction(false);
    }
  };

  const periodLabel = `${months[selectedMonth]} ${selectedYear}`;
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;
  const revenueCount = transactions.filter((t) => t.type === 'revenue').length;
  const avgTicket = revenueCount > 0 ? (summary.revenue || 0) / revenueCount : 0;

  const transactionColumns = useMemo<TableColumn<Transaction>[]>(() => [
    {
      key: 'datetime',
      header: 'Data/hora',
      render: (t) => (
        <div className="flex flex-col">
          <span className={`font-medium ${colors.text}`}>{t.date}</span>
          <span className={`text-xs ${colors.textMuted}`}>{t.time}</span>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Descrição / serviço',
      render: (t) => <span className={`font-medium ${colors.text}`}>{t.serviceName}</span>,
    },
    {
      key: 'professional',
      header: 'Profissional',
      render: (t) => <span className={`font-medium ${accent.text}`}>{t.professionalName}</span>,
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (t) => (
        <span className={colors.textSecondary}>
          {t.clientName || <span className={colors.textMuted}>—</span>}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (t) => (
        <span className={`font-mono font-bold tabular-nums ${t.type === 'expense' ? status.danger : status.success}`}>
          {t.type === 'expense' ? '-' : '+'}
          {formatCurrency(t.type === 'expense' ? (t.expense || 0) : (t.amount || 0), currencyRegion, false)}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      align: 'center',
      render: (t) => (
        <div className="flex flex-col items-center gap-1">
          <Badge variant={t.type === 'expense' ? 'danger' : 'success'}>
            {t.type === 'expense' ? 'Despesa' : 'Receita'}
          </Badge>
          {t.status === 'pending' && <Badge variant="warning">Pendente</Badge>}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Pagamento',
      align: 'center',
      render: (t) => (
        <span className={`text-xs ${colors.textSecondary} ${colors.surface} px-2 py-1 rounded border ${colors.border}`}>
          {PAYMENT_METHOD_LABELS[t.payment_method || ''] || t.payment_method || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          {t.type === 'expense' && t.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPendingMarkPaid({ id: t.id, name: t.serviceName || 'Despesa' });
              }}
            >
              Liquidar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteTransaction(t);
            }}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ], [accent.text, colors, currencyRegion, status.danger, status.success]);

  return (
    <div className={`space-y-6 md:space-y-8 pb-20 ${density.pagePadding} md:px-0`}>
      <PageHeader
        title="Financeiro"
        subtitle={periodLabel}
        meta={<AIAssistantButton context="suas finanças, entradas e saídas de dinheiro e relatórios" />}
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button variant="outline" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setShowFilterModal(true)}>
              Filtrar
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleOpenNewTransaction}>
              Registrar receita
            </Button>
            <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Exportar
            </Button>
          </div>
        }
      />

      {/* Month/Year Selector */}
      {activeTab === 'overview' && (
        <MonthYearSelector
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChange={handleMonthChange}
          accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
        />
      )}

      {/* Tabs — staff vê apenas Visão Geral */}
      <TabNav
        tabs={[
          { id: 'overview', label: isStaff ? 'Meu Financeiro' : 'Visão Geral', icon: <Calendar className="w-3.5 h-3.5" /> },
          ...(!isStaff ? [
            { id: 'insights', label: 'Insights', icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { id: 'commissions', label: 'Comissões', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'history', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
          ] : []),
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as FinanceTabType)}
        accentBg={accent.bg}
      />

      {activeTab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FinanceKpi
              icon={<TrendingUp className="h-5 w-5" />}
              title={isStaff ? 'Meu giro' : 'Receita'}
              value={formatCurrency(summary.revenue || 0, currencyRegion)}
              subtitle={
                isStaff
                  ? `${revenueCount} atendimentos em ${periodLabel}`
                  : `${summary.growth > 0 ? '+' : ''}${summary.growth.toFixed(1)}% vs mês anterior`
              }
              iconClass={iconClass}
              minHeightClass={density.kpiMinHeight}
            />
            {!isStaff && (
              <>
                <FinanceKpi
                  icon={<TrendingDown className="h-5 w-5" />}
                  title="Despesas"
                  value={formatCurrency(summary.expenses || 0, currencyRegion)}
                  subtitle="Comissões e custos liquidados"
                  iconClass={iconClass}
                  minHeightClass={density.kpiMinHeight}
                />
                <FinanceKpi
                  icon={<Wallet className="h-5 w-5" />}
                  title="Lucro"
                  value={formatCurrency(summary.profit || 0, currencyRegion)}
                  subtitle={
                    summary.revenue > 0
                      ? `${Math.round(((summary.profit || 0) / summary.revenue) * 100)}% margem`
                      : 'Sem receita no período'
                  }
                  iconClass={iconClass}
                  minHeightClass={density.kpiMinHeight}
                />
              </>
            )}
            {isStaff && (
              <FinanceKpi
                icon={<Calendar className="h-5 w-5" />}
                title="Atendimentos"
                value={String(revenueCount)}
                subtitle={`Ticket médio ${formatCurrency(avgTicket, currencyRegion)}`}
                iconClass={iconClass}
                minHeightClass={density.kpiMinHeight}
              />
            )}
          </section>

          {!isStaff && (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card variant="outlined">
                <p className={`text-sm font-semibold ${colors.textSecondary}`}>
                  {region === 'PT' ? 'Receita via MBWay' : 'Receita via Pix'}
                </p>
                <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${status.success}`}>
                  {formatCurrency(region === 'PT' ? (summary.revenueByMethod.mbway || 0) : (summary.revenueByMethod.pix || 0), currencyRegion)}
                </p>
              </Card>
              <Card variant="outlined">
                <p className={`text-sm font-semibold ${colors.textSecondary}`}>Receita via dinheiro</p>
                <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${status.success}`}>
                  {formatCurrency(summary.revenueByMethod.dinheiro || 0, currencyRegion)}
                </p>
              </Card>
              <Card variant="outlined">
                <p className={`text-sm font-semibold ${colors.textSecondary}`}>Receita via cartão</p>
                <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${status.success}`}>
                  {formatCurrency(summary.revenueByMethod.cartao || 0, currencyRegion)}
                </p>
              </Card>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6">
            <Card title={`Entradas e saídas — ${periodLabel}`}>
              <div className="h-[350px] min-h-[300px] w-full mt-4">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartTheme.revenueStroke} stopOpacity={0.35} />
                        <stop offset="50%" stopColor={chartTheme.revenueFill} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={chartTheme.revenueFill} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartTheme.expenseStroke} stopOpacity={0.28} />
                        <stop offset="50%" stopColor={chartTheme.expenseFill} stopOpacity={0.1} />
                        <stop offset="100%" stopColor={chartTheme.expenseFill} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={chartTheme.axis} style={{ fontSize: '11px', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartTheme.axis} style={{ fontSize: '11px', fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencyRegion === 'PT' ? '€' : 'R$'}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: '12px', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)', padding: '12px 16px' }}
                      labelStyle={{ color: chartTheme.tooltipText, fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ fontSize: '13px', padding: '2px 0' }}
                      formatter={(value: number) => [formatCurrency(value, currencyRegion), undefined]}
                    />
                    <Area type="natural" dataKey="receita" stroke={chartTheme.revenueStroke} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Entradas" isAnimationActive={false} />
                    <Area type="natural" dataKey="despesas" stroke={chartTheme.expenseStroke} strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Saídas" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Transações recentes" noPadding>
            <div className={density.cardPadding}>
              <Table<Transaction>
                columns={transactionColumns}
                data={transactions}
                rowKey={(t) => t.id}
                stickyHeader
                getRowClassName={(t) => (t.status === 'pending' ? `${status.warningBg}` : '')}
                emptyState={{
                  icon: History,
                  title: 'Nenhuma transação encontrada',
                  description: 'Registre uma nova transação ou mude o filtro.',
                  action: (
                    <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleOpenNewTransaction}>
                      Registrar receita
                    </Button>
                  ),
                }}
                mobileRender={(t) => (
                  <div
                    className={`rounded-xl border p-4 ${t.type === 'expense' ? `${status.dangerBg} ${status.dangerBorder}` : `${status.successBg} ${status.successBorder}`}`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className={`text-base font-semibold ${colors.text}`}>{t.serviceName}</span>
                        <div className={`mt-1 flex items-center gap-2 text-xs ${colors.textMuted}`}>
                          <span>{t.date}</span>
                          <span>•</span>
                          <span>{t.time}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono text-lg font-bold tabular-nums ${t.type === 'expense' ? status.danger : status.success}`}>
                          {t.type === 'expense' ? '-' : '+'}
                          {formatCurrency(t.type === 'expense' ? (t.expense || 0) : (t.amount || 0), currencyRegion, false)}
                        </span>
                        <div className="mt-1 flex flex-col items-end gap-1">
                          <Badge variant={t.type === 'expense' ? 'danger' : 'success'}>
                            {t.type === 'expense' ? 'Despesa' : 'Receita'}
                          </Badge>
                          {t.status === 'pending' && <Badge variant="warning">Pendente</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className={`my-3 grid grid-cols-2 gap-2 border-y py-3 ${colors.divider}`}>
                      <div>
                        <p className={`text-xs ${colors.textMuted}`}>Profissional</p>
                        <p className={`text-sm font-medium ${accent.text}`}>{t.professionalName}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${colors.textMuted}`}>Cliente</p>
                        <p className={`truncate text-sm ${colors.textSecondary}`}>{t.clientName || '—'}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {t.type === 'expense' && t.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Check className="h-3.5 w-3.5" />}
                          onClick={() => setPendingMarkPaid({ id: t.id, name: t.serviceName || 'Despesa' })}
                        >
                          Liquidar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => handleDeleteTransaction(t)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              />
            </div>
          </Card>
        </>
      )
      }

      {
        activeTab === 'history' && (
          <Card title="Histórico mensal — últimos 12 meses">
            <MonthlyHistory
              data={monthlyHistory}
              currencySymbol={currencySymbol}
              accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
              isBeauty={isBeauty}
            />
          </Card>
        )
      }

      {
        activeTab === 'commissions' && (
          <CommissionsManagement
            accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
            currencySymbol={currencySymbol}
            onPaymentSuccess={fetchFinanceData}
          />
        )
      }

      {activeTab === 'insights' && !isStaff && (
        <FinanceInsights
          summary={summary}
          monthlyHistory={monthlyHistory}
          transactions={transactions}
          currencyRegion={currencyRegion}
        />
      )}

      {/* New Transaction Modal */}
      {
        showNewTransactionModal && (
          <Modal
            open={showNewTransactionModal}
            onClose={() => setShowNewTransactionModal(false)}
            title="Nova transação"
            size="lg"
            footer={
              <div className="flex gap-3 w-full">
                <Button variant="secondary" className="flex-1" onClick={() => setShowNewTransactionModal(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreateTransaction}
                  disabled={savingTransaction}
                  loading={savingTransaction}
                >
                  {savingTransaction ? 'Salvando...' : 'Registrar'}
                </Button>
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
                      : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                        : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                          : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                      : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                        : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                        : `bg-black border border-neutral-700 focus:border-accent-gold`}
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
                      : `bg-black border border-neutral-700 focus:border-accent-gold`}
                `}
                >
                  <option value="">Selecione um serviço</option>
                  {dropdownServices.map(s => (
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
                      : `bg-black border border-neutral-700 focus:border-accent-gold`}
                `}
                >
                  <option value="">Selecione um cliente</option>
                  {dropdownClients.map(c => (
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
                      : `bg-black border border-neutral-700 focus:border-accent-gold`}
                `}
                >
                  <option value="">Selecione um profissional</option>
                  {dropdownProfessionals.map(p => (
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
            open={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            title="Filtrar transações"
            size="md"
            footer={
              <div className="flex gap-3 w-full">
                <Button variant="secondary" className="flex-1" onClick={handleClearFilter}>
                  Limpar
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleApplyFilter}>
                  Aplicar
                </Button>
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
                          ? `${accent.bg} text-[var(--color-bg)]`
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
                  {['all', 'Dinheiro', ...(region === 'PT' ? ['MBWay'] : ['Pix']), 'Cartão'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setFilterPaymentMethod(method)}
                      className={`px-3 py-2 rounded-lg font-bold text-xs uppercase transition-all
                      ${filterPaymentMethod === method
                          ? `${accent.bg} text-[var(--color-bg)]`
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

      <ConfirmModal
        open={!!pendingDelete}
        title="Excluir transação"
        message={
          pendingDelete?.type === 'revenue'
            ? `Excluir "${pendingDelete.serviceName}"?\n\nEsta é uma receita gerada por agendamento. O agendamento vinculado também será removido. Esta ação é irreversível.`
            : `Tem certeza que deseja excluir "${pendingDelete?.serviceName}"? Esta ação é irreversível.`
        }
        confirmLabel="Excluir"
        variant="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteTransaction()}
      />

      <ConfirmModal
        open={!!pendingMarkPaid}
        title="Liquidar despesa"
        message={`Deseja marcar "${pendingMarkPaid?.name}" como paga?`}
        confirmLabel="Liquidar"
        onCancel={() => setPendingMarkPaid(null)}
        onConfirm={async () => {
          if (!pendingMarkPaid) return;
          try {
            await markExpensePaidMutation.mutateAsync({ recordId: pendingMarkPaid.id, companyId: queryUserId });
            fetchFinanceData();
          } catch (err) {
            logger.error('Erro ao liquidar despesa:', err);
            const ui = mapError(err, 'Não foi possível liquidar a despesa. Tente de novo.');
            showToast(formatUserFacingError(ui), 'error');
          } finally {
            setPendingMarkPaid(null);
          }
        }}
      />
    </div >
  );
};
