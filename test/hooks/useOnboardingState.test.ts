import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import * as onboardingService from '@/services/onboarding';

vi.mock('@/services/onboarding', () => ({
  fetchOnboardingProgress: vi.fn(),
  upsertOnboardingStep: vi.fn(),
  completeOnboardingProgress: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

describe('useOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      companyId: 'company-001',
      user: { id: 'user-001' },
      tutorialCompleted: false,
      markTutorialCompleted: vi.fn(),
    });
  });

  it('retorna step=1 e loading inicial', () => {
    (onboardingService.fetchOnboardingProgress as any).mockReturnValue(
      new Promise(() => {})
    );

    const { result } = renderHook(() => useOnboardingState(), { wrapper: createWrapper() });
    expect(result.current.step).toBe(1);
    expect(result.current.completed).toBe(false);
  });

  it('retoma step do banco após fetch', async () => {
    (onboardingService.fetchOnboardingProgress as any).mockResolvedValue({
      step: 3,
      completed: false,
    });

    const { result } = renderHook(() => useOnboardingState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.step).toBe(3);
    expect(result.current.completed).toBe(false);
  });

  it('marca completed=true quando onboarding completo', async () => {
    (onboardingService.fetchOnboardingProgress as any).mockResolvedValue({
      step: 5,
      completed: true,
    });

    const { result } = renderHook(() => useOnboardingState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completed).toBe(true);
  });

  it('goToStep chama service e atualiza cache', async () => {
    (onboardingService.fetchOnboardingProgress as any).mockResolvedValue({
      step: 1,
      completed: false,
    });
    (onboardingService.upsertOnboardingStep as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOnboardingState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.goToStep(2);
    });

    expect(onboardingService.upsertOnboardingStep).toHaveBeenCalledWith('company-001', 2);

    await waitFor(() => expect(result.current.step).toBe(2));
  });

  it('completeOnboarding chama service e marca tutorial', async () => {
    const mockMarkTutorial = vi.fn();
    (useAuth as any).mockReturnValue({
      companyId: 'company-001',
      user: { id: 'user-001' },
      tutorialCompleted: false,
      markTutorialCompleted: mockMarkTutorial,
    });
    (onboardingService.fetchOnboardingProgress as any).mockResolvedValue({
      step: 4,
      completed: false,
    });
    (onboardingService.completeOnboardingProgress as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOnboardingState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(onboardingService.completeOnboardingProgress).toHaveBeenCalledWith('company-001');
    expect(mockMarkTutorial).toHaveBeenCalled();

    await waitFor(() => expect(result.current.completed).toBe(true));
  });
});