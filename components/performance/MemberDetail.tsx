import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Badge, Button } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { OwnerPerformance, PerformanceMember, PerformanceTrendPoint } from '../../types/staffPerformance';
import {
    formatHours,
    formatPercent,
    formatPercentPrecise,
    memberBadge,
    moneyDelta,
    monthShortLabel,
    plural,
    rankLabel,
    rateDelta,
    summarySentence,
    type Delta,
} from '../../utils/staffPerformanceView';
import { DeltaText } from './DeltaText';
import { MemberLedger } from './MemberLedger';
import { MetricInfo, type MetricId } from './MetricInfo';

interface MemberDetailProps {
    member: PerformanceMember;
    data: OwnerPerformance;
    against: string | null;
    previousName: string | null;
    formatMoney: (v: number) => string;
    companyId: string;
    onBack: () => void;
    onOpenHistory: () => void;
    onOpenReport: () => void;
}

const Headline: React.FC<{ label: string; info: MetricId; value: string; sub?: React.ReactNode; delta: Delta | null; against: string | null; children?: React.ReactNode }> = ({ label, info, value, sub, delta, against, children }) => {
    const { colors, font, radius } = useBrutalTheme();
    return (
        <div className={`p-4 lg:p-5 border ${colors.border} ${radius.card} ${colors.card} min-w-0 flex flex-col`}>
            <div className="flex items-center justify-between gap-1">
                <span className={`${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`}>{label}</span>
                <MetricInfo id={info} />
            </div>
            <p className={`mt-2 ${font.mono} tabular-nums font-bold text-xl sm:text-2xl lg:text-[1.75rem] leading-tight ${colors.text} whitespace-nowrap`}>{value}</p>
            {sub && <div className={`mt-1 text-xs ${colors.textSecondary} tabular-nums`}>{sub}</div>}
            <DeltaText delta={delta} against={against} className="mt-2" />
            {children}
        </div>
    );
};

const TrendChart: React.FC<{ title: string; points: PerformanceTrendPoint[]; pick: (p: PerformanceTrendPoint) => number | null; formatMoney: (v: number) => string; testId?: string }> = ({ title, points, pick, formatMoney, testId }) => {
    const { colors, font, accent, radius } = useBrutalTheme();
    const values = points.map(pick);
    const max = Math.max(0, ...values.map((v) => v ?? 0));
    return (
        <figure className="min-w-0">
            <figcaption className={`${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`}>{title}</figcaption>
            <ol className="mt-3 grid grid-cols-6 gap-2 items-end h-32" aria-label={title}>
                {points.map((p, i) => {
                    const v = values[i];
                    const h = v == null || max === 0 ? 0 : Math.max(4, Math.round((Math.max(v, 0) / max) * 100));
                    const text = v == null ? 'sem dados' : formatMoney(v);
                    return (
                        <li key={p.month} data-testid={testId} className="flex flex-col items-center justify-end h-full gap-1.5 min-w-0" aria-label={`${monthShortLabel(p.month)}: ${text}${p.low_sample ? ', amostra baixa' : ''}`}>
                            <span className={`${font.mono} text-xs tabular-nums ${colors.textMuted} whitespace-nowrap hidden sm:block`} aria-hidden="true">{v == null ? '—' : formatMoney(v).replace(/,\d{2}$/, '')}</span>
                            <span
                                aria-hidden="true"
                                className={`w-full max-w-[2.5rem] ${radius.badge === 'rounded-full' ? 'rounded-t-md' : 'rounded-t-sm'} ${p.low_sample ? `border border-dashed ${accent.border} bg-transparent` : accent.bg}`}
                                style={{ height: `${h}%` }}
                            />
                            <span className={`text-xs ${colors.textMuted}`} aria-hidden="true">{monthShortLabel(p.month)}</span>
                        </li>
                    );
                })}
            </ol>
        </figure>
    );
};

