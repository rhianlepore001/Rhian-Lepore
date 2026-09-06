export interface DiscountableService {
  id: string;
  name?: string;
  price: number;
}

export interface SubscriptionDiscountComputation {
  subtotalCents: number;
  coveredCents: number;
  finalCents: number;
  coveredServices: DiscountableService[];
  uncoveredServices: DiscountableService[];
  fullyCovered: boolean;
  hasActiveSubscription: boolean;
  canUseMembership: boolean;
  message: string | null;
}

function toCents(price: number): number {
  return Math.round(price * 100);
}

export function computeSubscriptionDiscount(input: {
  isActive: boolean;
  planName?: string | null;
  planServiceIds?: string[];
  services: DiscountableService[];
  usageLimit?: number | null;
  usageThisPeriod?: number;
}): SubscriptionDiscountComputation {
  const services = input.services;
  const subtotalCents = services.reduce((sum, service) => sum + toCents(service.price), 0);

  if (!input.isActive || !input.planName) {
    return {
      subtotalCents,
      coveredCents: 0,
      finalCents: subtotalCents,
      coveredServices: [],
      uncoveredServices: services,
      fullyCovered: false,
      hasActiveSubscription: false,
      canUseMembership: false,
      message: null,
    };
  }

  const usageBlocked =
    input.usageLimit != null && (input.usageThisPeriod ?? 0) >= input.usageLimit;

  if (usageBlocked) {
    return {
      subtotalCents,
      coveredCents: 0,
      finalCents: subtotalCents,
      coveredServices: [],
      uncoveredServices: services,
      fullyCovered: false,
      hasActiveSubscription: true,
      canUseMembership: false,
      message: `Plano ${input.planName} atingiu o limite de usos neste período.`,
    };
  }

  const planServiceIds = new Set(input.planServiceIds ?? []);
  const covered: DiscountableService[] = [];
  const uncovered: DiscountableService[] = [];

  for (const service of services) {
    if (planServiceIds.has(service.id)) covered.push(service);
    else uncovered.push(service);
  }

  const coveredCents = covered.reduce((sum, service) => sum + toCents(service.price), 0);
  const finalCents = uncovered.reduce((sum, service) => sum + toCents(service.price), 0);
  const fullyCovered = uncovered.length === 0 && covered.length > 0;

  let message: string | null = null;
  if (fullyCovered) {
    message = `Plano ${input.planName} ativo. Atendimento incluso.`;
  } else if (covered.length > 0) {
    message = `Plano ${input.planName} cobre ${covered.length} de ${services.length} serviços.`;
  } else {
    message = `Plano ${input.planName} ativo, mas não cobre os serviços agendados.`;
  }

  return {
    subtotalCents,
    coveredCents,
    finalCents,
    coveredServices: covered,
    uncoveredServices: uncovered,
    fullyCovered,
    hasActiveSubscription: true,
    canUseMembership: fullyCovered || covered.length > 0,
    message,
  };
}
