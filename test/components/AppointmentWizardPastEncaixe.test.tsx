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
  useBrutalTheme: () => ({ isBeauty: false, accent: { text: 'text-accent', border: 'border-accent', bg: 'bg-accent' }, colors: { text: 'text', textMuted: 'muted', textSecondary: 'sec' } }),
}));
vi.mock('../../hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ establishmentFallback: 'barbearia' }) }));
vi.mock('../../hooks/useScheduling', () => ({ useCreateAppointment: () => ({ mutateAsync }) }));
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }) }));
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
// Seleção de cliente/serviço simplificada (o componente real usa busca com dropdown)
vi.mock('../../components/appointment/ClientSelection', () => ({
  ClientSelection: ({ clients, selectedClientId, setSelectedClientId }: { clients: Array<{ id: string; name: string }>; selectedClientId: string; setSelectedClientId: (id: string) => void }) => (
    <div data-testid="client-step" data-selected={selectedClientId}>
      {clients.map((c) => <button key={c.id} type="button" onClick={() => setSelectedClientId(c.id)}>cliente {c.name}</button>)}
    </div>
  ),
}));
vi.mock('../../components/appointment/ServiceList', () => ({
  ServiceList: ({ services, selectedServiceIds, toggleService }: { services: Array<{ id: string; name: string }>; selectedServiceIds: string[]; toggleService: (id: string) => void }) => (
    <div data-testid="service-step" data-selected={selectedServiceIds.join(',')}>
      {services.map((s) => <button key={s.id} type="button" onClick={() => toggleService(s.id)}>serviço {s.name}</button>)}
    </div>
  ),
}));

import { AppointmentWizard } from '../../components/AppointmentWizard';

const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const open = (start: string, end: string) => ({ isOpen: true, blocks: [{ start, end }] });
const HOURS = {
  mon: open('09:00', '18:00'), tue: open('09:00', '18:00'), wed: open('09:00', '18:00'),
  thu: open('09:00', '18:00'), fri: open('09:00', '18:00'), sat: open('09:00', '14:00'), sun: { isOpen: false, blocks: [] },
};
const onSuccess = vi.fn();
const props = {
  onClose: vi.fn(),
  onSuccess,
  teamMembers: [{ id: 'pro-bob', name: 'Bob' }, { id: 'pro-ana', name: 'Ana' }],
  services: [{ id: 's-corte', name: 'Corte', price: 40, duration_minutes: 30 }],
  clients: [{ id: 'cli-bruno', name: 'Bruno Walk-in', phone: '' }],
  onRefreshClients: vi.fn(),
  businessHours: HOURS,
  shopTimeZone: DEVICE_TZ,
} as unknown as React.ComponentProps<typeof AppointmentWizard>;

async function toScheduleStep() {
  await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno Walk-in' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('button', { name: 'serviço Corte' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('AppointmentWizard — encaixe no passado e fora do expediente', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  it('"+" da grade às 22:30 (fora do expediente): horário aparece selecionado e o agendamento é criado', async () => {
    const monday = new Date(2026, 8, 28);
    render(<AppointmentWizard {...props} initialDate={monday} initialProfessionalId="pro-bob" initialTime="22:30" />);
    await toScheduleStep();
    expect(screen.getByRole('button', { name: /fora do expediente/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '22:30' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    const when = mutateAsync.mock.calls[0][0].appointmentTime as Date;
    expect([when.getDate(), when.getHours(), when.getMinutes()]).toEqual([28, 22, 30]);
  });

  it('dia passado (ontem): escolhe um horário do expediente e o wizard envia a data passada', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    render(<AppointmentWizard {...props} initialDate={yesterday} initialProfessionalId="pro-bob" businessHours={null} />);
    await toScheduleStep();
    await userEvent.click(screen.getByRole('button', { name: '10:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    const when = mutateAsync.mock.calls[0][0].appointmentTime as Date;
    expect(when.getTime()).toBeLessThan(Date.now());
    expect([when.getDate(), when.getHours()]).toEqual([yesterday.getDate(), 10]);
    expect(onSuccess).toHaveBeenCalled();
  });
});
