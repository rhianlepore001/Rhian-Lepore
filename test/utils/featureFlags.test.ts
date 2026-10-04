import { describe, expect, it } from 'vitest';
import { ASSISTANT_ENABLED } from '../../utils/featureFlags';

describe('featureFlags (PR-G)', () => {
  it('Assistente AgendiX desligado', () => {
    expect(ASSISTANT_ENABLED).toBe(false);
  });
});
