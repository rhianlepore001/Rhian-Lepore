/** Constantes do seed DEMO isolado. Sem secrets. */

export const DEMO_MARKER = '[AGENDIX-DEMO]';

/** Valor obrigatório em DEMO_SEED_CONFIRM para qualquer escrita. */
export const WRITE_CONFIRM_VALUE = 'WRITE_DEMO_TENANTS_ONLY';

/** Extra, só quando a URL aponta para o projeto de produção conhecido. */
export const PRODUCTION_CONFIRM_VALUE = 'YES_THIS_IS_PRODUCTION';

/** Extra, só para apagar auth.users dos tenants DEMO. */
export const DELETE_AUTH_CONFIRM_VALUE = 'DELETE_DEMO_AUTH_USERS';

/**
 * E-mails DEMO permitidos.
 * Plus-addressing opcional: agendix.demo.barber+prints@example.com
 */
export const DEMO_EMAIL_PATTERN =
  /^agendix\.demo\.(barber|beauty)(\+[a-z0-9._-]+)?@example\.com$/i;

/** Slugs públicos DEMO: sempre prefixo demo- (UNIQUE em profiles.business_slug). */
export const DEMO_SLUG_PATTERN = /^demo-[a-z0-9-]{3,60}$/;

export const DEFAULT_EMAILS = Object.freeze({
  barber: 'agendix.demo.barber@example.com',
  beauty: 'agendix.demo.beauty@example.com',
});

export const DEFAULT_SLUGS = Object.freeze({
  barber: 'demo-barbearia-corte-fino',
  beauty: 'demo-studio-luna-belle',
});

export const TIME_ZONE = 'America/Sao_Paulo';

/** Fragmento do host do projeto prod (já aparece em scripts/apply_migration_remote.mjs). */
export const KNOWN_PRODUCTION_HOST_FRAGMENT = 'lcqwrngscsziysyfhpfj';

export const TENANT_KEYS = Object.freeze(['barber', 'beauty']);

/**
 * Ordem de DELETE das tabelas operacionais (FKs do schema vivo).
 * Nunca inclui profiles / auth.users — isso só no purge com flag extra.
 */
export const OPERATIONAL_DELETE_ORDER = Object.freeze([
  { table: 'queue_payments', column: 'business_id' },
  { table: 'queue_entries', column: 'business_id' },
  { table: 'pix_payments', column: 'user_id' },
  { table: 'membership_payments', column: 'user_id' },
  { table: 'client_memberships', column: 'user_id' },
  { table: 'membership_plans', column: 'user_id' },
  { table: 'appointment_product_lines', column: 'company_id' },
  { table: 'product_sales', column: 'company_id' },
  { table: 'finance_records', column: 'user_id' },
  { table: 'appointments', column: 'user_id' },
  { table: 'public_bookings', column: 'business_id' },
  { table: 'public_clients', column: 'business_id' },
  { table: 'products', column: 'company_id' },
  { table: 'clients', column: 'user_id' },
  { table: 'service_upsells', column: 'user_id' },
  { table: 'services', column: 'user_id' },
  { table: 'service_categories', column: 'user_id' },
  { table: 'commission_payments', column: 'company_id' },
  { table: 'goal_settings', column: 'user_id' },
  { table: 'team_members', column: 'user_id' },
]);

export const PROFILE_DELETE_TABLES = Object.freeze([
  { table: 'onboarding_progress', column: 'company_id' },
  { table: 'business_settings', column: 'user_id' },
]);
