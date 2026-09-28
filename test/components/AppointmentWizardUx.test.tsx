import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
vi.mock('../../components/SearchableSelect', () => ({
  SearchableSelect: ({ options, onChange }: { options: Array<{ id: string; name: string }>; onChange: (id: string) => void }) => (
    <div>{options.map((o) => <button key={o.id} type="button" onClick={() => onChange(o.id)}>cliente {o.name}</button>)}</div>
  ),
}));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => <input aria-label="telefone" /> }));

import { AppointmentWizard } from '../../components/AppointmentWizard';

const onSuccess = vi.fn();
const props = {
  onClose: vi.fn(),
  onSuccess,
  teamMembers: [
    { id: 'pro-bob', name: 'Bob' }, { id: 'pro-ana', name: 'Ana' }, { id: 'pro-caio', name: 'Caio' },
    { id: 'pro-dani', name: 'Dani' }, { id: 'pro-edu', name: 'Edu' }, { id: 'pro-fabi', name: 'Fabi' },
  ],
  services: [{ id: 's-corte', name: 'Corte Social', price: 40, duration_minutes: 30, category_id: 'c-cortes', active: true }],
  categories: [{ id: 'c-cortes', name: 'Cortes' }],
  clients: [{ id: 'cli-bruno', name: 'Bruno', phone: '' }],
  onRefreshClients: vi.fn(),
} as unknown as React.ComponentProps<typeof AppointmentWizard>;

const next = () => userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

describe('AppointmentWizard: títulos, passo Horário e passo Confirmar', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  it('títulos são instruções curtas e consistentes em todos os passos', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} />);
    expect(screen.getByRole('heading', { name: 'Escolha o cliente' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    expect(screen.getByRole('heading', { name: 'Selecione os serviços' })).toBeInTheDocument();
    expect(screen.queryByText(/menu de serviços/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    expect(screen.getByRole('heading', { name: 'Escolha o profissional' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selecione a data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Escolha o horário' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Bob/ }));
    await userEvent.click(screen.getByRole('button', { name: '10:00' }));
    await next();
    expect(screen.getByRole('heading', { name: 'Confira o atendimento' })).toBeInTheDocument();
  });

  it('passo Horário: lista de profissionais sem caixa de rolagem interna (todos visíveis) e data compacta', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    const list = screen.getByTestId('wizard-pro-list');
    expect(list.className).not.toMatch(/overflow-y-auto|max-h-/);
    expect(within(list).getAllByRole('button')).toHaveLength(6);
    // "Disponível" era fixo (não refletia agenda) — removido
    expect(within(list).queryByText('Disponível')).not.toBeInTheDocument();
    const date = screen.getByTestId('wizard-date-picker');
    expect(date).toHaveTextContent(/28/);
    expect(within(date).getByRole('button', { name: /dia anterior/i })).toBeInTheDocument();
    expect(within(date).getByRole('button', { name: /próximo dia/i })).toBeInTheDocument();
  });

  it('passo Confirmar: total sempre visível ao lado do botão, sem "Forma de pagamento", e cria com pagamento "definir depois" (null)', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} initialProfessionalId="pro-bob" initialTime="10:00" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    await next();
    const footerTotal = screen.getByTestId('wizard-footer-total');
    expect(footerTotal).toHaveTextContent(/40,00/);
    const footer = screen.getByTestId('wizard-footer');
    expect(footer.contains(footerTotal)).toBe(true);
    expect(within(footer).getByRole('button', { name: 'Confirmar Atendimento' })).toBeInTheDocument();
    expect(screen.queryByText(/forma de pagamento/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0][0].paymentMethod).toBeNull();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('"Usar este horário" (slotContext): Serviços vai direto para Confirmar; conflito continua mostrando aviso', async () => {
    mutateAsync.mockResolvedValue({ success: false, message: 'conflict' });
    render(
      <AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} initialProfessionalId="pro-bob" initialTime="10:00"
        slotContext="Horário liberado pela falta de Aline às 10:00" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    expect(screen.getByRole('heading', { name: 'Confira o atendimento' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'warning');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('AppointmentWizard: rolagem por passo', () => {
  it('cada passo começa do topo (não herda a rolagem do passo anterior)', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} />);
    const content = screen.getByTestId('wizard-content');
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    content.scrollTop = 480;
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    expect(screen.getByRole('heading', { name: 'Escolha o profissional' })).toBeInTheDocument();
    expect(content.scrollTop).toBe(0);
  });
});
