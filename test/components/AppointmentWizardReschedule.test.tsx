import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn();
const showToast = vi.fn();

const countQuery = { select: () => countQuery, eq: () => Promise.resolve({ count: 5 }) };
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn(() => countQuery) } }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'staff-user' }, region: 'BR', businessName: 'Barbearia', companyId: 'company-1' }),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ isBeauty: false, accent: { text: 'text-accent', border: 'border-accent' }, colors: { text: 'text', textMuted: 'muted' } }),
}));
vi.mock('../../hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ establishmentFallback: 'barbearia' }) }));
vi.mock('../../hooks/useScheduling', () => ({ useCreateAppointment: () => ({ mutateAsync }) }));
vi.mock('../../services/publicBooking', () => ({ getFirstAvailableProfessional: vi.fn() }));
vi.mock('../../components/ui', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('@/hooks/useCatalog', () => ({ useProducts: () => ({ data: [] }) }));
vi.mock('@/services/catalog', () => ({ setAppointmentProductLines: vi.fn() }));
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
}));

import { AppointmentWizard } from '../../components/AppointmentWizard';

const props = {
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  teamMembers: [
    { id: 'pro-bob', name: 'Bob' },
    { id: 'pro-ana', name: 'Ana' },
  ],
  services: [{ id: 's-corte', name: 'Corte Masculino', price: 45, duration_minutes: 30 }],
  clients: [{ id: 'cli-aline', name: 'Aline Lima', phone: '' }],
  onRefreshClients: vi.fn(),
} as unknown as React.ComponentProps<typeof AppointmentWizard>;

describe('AppointmentWizard — Reagendar falta (novo agendamento pré-preenchido)', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  it('abre no passo Horário com cliente/serviço/observação e cria um NOVO agendamento', async () => {
    render(
      <AppointmentWizard
        {...props}
        initialDate={new Date(2026, 8, 25)}
        initialProfessionalId="pro-bob"
        initialClientId="cli-aline"
        initialServiceIds={['s-corte']}
        initialNotes="Reagendamento da falta de 23/08 às 06:00."
        initialStep={3}
        rescheduleContext="Aline Lima faltou em 23/08 às 06:00. Escolha o novo horário — a falta continua no histórico."
      />,
    );

    expect(screen.getByText('Reagendar')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-reschedule-context')).toHaveTextContent('a falta continua no histórico');
    expect(screen.getByText('Horário', { selector: 'h4' })).toBeInTheDocument();

    const next = screen.getByRole('button', { name: 'Continuar' });
    expect(next).toBeDisabled(); // falta escolher o horário novo
    await userEvent.click(screen.getByRole('button', { name: '18:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      companyId: 'company-1',
      professionalId: 'pro-bob',
      customerName: 'Aline Lima',
      clientId: 'cli-aline',
      serviceIds: ['s-corte'],
      status: 'Confirmed',
      notes: 'Reagendamento da falta de 23/08 às 06:00.',
    });
    const when = payload.appointmentTime as Date;
    expect([when.getDate(), when.getMonth(), when.getHours(), when.getMinutes()]).toEqual([25, 8, 18, 0]);
    expect(props.onSuccess).toHaveBeenCalled();
  });

  it('sem pré-preenchimento continua como "Novo Atendimento" no passo Cliente', () => {
    render(<AppointmentWizard {...props} />);
    expect(screen.getByText('Novo Atendimento')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-reschedule-context')).toBeNull();
  });
});
