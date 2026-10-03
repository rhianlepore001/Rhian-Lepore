import { describe, expect, it } from 'vitest';
import { appointmentStatusSchema } from '@/types/scheduling';

describe('appointmentStatusSchema — PR-1 NoShow', () => {
  it('aceita NoShow além de Confirmed/Pending/Completed/Cancelled', () => {
    expect(appointmentStatusSchema.options).toEqual([
      'Confirmed',
      'Pending',
      'Completed',
      'Cancelled',
      'NoShow',
    ]);
    expect(appointmentStatusSchema.safeParse('NoShow').success).toBe(true);
  });
});
