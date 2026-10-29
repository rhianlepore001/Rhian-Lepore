import type { WhatsAppTemplateKey, WhatsAppTemplateOverride, WhatsAppTemplateVars, WhatsAppTheme, TemplateVariant } from '../../utils/whatsappTemplates';
const messageOverrides = vi.hoisted(() => ({} as Partial<Record<WhatsAppTemplateKey, WhatsAppTemplateOverride>>));
vi.mock('../../hooks/useWhatsAppTemplates', async () => {
  const { renderWhatsAppTemplate } = await import('../../utils/whatsappTemplates');
  return { useWhatsAppTemplates: () => ({ templates: messageOverrides, isEnabled: (key: WhatsAppTemplateKey) => messageOverrides[key]?.enabled !== false, render: (key: WhatsAppTemplateKey, theme: WhatsAppTheme, vars: WhatsAppTemplateVars, variant?: TemplateVariant) => renderWhatsAppTemplate(key, theme, vars, variant, messageOverrides[key]) }) };
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
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
vi.mock('../../hooks/useClientDependents', () => ({ useClientDependents: () => ({ dependents: [
  { id: 'dep-a', name: 'Dependente Fictício A', nickname: null },
  { id: 'dep-b', name: 'Dependente Fictício B', nickname: null },
], loading: false, error: '', reload: vi.fn() }) }));
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
    delete messageOverrides.wizard_confirm;
    mutateAsync.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  it.each([true, false])('mensagem salva: ativa=%s controla caixa e envio', async enabled => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    messageOverrides.wizard_confirm = { message_key: 'wizard_confirm', enabled, body: 'Oi {cliente}, até {hora}!' };
    render(<AppointmentWizard {...props} clients={[{ id: 'cli-bruno', name: 'Bruno', phone: '11987654321' }]} initialDate={new Date(2026, 8, 28)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    expect(screen.queryByTestId('review-whatsapp') !== null).toBe(enabled);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    if (enabled) expect(new URL(String(open.mock.calls[0][0])).searchParams.get('text')).toBe('Oi Bruno, até 10:00!');
    else expect(open).not.toHaveBeenCalled();
    open.mockRestore();
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

describe('AppointmentWizard: retorno do agendamento criado', () => {
  it('onSuccess recebe a data/hora e { id, professionalId } do agendamento criado', async () => {
    mutateAsync.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'apt-123' });
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 8, 28)} initialProfessionalId="pro-ana" initialTime="18:30" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    const [when, created] = onSuccess.mock.calls[0];
    expect([when.getDate(), when.getHours(), when.getMinutes()]).toEqual([28, 18, 30]);
    expect(created).toEqual({ id: 'apt-123', professionalId: 'pro-ana' });
  });
});


describe('AppointmentWizard: persistent review', () => {
  it('restores price, discount and notes without replacing manual values; closing clears nested client draft', async () => {
    const prefix = 'agendix:draft:v1:company-1:staff-user:';
    sessionStorage.setItem(`${prefix}appointment:wizard`, JSON.stringify({ v: 1, savedAt: Date.now(), data: {
      step: 4, selectedClientId: 'cli-bruno', selectedServiceIds: ['s-corte'], selectedProId: 'pro-bob',
      selectedDate: '2026-09-28', selectedTime: '10:00', customPrice: '72.50', discount: '10', notes: 'Nota fictícia',
    } }));
    sessionStorage.setItem(`${prefix}appointment:new-client`, '{}');
    render(<AppointmentWizard {...props} />);
    await waitFor(() => expect(screen.getByLabelText('Preço final')).toHaveValue(72.5));
    expect(screen.getByLabelText('Desconto (%)')).toHaveValue(10);
    expect(screen.getByLabelText('Observações internas')).toHaveValue('Nota fictícia');
    await userEvent.click(screen.getByRole('button', { name: /^Fechar$/ }));
    expect(sessionStorage.getItem(`${prefix}appointment:wizard`)).toBeNull();
    expect(sessionStorage.getItem(`${prefix}appointment:new-client`)).toBeNull();
  });

  it('drops removed client, service and professional IDs when restoring', async () => {
    sessionStorage.setItem('agendix:draft:v1:company-1:staff-user:appointment:wizard', JSON.stringify({ v: 1, savedAt: Date.now(), data: {
      step: 1, selectedClientId: 'removed-client', selectedServiceIds: ['removed-service'], selectedProId: 'removed-professional',
    } }));
    render(<AppointmentWizard {...props} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled());
    act(() => window.dispatchEvent(new Event('pagehide')));
    const data = JSON.parse(sessionStorage.getItem('agendix:draft:v1:company-1:staff-user:appointment:wizard')!).data;
    expect(data.selectedClientId).toBe('');
    expect(data.selectedServiceIds).toEqual([]);
    expect(data.selectedProId).toBe('');
  });
});


describe('AppointmentWizard: dependentes e sequência', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });
  it('agenda somente o dependente e mantém o clientId do titular', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 10, 1)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Para quem?' }), 'dep-a');
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
    expect(screen.getByText('Responsável: Bruno')).toBeInTheDocument();
    expect(screen.getByText(/Atendido\(a\): Dependente Fictício A/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'cli-bruno', dependentId: 'dep-a', customerName: 'Bruno' }));
  });
  it('envia serviços por pessoa e mostra total e horários consecutivos', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 10, 1)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Para quem?' }), 'dep-a');
    await userEvent.click(screen.getByText('Corte Social'));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar outra pessoa' }));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    const card = within(screen.getByTestId('extra-attendee-card'));
    await userEvent.selectOptions(card.getByRole('combobox', { name: 'Para quem?' }), 'dep-b');
    await userEvent.click(card.getByText('Corte Social'));
    await next();
    const rows = screen.getAllByTestId('group-review-person');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent(/Dependente Fictício B/);
    expect(rows[1]).toHaveTextContent(/Corte Social/);
    expect(rows[1]).toHaveTextContent(/10:30/);
    expect(screen.getByTestId('wizard-footer-total')).toHaveTextContent(/80,00/);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'cli-bruno', attendees: [
      { dependentId: 'dep-a', serviceIds: ['s-corte'], totalPrice: 40 },
      { dependentId: 'dep-b', serviceIds: ['s-corte'], totalPrice: 40 },
    ] }));
  });
  it('cada pessoa escolhe serviços como o titular e pode ter outro profissional, ao mesmo tempo', async () => {
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 10, 1)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar outra pessoa' }));
    const card = within(screen.getByTestId('extra-attendee-card'));
    expect(card.getByRole('textbox', { name: 'Buscar serviço' })).toBeInTheDocument();
    expect(card.getByRole('group', { name: 'Filtrar por categoria' })).toBeInTheDocument();
    expect(card.queryByText('Serviço avulso')).not.toBeInTheDocument();
    await userEvent.selectOptions(card.getByRole('combobox', { name: 'Para quem?' }), 'dep-b');
    await userEvent.click(card.getByText('Corte Social'));
    await userEvent.selectOptions(card.getByTestId('extra-attendee-professional'), 'pro-ana');
    await next();
    const rows = screen.getAllByTestId('group-review-person');
    expect(rows[0]).toHaveTextContent(/Bob/);
    expect(rows[0]).toHaveTextContent(/10:00/);
    expect(rows[1]).toHaveTextContent(/Ana/);
    expect(rows[1]).toHaveTextContent(/10:00/);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ professionalId: 'pro-bob', attendees: [
      { dependentId: null, serviceIds: ['s-corte'], totalPrice: 40 },
      { dependentId: 'dep-b', serviceIds: ['s-corte'], totalPrice: 40, professionalId: 'pro-ana' },
    ] }));
  });
  it('conflito de um profissional mostra o aviso e não confirma nada', async () => {
    mutateAsync.mockResolvedValue({ success: false, code: 'sequence_slot_unavailable', message: 'O horário com Ana já está ocupado. Escolha outro horário ou outro profissional.' });
    render(<AppointmentWizard {...props} initialDate={new Date(2026, 10, 1)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" />);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar outra pessoa' }));
    const card = within(screen.getByTestId('extra-attendee-card'));
    await userEvent.selectOptions(card.getByRole('combobox', { name: 'Para quem?' }), 'dep-b');
    await userEvent.click(card.getByText('Corte Social'));
    await userEvent.selectOptions(card.getByTestId('extra-attendee-professional'), 'pro-ana');
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('O horário com Ana já está ocupado. Escolha outro horário ou outro profissional.', 'warning'));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
