import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarX } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton, Badge } from '../components/ui';
import { CommissionDetailReport } from '../components/CommissionDetailReport';
import { CommissionPaymentHistory } from '../components/CommissionPaymentHistory';
import { DataQualityNotice } from '../components/performance/DataQualityNotice';
import { MemberDetail } from '../components/performance/MemberDetail';
import { PerformanceFilters, type RosterEntry } from '../components/performance/PerformanceFilters';
import { PerformanceSection } from '../components/performance/PerformanceSection';
import { TeamOverview } from '../components/performance/TeamOverview';
import { TeamRanking } from '../components/performance/TeamRanking';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { useStaffPerformance } from '../hooks/useStaffPerformance';
import { supabase } from '../lib/supabase';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { getCurrencySymbol } from '../utils/formatters';
import {
    comparingHeadline,
    detectPreset,
    emptyPeriodSuggestion,
    filtersToSearch,
    parseFilters,
    periodLabel,
    presetRange,
    previousMonthName,
    timezoneLabel,
    type PerformanceFilters as Filters,
    type SortDir,
    type SortKey,
} from '../utils/staffPerformanceView';
import { formatCycleLabel } from '../utils/commissionCycle';

const BASE = '/financeiro/performance';
const PAGE_PB = 'pb-[calc(8rem+var(--safe-bottom))] md:pb-16';

