export const TRIAL_DAYS = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeTrialEndsAt(from: Date | number = Date.now()): string {
  const startMs = typeof from === 'number' ? from : from.getTime();
  return new Date(startMs + TRIAL_DAYS * MS_PER_DAY).toISOString();
}