export const MemberDetail: React.FC<MemberDetailProps> = ({ member: m, data, against, previousName, formatMoney, companyId, onBack, onOpenHistory, onOpenReport }) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const [showMath, setShowMath] = useState(false);
    const x = m.metrics;
    const p = m.previous;
    const prevSample = p?.atendimentos ?? 0;
    const money = (v: number | null) => (v == null ? '—' : formatMoney(v));
    const perHour = (v: number | null) => (v == null ? '—' : `${formatMoney(v)}/h`);
    const badge = memberBadge(m, data.min_sample);
    const comissoes = x.comissao_servicos + x.comissao_produtos + x.comissao_avulsa;
    const label = `${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`;
    const trend = data.trend ?? [];

    const mathLine = (name: string, value: string, strong = false) => (
        <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? `border-t ${colors.divider} mt-1 pt-3` : ''}`}>
            <dt className={strong ? `font-semibold ${colors.text}` : colors.textSecondary}>{name}</dt>
            <dd className={`${font.mono} tabular-nums whitespace-nowrap ${strong ? `font-bold ${colors.text}` : colors.text}`}>{value}</dd>
        </div>
    );

    const secondary: { label: string; info: MetricId; main: string; extra?: string | null }[] = [
        { label: 'Atendimentos', info: 'atendimentos', main: `${plural(x.atendimentos, 'atendimento', 'atendimentos')}${x.atendimentos_clube ? ` · ${x.atendimentos_clube} do Clube` : ''}` },
        { label: 'Tempo de cadeira (agendado)', info: 'tempo', main: `${formatHours(x.tempo_total_min)}${x.tempo_clube_min ? ` (${formatHours(x.tempo_clube_min)} do Clube)` : ''}` },
        {
            label: 'Faltas · Cancelamentos',
            info: 'faltas',
            main: x.desfechos ? `Faltas ${formatPercent(x.taxa_faltas)} (${x.faltas} de ${x.desfechos}) · Cancel. ${formatPercent(x.taxa_cancelamentos)} (${x.cancelamentos} de ${x.desfechos})` : 'Nenhum horário com desfecho',
            extra: x.sem_desfecho ? plural(x.sem_desfecho, 'sem desfecho', 'sem desfecho') : null,
        },
        {
            label: 'Produtos',
            info: 'produtos',
            main: x.vendas_produtos ? `${x.visitas_com_produto} de ${x.atendimentos} com produto (${formatPercent(x.attach)})` : 'Nenhuma venda de produto no período',
            extra: x.vendas_produtos ? `${formatMoney(x.receita_produtos)} em produtos` : null,
        },
        { label: 'Comissão do período', info: 'comissao_periodo', main: formatMoney(m.is_owner ? 0 : x.comissao_periodo), extra: x.sem_registro_financeiro ? `${plural(x.sem_registro_financeiro, 'atendimento', 'atendimentos')} sem registro financeiro: comissão não calculada` : null },
    ];

    return (
        <div className="space-y-5 lg:space-y-6">
            <div className="space-y-3">
                <button type="button" onClick={onBack} className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm ${accent.text} hover:underline underline-offset-4`}>
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Toda a equipe
                </button>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className={`${font.heading} text-xl lg:text-2xl font-bold tracking-tight ${colors.text}`}>{m.name}</h2>
                    {m.rank != null && <span className={`${font.mono} text-sm tabular-nums ${colors.textSecondary}`}>{rankLabel(m.rank)} no ranking</span>}
                    {badge && <Badge variant="neutral">{badge}</Badge>}
                </div>
                <p className={`text-sm leading-relaxed ${colors.textSecondary} max-w-3xl`}>{summarySentence(m, { formatMoney, minSample: data.min_sample, previousName })}</p>
            </div>

            <section data-testid="detail-headline" aria-label="Números principais" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Headline label="Retorno para a casa" info="retorno" value={money(x.retorno)} sub="antes das despesas fixas" delta={moneyDelta(x.retorno, p?.retorno, { prevSample, formatMoney })} against={against}>
                    <button
                        type="button"
                        aria-expanded={showMath}
                        aria-controls="retorno-breakdown"
                        onClick={() => setShowMath((v) => !v)}
                        className={`mt-auto pt-2 self-start inline-flex items-center gap-1 min-h-[44px] text-sm ${accent.text} hover:underline underline-offset-4`}
                    >
                        Ver a conta <ChevronDown className={`w-4 h-4 transition-transform ${showMath ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                </Headline>
                <Headline label="Retorno por hora" info="retorno_por_hora" value={perHour(x.retorno_por_hora)} sub={<>Faturamento por hora <span className={`${font.mono} whitespace-nowrap`}>{perHour(x.faturamento_por_hora)}</span></>} delta={moneyDelta(x.retorno_por_hora, p?.retorno_por_hora, { prevSample, formatMoney })} against={against} />
                <Headline label="Ticket médio" info="ticket_medio" value={money(x.ticket_medio)} sub={x.atendimentos_pagos ? plural(x.atendimentos_pagos, 'atendimento pago', 'atendimentos pagos') : 'nenhum atendimento pago'} delta={moneyDelta(x.ticket_medio, p?.ticket_medio, { prevSample, formatMoney })} against={against} />
                <Headline
                    label="Voltou a agendar"
                    info="voltou"
                    value={formatPercent(x.voltou_taxa)}
                    sub={x.maduros ? (
                        <span title={formatPercentPrecise(x.voltou_taxa)}>
                            <span>{`${x.voltou} de ${x.maduros}`}</span>
                            {x.imaturos > 0 && <span className={colors.textMuted}>{` · ${x.imaturos} em avaliação`}</span>}
                        </span>
                    ) : 'nenhum atendimento com mais de 48 h'}
                    delta={rateDelta(x.voltou_taxa, p?.voltou_taxa, { prevSample })}
                    against={against}
                />
            </section>

            {showMath && (
                <section id="retorno-breakdown" data-testid="retorno-breakdown" aria-label="Conta do retorno" className={`border ${colors.border} ${radius.card} ${colors.card} px-4 py-3 lg:px-5 lg:max-w-xl`}>
                    <dl className="text-sm">
                        {mathLine('Serviços', formatMoney(x.receita_servicos))}
                        {mathLine('Produtos', `+ ${formatMoney(x.receita_produtos)}`)}
                        {mathLine('Lançamentos avulsos', `+ ${formatMoney(x.receita_avulsa)}`)}
                        {mathLine(m.is_owner ? 'Comissões (dono: zero)' : 'Comissões', `− ${formatMoney(m.is_owner ? 0 : comissoes)}`)}
                        {mathLine('Custo dos produtos', `− ${formatMoney(x.custo_produtos)}`)}
                        {mathLine('Retorno para a casa', money(x.retorno), true)}
                    </dl>
                </section>
            )}

            <section aria-label="Outros números" className={`border ${colors.border} ${radius.card} ${colors.card}`}>
                <dl className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 ${colors.divider}`}>
                    {secondary.map((s, i) => (
                        <div key={s.label} className={`px-4 py-3.5 lg:px-5 min-w-0 ${i > 0 ? `lg:border-l ${colors.divider}` : ''} ${i % 2 === 1 ? `sm:border-l ${colors.divider}` : ''} ${i >= 2 ? `sm:border-t lg:border-t-0 ${colors.divider}` : ''}`}>
                            <dt className="flex items-center justify-between gap-1">
                                <span className={label}>{s.label}</span>
                                <MetricInfo id={s.info} />
                            </dt>
                            <dd className={`mt-1 text-sm ${colors.text} tabular-nums`}>{s.main}</dd>
                            {s.extra && <dd className={`mt-0.5 text-xs ${colors.textMuted}`}>{s.extra}</dd>}
                        </div>
                    ))}
                </dl>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <section aria-label="Tendência de 6 meses" className={`lg:col-span-2 border ${colors.border} ${radius.card} ${colors.card} p-4 lg:p-5`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className={`text-sm font-semibold ${colors.text}`}>Últimos 6 meses</h3>
                        <span className={`text-xs ${colors.textMuted} inline-flex items-center gap-1.5`}>
                            <span aria-hidden="true" className={`inline-block w-3 h-3 border border-dashed ${accent.border}`} /> mês com amostra baixa
                        </span>
                    </div>
                    {trend.length === 0 ? (
                        <p className={`mt-3 text-sm ${colors.textMuted}`}>Sem histórico para mostrar.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <TrendChart title="Retorno para a casa" points={trend} pick={(t) => t.retorno} formatMoney={formatMoney} testId="trend-month" />
                            <TrendChart title="Ticket médio" points={trend} pick={(t) => t.ticket_medio} formatMoney={formatMoney} />
                        </div>
                    )}
                </section>
                <section aria-label="Serviços mais feitos" className={`border ${colors.border} ${radius.card} ${colors.card} p-4 lg:p-5`}>
                    <h3 className={`text-sm font-semibold ${colors.text}`}>Serviços mais feitos</h3>
                    {data.top_services.length === 0 ? (
                        <p className={`mt-3 text-sm ${colors.textMuted}`}>Nenhum serviço concluído no período.</p>
                    ) : (
                        <ol className="mt-3 space-y-2">
                            {data.top_services.slice(0, 5).map((s, i) => (
                                <li key={s.service} className="flex items-baseline gap-3 text-sm">
                                    <span className={`${font.mono} tabular-nums w-5 ${colors.textMuted}`}>{i + 1}</span>
                                    <span className={`flex-1 min-w-0 break-words first-letter:uppercase ${colors.text}`}>{s.service}</span>
                                    <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{s.count}×</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            <MemberLedger
                companyId={companyId}
                professionalId={m.professional_id}
                start={data.period.start}
                end={data.period.end}
                formatMoney={formatMoney}
            />

            {!m.is_owner && (
                <section aria-label="Pagamentos" className={`flex flex-col sm:flex-row sm:items-center gap-3 border ${colors.border} ${radius.card} px-4 py-3.5 lg:px-5`}>
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold ${colors.text}`}>Pagamentos</h3>
                        <p className={`text-xs ${colors.textMuted}`}>Repasses já feitos e o relatório de comissões deste período.</p>
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
