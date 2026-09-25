import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const auth = { user: { id: 'staff-user-1' }, companyId: 'company-owner-1', region: 'BR' };
const eqCalls: Array<[string, unknown]> = [];
const updateResult: { data: unknown; error: unknown } = { data: [{ id: 'apt-1' }], error: null };
const updatePayloads: unknown[] = [];
const showToast = vi.fn();
const onSave = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
        const chain = {
          eq: (col: string, val: unknown) => { eqCalls.push([col, val]); return chain; },
          select: () => Promise.resolve(updateResult),
        };
        return chain;
      },
    }),
  },
}));
vi.mock('focus-trap-react', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../contexts/UIContext', () => ({ useUI: () => ({ setModalOpen: vi.fn() }) }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', inputBg: '', inputBorder: '', divider: '' },
    accent: { text: '', bg: '' },
    classes: { modalContainer: '', modalHeader: '', label: '' },
    status: {},
    radius: { input: '' },
  }),
}));
vi.mock('../../components/ui', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('@/hooks/useCatalog', () => ({ useProducts: () => ({ data: [] }) }));
vi.mock('@/services/catalog', () => ({
  listAppointmentProductLines: vi.fn().mockResolvedValue([]),
  setAppointmentProductLines: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../components/SearchableSelect', () => ({ SearchableSelect: () => null }));
vi.mock('../../components/appointment/ProductLinesPicker', () => ({ ProductLinesPicker: () => null }));

import { AppointmentEditModal } from '../../components/AppointmentEditModal';

const appointment = {
  id: 'apt-1',
  client_id: 'client-1',
  clientName: 'Aline',
  service: 'Corte',
  appointment_time: '2030-01-15T12:00:00.000Z',
  price: 45,
  status: 'Confirmed',
  professional_id: 'member-self',
};
const teamMembers = [{ id: 'member-self', name: 'Eu' }, { id: 'member-other', name: 'Outro' }];
const services = [{ id: 'svc-1', name: 'Corte', price: 45 }];
const clients = [{ id: 'client-1', name: 'Aline' }];

const renderModal = (props: Partial<React.ComponentProps<typeof AppointmentEditModal>> = {}) => render(
  <AppointmentEditModal
    appointment={appointment}
    teamMembers={teamMembers}
    services={services}
    clients={clients}
    onClose={vi.fn()}
    onSave={onSave}
    accentColor="accent-gold"
    currencySymbol="R$"
    {...props}
  />,
);

describe('AppointmentEditModal — colaborador editando', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqCalls.length = 0;
    updatePayloads.length = 0;
    updateResult.data = [{ id: 'apt-1' }];
    updateResult.error = null;
  });

  it('filtra pelo tenant da empresa (companyId), não pelo login do colaborador', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(eqCalls).toContainEqual(['user_id', 'company-owner-1']);
    expect(eqCalls).not.toContainEqual(['user_id', 'staff-user-1']);
    expect(showToast).toHaveBeenCalledWith('Agendamento atualizado com sucesso!', 'success');
  });

  it('0 linhas atualizadas não é mais "sucesso" silencioso', async () => {
    updateResult.data = [];
    renderModal();
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar as alterações. Tente novamente.', 'error'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('bloqueio da trigger vira mensagem clara de permissão', async () => {
    updateResult.data = null;
    updateResult.error = { code: '42501', message: 'staff_appointment_edit_forbidden' };
    renderModal();
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Sua permissão não permite alterar este agendamento. Fale com o dono.', 'error'));
  });

  it('nível "só os próprios": profissional travado em si mesmo, com explicação', () => {
    renderModal({ lockProfessional: true });
    const select = screen.getByLabelText('Profissional') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe('member-self');
    expect(screen.getByText(/não passá-los para outro profissional/)).toBeInTheDocument();
  });

  it('dono / nível "todos": profissional livre', () => {
    renderModal();
    expect((screen.getByLabelText('Profissional') as HTMLSelectElement).disabled).toBe(false);
  });
});
