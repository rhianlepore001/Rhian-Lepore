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

const onSuccess = vi.fn();
const props = {
  onClose: vi.fn(),
  onSuccess,
  teamMembers: [
    { id: 'pro-bob', name: 'Bob' },
    { id: 'pro-ana', name: 'Ana' },
  ],
  services: [
    { id: 's-corte', name: 'Corte', price: 40, duration_minutes: 30 },
    { id: 's-combo', name: 'Corte + Barba', price: 70, duration_minutes: 60 },
  ],
  clients: [
    { id: 'cli-aline', name: 'Aline Lima', phone: '' },
    { id: 'cli-bruno', name: 'Bruno Walk-in', phone: '' },
  ],
  onRefreshClients: vi.fn(),
} as unknown as React.ComponentProps<typeof AppointmentWizard>;

// Falta de hoje às 14:00, marcada depois do horário (ex.: 14:15): horário já passou.
const today = new Date();
today.setHours(0, 0, 0, 0);
const slotProps = {
  initialDate: today,
  initialProfessionalId: 'pro-bob',
  initialTime: '14:00',
  slotContext: 'Horário liberado pela falta de Aline Lima às 14:00',
};

describe('AppointmentWizard — "Usar este horário" da falta', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    showToast.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  it('abre no passo Cliente, vazio, com profissional/horário da falta visíveis', () => {
    render(<AppointmentWizard {...props} {...slotProps} />);
    expect(screen.getByText('Novo Atendimento')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-slot-context')).toHaveTextContent('Horário liberado pela falta de Aline Lima às 14:00');
    expect(screen.getByTestId('wizard-slot-summary')).toHaveTextContent(/^Bob · .+ · 14:00$/);
    expect(screen.getByTestId('client-step')).toHaveAttribute('data-selected', '');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('outro cliente + serviço -> pula Horário -> cria NOVO agendamento no horário (já passado) da falta', async () => {
    render(<AppointmentWizard {...props} {...slotProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno Walk-in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByTestId('service-step')).toHaveAttribute('data-selected', ''); // serviço não vem preenchido
    await userEvent.click(screen.getByRole('button', { name: 'serviço Corte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    // Direto no Confirmar (sem passo Horário)
    expect(screen.queryByText('Horário', { selector: 'h4' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar Atendimento' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      professionalId: 'pro-bob',
      clientId: 'cli-bruno',
      customerName: 'Bruno Walk-in',
      serviceIds: ['s-corte'],
      durationMinutes: 30,
      status: 'Confirmed',
      notes: null,
    });
    const when = payload.appointmentTime as Date;
    expect([when.getFullYear(), when.getMonth(), when.getDate(), when.getHours(), when.getMinutes()])
      .toEqual([today.getFullYear(), today.getMonth(), today.getDate(), 14, 0]);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('Voltar no Confirmar leva ao Horário (para trocar), com 14:00 selecionado', async () => {
    render(<AppointmentWizard {...props} {...slotProps} initialTime="14:15" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Aline Lima' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'serviço Corte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    expect(screen.getByText('Horário', { selector: 'h4' })).toBeInTheDocument();
    // horário fora da grade de 30 min aparece na lista
    expect(screen.getByRole('button', { name: '14:15' })).toBeInTheDocument();
  });

  it('serviço maior que o intervalo livre: banco recusa e a mensagem explica', async () => {
    mutateAsync.mockResolvedValue({ success: false, message: 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.' });
    render(<AppointmentWizard {...props} {...slotProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno Walk-in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'serviço Corte + Barba' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(mutateAsync.mock.calls[0][0].durationMinutes).toBe(60);
    expect(showToast).toHaveBeenCalledWith(
      'Esse horário não está livre para 60 min: Bob já tem outro agendamento entre 14:00 e 15:00. Escolha outro horário ou serviços mais curtos.',
      'warning',
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('sem falta (célula vazia comum): mantém o passo Horário', async () => {
    render(<AppointmentWizard {...props} initialDate={today} initialProfessionalId="pro-bob" initialTime="10:00" />);
    expect(screen.queryByTestId('wizard-slot-context')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'cliente Aline Lima' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('button', { name: 'serviço Corte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Horário', { selector: 'h4' })).toBeInTheDocument();
  });
});
