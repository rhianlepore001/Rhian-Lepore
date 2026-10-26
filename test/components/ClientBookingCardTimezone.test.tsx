vi.mock('../../hooks/useWhatsAppTemplates', async () => {
  const { renderWhatsAppTemplate } = await import('../../utils/whatsappTemplates');
  return { useWhatsAppTemplates: () => ({ templates: {}, isEnabled: () => true, render: renderWhatsAppTemplate }) };
});

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { useToast } from '../../components/ui/Toast';

vi.mock('../../services/publicBooking', () => ({ cancelPublicBooking: vi.fn() }));
vi.mock('../../components/ui/Toast', () => ({ useToast: vi.fn() }));

const booking: ClientBooking = {
  id: 'b1',
  appointment_time: '2000-07-15T12:00:00+00:00',
  status: 'confirmed',
  service_ids: ['s1'],
  service_names: ['Serviço Exemplo'],
  professional_id: 'p1',
  professional_name: 'Profissional Exemplo',
  total_price: 50,
  duration_minutes: 30,
  created_at: '2000-07-01T00:00:00.000Z',
};

function renderCard(props: { region: 'BR' | 'PT'; timeZone?: string }) {
  return render(
    <MemoryRouter>
      <ClientBookingCard
        booking={booking}
        isBeauty={false}
        businessPhone="000000000"
        businessSlug="negocio-exemplo"
        clientName="Cliente Exemplo"
        clientPhone="000000000"
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
    'negócio PT mostra 13:00 (hora de Lisboa) com navegador em %s',
    (tz) => {
      process.env.TZ = tz;
      renderCard({ region: 'PT' });
      expect(screen.getByText(/13:00/)).toBeInTheDocument();
    },
  );

  it('fuso configurado vence a região (Manaus: 08:00)', () => {
    process.env.TZ = 'Europe/Lisbon';
    renderCard({ region: 'BR', timeZone: 'America/Manaus' });
    expect(screen.getByText(/08:00/)).toBeInTheDocument();
  });
});
