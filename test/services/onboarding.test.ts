import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOnboardingProgress,
  getOnboardingProgress,
  saveOnboardingStep,
  upsertOnboardingStep,
  completeOnboardingProgress,
  getSetupStatus,
  isBookingLinkReady,
  isSetupChecklistComplete,
  shouldHideSetupCopilot,
  type SetupStatus,
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

  it('completeOnboardingProgress chama RPC e marca is_completed=true', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
    (supabase.from as any).mockReturnValue({ update });

    await completeOnboardingProgress('company-001');

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
      p_company_id: 'company-001',
      p_current_step: 5,
      p_completed_steps: [1, 2, 3, 4, 5],
      p_step_data: {},
    });
    expect(supabase.from).toHaveBeenCalledWith('onboarding_progress');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_completed: true,
        current_step: 5,
      }),
    );
    expect(eq).toHaveBeenCalledWith('company_id', 'company-001');
  });

  it('upsertOnboardingStep rejeita companyId vazio', async () => {
    await expect(upsertOnboardingStep('', 2)).rejects.toThrow(/company_id ausente/);
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

function countQuery(count: number) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    }),
  };
}

function rowQuery(data: unknown) {
  const payload = { data, error: null };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(payload),
        single: vi.fn().mockResolvedValue(payload),
      }),
    }),
  };
}

function mockSetupTables(opts: {
  services?: number;
  team?: number;
  clients?: number;
  hours?: Record<string, unknown> | null;
  slug?: string | null;
  activated?: boolean;
  appointments?: number;
  publicBookings?: number;
}) {
  (supabase.from as any).mockImplementation((table: string) => {
    switch (table) {
      case 'services':
        return countQuery(opts.services ?? 0);
      case 'team_members':
        return countQuery(opts.team ?? 0);
      case 'clients':
        return countQuery(opts.clients ?? 0);
      case 'appointments':
        return countQuery(opts.appointments ?? 0);
      case 'public_bookings':
        return countQuery(opts.publicBookings ?? 0);
      case 'business_settings':
        return rowQuery(opts.hours === undefined ? { business_hours: { mon: {} } } : { business_hours: opts.hours });
      case 'profiles':
        return rowQuery({
          business_slug: opts.slug ?? null,
          activation_completed: opts.activated ?? false,
        });
      default:
        return countQuery(0);
    }
  });
}

const completeChecklist = {
  hasServices: true,
  hasTeam: true,
  hasClients: true,
  hasBusinessHours: true,
  hasBookingSlug: true,
  hasAppointments: true,
  isActivated: false,
} satisfies SetupStatus;

describe('isBookingLinkReady', () => {
  it('é verdadeiro quando o slug existe', () => {
    expect(isBookingLinkReady({ businessSlug: 'barbearia-bob', publicBookingsCount: 0 })).toBe(true);
  });

  it('é verdadeiro quando já houve agendamento público, mesmo sem slug', () => {
    expect(isBookingLinkReady({ businessSlug: null, publicBookingsCount: 2 })).toBe(true);
  });

  it('é falso quando não há slug nem reservas públicas', () => {
    expect(isBookingLinkReady({ businessSlug: '  ', publicBookingsCount: 0 })).toBe(false);
    expect(isBookingLinkReady({})).toBe(false);
  });
});

describe('shouldHideSetupCopilot', () => {
  it('esconde o card quando todos os passos estão concluídos', () => {
    expect(shouldHideSetupCopilot(completeChecklist)).toBe(true);
    expect(isSetupChecklistComplete(completeChecklist)).toBe(true);
  });

  it('esconde o card quando o perfil já está ativado', () => {
    expect(shouldHideSetupCopilot({ ...completeChecklist, hasBookingSlug: false, isActivated: true })).toBe(true);
  });

  it('mantém o card se o link público ainda não foi configurado nem usado', () => {
    expect(shouldHideSetupCopilot({ ...completeChecklist, hasBookingSlug: false })).toBe(false);
  });
});

describe('getSetupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca o passo de booking quando o slug existe', async () => {
    mockSetupTables({ slug: 'barbearia-bob', publicBookings: 0 });
    const status = await getSetupStatus('user-001');
    expect(status.hasBookingSlug).toBe(true);
  });

  it('marca o passo de booking quando o link público já foi usado', async () => {
    mockSetupTables({
      slug: null,
      publicBookings: 3,
      services: 1,
      team: 1,
      clients: 1,
      appointments: 1,
    });
    const status = await getSetupStatus('user-001');
    expect(status.hasBookingSlug).toBe(true);
    expect(status.hasAppointments).toBe(true);
    expect(isSetupChecklistComplete(status)).toBe(true);
    expect(shouldHideSetupCopilot(status)).toBe(true);
  });

  it('não marca booking só com o restante do checklist', async () => {
    mockSetupTables({
      slug: null,
      publicBookings: 0,
      services: 1,
      team: 1,
      clients: 1,
      appointments: 1,
    });
    const status = await getSetupStatus('user-001');
    expect(status.hasBookingSlug).toBe(false);
    expect(isSetupChecklistComplete(status)).toBe(false);
    expect(shouldHideSetupCopilot(status)).toBe(false);
  });
});