export const StaffPerformance: React.FC = () => {
    const { user } = useAuth();
    const { remainder } = useBusinessCopy();
    const { formatMoney, region: localeRegion } = useTenantLocale();
    const { colors, isBeauty } = useBrutalTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const today = useMemo(() => new Date(), []);
    const filters = useMemo(() => parseFilters(location.search, today), [location.search, today]);
    const [compare, setCompare] = useState(true);
    const [settlementDay, setSettlementDay] = useState(5);
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'rank', dir: 'asc' });
    const [modal, setModal] = useState<null | 'history' | 'report'>(null);
    const [reportInfo, setReportInfo] = useState<{ rate: number; cpf: string | null }>({ rate: 0, cpf: null });

    const { status, data, retry } = useStaffPerformance({ start: filters.start, end: filters.end, professionalId: filters.pro, compare });

    useEffect(() => {
        if (!user?.id) return;
        let alive = true;
        (async () => {
            try {
                const { data: row } = await supabase
                    .from('business_settings')
                    .select('commission_settlement_day_of_month')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (alive && row?.commission_settlement_day_of_month) setSettlementDay(row.commission_settlement_day_of_month);
            } catch {
                // sem a configuração, o ciclo usa o dia 5 (R4.1.5)
            }
        })();
        return () => { alive = false; };
    }, [user?.id]);

    useEffect(() => {
        if (!data) return;
        if (!filters.pro) {
            setRoster(data.members.map((m) => ({ id: m.professional_id, name: m.name })));
        } else {
            setRoster((prev) => (prev.length ? prev : data.members.map((m) => ({ id: m.professional_id, name: m.name }))));
        }
    }, [data, filters.pro]);

    useEffect(() => {
        const scroller = [...document.querySelectorAll('div')].find((node) => {
            const c = typeof node.className === 'string' ? node.className : '';
            return c.includes('overflow-y-auto') && c.includes('h-[100dvh]');
        }) as HTMLElement | undefined;
        (scroller ?? document.scrollingElement)?.scrollTo(0, 0);
    }, [filters.pro, filters.start, filters.end]);

    const go = (next: Filters) => navigate({ pathname: BASE, search: `?${filtersToSearch(next)}` });
    const hrefFor = (pro: string) => `${BASE}?${filtersToSearch({ ...filters, pro })}`;

    const region = localeRegion;
    const previousName = compare ? previousMonthName(data?.period.previous) : null;
    const preset = detectPreset(filters.start, filters.end, today, settlementDay);
    const member = filters.pro ? data?.members.find((m) => m.professional_id === filters.pro) ?? null : null;
    const emptyHint = emptyPeriodSuggestion(preset);

    const quality = useMemo(() => {
        const sum = { sem_registro_financeiro: 0, duplicadas: 0, sem_desfecho: 0 };
        for (const m of data?.members ?? []) {
            sum.sem_registro_financeiro += m.quality.sem_registro_financeiro;
            sum.duplicadas += m.quality.duplicadas;
            sum.sem_desfecho += m.quality.sem_desfecho;
        }
        if (data?.unassigned && !filters.pro) {
            sum.sem_registro_financeiro += data.unassigned.sem_registro_financeiro;
            sum.duplicadas += data.unassigned.duplicadas;
            sum.sem_desfecho += data.unassigned.sem_desfecho;
        }
        return sum;
    }, [data, filters.pro]);

    const isEmpty = !!data && (filters.pro
        ? !member || (member.metrics.atendimentos === 0 && member.metrics.vendas_produtos === 0 && member.metrics.avulsos === 0)
        : (data.team_totals?.atendimentos ?? 0) === 0 && (data.team_totals?.vendas_produtos ?? 0) === 0 && (data.team_totals?.avulsos ?? 0) === 0);
    const comparing = !isEmpty && compare && data?.period.previous
        ? comparingHeadline(filters.start, filters.end, data.period.previous)
        : null;

    const openReport = async () => {
        if (!member || !user?.id) return;
        try {
            const { data: tm } = await supabase
                .from('team_members')
                .select('commission_rate, commission_percent, cpf')
                .eq('id', member.professional_id)
                .eq('user_id', user.id)
                .maybeSingle();
            setReportInfo({ rate: Number(tm?.commission_rate ?? tm?.commission_percent ?? 0) || 0, cpf: tm?.cpf ?? null });
        } catch {
            setReportInfo({ rate: 0, cpf: null });
        }
        setModal('report');
    };

    const subtitle = (
        <span className="inline-flex flex-col gap-1">
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="first-letter:uppercase">{periodLabel(filters.start, filters.end)}</span>
                {data?.period.partial && <Badge variant="warning">Mês em andamento</Badge>}
            </span>
            {comparing && <span>{comparing}</span>}
        </span>
    );

    return (
        <div className={`flex flex-col gap-8 ${PAGE_PB}`}>
            <Link to="/financeiro?tab=commissions" className={`inline-flex items-center gap-1.5 min-h-[44px] -mb-4 text-sm ${colors.textSecondary} hover:text-theme-text`}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Pagamento de comissão
            </Link>
            <PageHeader title="Performance da equipe" subtitle={subtitle} className="pb-0" />

            <PerformanceFilters
                preset={preset}
                start={filters.start}
                end={filters.end}
                pro={filters.pro}
                compare={compare}
                roster={roster}
                tzLabel={data ? timezoneLabel(data.period.tz) : null}
                onPreset={(p) => go({ ...presetRange(p, today, settlementDay), pro: filters.pro })}
                onCustom={(start, end) => start <= end && go({ start, end, pro: filters.pro })}
                onPro={(pro) => go({ ...filters, pro })}
                onCompare={setCompare}
            />

            {status === 'loading' && (
                <div data-testid="performance-loading" aria-busy="true" aria-label="Carregando a performance" className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-[136px] col-span-2" />
                    <Skeleton className="h-[136px]" />
                    <Skeleton className="h-[136px]" />
                    <Skeleton className="h-[136px] col-span-2" />
                    <Skeleton className="h-72 col-span-2" />
                </div>
            )}

            {status === 'error' && (
                <ErrorState
                    title="Não foi possível carregar a performance."
                    message="Confira a conexão e tente de novo."
                    retryLabel="Tentar de novo"
                    onRetry={retry}
                />
            )}

            {status === 'unavailable' && (
                <EmptyState
                    icon={BarChart3}
                    bordered
                    title="A análise de performance ainda não foi ativada."
                    description="Os números aparecem aqui assim que a atualização do banco for publicada. Os repasses continuam em Pagamento de comissão."
                />
            )}

            {status === 'ready' && data && isEmpty && (
                <>
                    {filters.pro && (
                        <button type="button" onClick={() => go({ ...filters, pro: null })} className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm ${colors.textSecondary} hover:text-theme-text`}>
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Toda a equipe
                        </button>
                    )}
                    <EmptyState
                        icon={CalendarX}
                        bordered
                        title="Nenhum atendimento concluído neste período."
                        description={emptyHint ? `Tente “${emptyHint.label}”.` : undefined}
                        action={emptyHint ? (
                            <Button variant="secondary" onClick={() => go({ ...presetRange(emptyHint.id, today, settlementDay), pro: filters.pro })}>
                                {`Ver “${emptyHint.label}”`}
                            </Button>
                        ) : undefined}
                    />
                </>
            )}

            {status === 'ready' && data && !isEmpty && member && (
                <MemberDetail
                    member={member}
                    data={data}
                    previousName={previousName}
                    formatMoney={formatMoney}
                    companyId={user?.id ?? ''}
                    remainder={remainder}
                    onBack={() => go({ ...filters, pro: null })}
                    onOpenHistory={() => setModal('history')}
                    onOpenReport={openReport}
                />
            )}

            {status === 'ready' && data && !isEmpty && !filters.pro && (
                <>
                    <TeamOverview
                        totals={data.team_totals}
                        previous={compare ? data.team_previous : null}
                        previousName={previousName}
                        periodStart={data.period.start}
                        periodEnd={data.period.end}
                        formatMoney={formatMoney}
                        remainder={remainder}
                    />
                    <PerformanceSection
                        title="Por colaborador"
                        description="Compare cada pessoa principalmente com ela mesma. Turnos e tipos de serviço diferentes mudam os números."
                    >
                        {!data.ranking_available && (
                            <p className={`text-sm ${colors.textMuted}`}>Ranking aparece quando 2 ou mais colaboradores têm {data.min_sample} atendimentos no período.</p>
                        )}
                        <TeamRanking
                            members={data.members.map((m) => (compare ? m : { ...m, previous: null }))}
                            minSample={data.min_sample}
                            previousName={previousName}
                            formatMoney={formatMoney}
                            hrefFor={hrefFor}
                            sortKey={sort.key}
                            sortDir={sort.dir}
                            onSort={(key, dir) => setSort({ key, dir })}
                            remainder={remainder}
                        />
                    </PerformanceSection>
                    {data.unassigned && data.unassigned.atendimentos + data.unassigned.vendas_produtos + data.unassigned.avulsos > 0 && (
                        <section aria-label="Sem profissional" className="space-y-1">
                            <h2 className={`text-lg font-semibold ${colors.text}`}>Sem profissional</h2>
                            <p className={`text-sm ${colors.textSecondary}`}>
                                Atendimentos e vendas sem colaborador atribuído. Entram no total da equipe, sem posição no ranking.
                            </p>
                            <p className={`text-sm tabular-nums ${colors.textSecondary}`}>
                                <span className={`${colors.text} font-semibold`}>{data.unassigned.retorno == null ? '—' : formatMoney(data.unassigned.retorno)}</span>
                                {` · ${data.unassigned.atendimentos} ${data.unassigned.atendimentos === 1 ? 'atendimento' : 'atendimentos'}`}
                            </p>
                        </section>
                    )}
                </>
            )}

            {status === 'ready' && data && <DataQualityNotice counts={quality} />}

            <p className={`text-[13px] ${colors.textMuted}`}>
                Aluguel, luz e outras contas fixas não entram nestes números.
            </p>

            {modal === 'history' && member && (
                <CommissionPaymentHistory
                    professionalId={member.professional_id}
                    professionalName={member.name}
                    onClose={() => setModal(null)}
                    accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
                    currencySymbol={getCurrencySymbol(region)}
                />
            )}
            {modal === 'report' && member && (
                <CommissionDetailReport
                    professionalId={member.professional_id}
                    professionalName={member.name}
                    cpf={reportInfo.cpf}
                    commissionRate={reportInfo.rate}
                    periodStart={filters.start}
                    periodEnd={filters.end}
                    periodLabel={formatCycleLabel(filters.start, filters.end)}
                    currencySymbol={getCurrencySymbol(region)}
                    accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
};
