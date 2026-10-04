import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { prefetchStaffPerformanceFromLocation } from '../hooks/useStaffPerformance';
import { FinanceKpi } from '../components/finance/FinanceKpi';
import { TeamPerformanceCard } from '../components/finance/TeamPerformanceCard';
import { Card } from '../components/ui/Card';
import { Button, Modal, Table, Badge, ConfirmModal, useToast, ErrorState, SkeletonCard } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Wallet, TrendingUp, TrendingDown, Calendar, Download, Filter, Users, History, Trash2, Plus, Check, Smartphone, Banknote, CreditCard, User, Clock, Scissors, BarChart3, Bot } from 'lucide-react';
import { FinanceCashflowChart } from '../components/finance/FinanceCashflowChart';
import { CommissionsManagement } from '../components/CommissionsManagement';
import { MonthStepper } from '../components/finance/MonthStepper';
import { FinanceMoreMenu } from '../components/finance/FinanceMoreMenu';
import { MonthlyHistory } from '../components/MonthlyHistory';
import { TabNav } from '../components/TabNav';
import { formatCurrency } from '../utils/formatters';
import { combineDateAndTime, getTodayDateString } from '../utils/date';
import { ASSISTANT_ENABLED } from '../utils/featureFlags';
import { logger } from '../utils/Logger';
import { mapError, formatUserFacingError } from '../utils/mapError';
import { filterStaffTransactions, mapFinanceTransaction } from '../services/finance';
import {
  financeDeleteConfirmMessage,
  mapFinanceDeleteError,
  shouldShowFinanceDelete,
  type FinanceDeleteKind,
} from '../utils/financeDelete';
import {
  useMonthlyHistory,
  useFinanceDropdowns,
  useDeleteFinanceTransaction,
  useMarkExpenseAsPaid,
  useCreateFinanceRecord,
  useFinanceOverview,
} from '../hooks/useFinance';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { useBusinessSettings } from '../hooks/useSettings';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import {
  MONTH_NAMES,
  bucketDaysByWeeks,
  bucketMonthByDays,
  calcSobrou,
  formatMonthGrowth,
  getZonedMonthRange,
  isInstantInRange,
  previousMonthIndex,
} from '../utils/financeCashflow';

// Assistente desligado (PR-G): com a constante em false o import some do bundle.
const AIAssistantPanel = ASSISTANT_ENABLED
  ? lazy(() => import('../components/AIAssistantButton').then((m) => ({ default: m.AIAssistantButton })))
  : null;

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
  description?: string | null;
  deleteKind?: FinanceDeleteKind;
}

