import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutModal } from './CheckoutModal';
import type { Appointment } from '@/types';

// Regressão: a Agenda deixa o CheckoutModal sempre montado com appointment=null.
// Com a query de linhas de produto desabilitada (data undefined), o default
// `= []` criava um array novo a cada render; o efeito do carrinho dependia dele
// e fazia setCart([]) -> novo render -> loop infinito ("Maximum update depth").
//
// Contador de renders via hook chamado em todo render; passando de RENDER_GUARD
// ele lança (o ErrorBoundary do teste segura) para o loop não travar o worker.
const RENDER_GUARD = 50;
const renders = { count: 0 };

vi.mock('@/hooks/useSubscriptionDiscount', () => ({
  useSubscriptionDiscount: () => {
    renders.count += 1;
    if (renders.count > RENDER_GUARD) throw new Error(`render loop: ${renders.count} renders`);
    return { hasActiveSubscription: false, coveredCents: 0, finalCents: 0, fullyCovered: false, plan: null, message: '' };
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-123' }, companyId: 'company-abc', role: 'owner', userType: 'barber', region: 'BR' }),
}));

vi.mock('@/contexts/UIContext', () => ({
  useUI: () => ({ setModalOpen: vi.fn() }),
}));

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <h2>{title}</h2>}{children}</div> : null,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  useToast: () => ({ showToast: vi.fn() }),
}));

// Query desabilitada (sem agendamento): TanStack devolve data undefined e isFetched false.
vi.mock('@/hooks/useCatalog', () => ({
  useProducts: () => ({ data: undefined }),
  useAppointmentProductLines: (_companyId: string, appointmentId?: string | null) =>
    appointmentId ? { data: [], isFetched: true } : { data: undefined, isFetched: false },
  useSellProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <p data-testid="guard-tripped">{this.state.error.message}</p> : this.props.children; }
}

const appointment: Appointment = {
  id: 'apt-001',
  clientName: 'Joao Silva',
  service: 'Corte Masculino',
  time: '10:00',
  appointment_time: '2026-04-13T10:00:00',
  status: 'Confirmed',
  price: 40,
};

function ui(apt: Appointment | null, client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <Boundary>
        <CheckoutModal appointment={apt} teamMembers={[]} financialSettings={null} onClose={vi.fn()} onConfirm={vi.fn()} />
      </Boundary>
    </QueryClientProvider>
  );
}

const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));

describe('CheckoutModal — sem loop de render com a agenda aberta (modal fechado)', () => {
  beforeEach(() => {
    renders.count = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('montado com appointment=null e query de produtos desabilitada: renders limitados', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { queryByTestId } = render(ui(null, client));
    await settle();
    expect(queryByTestId('guard-tripped')).toBeNull();
    expect(renders.count).toBeLessThanOrEqual(5);
  });

  it('abre e fecha o modal: continua limitado depois de fechar', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(ui(appointment, client));
    await settle();
    renders.count = 0;
    view.rerender(ui(null, client));
    await settle();
    expect(view.queryByTestId('guard-tripped')).toBeNull();
    expect(renders.count).toBeLessThanOrEqual(5);
  });
});
