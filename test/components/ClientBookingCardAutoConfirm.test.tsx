import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { useToast } from '../../components/ui/Toast';

vi.mock('../../services/publicBooking', () => ({ cancelPublicBooking: vi.fn() }));
vi.mock('../../components/ui/Toast', () => ({ useToast: vi.fn() }));

// Agendado às 12:00 para as 13:00, prazo de 2h já fechado.
const booking: ClientBooking = {
  id: 'b1',
  appointment_time: '2026-10-04T13:00:00.000Z',
  status: 'confirmed',
  service_ids: ['s1'],
  service_names: ['Corte'],
  professional_id: 'p1',
  professional_name: 'Mario',
  total_price: 13,
  duration_minutes: 30,
  created_at: '2026-10-04T12:00:00.000Z',
};

function renderCard(props: { autoConfirmEnabled?: boolean; booking?: ClientBooking } = {}) {
  return render(
    <MemoryRouter>
      <ClientBookingCard
        booking={props.booking ?? booking}
        isBeauty={false}
        businessPhone="11999998888"
        businessSlug="corte-fino"
        clientName="Zé"
        managementToken="test-private-token"
        clientPhone="11999998888"
        businessName="Barbearia São João"
        region="PT"
        cancelCutoffHours={2}
        autoConfirmEnabled={props.autoConfirmEnabled}
        onCancelled={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('ClientBookingCard — confirmação automática: 15 min para cancelar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast: vi.fn() });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('5 min depois de agendar: Cancelar online, mesmo dentro do prazo', () => {
    vi.setSystemTime(new Date('2026-10-04T12:05:00.000Z'));
    renderCard({ autoConfirmEnabled: true });
    expect(screen.getByTestId('client-cancel-cta')).toHaveAttribute('data-cta', 'cancel');
    expect(screen.getByRole('button', { name: /^Cancelar$/ })).toBeInTheDocument();
  });

  it('16 min depois: volta ao prazo (Falar com o estabelecimento)', () => {
    vi.setSystemTime(new Date('2026-10-04T12:16:00.000Z'));
    renderCard({ autoConfirmEnabled: true });
    expect(screen.getByTestId('client-cancel-cta')).toHaveAttribute('data-cta', 'whatsapp');
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
  });

  it('aprovação manual (padrão): sem janela extra', () => {
    vi.setSystemTime(new Date('2026-10-04T12:05:00.000Z'));
    renderCard();
    expect(screen.getByTestId('client-cancel-cta')).toHaveAttribute('data-cta', 'whatsapp');
  });

  it('pedido de alteração não ganha a janela', () => {
    vi.setSystemTime(new Date('2026-10-04T12:05:00.000Z'));
    renderCard({ autoConfirmEnabled: true, booking: { ...booking, is_edit: true } });
    expect(screen.getByTestId('client-cancel-cta')).not.toHaveAttribute('data-cta', 'cancel');
  });
});
