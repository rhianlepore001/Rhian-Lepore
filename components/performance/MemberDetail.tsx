import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { OwnerPerformance, PerformanceMember } from '../../types/staffPerformance';
import type { BusinessRemainderNoun } from '../../utils/businessCopy';
import { buildMetricAccount, MEMBER_METRIC_IDS, metricCellClass } from '../../utils/staffPerformanceAccount';
import { memberBadge, rankLabel, unrankedSentence } from '../../utils/staffPerformanceView';
import { MemberLedger } from './MemberLedger';
import { MetricCard } from './MetricCard';
import { MetricGrid, PerformanceSection } from './PerformanceSection';
import { TrendBars } from './TrendBars';

interface MemberDetailProps {
    member: PerformanceMember;
    data: OwnerPerformance;
    previousName: string | null;
    formatMoney: (v: number) => string;
    companyId: string;
    remainder: BusinessRemainderNoun;
    onBack: () => void;
    onOpenHistory: () => void;
    onOpenReport: () => void;
}

export const MemberDetail: React.FC<MemberDetailProps> = ({
    member: m, data, previousName, formatMoney, companyId, remainder, onBack, onOpenHistory, onOpenReport,
}) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const badge = memberBadge(m, data.min_sample);
    const trend = data.trend ?? [];
    const accounts = MEMBER_METRIC_IDS.map((id) =>
        buildMetricAccount(id, m.metrics, {
            formatMoney,
            remainder,
            personName: m.name,
            voice: 'member',
            previous: m.previous,
            previousName,
            periodStart: data.period.start,
            periodEnd: data.period.end,
            isOwner: m.is_owner,
        }),
    );

    return (
        <div className="flex flex-col gap-8">
            <div>
                <button type="button" onClick={onBack} className={`inline-flex items-center gap-1.5 min-h-[44px] -mt-1 text-sm ${accent.text} hover:underline underline-offset-4`}>
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Toda a equipe
                </button>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
                    <h2 className={`${font.heading} text-lg lg:text-xl lg:font-bold font-semibold tracking-tight ${colors.text} break-words`}>{m.name}</h2>
                    {m.rank != null && <span className={`${font.mono} text-sm tabular-nums ${colors.textSecondary}`}>{rankLabel(m.rank)} no ranking</span>}
                    {badge && <Badge variant="neutral">{badge}</Badge>}
                </div>
                {m.rank == null && (m.low_sample || m.metrics.atendimentos < data.min_sample) && (
                    <p className={`mt-1 text-sm leading-relaxed ${colors.textSecondary}`}>
                        {unrankedSentence(m, data.min_sample)}
                    </p>
                )}
                {m.is_owner && (
                    <p className={`mt-1 text-sm leading-relaxed ${colors.textSecondary}`}>
                        Como dono, a comissão conta como zero.
                    </p>
                )}
                <section data-testid="detail-headline" aria-label="Números principais" className="mt-2 lg:mt-3">
                    <MetricGrid>
                        {accounts.map((account) => (
                            <div key={account.id} className={metricCellClass(account.span)}>
                                <MetricCard account={account} />
                            </div>
                        ))}
                    </MetricGrid>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <PerformanceSection title="Últimos 6 meses" className="lg:col-span-2">
                    {trend.length === 0 ? (
                        <p className={`text-sm ${colors.textMuted}`}>Sem histórico para mostrar.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <TrendBars
                                title={remainder.remainderLabel}
                                points={trend.map((t) => ({ month: t.month, value: t.retorno, low_sample: t.low_sample, atendimentos: t.atendimentos }))}
                                formatValue={formatMoney}
                                testId="trend-month"
                            />
                            <TrendBars
                                title="Cada cliente gastou, em média"
                                points={trend.map((t) => ({ month: t.month, value: t.ticket_medio, low_sample: t.low_sample, atendimentos: t.atendimentos }))}
                                formatValue={formatMoney}
                            />
                        </div>
                    )}
                </PerformanceSection>
                <PerformanceSection title="Serviços mais feitos">
                    {data.top_services.length === 0 ? (
                        <p className={`text-sm ${colors.textMuted}`}>Nenhum serviço concluído no período.</p>
                    ) : (
                        <ol className="space-y-2">
                            {data.top_services.slice(0, 5).map((s, i) => (
                                <li key={s.service} className="flex items-baseline gap-3 text-sm">
                                    <span className={`${font.mono} tabular-nums w-5 ${colors.textMuted}`}>{i + 1}</span>
                                    <span className={`flex-1 min-w-0 break-words first-letter:uppercase ${colors.text}`}>{s.service}</span>
                                    <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{s.count}×</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </PerformanceSection>
            </div>

            <MemberLedger
                companyId={companyId}
                professionalId={m.professional_id}
                start={data.period.start}
                end={data.period.end}
                tz={data.period.tz}
                formatMoney={formatMoney}
            />

            {!m.is_owner && (
                <section aria-label="Pagamentos" className={`flex flex-col sm:flex-row sm:items-center gap-3 border ${colors.border} ${radius.card} px-4 py-4 lg:px-5`}>
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold ${colors.text}`}>Pagamentos</h3>
                        <p className={`text-[13px] ${colors.textMuted}`}>Repasses já feitos e o relatório de comissões deste período.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="secondary" size="sm" className="min-h-[44px]" onClick={onOpenHistory}>Histórico de pagamentos</Button>
                        <Button variant="secondary" size="sm" className="min-h-[44px]" onClick={onOpenReport}>Relatório de comissões</Button>
                    </div>
                </section>
            )}
        </div>
    );
};
