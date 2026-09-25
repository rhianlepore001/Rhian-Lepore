import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { useToast } from '../../components/ui/Toast';

vi.mock('../../services/publicBooking', () => ({ cancelPublicBooking: vi.fn() }));
vi.mock('../../components/ui/Toast', () => ({ useToast: vi.fn() }));

// Agendamento real (Barbearia Bob, PT): 08/09/2026 14:13Z = 15:13 em Lisboa
const booking: ClientBooking = {
  id: 'b1',
  appointment_time: '2026-09-08T14:13:00+00:00',
  status: 'confirmed',
  service_ids: ['s1'],
  service_names: ['Corte'],
  professional_id: 'p1',
  professional_name: 'Mario',
  total_price: 50,
  duration_minutes: 30,
  created_at: '2026-09-01T00:00:00.000Z',
};

function renderCard(props: { region: 'BR' | 'PT'; timeZone?: string }) {
  return render(
    <MemoryRouter>
      <ClientBookingCard
        booking={booking}
        isBeauty={false}
        businessPhone="912345678"
        businessSlug="barbeariasilva"
        clientName="Zé"
        clientPhone="912345678"
        region={props.region}
        timeZone={props.timeZone}
        onCancelled={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('ClientBookingCard — horário no fuso do negócio', () => {
  const originalTz = process.env.TZ;
  beforeEach(() => {
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast: vi.fn() });
  });
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(['America/Sao_Paulo', 'Europe/London', 'UTC', 'Asia/Tokyo'])(
    'negócio PT mostra 15:13 (hora de Lisboa) com navegador em %s',
    (tz) => {
      process.env.TZ = tz;
      renderCard({ region: 'PT' });
      expect(screen.getByText(/15:13/)).toBeInTheDocument();
    },
  );

  it('fuso configurado vence a região (Manaus: 10:13)', () => {
    process.env.TZ = 'Europe/Lisbon';
    renderCard({ region: 'BR', timeZone: 'America/Manaus' });
    expect(screen.getByText(/10:13/)).toBeInTheDocument();
  });
});
