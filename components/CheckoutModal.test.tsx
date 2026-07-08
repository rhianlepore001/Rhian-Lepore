import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutModal } from './CheckoutModal';
import type { Appointment } from '@/types';
import { supabase } from '@/lib/supabase';

const showToastMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-123' },
    companyId: 'company-abc',
    role: 'owner',
    userType: 'barber',
    region: 'BR',
  }),
}));

vi.mock('@/contexts/UIContext', () => ({
  useUI: () => ({ setModalOpen: vi.fn() }),
}));

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, footer }: { open: boolean; children: React.ReactNode; title?: string; footer?: React.ReactNode }) =>
    open ? (
      <div role="dialog" aria-modal="true">
        {title && <h2>{title}</h2>}
        {children}
        {footer}
      </div>
    ) : null,
  Button: ({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('@/hooks/useCatalog', () => ({
  useProducts: () => ({ data: [] }),
  useSellProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockAppointment: Appointment = {
  id: 'apt-001',
  clientName: 'Joao Silva',
  service: 'Corte Masculino',
  time: '10:00',
  appointment_time: '2026-04-13T10:00:00',
  status: 'Confirmed',
  price: 40,
};

const mockTeamMembers = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Carlos', active: true },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Ana', active: true },
];

describe('CheckoutModal', () => {
  const defaultProps = {
    appointment: mockAppointment,
    teamMembers: mockTeamMembers,
    financialSettings: null,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  const renderCheckoutModal = (props = defaultProps) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <CheckoutModal {...props} />
      </QueryClientProvider>
    );
  };

  it('renderiza sem crash com appointment valido', () => {
    renderCheckoutModal();
    expect(screen.getByText('Concluir Atendimento')).toBeInTheDocument();
  });

  it('exibe mensagem de erro ao confirmar sem payment_method', () => {
    renderCheckoutModal();
    fireEvent.click(screen.getByText('Confirmar Pagamento'));
    expect(screen.getByText('Selecione a forma de pagamento')).toBeInTheDocument();
  });

  it('nao exibe campo taxa quando PIX selecionado', () => {
    renderCheckoutModal();
    fireEvent.click(screen.getByLabelText('PIX'));
    expect(screen.queryByLabelText(/taxa de maquininha/i)).not.toBeInTheDocument();
  });

  it('nao exibe campo taxa quando Dinheiro selecionado', () => {
    renderCheckoutModal();
    fireEvent.click(screen.getByLabelText('Dinheiro'));
    expect(screen.queryByLabelText(/taxa de maquininha/i)).not.toBeInTheDocument();
  });

  it('exibe campo taxa quando Debito selecionado', () => {
    renderCheckoutModal();
    fireEvent.click(screen.getByLabelText('Débito'));
    expect(screen.getByLabelText(/taxa de maquininha/i)).toBeInTheDocument();
  });

  it('exibe campo taxa quando Credito selecionado', () => {
    renderCheckoutModal();
    fireEvent.click(screen.getByLabelText('Crédito'));
    expect(screen.getByLabelText(/taxa de maquininha/i)).toBeInTheDocument();
  });

  it('dropdown Recebido por contem opcao Dono como primeira entrada', () => {
    renderCheckoutModal();
    const select = screen.getByLabelText(/recebido por/i);
    const options = Array.from(select.querySelectorAll('option'));
    expect(options[1].textContent).toBe('Dono');
  });

  it('dropdown Recebido por lista team members passados via prop', () => {
    renderCheckoutModal();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('finaliza checkout via RPC com preco final e sem update client-side separado', async () => {
    renderCheckoutModal();

    fireEvent.change(screen.getByLabelText(/valor final/i), { target: { value: '70' } });
    fireEvent.click(screen.getByLabelText('Débito'));
    fireEvent.change(screen.getByLabelText(/taxa de maquininha/i), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/recebido por/i), { target: { value: '11111111-1111-4111-8111-111111111111' } });
    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('complete_appointment', {
        p_appointment_id: 'apt-001',
        p_payment_method: 'debit',
        p_received_by: '11111111-1111-4111-8111-111111111111',
        p_completed_by: '11111111-1111-4111-8111-111111111111',
        p_final_price: 70,
        p_machine_fee_percent: 2.5,
        p_machine_fee_amount: 1.75,
      });
    });
    expect(supabase.from).not.toHaveBeenCalledWith('appointments');
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('quando RPC falha com erro genérico, exibe mensagem de erro amigável', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: new Error('RPC indisponivel'),
    });

    renderCheckoutModal();

    fireEvent.click(screen.getByLabelText('PIX'));
    fireEvent.change(screen.getByLabelText(/recebido por/i), { target: { value: 'owner' } });
    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Erro ao concluir atendimento. Tente novamente.', 'error');
    });
    // Sprint D+1: useSubscriptionDiscount faz query em 'services' para mapear preços
    // (não relacionado ao fluxo de checkout do appointment em si)
    expect(supabase.from).not.toHaveBeenCalledWith('appointments');
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('quando RPC recusa agendamento cancelado, exibe mensagem específica', async () => {
    // P0001 = RAISE EXCEPTION do Postgres (veja migration 20260530)
    const rpcError = Object.assign(new Error('Agendamento cancelado nao pode ser concluido.'), {
      code: 'P0001',
    });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: rpcError });

    renderCheckoutModal();

    fireEvent.click(screen.getByLabelText('PIX'));
    fireEvent.change(screen.getByLabelText(/recebido por/i), { target: { value: 'owner' } });
    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Este agendamento está cancelado e não pode ser concluído.',
        'error',
      );
    });
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('quando RPC não existe (migration 20260530 pendente), avisa atualização pendente', async () => {
    // 42883 = undefined_function no Postgres (function does not exist)
    const rpcError = Object.assign(new Error('function public.complete_appointment(...) does not exist'), {
      code: '42883',
    });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: rpcError });

    renderCheckoutModal();

    fireEvent.click(screen.getByLabelText('PIX'));
    fireEvent.change(screen.getByLabelText(/recebido por/i), { target: { value: 'owner' } });
    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Atualização do sistema pendente. Tente novamente em alguns minutos.',
        'error',
      );
    });
  });
});
