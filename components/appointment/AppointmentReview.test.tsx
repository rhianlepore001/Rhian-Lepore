import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentReview } from './AppointmentReview';

// Props mínimas necessárias para o componente renderizar
const baseProps = {
  clients: [{ id: 'c1', name: 'João Silva' }],
  selectedClientId: 'c1',
  teamMembers: [{ id: 'p1', name: 'Rhian' }],
  selectedProId: 'p1',
  selectedDate: new Date('2026-04-07'),
  selectedTime: '10:00',
  cardBg: 'bg-neutral-800',
  activeCardBg: 'bg-accent-gold',
  selectedServicesDetails: [{ id: 's1', name: 'Corte Feminino' }],
  isCustomService: false,
  customServiceName: '',
  customServicePrice: '',
  currencyRegion: 'BR' as const,
  isBeauty: false,
  accentColor: 'text-accent-gold',
  sendWhatsapp: false,
  setSendWhatsapp: vi.fn(),
  customPrice: '80',
  setCustomPrice: vi.fn(),
  discount: '0',
  setDiscount: vi.fn(),
  finalPrice: 80,
  notes: '',
  setNotes: vi.fn(),
  currencySymbol: 'R$',
  paymentMethod: 'Dinheiro',
  setPaymentMethod: vi.fn(),
};

describe('AppointmentReview — métodos de pagamento por region', () => {
  it('BR: exibe Dinheiro, Pix, Débito e Crédito (sem MBWay)', () => {
    render(<AppointmentReview {...baseProps} region="BR" />);

    expect(screen.getByText('Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.queryByText('MBWay')).not.toBeInTheDocument();
  });

  it('PT: exibe Dinheiro, MBWay, Débito e Crédito (sem Pix)', () => {
    render(<AppointmentReview {...baseProps} region="PT" currencyRegion="PT" currencySymbol="€" />);

    expect(screen.getByText('Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('MBWay')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.queryByText('Pix')).not.toBeInTheDocument();
  });

  it('BR: exibe os botões de pagamento corretos', () => {
    render(<AppointmentReview {...baseProps} region="BR" />);
    const paymentButtons = ['Dinheiro', 'Pix', 'Débito', 'Crédito'];
    paymentButtons.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('PT: exibe os botões de pagamento corretos', () => {
    render(<AppointmentReview {...baseProps} region="PT" currencyRegion="PT" currencySymbol="€" />);
    const paymentButtons = ['Dinheiro', 'MBWay', 'Débito', 'Crédito'];
    paymentButtons.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('ícone correto: BR usa 💎 (Pix), PT usa 📱 (MBWay)', () => {
    const { rerender } = render(<AppointmentReview {...baseProps} region="BR" />);
    expect(screen.getByText('💎')).toBeInTheDocument(); // Pix
    expect(screen.queryByText('📱')).not.toBeInTheDocument(); // MBWay ausente

    rerender(<AppointmentReview {...baseProps} region="PT" currencyRegion="PT" currencySymbol="€" />);
    expect(screen.getByText('📱')).toBeInTheDocument(); // MBWay
    expect(screen.queryByText('💎')).not.toBeInTheDocument(); // Pix ausente
  });
});