function transactionAmount(t: Transaction): number {
  return t.type === 'expense' ? (t.expense || 0) : (t.amount || 0);
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

export const Finance: React.FC = () => {
  const { user, region, role, companyId, teamMemberId } = useAuth();
const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  // Staff não vê aba de comissões nem histórico
  const isStaff = role === 'staff';
  const canDeleteTransactions = shouldShowFinanceDelete(role);
  // A aba vive na URL (?tab=) para o botão voltar funcionar (PR-E).
  const tabParam = searchParams.get('tab');
  const activeTab: FinanceTabType = !isStaff && (tabParam === 'commissions' || tabParam === 'history') ? tabParam : 'overview';
  const setActiveTab = useCallback((next: FinanceTabType) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'overview') params.delete('tab');
      else params.set('tab', next);
      return params;
    });
  }, [setSearchParams]);

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
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);

  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { accent, colors, isBeauty, classes, status, font } = useBrutalTheme();
  const { showToast } = useToast();
  const { region: currencyRegion, currencySymbol } = useTenantLocale();
  const { data: businessSettings } = useBusinessSettings();
  const timeZone = resolveBusinessTimezone({ timezone: businessSettings?.timezone, region });

  const queryUserId = isStaff && companyId ? companyId : (user?.id || '');
  const monthRange = useMemo(
    () => getZonedMonthRange(selectedYear, selectedMonth, timeZone),
    [selectedYear, selectedMonth, timeZone],
  );
  const prevMonth = previousMonthIndex(selectedYear, selectedMonth);
  const prevRange = useMemo(
    () => getZonedMonthRange(prevMonth.year, prevMonth.monthIndex, timeZone),
    [prevMonth.year, prevMonth.monthIndex, timeZone],
  );

  const {
    data: overview,
    isPending: overviewPending,
    isFetching: overviewFetching,
    isError: overviewError,
    error: overviewErr,
    refetch: refetchOverview,
  } = useFinanceOverview({
    companyId: queryUserId,
    startIso: monthRange.startIso,
    endIso: monthRange.endIso,
    prevStartIso: prevRange.startIso,
    prevEndIso: prevRange.endIso,
    professionalId: isStaff ? teamMemberId : null,
    enabled: !!user && activeTab === 'overview',
  });

  const { data: monthlyHistoryData, refetch: refetchMonthlyHistory } = useMonthlyHistory(
    queryUserId,
    12,
    activeTab === 'history' && !isStaff,
  );
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

  const months = MONTH_NAMES;

  const warmPerformance = useCallback(() => {
    prefetchStaffPerformanceFromLocation();
    void import('./StaffPerformance');
  }, []);


  useEffect(() => {
    const isNewQuery = searchParams.get('new') === 'true';
    if (isNewQuery && user) {
      handleOpenNewTransaction();
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, user]);

  const derived = useMemo(() => {
    const emptyDays = bucketMonthByDays([], selectedYear, selectedMonth, timeZone);
    const emptyWeeks = bucketDaysByWeeks(emptyDays, selectedYear, selectedMonth);
    const emptySummary = {
      revenue: 0,
      expenses: 0,
      commissionsPending: 0,
      profit: 0,
      growthLabel: '0,0%',
      previousMonthRevenue: 0,
      revenueByMethod: { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
      pendingExpenses: 0,
      queueServed: 0,
    };
    if (!overview?.current) {
      return {
        transactions: [] as Transaction[],
        days: emptyDays,
        weeks: emptyWeeks,
        totals: { receita: 0, despesas: 0, sobrou: 0 },
        summary: emptySummary,
      };
    }

    const formatted = (overview.current.transactions || []).map(mapFinanceTransaction);
    const scoped = isStaff
      ? filterStaffTransactions(formatted, teamMemberId)
      : formatted;
    const inMonth = scoped.filter((t) => isInstantInRange(t.rawDate, monthRange.startIso, monthRange.endIso));
    const cashTxns = inMonth.map((t) => ({
      instant: t.rawDate,
      type: t.type,
      amount: t.type === 'expense' ? (t.expense || 0) : (t.amount || 0),
    }));
    const days = bucketMonthByDays(cashTxns, selectedYear, selectedMonth, timeZone);
    const weeks = bucketDaysByWeeks(days, selectedYear, selectedMonth);
    const receita = days.reduce((s, d) => s + d.receita, 0);
    const despesas = isStaff ? 0 : days.reduce((s, d) => s + d.despesas, 0);
    const sobrou = calcSobrou(receita, despesas);

    const prevFormatted = (overview.previous?.transactions || []).map(mapFinanceTransaction);
    const prevScoped = isStaff
      ? filterStaffTransactions(prevFormatted, teamMemberId)
      : prevFormatted;
    const prevInRange = prevScoped.filter((t) => isInstantInRange(t.rawDate, prevRange.startIso, prevRange.endIso));
    const previousMonthRevenue = prevInRange
      .filter((t) => t.type === 'revenue')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const growthLabel = isStaff
      ? '0,0%'
      : formatMonthGrowth({
        currentRevenue: receita,
        previousRevenue: previousMonthRevenue,
        previousRecords: prevInRange.length,
      });

    const filtered = inMonth.filter((t) => {
      const matchesType = filterType === 'all' || (filterType === 'revenue' ? t.type === 'revenue' : t.type === 'expense');
      const matchesPayment = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;
      return matchesType && matchesPayment;
    });

    return {
      transactions: filtered as Transaction[],
      days,
      weeks,
      totals: { receita, despesas, sobrou },
      summary: {
        revenue: receita,
        expenses: despesas,
        commissionsPending: isStaff ? 0 : (overview.current.commissions_pending || 0),
        profit: isStaff ? receita : sobrou,
        growthLabel,
        previousMonthRevenue,
        revenueByMethod: overview.current.revenue_by_method || { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
        pendingExpenses: isStaff ? 0 : (overview.current.pendingExpenses || 0),
        queueServed: overview.queueServed || 0,
      },
    };
  }, [
    overview,
    isStaff,
    teamMemberId,
    monthRange.startIso,
    monthRange.endIso,
    prevRange.startIso,
    prevRange.endIso,
    selectedYear,
    selectedMonth,
    timeZone,
    filterType,
    filterPaymentMethod,
  ]);

  const transactions = derived.transactions;
  const summary = derived.summary;
  const loading = overviewPending && !overview;
  const fetchError = overviewError
    ? formatUserFacingError(mapError(overviewErr, 'Não foi possível carregar o financeiro.'))
    : null;

  const fetchFinanceData = () => {
    void refetchOverview();
  };

  const handleDeleteTransaction = (t: Transaction) => {
    setPendingDelete(t);
  };

  const confirmDeleteTransaction = async () => {
    if (!pendingDelete || !canDeleteTransactions) return;
    const t = pendingDelete;
    try {
      await deleteTransactionMutation.mutateAsync({ transactionId: t.id, companyId: queryUserId });
      showToast('Transação excluída com sucesso!', 'success');
      await fetchFinanceData();
      void refetchMonthlyHistory();
    } catch (error: unknown) {
      logger.error('Erro ao excluir transação', error);
      showToast(mapFinanceDeleteError(error), 'error');
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
    setShowFilterModal(false);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
    setFilterPaymentMethod('all');
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

      // Data/hora do formulário são locais: montar via UTC deslocaria o dia
      // em fusos negativos (Brasil).
      const transactionDateTime = combineDateAndTime(
        newTransactionDate || getTodayDateString(),
        newTransactionTime || '00:00',
      );

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
        clientName,
        serviceName,
        appointmentId: null,
        dueDate: newTransactionStatus === 'pending'
          ? (newTransactionDueDate ? new Date(newTransactionDueDate).toISOString() : transactionDateTime.toISOString())
          : null,
        commissionPaid: newTransactionType === 'expense' ? isPaid : true,
        status: newTransactionStatus,
        createdAt: transactionDateTime.toISOString(),
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
    ...(canDeleteTransactions
      ? [{
          key: 'actions',
          header: 'Ações',
          align: 'right' as const,
          render: (t: Transaction) => (
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
                  Dar baixa
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                data-testid="finance-delete"
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
        } satisfies TableColumn<Transaction>]
      : []),
  ], [accent.text, canDeleteTransactions, colors, currencyRegion, status.danger, status.success]);

  // "⋯" do celular: só Filtrar/Exportar na Visão geral; sem itens, sem botão.
  const moreItems = [
    ...(activeTab === 'overview'
      ? [
        { id: 'filter', label: 'Filtrar', icon: <Filter className="h-4 w-4" />, onSelect: () => setShowFilterModal(true) },
        { id: 'export', label: 'Exportar', icon: <Download className="h-4 w-4" />, onSelect: handleExport },
      ]
      : []),
    ...(ASSISTANT_ENABLED
      ? [{ id: 'assistant', label: 'Assistente', icon: <Bot className="h-4 w-4" />, onSelect: () => setAssistantOpen(true) }]
      : []),
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Topo (PR-F #9). Celular: título + mês (‹ ›) + "⋯" numa linha; Filtrar/Exportar no "⋯" (assistente desligado, PR-G)
          e "Registrar receita" no "+". Computador: mês ao lado do título, ações visíveis. */}
      <header className="flex flex-col gap-3 pb-1 md:flex-row md:items-start md:justify-between md:gap-6 md:pb-2">
        <div className="min-w-0 flex-1">
          <div
            className={isStaff
              ? 'flex flex-wrap items-center gap-x-3 gap-y-2 min-[440px]:flex-nowrap'
              : 'flex flex-wrap items-center gap-x-3 gap-y-2 min-[360px]:flex-nowrap'}
          >
            <h1
              className={`${font.heading} text-2xl md:text-3xl font-bold tracking-tight leading-tight whitespace-nowrap ${colors.text} mr-auto ${activeTab !== 'overview' ? '' : isStaff ? 'min-[440px]:mr-0' : 'min-[360px]:mr-0'} md:mr-0`}
            >
              {isStaff ? 'Meu financeiro' : 'Financeiro'}
            </h1>
            {activeTab === 'overview' && (
              <MonthStepper
                month={selectedMonth}
                year={selectedYear}
                onChange={handleMonthChange}
                className={isStaff
                  ? 'order-last min-[440px]:order-none min-[440px]:ml-auto md:ml-0'
                  : 'order-last min-[360px]:order-none min-[360px]:ml-auto md:ml-0'}
              />
            )}
            {moreItems.length > 0 && (
              <FinanceMoreMenu label="Mais ações do financeiro" className="md:hidden" items={moreItems} />
            )}
          </div>
          <div className="mt-3 hidden md:flex flex-wrap items-center gap-2">
            {activeTab === 'overview' && (
              <>
                <Button variant="outline" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setShowFilterModal(true)}>
                  Filtrar
                </Button>
                <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
                  Exportar
                </Button>
              </>
            )}
            {ASSISTANT_ENABLED && (
              <Button
                variant="outline"
                size="sm"
                icon={<Bot className="h-4 w-4" />}
                aria-label="Abrir assistente IA"
                onClick={() => setAssistantOpen(true)}
              >
                Assistente
              </Button>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {!isStaff && (
            <Button
              variant="outline"
              size="sm"
              data-testid="finance-performance-button"
              icon={<BarChart3 className="h-4 w-4" />}
              onClick={() => navigate('/financeiro/performance')}
              onMouseEnter={warmPerformance}
              onPointerDown={warmPerformance}
            >
              Performance da equipe
            </Button>
          )}
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleOpenNewTransaction}>
            Registrar receita
          </Button>
        </div>
      </header>
      {/* Painel do assistente: só montado com ASSISTANT_ENABLED (hoje desligado). */}
      {AIAssistantPanel && assistantOpen && (
        <Suspense fallback={null}>
          <AIAssistantPanel
            hideTrigger
            context="suas finanças, entradas e saídas de dinheiro e relatórios"
            open={assistantOpen}
            onOpenChange={setAssistantOpen}
          />
        </Suspense>
      )}

      {/* Abas: controle segmentado de uma linha. Staff só tem a Visão geral (sem controle). */}
      {!isStaff && (
        <TabNav
          ariaLabel="Seções do financeiro"
          panelId="finance-panel"
          tabs={[
            { id: 'overview', label: 'Visão geral', icon: <Calendar className="w-4 h-4" /> },
            { id: 'commissions', label: 'Pagamentos', icon: <Users className="w-4 h-4" /> },
            { id: 'history', label: 'Histórico', icon: <History className="w-4 h-4" /> },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as FinanceTabType)}
        />
      )}

      <div
        id="finance-panel"
        role={isStaff ? undefined : 'tabpanel'}
        aria-labelledby={isStaff ? undefined : `tab-${activeTab}`}
        className="space-y-4 md:space-y-6"
      >

      {activeTab === 'overview' && (
        <>
          {loading ? (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SkeletonCard className="min-h-[72px]" />
                <SkeletonCard className="min-h-[72px]" />
                <SkeletonCard className="min-h-[72px]" />
              </section>
              {!isStaff && (
                <section className="grid grid-cols-3 gap-2">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </section>
              )}
              <SkeletonCard className="min-h-[340px]" />
              <SkeletonCard className="min-h-[160px]" />
            </>
          ) : fetchError ? (
            <ErrorState
              title="Não foi possível carregar o financeiro"
              message={fetchError}
              onRetry={() => { void fetchFinanceData(); }}
            />
          ) : (
          <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceKpi
              icon={<TrendingUp className="h-4 w-4" />}
              title={isStaff ? 'Meu giro' : 'Receita'}
              value={formatCurrency(summary.revenue || 0, currencyRegion)}
              subtitle={
                isStaff
                  ? `${revenueCount} atendimentos em ${periodLabel}`
                  : summary.growthLabel === 'Mês anterior com pouco movimento'
                    ? summary.growthLabel
                    : `${summary.growthLabel} vs mês anterior`
              }
            />
            {!isStaff && (
              <>
                <FinanceKpi
                  icon={<TrendingDown className="h-4 w-4" />}
                  title="Despesas"
                  value={formatCurrency(summary.expenses || 0, currencyRegion)}
                  subtitle="Comissões e custos liquidados"
                    />
                <FinanceKpi
                  icon={<Wallet className="h-4 w-4" />}
                  title="Lucro"
                  value={formatCurrency(summary.profit || 0, currencyRegion)}
                  subtitle={
                    summary.revenue > 0
                      ? `${Math.round(((summary.profit || 0) / summary.revenue) * 100)}% margem`
                      : 'Sem receita no período'
                  }
                    />
              </>
            )}
            {isStaff && (
              <FinanceKpi
                icon={<Calendar className="h-4 w-4" />}
                title="Atendimentos"
                value={String(revenueCount)}
                subtitle={`Ticket médio ${formatCurrency(avgTicket, currencyRegion)}`}
                />
            )}
            <FinanceKpi
              icon={<Users className="h-4 w-4" />}
              title="Fila digital"
              value={String(summary.queueServed)}
              subtitle={
                summary.queueServed === 1
                  ? `1 cliente atendido em ${periodLabel}`
                  : `Clientes atendidos na fila em ${periodLabel}`
              }
            />
          </section>

          {!isStaff && <TeamPerformanceCard monthName={months[selectedMonth]} className="md:hidden" />}

          {!isStaff && (
            <section className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: <Smartphone className="h-3.5 w-3.5" />,
                  label: region === 'PT' ? 'MBWay' : 'Pix',
                  value: region === 'PT' ? (summary.revenueByMethod.mbway || 0) : (summary.revenueByMethod.pix || 0),
                },
                { icon: <Banknote className="h-3.5 w-3.5" />, label: 'Dinheiro', value: summary.revenueByMethod.dinheiro || 0 },
                { icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Cartão', value: summary.revenueByMethod.cartao || 0 },
              ].map((m) => (
                <Card key={m.label} variant="outlined" noPadding>
                  <div className="px-2.5 py-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`${accent.text} shrink-0`}>{m.icon}</span>
                      <p className={`text-xs font-semibold ${colors.textMuted} truncate`}>{m.label}</p>
                    </div>
                    <p className={`mt-1 font-mono text-sm font-bold tabular-nums ${colors.text}`}>
                      {formatCurrency(m.value, currencyRegion)}
                    </p>
                  </div>
                </Card>
              ))}
            </section>
          )}

          <Card
            id="finance-cashflow"
            className="scroll-mt-16 md:scroll-mt-24"
            title={
              <div>
                <h3 className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
                  Entradas e saídas
                </h3>
                <p className={`mt-0.5 text-xs ${colors.textMuted}`}>{periodLabel}</p>
              </div>
            }
            style={{ overflow: 'visible' }}
          >
            <div className="w-full" aria-busy={overviewFetching}>
              <FinanceCashflowChart
                days={derived.days}
                weeks={derived.weeks}
                totals={derived.totals}
                currencyRegion={currencyRegion}
                periodLabel={periodLabel}
                monthIndex={selectedMonth}
              />
            </div>
          </Card>

          <Card title="Transações recentes" noPadding>
            <div className="p-3 md:p-4">
              <Table<Transaction>
                columns={transactionColumns}
                data={transactions}
                rowKey={(t) => t.id}
                stickyHeader
                compact
                onRowClick={(t) => setDetailTransaction(t)}
                selectedRowKey={detailTransaction?.id ?? null}
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
                  <button
                    type="button"
                    data-testid="finance-tx-card"
                    aria-label={`${t.type === 'expense' ? 'Saída' : 'Entrada'} ${t.serviceName}`}
                    onClick={() => setDetailTransaction(t)}
                    className={`flex w-full overflow-hidden rounded-lg border text-left min-h-[44px] ${colors.border} ${colors.card}`}
                  >
                    <span
                      className={`w-0.5 shrink-0 ${t.type === 'expense' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 px-2.5 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${colors.text}`}>{t.serviceName}</p>
                        <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${t.type === 'expense' ? status.danger : status.success}`}>
                          {t.type === 'expense' ? '−' : '+'}
                          {formatCurrency(transactionAmount(t), currencyRegion, false)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs ${colors.textMuted} truncate`}>
                        <span className={t.type === 'expense' ? status.danger : status.success}>
                          {t.type === 'expense' ? 'Saída' : 'Entrada'}
                        </span>
                        {t.status === 'pending' ? ' · Pendente' : ''}
                        {' · '}
                        {t.date} · {t.time}
                        {t.professionalName ? ` · ${t.professionalName}` : ''}
                        {t.clientName ? ` · ${t.clientName}` : ''}
                      </p>
                    </div>
                  </button>
                )}
              />
            </div>
          </Card>
          </>
          )}
        </>
      )
      }

      {
        activeTab === 'history' && (
          <MonthlyHistory data={monthlyHistory} currencyRegion={currencyRegion} />
        )
      }

      {
        activeTab === 'commissions' && (
          <>
          <TeamPerformanceCard monthName={months[selectedMonth]} />
          <CommissionsManagement
            accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
            currencySymbol={currencySymbol}
            onPaymentSuccess={fetchFinanceData}
          />
          </>
        )
      }

      </div>

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
                <label className={`${classes.label} uppercase mb-2 block`}>Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTransactionType('income')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors border-2 ${newTransactionType === 'income'
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)]'
                      : 'bg-theme-surface border-theme-border text-theme-textSecondary hover:border-theme-border'
                      }`}
                  >
                    + Receita
                  </button>
                  <button
                    onClick={() => setNewTransactionType('expense')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors border-2 ${newTransactionType === 'expense'
                      ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
                      : 'bg-theme-surface border-theme-border text-theme-textSecondary hover:border-theme-border'
                      }`}
                  >
                    - Despesa
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Descrição *</label>
                <input
                  type="text"
                  value={newTransactionDescription}
                  onChange={(e) => setNewTransactionDescription(e.target.value)}
                      className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                  placeholder="Ex: Venda de produto, Pagamento de aluguel..."
                  required
                />
              </div>

              {/* Status and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${classes.label} uppercase mb-2 block`}>Status</label>
                  <select
                    value={newTransactionStatus}
                    onChange={(e) => setNewTransactionStatus(e.target.value as 'paid' | 'pending')}
                    className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                  >
                    <option value="paid">Pago / Recebido</option>
                    <option value="pending">Pendente / Agendado</option>
                  </select>
                </div>
                {newTransactionStatus === 'pending' && (
                  <div>
                    <label className={`${classes.label} uppercase mb-2 block`}>Vencimento</label>
                    <input
                      type="date"
                      value={newTransactionDueDate}
                      onChange={(e) => setNewTransactionDueDate(e.target.value)}
                    className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                    />
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Valor ({currencySymbol}) *</label>
                <input
                  type="number"
                  value={newTransactionAmount}
                  onChange={(e) => setNewTransactionAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className={`w-full p-3 rounded-lg text-[var(--color-text)] font-mono text-lg transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${classes.label} uppercase mb-2 block`}>Data</label>
                  <input
                    type="date"
                    value={newTransactionDate}
                    onChange={(e) => setNewTransactionDate(e.target.value)}
                    className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                  />
                </div>
                <div>
                  <label className={`${classes.label} uppercase mb-2 block`}>Horário (opcional)</label>
                  <input
                    type="time"
                    value={newTransactionTime}
                    onChange={(e) => setNewTransactionTime(e.target.value)}
                    className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                  />
                </div>
              </div>

              {/* Service */}
              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Serviço (opcional)</label>
                <select
                  value={newTransactionService}
                  onChange={(e) => setNewTransactionService(e.target.value)}
                  className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                >
                  <option value="">Selecione um serviço</option>
                  {dropdownServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Cliente (opcional)</label>
                <select
                  value={newTransactionClient}
                  onChange={(e) => setNewTransactionClient(e.target.value)}
                  className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                >
                  <option value="">Selecione um cliente</option>
                  {dropdownClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Professional */}
              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Profissional (opcional)</label>
                <select
                  value={newTransactionProfessional}
                  onChange={(e) => setNewTransactionProfessional(e.target.value)}
                  className={`w-full p-3 rounded-lg text-[var(--color-text)] transition-all outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
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
                <label className={`${classes.label} uppercase mb-2 block`}>Tipo de Transação</label>
                <div className="flex gap-2">
                  {(['all', 'revenue', 'expense'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all
                      ${filterType === type
                          ? `${accent.bg} text-[var(--color-bg)]`
                          : 'bg-theme-surface text-theme-textSecondary hover:bg-[var(--color-card-hover)]'}`}
                    >
                      {type === 'all' ? 'Tudo' : type === 'revenue' ? 'Entradas' : 'Saídas'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`${classes.label} uppercase mb-2 block`}>Forma de Pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'Dinheiro', ...(region === 'PT' ? ['MBWay'] : ['Pix']), 'Cartão'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setFilterPaymentMethod(method)}
                      className={`px-3 py-2 rounded-lg font-bold text-xs uppercase transition-all
                      ${filterPaymentMethod === method
                          ? `${accent.bg} text-[var(--color-bg)]`
                          : 'bg-theme-surface text-theme-textSecondary hover:bg-[var(--color-card-hover)]'}`}
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

      <Modal
        open={!!detailTransaction}
        onClose={() => setDetailTransaction(null)}
        title={detailTransaction?.type === 'expense' ? 'Detalhes da saída' : 'Detalhes da entrada'}
        size="md"
        footer={
          detailTransaction
          && (canDeleteTransactions || (detailTransaction.type === 'expense' && detailTransaction.status === 'pending'))
            ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {detailTransaction.type === 'expense' && detailTransaction.status === 'pending' && (
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => {
                    setPendingMarkPaid({ id: detailTransaction.id, name: detailTransaction.serviceName || 'Despesa' });
                    setDetailTransaction(null);
                  }}
                >
                  Dar baixa
                </Button>
              )}
              {canDeleteTransactions && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  data-testid="finance-delete"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    handleDeleteTransaction(detailTransaction);
                    setDetailTransaction(null);
                  }}
                >
                  Excluir
                </Button>
              )}
            </div>
              )
            : null
        }
      >
        {detailTransaction && (
          <div className="space-y-5">
            <div>
              <Badge variant={detailTransaction.type === 'expense' ? 'danger' : 'success'}>
                {detailTransaction.type === 'expense' ? 'Saída' : 'Entrada'}
              </Badge>
              {detailTransaction.status === 'pending' && (
                <span className="ml-2">
                  <Badge variant="warning">Pendente</Badge>
                </span>
              )}
              <p className={`mt-3 font-mono text-2xl font-black tabular-nums tracking-tight ${detailTransaction.type === 'expense' ? status.danger : status.success}`}>
                {detailTransaction.type === 'expense' ? '−' : '+'}
                {formatCurrency(transactionAmount(detailTransaction), currencyRegion)}
              </p>
            </div>

            <div className={`w-full h-px border-t ${colors.divider}`} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                  <Scissors className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">Descrição</span>
                </div>
                <p className={`${colors.text} font-medium text-sm break-words`}>{detailTransaction.serviceName}</p>
              </div>
              <div>
                <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                  <User className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">Profissional</span>
                </div>
                <p className={`${colors.text} font-medium text-sm`}>
                  {detailTransaction.professionalName || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">Cliente</span>
                </div>
                <p className={`${colors.text} font-medium text-sm`}>
                  {detailTransaction.clientName || '—'}
                </p>
              </div>
              <div>
                <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">Data e hora</span>
                </div>
                <p className={`${colors.text} font-medium text-sm`}>{detailTransaction.date}</p>
                <p className={`font-mono font-bold mt-0.5 ${accent.text}`}>{detailTransaction.time}</p>
              </div>
            </div>

            <div>
              <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-widest font-bold">Pagamento</span>
              </div>
              <p className={`${colors.text} font-medium text-sm`}>
                {PAYMENT_METHOD_LABELS[detailTransaction.payment_method || ''] || detailTransaction.payment_method || '—'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        title="Excluir transação"
        testId="finance-delete-confirm"
        message={
          pendingDelete
            ? financeDeleteConfirmMessage({
              deleteKind: pendingDelete.deleteKind
                ?? (pendingDelete.type === 'expense' ? 'expense' : 'manual'),
              clientName: pendingDelete.clientName,
              date: pendingDelete.date,
              serviceName: pendingDelete.serviceName,
            })
            : ''
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteTransactionMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteTransaction()}
      />

      <ConfirmModal
        open={!!pendingMarkPaid}
        title="Dar baixa na despesa"
        message={`Deseja marcar "${pendingMarkPaid?.name}" como paga?`}
        confirmLabel="Dar baixa"
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
