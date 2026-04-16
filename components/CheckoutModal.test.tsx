import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutModal } from './CheckoutModal';
import type { Appointment } from '@/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-123' },
    companyId: 'company-abc',
    role: 'owner',
    userType: 'barber',
  })
}));

vi.mock('@/contexts/UIContext', () => ({
  useUI: () => ({ setModalOpen: vi.fn() })
}));

vi.mock('@/components/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title?: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div role="dialog" aria-modal="true">
        {title && <h2>{title}</h2>}
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock('@/components/BrutalButton', () => ({
  BrutalButton: ({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) => (
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
}));

const mockAppointment: Appointment = {
  id: 'apt-001',
  clientName: 'João Silva',
  service: 'Corte Masculino',
  time: '10:00',
  appointment_time: '2026-04-13T10:00:00',
  status: 'Confirmed',
  price: 40,
};

const mockTeamMembers = [
  { id: 'tm-001', name: 'Carlos', active: true },
  { id: 'tm-002', name: 'Ana', active: true },
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
  });

  it('renderiza sem crash com appointment válido', () => {
    render(<CheckoutModal {...defaultProps} />);
    expect(screen.getByText('Concluir Atendimento')).toBeInTheDocument();
  });

  it('exibe mensagem de erro ao confirmar sem payment_method', () => {
    render(<CheckoutModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirmar Pagamento'));
    expect(screen.getByText('Selecione a forma de pagamento')).toBeInTheDocument();
  });

  it('NÃO exibe campo taxa quando PIX selecionado', () => {
    render(<CheckoutModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('PIX'));
    expect(screen.queryByLabelText(/taxa de maquininha/i)).not.toBeInTheDocument();
  });

  it('NÃO exibe campo taxa quando Dinheiro selecionado', () => {
    render(<CheckoutModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Dinheiro'));
    expect(screen.queryByLabelText(/taxa de maquininha/i)).not.toBeInTheDocument();
  });

  it('EXIBE campo taxa quando Débito selecionado', () => {
    render(<CheckoutModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Débito'));
    expect(screen.getByLabelText(/taxa de maquininha/i)).toBeInTheDocument();
  });

  it('EXIBE campo taxa quando Crédito selecionado', () => {
    render(<CheckoutModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Crédito'));
    expect(screen.getByLabelText(/taxa de maquininha/i)).toBeInTheDocument();
  });

  it('dropdown Recebido por contém opção Dono como primeira entrada', () => {
    render(<CheckoutModal {...defaultProps} />);
    const select = screen.getByLabelText(/recebido por/i);
    const options = Array.from(select.querySelectorAll('option'));
    expect(options[1].textContent).toBe('Dono');
  });

  it('dropdown Recebido por lista team members passados via prop', () => {
    render(<CheckoutModal {...defaultProps} />);
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
});