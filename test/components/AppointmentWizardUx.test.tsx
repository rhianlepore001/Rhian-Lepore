import type { WhatsAppTemplateKey, WhatsAppTemplateOverride, WhatsAppTemplateVars, WhatsAppTheme, TemplateVariant } from '../../utils/whatsappTemplates';
const messageOverrides = vi.hoisted(() => ({} as Partial<Record<WhatsAppTemplateKey, WhatsAppTemplateOverride>>));
vi.mock('../../hooks/useWhatsAppTemplates', async () => {
  const { renderWhatsAppTemplate } = await import('../../utils/whatsappTemplates');
  return { useWhatsAppTemplates: () => ({ templates: messageOverrides, saving: false, save: async (row: WhatsAppTemplateOverride) => { messageOverrides[row.message_key] = row; return row; }, restore: async () => undefined, isEnabled: (key: WhatsAppTemplateKey) => messageOverrides[key]?.enabled !== false, render: (key: WhatsAppTemplateKey, theme: WhatsAppTheme, vars: WhatsAppTemplateVars, variant?: TemplateVariant) => renderWhatsAppTemplate(key, theme, vars, variant, messageOverrides[key]) }) };
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn();
const showToast = vi.fn();

const countQuery = { select: () => countQuery, eq: () => Promise.resolve({ count: 5 }) };
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn(() => countQuery) } }));
const authRole = vi.hoisted(() => ({ role: 'owner' as 'owner' | 'staff' }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'staff-user' }, region: 'BR', businessName: 'Barbearia', companyId: 'company-1', role: authRole.role }),
}));
vi.mock('../../hooks/useSettings', () => ({ useProfileFields: () => ({ data: { phone: '' } }) }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ isBeauty: false, theme: 'barber', accent: { text: 'text-accent', border: 'border-accent', bg: 'bg-accent', bgDim: 'bg-dim' }, colors: { text: 'text', textMuted: 'muted', textSecondary: 'sec', border: 'b', card: 'c' }, classes: { buttonPrimary: 'p', buttonGhost: 'g', input: 'i' }, radius: { button: 'r', card: 'r', badge: 'r' } }),
}));
vi.mock('../../hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ establishmentFallback: 'barbearia' }) }));
vi.mock('../../hooks/useScheduling', () => ({ useCreateAppointment: () => ({ mutateAsync }) }));
vi.mock('../../hooks/useClientDependents', () => ({ useClientDependents: () => ({ dependents: [
  { id: 'dep-a', name: 'Dependente Fictício A', nickname: null },
  { id: 'dep-b', name: 'Dependente Fictício B', nickname: null },
], loading: false, error: '', reload: vi.fn() }) }));
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }) }));
vi.mock('../../services/publicBooking', () => ({ getFirstAvailableProfessional: vi.fn() }));
vi.mock('../../components/ui', async () => {
  const Modal = ({ open, title, children, footer }: { open: boolean; title?: string; children: React.ReactNode; footer?: React.ReactNode }) => (open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null);
  const Button = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>;
  return { useToast: () => ({ showToast }), Modal, Button, ConfirmModal: () => null };
});
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('@/hooks/useCatalog', () => ({ useProducts: () => ({ data: [] }) }));
vi.mock('@/services/catalog', () => ({ setAppointmentProductLines: vi.fn() }));
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ open, title, children, footer }: { open: boolean; title?: string; children: React.ReactNode; footer?: React.ReactNode }) => (open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null),
}));
vi.mock('../../components/SearchableSelect', () => ({
  SearchableSelect: ({ options, onChange }: { options: Array<{ id: string; name: string }>; onChange: (id: string) => void }) => (
    <div>{options.map((o) => <button key={o.id} type="button" onClick={() => onChange(o.id)}>cliente {o.name}</button>)}</div>
  ),
}));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => <input aria-label="telefone" /> }));

