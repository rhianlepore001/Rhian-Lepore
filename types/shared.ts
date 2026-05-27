import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const companyIdSchema = uuidSchema;
export const userIdSchema = uuidSchema;

export const tenantScopedSchema = z.object({
  company_id: companyIdSchema,
});

export const timestampedSchema = z.object({
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema.nullish(),
});

export const moneyAmountSchema = z.number().finite().nonnegative();

export const paginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const paymentMethodSchema = z.enum([
  'cash',
  'pix',
  'debit',
  'credit',
  'other',
]);

export const userRoleSchema = z.enum(['owner', 'staff']);
export const businessThemeSchema = z.enum(['barber', 'beauty']);
export const colorModeSchema = z.enum(['dark', 'light']);

export const asyncStatusSchema = z.enum([
  'idle',
  'loading',
  'success',
  'error',
]);

export const serviceResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      ok: z.literal(false),
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
  ]);

export type Uuid = z.infer<typeof uuidSchema>;
export type CompanyId = z.infer<typeof companyIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type TenantScoped = z.infer<typeof tenantScopedSchema>;
export type Timestamped = z.infer<typeof timestampedSchema>;
export type MoneyAmount = z.infer<typeof moneyAmountSchema>;
export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type BusinessTheme = z.infer<typeof businessThemeSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;
export type AsyncStatus = z.infer<typeof asyncStatusSchema>;
export type ServiceResult<T> = z.infer<ReturnType<typeof serviceResultSchema<z.ZodType<T>>>>;
