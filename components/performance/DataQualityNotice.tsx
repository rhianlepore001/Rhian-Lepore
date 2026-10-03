import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { plural } from '../../utils/staffPerformanceView';

export interface QualityCounts {
    sem_registro_financeiro: number;
    duplicadas: number;
    sem_desfecho: number;
}

/** R3.12: faixa discreta, uma frase do que fazer, sem culpa. */
export const DataQualityNotice: React.FC<{ counts: QualityCounts }> = ({ counts }) => {
    const { colors, radius, status } = useBrutalTheme();
    const items = [
        counts.sem_registro_financeiro > 0 && {
            what: `${plural(counts.sem_registro_financeiro, 'atendimento', 'atendimentos')} sem registro financeiro: comissão não calculada`,
            todo: 'Conclua pelo botão Concluir e cobrar para registrar a comissão.',
        },
        counts.duplicadas > 0 && {
            what: `${plural(counts.duplicadas, 'atendimento', 'atendimentos')} com lançamento duplicado: contamos só um`,
            todo: 'Revise em Financeiro → Histórico e apague a cópia.',
        },
        counts.sem_desfecho > 0 && {
            what: `${plural(counts.sem_desfecho, 'horário passado', 'horários passados')} sem desfecho`,
            todo: 'Marque como concluído, falta ou cancelado na Agenda.',
        },
    ].filter(Boolean) as { what: string; todo: string }[];
    if (items.length === 0) return null;
    return (
        <section data-testid="data-quality" aria-label="Atenção aos dados deste período" className={`border ${status.warningBorder} ${radius.card} px-4 py-3.5`}>
            <h3 className={`text-sm font-semibold ${status.warning}`}>Atenção aos dados deste período</h3>
            <ul className="mt-2 space-y-2">
                {items.map((i) => (
                    <li key={i.what} className="text-sm leading-snug">
                        <span className={colors.text}>{i.what}.</span>{' '}
                        <span className={colors.textMuted}>{i.todo}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};