import { AppointmentWizard } from '../../components/AppointmentWizard';
import { WhatsAppHandoffHost, clearWhatsAppHandoff } from '../../components/whatsapp/WhatsAppHandoff';

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
    authRole.role = 'owner';
    act(() => clearWhatsAppHandoff());
    mutateAsync.mockReset();
    onSuccess.mockReset();
    mutateAsync.mockResolvedValue({ success: true, booking_id: 'new-apt' });
  });

  const withPhone = [{ id: 'cli-bruno', name: 'Bruno', phone: '11987654321' }];
  const toConfirm = async (clients = withPhone) => {
    render(<><AppointmentWizard {...props} clients={clients} initialDate={new Date(2026, 8, 28)} initialProfessionalId="pro-bob" initialTime="10:00" slotContext="Horário disponível" /><WhatsAppHandoffHost /></>);
    await userEvent.click(screen.getByRole('button', { name: 'cliente Bruno' }));
    await next();
    await userEvent.click(screen.getByText('Corte Social'));
    await next();
  };
  const toggle = () => screen.getByRole('checkbox', { name: 'Enviar confirmação no WhatsApp' });
  const handoffText = () => new URL(screen.getByRole('link', { name: /Abrir WhatsApp/ }).getAttribute('href')!).searchParams.get('text');

  it.each([true, false])('chave SEMPRE visível (modelo ativa=%s); ligada usa o texto salvo, com variáveis', async enabled => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    messageOverrides.wizard_confirm = { message_key: 'wizard_confirm', enabled, body: 'Oi {cliente}, {data} às {hora} em {estabelecimento}!' };
    await toConfirm();
    expect(screen.getByTestId('review-whatsapp')).toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    // iPhone: nada de window.open depois do await de salvar; a pessoa toca em "Abrir WhatsApp".
    await waitFor(() => expect(handoffText()).toBe('Oi Bruno, 28/09/2026 às 10:00 em Barbearia!'));
    expect(new URL(screen.getByRole('link', { name: /Abrir WhatsApp/ }).getAttribute('href')!).pathname).toBe('/5511987654321');
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('sem texto salvo, ligada usa o texto padrão com nome, data e hora', async () => {
    await toConfirm();
    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    await waitFor(() => expect(handoffText()).toContain('Bruno'));
    expect(handoffText()).toContain('28/09/2026');
    expect(handoffText()).toContain('10:00');
    expect(handoffText()).not.toMatch(/\{\w+\}/);
  });

  it('confirmação no WhatsApp vem DESLIGADA por padrão: sem abrir o WhatsApp se o dono não ligar', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await toConfirm();
    expect(toggle()).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Abrir WhatsApp/ })).toBeNull();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('cliente sem telefone: chave visível, avisa e não oferece WhatsApp', async () => {
    await toConfirm([{ id: 'cli-bruno', name: 'Bruno', phone: '' }]);
    await userEvent.click(toggle());
    expect(screen.getByText('Cliente sem telefone cadastrado.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Abrir WhatsApp/ })).toBeNull();
  });

  it('"Personalizar mensagem" abre o editor por cima, salva e o envio usa o texto novo sem perder o atendimento', async () => {
    await toConfirm();
    await userEvent.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    const editor = screen.getByRole('dialog', { name: 'Novo agendamento' });
    const input = within(editor).getByLabelText('Texto da mensagem');
    await userEvent.clear(input);
    fireEvent.change(input, { target: { value: 'Fechado, {cliente}! {data} {hora}.' } });
    await userEvent.click(within(editor).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByLabelText('Texto da mensagem')).toBeNull());
    // O atendimento continua no passo Confirmar, com o mesmo cliente e serviço.
    expect(screen.getByRole('button', { name: 'Confirmar Atendimento' })).toBeInTheDocument();
    expect(screen.getByTestId('review-whatsapp')).toBeInTheDocument();
    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Atendimento' }));
    await waitFor(() => expect(handoffText()).toBe('Fechado, Bruno! 28/09/2026 10:00.'));
  });

  it('profissional (não gestor) não vê "Personalizar mensagem"', async () => {
    authRole.role = 'staff';
    await toConfirm();
    expect(screen.getByTestId('review-whatsapp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Personalizar mensagem' })).toBeNull();
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
