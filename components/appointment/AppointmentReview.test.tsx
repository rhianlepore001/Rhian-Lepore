import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentReview } from './AppointmentReview';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ accent: { text: 'text-accent', bg: 'bg-accent' }, colors: {} }),
}));

// Props mínimas necessárias para o componente renderizar
const baseProps = {
  clients: [{ id: 'c1', name: 'João Silva' }],
  selectedClientId: 'c1',
  teamMembers: [{ id: 'p1', name: 'Rhian' }],
  selectedProId: 'p1',
  selectedDate: new Date('2026-04-07T12:00:00'),
  selectedTime: '10:00',
  cardBg: 'bg-[var(--color-card)]',
  activeCardBg: 'bg-accent-gold',
  selectedServicesDetails: [{ id: 's1', name: 'Corte Feminino' }],
  isCustomService: false,
  customServiceName: '',
  customServicePrice: '',
  currencyRegion: 'BR' as const,
  isBeauty: false,
  accentColor: 'text-accent-gold',
  sendWhatsapp: true,
  setSendWhatsapp: vi.fn(),
  customPrice: '80',
  setCustomPrice: vi.fn(),
  discount: '0',
  setDiscount: vi.fn(),
  finalPrice: 80,
  notes: '',
  setNotes: vi.fn(),
  currencySymbol: 'R$',
};

describe('AppointmentReview: passo Confirmar enxuto', () => {
  it.each(['BR', 'PT'] as const)('%s: sem card "Forma de pagamento" (pagamento é escolhido em "Confirmar e cobrar")', (region) => {
    render(<AppointmentReview {...baseProps} currencyRegion={region} />);
    expect(screen.queryByText(/forma de pagamento/i)).not.toBeInTheDocument();
    for (const label of ['Definir depois', 'Dinheiro', 'Pix', 'MBWay', 'Débito', 'Crédito']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('título do passo é instrução curta e o resumo mostra cliente, profissional, data/hora e serviços', () => {
    render(<AppointmentReview {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Confira o atendimento' })).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Rhian')).toBeInTheDocument();
    expect(screen.getByText(/07\/04\/2026 às 10:00/)).toBeInTheDocument();
    expect(screen.getByText('Corte Feminino')).toBeInTheDocument();
  });

  it('WhatsApp é um interruptor pequeno, é a última seção do passo e alterna o envio', async () => {
    const setSendWhatsapp = vi.fn();
    const { container } = render(<AppointmentReview {...baseProps} setSendWhatsapp={setSendWhatsapp} />);
    const toggle = screen.getByRole('checkbox', { name: /confirmação no whatsapp/i });
    expect(toggle).toBeChecked();
    const root = container.firstElementChild as HTMLElement;
    expect(root.lastElementChild?.contains(toggle)).toBe(true);
    expect(root.lastElementChild).toHaveAttribute('data-testid', 'review-whatsapp');
    await userEvent.click(toggle);
    expect(setSendWhatsapp).toHaveBeenCalledWith(false);
  });

  it('sem área de rolagem interna no passo (a rolagem é só a do modal)', () => {
    const { container } = render(<AppointmentReview {...baseProps} />);
    expect(container.querySelector('[class*="overflow-y-auto"], [class*="overflow-auto"]')).toBeNull();
  });
});
