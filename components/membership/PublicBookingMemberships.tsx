import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { usePublicMembershipPlans } from '../../hooks/useMemberships';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { MembershipBadge } from './MembershipBadge';
import { formatCurrency, type Region } from '../../utils/formatters';

interface PublicBookingMembershipsProps {
  businessId: string | null;
  slug: string;
  region?: Region;
  themeOverride?: ThemeVariant;
  services?: Array<{ id: string; name: string }>;
}

export const PublicBookingMemberships: React.FC<PublicBookingMembershipsProps> = ({
  businessId,
  slug,
  region = 'BR',
  themeOverride,
  services = [],
}) => {
  const { colors, accent, shadow } = useBrutalTheme({ override: themeOverride });
  const { data: plans, isLoading } = usePublicMembershipPlans(businessId);
  const serviceNameById = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );

  if (!slug || isLoading || !plans?.length) return null;

  return (
    <section id="booking-memberships" data-testid="booking-memberships" className="space-y-4 pb-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crown className={`w-5 h-5 ${accent.text}`} aria-hidden />
          <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${colors.text}`}>
            Assinaturas
          </h2>
        </div>
        <p className={`${colors.textMuted} text-sm`}>
          Pague menos todo mês com um plano do clube.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {plans.map((plan) => {
          const included = plan.service_ids
            .map((id) => serviceNameById.get(id))
            .filter((name): name is string => Boolean(name));

          return (
            <article
              key={plan.id}
              data-testid={`booking-plan-${plan.id}`}
              className={`${colors.card} ${colors.border} border ${shadow.card} rounded-2xl overflow-hidden`}
            >
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className={`text-xl font-black tracking-tight ${colors.text}`}>
                      {plan.name}
                    </h3>
                    {plan.description ? (
                      <p className={`text-xs leading-snug ${colors.textSecondary}`}>
                        {plan.description}
                      </p>
                    ) : null}
                  </div>
                  <MembershipBadge color={plan.badge_color} />
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-base font-black tracking-tight ${accent.text}`}>
                    {formatCurrency(plan.price_cents / 100, region)}
                    <span className={`${colors.textMuted} text-xs font-bold ml-1`}>/mês</span>
                  </span>
                  <div className={`w-1 h-1 rounded-full ${colors.textMuted}`} />
                  <span className={`text-xs font-bold ${colors.textMuted}`}>
                    {plan.usage_limit_per_month
                      ? `${plan.usage_limit_per_month} uso${plan.usage_limit_per_month > 1 ? 's' : ''}/mês`
                      : 'Ilimitado'}
                  </span>
                </div>

                {included.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {included.map((name) => (
                      <li
                        key={name}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.surface} ${colors.textSecondary}`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to={`/clube/${slug}`}
                  className={`flex items-center justify-center gap-2 w-full py-3 min-h-[44px] font-semibold text-sm rounded-xl ${accent.bg} text-[var(--color-on-accent)]`}
                >
                  Quero assinar
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
