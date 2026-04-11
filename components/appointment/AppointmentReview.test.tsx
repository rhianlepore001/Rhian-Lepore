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
  it('BR: exibe Dinheiro, Pix e Cartão (sem MBWay)', () => {
    render(<AppointmentReview {...baseProps} region="BR" />);

    expect(screen.getByText('DINHEIRO')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('CARTÃO')).toBeInTheDocument();
    expect(screen.queryByText('MBWAY')).not.toBeInTheDocument();
  });

  it('PT: exibe Dinheiro, MBWay e Cartão (sem Pix)', () => {
    render(<AppointmentReview {...baseProps} region="PT" currencyRegion="PT" currencySymbol="€" />);

    expect(screen.getByText('DINHEIRO')).toBeInTheDocument();
    expect(screen.getByText('MBWAY')).toBeInTheDocument();
    expect(screen.getByText('CARTÃO')).toBeInTheDocument();
    expect(screen.queryByText('PIX')).not.toBeInTheDocument();
  });

  it('BR: exibe exatamente 3 botões de pagamento', () => {
    render(<AppointmentReview {...baseProps} region="BR" />);
    // Os 3 botões de pagamento têm a label em uppercase
    const paymentButtons = ['DINHEIRO', 'PIX', 'CARTÃO'];
    paymentButtons.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('PT: exibe exatamente 3 botões de pagamento', () => {
    render(<AppointmentReview {...baseProps} region="PT" currencyRegion="PT" currencySymbol="€" />);
    const paymentButtons = ['DINHEIRO', 'MBWAY', 'CARTÃO'];
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
