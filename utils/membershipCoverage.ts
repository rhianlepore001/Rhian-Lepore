export interface CoverageService {
  id: string;
  name?: string;
  price: number;
}

export interface MembershipCoverageInput {
  services: CoverageService[];
  planServiceIds: string[];
  planName: string;
  usageLimitPerMonth: number | null;
  usageThisPeriod: number;
}

export interface MembershipCoverageResult {
  coveredServices: CoverageService[];
  uncoveredServices: CoverageService[];
  subtotalCents: number;
  coveredCents: number;
  finalCents: number;
  fullyCovered: boolean;
  remainingUses: number | null;
  message: string;
}

function toCents(price: number): number {
  return Math.round(price * 100);
}

/**
 * 1 atendimento concluído com payment_method membership = 1 uso.
 * Se o teto do período já foi atingido, nenhum serviço entra de graça nesta visita.
 */
export function applyMembershipCoverage(input: MembershipCoverageInput): MembershipCoverageResult {
  const { services, planServiceIds, planName, usageLimitPerMonth, usageThisPeriod } = input;
  const planIds = new Set(planServiceIds);
  const subtotalCents = services.reduce((sum, s) => sum + toCents(s.price), 0);
  const remainingUses = usageLimitPerMonth == null
    ? null
    : Math.max(0, usageLimitPerMonth - usageThisPeriod);

  const limitReached = remainingUses === 0;
  const covered: CoverageService[] = [];
  const uncovered: CoverageService[] = [];

  for (const service of services) {
    if (!limitReached && planIds.has(service.id)) {
      covered.push(service);
    } else {
      uncovered.push(service);
    }
  }

  const coveredCents = covered.reduce((sum, s) => sum + toCents(s.price), 0);
  const finalCents = uncovered.reduce((sum, s) => sum + toCents(s.price), 0);
  const fullyCovered = uncovered.length === 0 && covered.length > 0;

  let message: string;
  if (limitReached) {
    message = `Limite de ${usageLimitPerMonth} usos do plano ${planName} atingido neste período. Cobrar o atendimento.`;
  } else if (fullyCovered) {
    message = remainingUses == null
      ? `Plano ${planName} ativo. Atendimento incluso.`
      : `Plano ${planName} ativo. ${remainingUses} uso${remainingUses === 1 ? '' : 's'} restante${remainingUses === 1 ? '' : 's'} neste período.`;
  } else if (covered.length > 0) {
    message = `Plano ${planName} cobre ${covered.length} de ${services.length} serviços.`;
  } else {
    message = `Plano ${planName} ativo, mas não cobre os serviços agendados.`;
  }

  return {
    coveredServices: covered,
    uncoveredServices: uncovered,
    subtotalCents,
    coveredCents,
    finalCents,
    fullyCovered,
    remainingUses,
    message,
  };
}
