import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, ErrorState, PageHeader } from '../components/ui';
import { ChairHourCard } from '../components/performance/ChairHourCard';
import { useAuth } from '../contexts/AuthContext';
import { useChairHour } from '../hooks/useChairHour';
import { chairHourMonth } from '../utils/chairHourPeriod';
import { hourlyEmptyKind } from '../utils/hourlyResultsEmpty';
import { periodLabel } from '../utils/chairHourCopy';
import { resolveHeaderBackTarget } from '../utils/headerBackTarget';

const PAGE_PB = 'pb-[calc(8rem+var(--safe-bottom))] md:pb-16';
const SETTINGS = '/configuracoes/financeiro';

export const HourlyResults: React.FC = () => {
  const { role, teamMemberId } = useAuth();
  const [params] = useSearchParams();
  const start = params.get('de') || chairHourMonth('America/Sao_Paulo');
  const end = params.get('ate') || null;
  const pro = params.get('pro');
  const staff = role === 'staff';
  const { data, status, retry } = useChairHour(start, staff ? null : pro, end);
  const selected = staff
    ? data?.professionals?.find((person) => person.id === teamMemberId)
    : pro
      ? data?.professionals?.find((person) => person.id === pro)
      : data?.total;
  const kind = status === 'ready' ? hourlyEmptyKind({ role: staff ? 'staff' : 'owner', item: selected }) : null;
  const back = resolveHeaderBackTarget('/resultados-por-hora', staff ? 'staff' : 'owner');

  return (
    <div className={`flex flex-col gap-4 lg:gap-8 ${PAGE_PB} max-w-[1120px]`}>
      <Link to={back.to} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]">
        ← {back.label}
      </Link>
      <PageHeader
        title="Resultados por hora"
        subtitle={periodLabel(start, end)}
        className="!pb-0 !gap-1"
      />

      {status === 'loading' && (
        <div role="status" aria-label="Carregando resultados" className="space-y-3">
          {['h-24', 'h-14', 'h-20'].map((height) => <div key={height} className={`${height} animate-pulse rounded-xl bg-[var(--color-card-hover)] motion-reduce:animate-none`} />)}
          <span className="sr-only">Carregando resultados...</span>
        </div>
      )}

      {status === 'error' && (
        <ErrorState
          title="Não foi possível carregar os resultados."
          message="Confira a conexão e tente de novo."
          retryLabel="Tentar novamente"
          onRetry={retry}
        />
      )}

      {status === 'ready' && kind === 'setup' && (
        <Card>
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-theme-text">Aqui você vê se cada hora aberta paga as contas e quanto sobra. Não é o caixa do dia.</p>
            <p className="text-sm text-theme-textSecondary">Para ver seu primeiro resultado, complete os 4 passos em Ajustes:</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-theme-text">
              <li>Informe as contas do mês (aluguel, luz, internet).</li>
              <li>Confira os horários de cada profissional.</li>
              <li>Calcule o material dos serviços (gilete, tinta, progressiva).</li>
              <li>Defina quando avisar que sobrou pouco.</li>
            </ol>
            <p className="text-sm leading-relaxed text-theme-text">O progresso aparece em Ajustes como N de 4. Depois: fechar o primeiro atendimento na Agenda ou na Fila.</p>
            <Link
              to={`${SETTINGS}#contas`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-accent-border)] px-4 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              Ir para ajustes financeiros
            </Link>
          </div>
        </Card>
      )}

      {status === 'ready' && kind === 'no_attendance' && (
        <Card>
          <div className="space-y-3">
            <p className="text-base leading-relaxed text-theme-text">Ainda não há atendimento fechado neste período. Feche o primeiro na Agenda ou na Fila para ver o rendimento da hora, ou escolha outro período.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/agenda" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-[var(--color-accent)]">Abrir Agenda</Link>
              <Link to="/fila" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-[var(--color-accent)]">Abrir Fila</Link>
            </div>
          </div>
        </Card>
      )}

      {status === 'ready' && kind === 'staff_no_hours' && (
        <Card>
          <p className="text-base leading-relaxed text-theme-text">Peça ao responsável para definir seus horários. Depois, aqui você vê quanto cada hora da sua agenda rendeu.</p>
        </Card>
      )}

      {status === 'ready' && kind === 'unmeasurable' && (
        <Card>
          <p className="text-base leading-relaxed text-theme-text">Os atendimentos deste período não têm valor registrado. Confira os preços dos serviços.</p>
        </Card>
      )}

      {status === 'ready' && kind === null && (
        <ChairHourCard month={start} endDate={end} professionalId={staff ? null : pro} hidePeriod />
      )}

      {status === 'ready' && kind === 'setup' && !staff && (
        <p className="text-sm text-theme-textSecondary">Só usamos o que você informar. Nenhum número é inventado.</p>
      )}
    </div>
  );
};
