import { z } from 'zod';

export const onboardingProgressSchema = z.object({
  company_id: z.string().min(1),
  current_step: z.number().min(1).max(5),
  is_completed: z.boolean(),
});

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;