import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, ErrorState, PageHeader } from '../components/ui';
import { ChairHourCard } from '../components/performance/ChairHourCard';
import { useAuth } from '../contexts/AuthContext';
import { useChairHour } from '../hooks/useChairHour';
import { chairHourMonth } from '../utils/chairHourPeriod';
import { hourlyEmptyKind } from '../utils/hourlyResultsEmpty';
import { allServicesHaveMaterialDecision, firstPendingBlock, hasOpenBusinessHours, pendingSetupWarning, setupProgress, WIZARD_BLOCK_HASH, type SetupBlockId, type WorkingHoursLike } from '../utils/hourlyResultsSetup';
import { periodLabel } from '../utils/chairHourCopy';
import { resolveHeaderBackTarget } from '../utils/headerBackTarget';
import { fixedCostsApi } from '../services/fixedCosts';
import { getTodayInTimeZone, resolveBusinessTimezone } from '../utils/businessTimezone';
import { useBusinessSettings } from '@/hooks/useSettings';

const PAGE_PB = 'pb-[calc(8rem+var(--safe-bottom))] md:pb-16';
const SETTINGS = '/configuracoes/financeiro';

const STEPS: { id: SetupBlockId; label: string; hint: string; hash: string }[] = [
  { id: 'costs', label: 'Contas do mês', hint: 'Informe as contas do mês (aluguel, luz, internet).', hash: 'contas' },
  { id: 'hours', label: 'Horários da equipe', hint: 'Confira os horários de cada profissional.', hash: 'horarios' },
  { id: 'materials', label: 'Material dos serviços', hint: 'Calcule o material dos serviços (gilete, tinta, progressiva).', hash: 'materiais' },
  { id: 'margin', label: 'Quanto precisa sobrar', hint: 'Defina quando avisar que sobrou pouco.', hash: 'margem' },
];

export const HourlyResults: React.FC = () => {
  const { role, teamMemberId, companyId, region } = useAuth();
  const { data: settings } = useBusinessSettings();
  const timezone = resolveBusinessTimezone({ timezone: settings?.timezone, region });
  const [params] = useSearchParams();
  const start = params.get('de') || chairHourMonth(timezone);
  const end = params.get('ate') || null;
  const pro = params.get('pro');
  const staff = role === 'staff';
  const { data, status, retry } = useChairHour(start, staff ? null : pro, end);
  const selected = staff
    ? data?.professionals?.find((person) => person.id === teamMemberId)
    : pro
      ? data?.professionals?.find((person) => person.id === pro)
      : data?.total;
  const [setupComplete, setSetupComplete] = useState<boolean | undefined>(staff ? true : undefined);
  const [blocks, setBlocks] = useState<Record<SetupBlockId, boolean> | null>(null);
  const [wizardError, setWizardError] = useState(false);
  const [wizardRetry, setWizardRetry] = useState(0);

  useEffect(() => {
    if (staff || !companyId) return;
    let cancelled = false;
    setWizardError(false);
    void fixedCostsApi.list(companyId).then((result) => {
      if (cancelled) return;
      const today = getTodayInTimeZone(timezone);
      const progress = setupProgress({
        hasActiveCost: result.costs.some((cost) => cost.active && (!cost.end_date || cost.end_date >= today)),
        hasOpenHours: hasOpenBusinessHours(settings?.business_hours as WorkingHoursLike)
          || result.professionals.some((person) => hasOpenBusinessHours(person.working_hours)),
        hasMaterial: allServicesHaveMaterialDecision(result.services, result.materials),
        marginSaved: !!result.lowMarginSaved,
      });
      setBlocks(progress.blocks);
      setSetupComplete(progress.configured === progress.total);
    }).catch(() => {
      if (cancelled) return;
      setSetupComplete(false);
      setWizardError(true);
    });
    return () => { cancelled = true; };
  }, [companyId, staff, settings?.business_hours, timezone, wizardRetry]);

  const kind = status === 'ready'
    ? hourlyEmptyKind({ role: staff ? 'staff' : 'owner', item: selected, setupComplete })
    : null;
  const back = resolveHeaderBackTarget('/resultados-por-hora', staff ? 'staff' : 'owner');
  const pending = blocks ? firstPendingBlock(blocks) : 'costs';
  const continueStep = STEPS.find((step) => step.id === (pending ?? 'costs')) ?? STEPS[0];
  const warning = pendingSetupWarning(blocks);
  const settingsHref = (hash: string) => `${SETTINGS}?bloco=${hash}`;
  const doneCount = blocks ? Object.values(blocks).filter(Boolean).length : null;

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
            <p className="text-sm font-semibold tabular-nums text-theme-text">{doneCount == null ? '… de 4 ajustes' : `${doneCount} de 4 ajustes feitos`}</p>
            {wizardError && (
              <p className="text-sm text-theme-text">
                Não foi possível conferir os ajustes.{' '}
                <button type="button" className="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)]" onClick={() => setWizardRetry((n) => n + 1)}>
                  Tentar de novo
                </button>
              </p>
            )}
            <p className="text-base leading-relaxed text-theme-text">Aqui você vê se cada hora aberta paga as contas e quanto sobra. Não é o caixa do dia.</p>
            <p className="text-sm text-theme-textSecondary">Para ver seu primeiro resultado, complete os 4 passos em Ajustes:</p>
            <ol className="list-none space-y-2 text-sm leading-relaxed text-theme-text">
              {STEPS.map((step, index) => {
                const done = blocks == null ? null : blocks[step.id];
                return (
                  <li key={step.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      to={settingsHref(step.hash)}
                      className="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)]"
                    >
                      {index + 1}. {step.label}
                    </Link>
                    <span className="rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-xs font-semibold">{done == null ? '…' : done ? 'Feito' : 'Falta'}</span>
                    <span className="w-full text-theme-textSecondary">{step.hint}</span>
                  </li>
                );
              })}
            </ol>
            <p className="text-sm leading-relaxed text-theme-text">Depois: fechar o primeiro atendimento na Agenda ou na Fila.</p>
            <Link
              to={settingsHref(continueStep.hash)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-accent-border)] px-4 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              Continuar nos ajustes: {continueStep.label}
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
        <>
          {setupComplete === false && warning.kind && (
            <p className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-theme-text">
              {warning.text}{' '}
              <Link
                to={settingsHref(WIZARD_BLOCK_HASH[warning.pending[0]])}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)]"
              >
                Completar
              </Link>
            </p>
          )}
          <ChairHourCard month={start} endDate={end} professionalId={staff ? null : pro} hidePeriod />
        </>
      )}

      {status === 'ready' && kind === 'setup' && !staff && (
        <p className="text-sm text-theme-textSecondary">Só usamos o que você informar. Nenhum número é inventado.</p>
      )}
    </div>
  );
};
