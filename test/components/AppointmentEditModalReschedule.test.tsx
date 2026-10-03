import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const auth = { user: { id: 'staff-user-1' }, companyId: 'company-owner-1', region: 'BR' };
const eqCalls: Array<[string, unknown]> = [];
const updateResult: { data: unknown; error: unknown } = { data: [{ id: 'apt-1' }], error: null };
const updatePayloads: Record<string, unknown>[] = [];
const showToast = vi.fn();
const onSave = vi.fn();
const onReschedule = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
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
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }) }));
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

describe('T-V13 AppointmentEditModal — data/hora/profissional só leitura + Remarcar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqCalls.length = 0;
    updatePayloads.length = 0;
    updateResult.data = [{ id: 'apt-1' }];
    updateResult.error = null;
  });

  it('mostra data, hora e profissional só para leitura e o link Remarcar', () => {
    render(
      <AppointmentEditModal
        appointment={appointment}
        teamMembers={[{ id: 'member-self', name: 'Eu' }, { id: 'member-other', name: 'Outro' }]}
        services={[{ id: 'svc-1', name: 'Corte', price: 45 }]}
        clients={[{ id: 'client-1', name: 'Aline' }]}
        onClose={vi.fn()}
        onSave={onSave}
        onReschedule={onReschedule}
        accentColor="accent-gold"
        currencySymbol="R$"
      />,
    );
    const date = screen.getByLabelText('Data') as HTMLInputElement;
    const time = screen.getByLabelText('Horário');
    const pro = screen.getByLabelText('Profissional') as HTMLSelectElement | HTMLInputElement;
    expect(date).toBeDisabled();
    expect(time).toBeDisabled();
    expect(pro).toBeDisabled();
    fireEvent.click(screen.getByTestId('edit-reschedule-link'));
    expect(onReschedule).toHaveBeenCalledTimes(1);
  });

  it('salvar não envia appointment_time nem professional_id', async () => {
    render(
      <AppointmentEditModal
        appointment={appointment}
        teamMembers={[{ id: 'member-self', name: 'Eu' }]}
        services={[{ id: 'svc-1', name: 'Corte', price: 45 }]}
        clients={[{ id: 'client-1', name: 'Aline' }]}
        onClose={vi.fn()}
        onSave={onSave}
        onReschedule={onReschedule}
        accentColor="accent-gold"
        currencySymbol="R$"
      />,
    );
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(updatePayloads[0]).not.toHaveProperty('appointment_time');
    expect(updatePayloads[0]).not.toHaveProperty('professional_id');
  });
});
