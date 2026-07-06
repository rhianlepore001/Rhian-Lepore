import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOnboardingProgress,
  getOnboardingProgress,
  saveOnboardingStep,
  upsertOnboardingStep,
  completeOnboardingProgress,
} from '@/services/onboarding';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('onboarding service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchOnboardingProgress retorna step e completed do banco', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { current_step: 3, is_completed: false },
            error: null,
          }),
        }),
      }),
    });

    const result = await fetchOnboardingProgress('company-001');
    expect(result).toEqual({ step: 3, completed: false });
  });

  it('fetchOnboardingProgress retorna completed=true quando is_completed', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { current_step: 5, is_completed: true },
            error: null,
          }),
        }),
      }),
    });

    const result = await fetchOnboardingProgress('company-001');
    expect(result).toEqual({ step: 5, completed: true });
  });

  it('fetchOnboardingProgress clamps step para [1,6]', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { current_step: 99, is_completed: false },
            error: null,
          }),
        }),
      }),
    });

    const result = await fetchOnboardingProgress('company-001');
    expect(result).toEqual({ step: 6, completed: false });
  });

  it('fetchOnboardingProgress retorna step=1 quando sem dados', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    });

    const result = await fetchOnboardingProgress('company-001');
    expect(result).toEqual({ step: 1, completed: false });
  });

  it('upsertOnboardingStep chama RPC com parametros corretos', async () => {
    await upsertOnboardingStep('company-001', 3);
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
      p_company_id: 'company-001',
      p_current_step: 3,
      p_completed_steps: [],
      p_step_data: {},
    });
  });

  it('completeOnboardingProgress faz upsert com is_completed=true', async () => {
    (supabase.from as any).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await completeOnboardingProgress('company-001');
    expect(supabase.from).toHaveBeenCalledWith('onboarding_progress');
  });

  it('getOnboardingProgress retorna null quando registro não existe', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    });

    const result = await getOnboardingProgress('company-001');
    expect(result).toBeNull();
  });

  it('getOnboardingProgress retorna registro completo', async () => {
    const record = {
      id: 'prog-1',
      company_id: 'company-001',
      current_step: 2,
      completed_steps: [1],
      is_completed: false,
      completed_at: null,
      step_data: { last_visited_step: 'services' },
    };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: record, error: null }),
        }),
      }),
    });

    const result = await getOnboardingProgress('company-001');
    expect(result).toEqual(record);
  });

  it('saveOnboardingStep chama RPC com todos os parametros', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: { id: 'prog-1', company_id: 'company-001' },
      error: null,
    });

    await saveOnboardingStep('company-001', 3, [1, 2], { guided_started: true });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
      p_company_id: 'company-001',
      p_current_step: 3,
      p_completed_steps: [1, 2],
      p_step_data: { guided_started: true },
    });
  });
});