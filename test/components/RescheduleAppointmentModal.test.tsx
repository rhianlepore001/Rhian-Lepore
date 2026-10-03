import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const showToast = vi.fn();
const rpc = vi.fn();
const open = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, companyId: 'owner-1', region: 'PT', businessName: 'Barbearia Bob' }),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: 'text', textMuted: 'muted', inputBg: '', inputBorder: '', divider: 'div', card: '', overlay: '' },
    accent: { text: 'acc', bg: '', bgDim: '', borderDim: '' },
    classes: { modalContainer: '', modalHeader: '', label: '' },
    status: { warning: 'warn' },
    radius: { input: '' },
    isBeauty: false,
  }),
}));
vi.mock('../../components/ui', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children, onClick, disabled, ...rest
  }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean } & Record<string, unknown>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ open: isOpen, title, children, footer }: {
    open: boolean; title?: string; children: React.ReactNode; footer?: React.ReactNode;
  }) => (isOpen ? <div data-testid="reschedule-modal"><h2>{title}</h2>{children}{footer}</div> : null),
}));
vi.mock('../../components/appointment/ScheduleSelection', () => ({
  ScheduleSelection: ({
    selectedTime, setSelectedTime, selectedProId, setSelectedProId, lockProfessional,
  }: {
    selectedTime: string;
    setSelectedTime: (t: string) => void;
    selectedProId: string;
    setSelectedProId: (id: string) => void;
    lockProfessional?: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => setSelectedTime('10:30')}>slot-10:30</button>
      <button type="button" onClick={() => setSelectedTime('00:30')}>slot-00:30</button>
      <button type="button" onClick={() => setSelectedProId('pro-2')} disabled={!!lockProfessional}>pro-2</button>
      <span data-testid="lock-pro">{String(!!lockProfessional)}</span>
      <span data-testid="sel-time">{selectedTime}</span>
      <span data-testid="sel-pro">{selectedProId}</span>
    </div>
  ),
}));
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }) }));
vi.mock('../../utils/rescheduleOccupancy', () => ({
  fetchRescheduleOccupancy: vi.fn().mockResolvedValue([]),
}));

import { RescheduleAppointmentModal } from '../../components/agenda/RescheduleAppointmentModal';

const appointment = {
  id: 'apt-1',
  clientName: 'Aline Lima',
  clientPhone: '+351619923489',
  professional_id: 'pro-1',
  appointment_time: '2026-08-23T05:00:00.000Z',
  duration_minutes: 30,
  status: 'Confirmed',
  service: 'Corte Masculino',
};

const teamMembers = [
  { id: 'pro-1', name: 'Bob' },
  { id: 'pro-2', name: 'Bruna' },
];

const renderModal = (props: Partial<React.ComponentProps<typeof RescheduleAppointmentModal>> = {}) => render(
  <RescheduleAppointmentModal
    open
    appointment={appointment}
    teamMembers={teamMembers}
    shopTimeZone="Europe/Lisbon"
    businessHours={null}
    onClose={vi.fn()}
    onSuccess={vi.fn()}
    {...props}
  />,
);

describe('RescheduleAppointmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: { success: true }, error: null });
    vi.stubGlobal('open', open);
  });

  it('mostra Atual e desabilita confirmar sem mudança (R-09)', () => {
    renderModal();
    expect(screen.getByText('Remarcar horário')).toBeInTheDocument();
    expect(screen.getByTestId('reschedule-current').textContent).toMatch(/Atual:.*23\/08\/2026 às 06:00 com Bob/);
    expect(screen.getByTestId('reschedule-confirm')).toBeDisabled();
  });

  it('aviso de passado (R-08) ao escolher horário já ocorrido', () => {
    renderModal({
      appointment: { ...appointment, appointment_time: new Date().toISOString() },
      now: new Date('2030-01-01T12:00:00.000Z'),
    });
    fireEvent.click(screen.getByText('slot-00:30'));
    expect(screen.getByTestId('reschedule-past-note').textContent).toBe(
      'Esse horário já passou — use para lançar um atendimento que já aconteceu.',
    );
  });

  it('escopo own trava o seletor de profissional', () => {
    renderModal({ lockProfessional: true });
    expect(screen.getByTestId('lock-pro').textContent).toBe('true');
    expect(screen.getByText('pro-2')).toBeDisabled();
  });

  it('WhatsApp marcado por padrão quando o cliente tem telefone', () => {
    renderModal();
    expect(screen.getByLabelText('Avisar o cliente no WhatsApp')).toBeChecked();
  });

  it('WhatsApp escondido quando o cliente não tem telefone', () => {
    renderModal({ appointment: { ...appointment, clientPhone: '' } });
    expect(screen.queryByLabelText('Avisar o cliente no WhatsApp')).toBeNull();
  });

  it('sucesso chama RPC, toast Horário remarcado. e abre wa.me', async () => {
    const onSuccess = vi.fn();
    renderModal({ onSuccess });
    fireEvent.click(screen.getByText('slot-10:30'));
    fireEvent.click(screen.getByTestId('reschedule-confirm'));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc.mock.calls[0][0]).toBe('reschedule_appointment');
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Horário remarcado.', 'success'));
    expect(onSuccess).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
    expect(String(open.mock.calls[0][0])).toContain('https://wa.me/');
  });

  it('mostra erro inline acima de confirmar, limpa no retry e some no sucesso', async () => {
    const busy = 'Esse horário já está ocupado na agenda de Bob. Escolha outro.';
    rpc
      .mockResolvedValueOnce({ data: null, error: { message: busy, hint: 'reschedule_slot_busy' } })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    renderModal();
    fireEvent.click(screen.getByText('slot-10:30'));
    fireEvent.click(screen.getByTestId('reschedule-confirm'));
    expect(await screen.findByTestId('reschedule-inline-error')).toHaveTextContent(busy);
    expect(showToast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('reschedule-confirm'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Horário remarcado.', 'success'));
    expect(screen.queryByTestId('reschedule-inline-error')).toBeNull();
  });
});
