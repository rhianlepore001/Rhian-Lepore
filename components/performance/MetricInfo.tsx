import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export type MetricId =
    | 'retorno'
    | 'retorno_por_hora'
    | 'ticket_medio'
    | 'voltou'
    | 'faltas'
    | 'atendimentos'
    | 'tempo'
    | 'produtos'
    | 'comissao_periodo'
    | 'ranking';

interface Help { title: string; question: string; formula: string; base: string; notes?: string }

/** Texto da seção 4 do ACCEPTANCE, em português simples (R7.7). */
export const METRIC_HELP: Record<MetricId, Help> = {
    retorno: {
        title: 'Retorno para a casa',
        question: 'Quanto este colaborador deixou de dinheiro para o negócio, já descontando a comissão e o custo dos produtos?',
        formula: 'Serviços + Produtos + Lançamentos avulsos − Comissões − Custo dos produtos.',
        base: 'Atendimentos concluídos no período, pela data do atendimento. Produtos e avulsos pela data da venda.',
        notes: 'Antes das despesas fixas (aluguel, luz). Atendimentos do Clube não entram na receita. A comissão do dono conta como zero. Nada é estimado: atendimento sem registro financeiro entra com comissão zero e aparece no aviso de dados.',
    },
    retorno_por_hora: {
        title: 'Retorno por hora',
        question: 'Quanto cada hora de cadeira rende para a casa?',
        formula: 'Retorno dos atendimentos ÷ horas dos atendimentos pagos.',
        base: 'Duração marcada de cada atendimento pago (não mede o tempo real).',
        notes: 'Lançamentos avulsos ficam fora, porque não têm duração. É o número que define a posição no ranking, a partir de 8 atendimentos no período.',
    },
    ticket_medio: {
        title: 'Ticket médio',
        question: 'Quanto, em média, cada cliente pagou pelo serviço?',
        formula: 'Receita de serviços ÷ atendimentos pagos.',
        base: 'Atendimentos concluídos e pagos no período.',
        notes: 'Produtos não entram. Atendimentos do Clube e com preço zero ficam fora.',
    },
    voltou: {
        title: 'Voltou a agendar',
        question: 'O cliente saiu com o próximo horário marcado?',
        formula: 'Clientes que marcaram o próximo horário em até 48 h depois do atendimento, para até 45 dias.',
        base: 'Atendimentos com mais de 48 h. Os mais recentes aparecem como "em avaliação".',
        notes: 'Vale horário com qualquer profissional; o crédito fica com quem atendeu. Horário já marcado antes da visita também conta.',
    },
    faltas: {
        title: 'Faltas',
        question: 'A agenda está furando?',
        formula: 'Faltas ÷ (concluídos + faltas + cancelamentos).',
        base: 'Só horários com desfecho. Horários passados ainda pendentes aparecem à parte.',
        notes: 'Muitas faltas não dependem do profissional; use para ajustar confirmação e lembretes.',
    },
    atendimentos: {
        title: 'Atendimentos',
        question: 'Quantas pessoas foram atendidas?',
        formula: 'Atendimentos concluídos no período.',
        base: 'Data do atendimento, no fuso do negócio.',
        notes: 'Os do Clube contam aqui, mas não na receita.',
    },
    tempo: {
        title: 'Tempo de cadeira (agendado)',
        question: 'Quanto tempo foi dedicado a atendimentos?',
        formula: 'Soma da duração marcada de cada atendimento concluído.',
        base: 'Inclui o Clube; não mede o tempo real.',
    },
    produtos: {
        title: 'Venda de produtos',
        question: 'Recomenda produto?',
        formula: 'Atendimentos com pelo menos uma venda de produto ligada ÷ atendimentos.',
        base: 'Vendas registradas no AgendiX, pela data da venda.',
    },
    comissao_periodo: {
        title: 'Comissão do período',
        question: 'Quanto de comissão foi gerado no período?',
        formula: 'Comissão registrada de serviços, produtos e avulsos.',
        base: 'Data do atendimento ou da venda.',
        notes: 'Pode diferir do "A pagar" do Pagamento de comissão, que usa a data do lançamento financeiro.',
    },
    ranking: {
        title: 'Ranking por Retorno por hora',
        question: 'Quem rende mais por hora trabalhada, comparando de forma justa?',
        formula: 'Ordena por Retorno por hora. Empate: ticket maior, depois mais atendimentos, depois nome.',
        base: 'Colaboradores ativos com 8 ou mais atendimentos concluídos no período.',
        notes: 'O dono, inativos e quem tem amostra baixa aparecem abaixo, sem posição.',
    },
};

export const MetricInfo: React.FC<{ id: MetricId }> = ({ id }) => {
    const { colors, font } = useBrutalTheme();
    const [open, setOpen] = useState(false);
    const help = METRIC_HELP[id];
    const row = (label: string, text: string) => (
        <div>
            <dt className={`${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`}>{label}</dt>
            <dd className={`mt-1 text-sm leading-relaxed ${colors.textSecondary}`}>{text}</dd>
        </div>
    );
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`Como calculamos: ${help.title}`}
                className={`inline-flex items-center justify-center w-11 h-11 -my-3 -mr-3 shrink-0 rounded-full ${colors.textMuted} hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-input-focus)]`}
            >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {open && (
                <Modal open onClose={() => setOpen(false)} title={`Como calculamos · ${help.title}`} size="md">
                    <dl className="space-y-4">
                        {row('Pergunta', help.question)}
                        {row('Conta', help.formula)}
                        {row('Base', help.base)}
                        {help.notes && row('Observações', help.notes)}
                    </dl>
                </Modal>
            )}
        </>
    );
};
