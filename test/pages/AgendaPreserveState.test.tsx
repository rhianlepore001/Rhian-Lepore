import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Agenda } from '../../pages/Agenda';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fictional-owner' }, companyId: 'fictional-company', region: 'BR', role: 'owner', userType: 'barber' }) }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useSettings', () => ({ useBusinessSettings: () => ({ data: { timezone: 'America/Sao_Paulo' } }) }));
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }), useCreateAgendaBlock: () => ({}), useDeleteAgendaBlock: () => ({}) }));
vi.mock('../../hooks/useWhatsAppTemplates', async () => {
  const { renderWhatsAppTemplate } = await import('../../utils/whatsappTemplates');
  return { useWhatsAppTemplates: () => ({ templates: {}, isEnabled: () => true, render: (key: any, theme: any, vars: any, variant?: any) => renderWhatsAppTemplate(key, theme, vars, variant) }) };
});
vi.mock('../../hooks/useAppTour', () => ({ useAppTour: vi.fn() }));
vi.mock('../../hooks/usePendingPublicBookingsLive', () => ({ usePendingPublicBookingsLive: vi.fn() }));
vi.mock('../../hooks/useStaffAppointmentPermission', () => ({ useStaffAppointmentPermission: () => ({ lockProfessionalToSelf: false }) }));
vi.mock('../../components/CheckoutModal', () => ({ CheckoutModal: () => null }));
vi.mock('../../components/agenda/AgendaBlockForm', () => ({ AgendaBlockForm: () => null }));
vi.mock('../../components/agenda/AgendaResourceGrid', () => ({ AgendaResourceGrid: () => null }));
vi.mock('../../components/agenda/AgendaDayScroller', () => ({ AgendaDayScroller: () => null }));
vi.mock('../../components/agenda/AgendaPublicLinkBar', () => ({ AgendaPublicLinkBar: () => null }));
vi.mock('../../components/AppointmentWizard', () => ({ AppointmentWizard: () => <input aria-label="Wizard field" defaultValue="" /> }));

function Driver() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/agenda?date=2026-12-16')}>Refresh agenda</button>;
}

describe('Agenda preserves mounted wizard during refetch', () => {
  it('keeps the same input and its contents during and after a pending fetch', async () => {
    let gate = Promise.resolve();
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const data = table === 'team_members' ? [{ id: 'pro-fictional', name: 'Profissional Fictício', active: true }] : [];
      const query: any = {
        then: (resolve: (value: unknown) => unknown) => gate.then(() => resolve({ data, error: null })),
        single: () => gate.then(() => ({ data: { business_name: 'Empresa Fictícia' }, error: null })),
        maybeSingle: () => gate.then(() => ({ data: null, error: null })),
      };
      for (const method of ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'in', 'order', 'not', 'limit', 'is']) query[method] = () => query;
      return query;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any);
    render(<MemoryRouter initialEntries={['/agenda?date=2026-12-15']}><Driver /><Agenda /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Carregando agenda...')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Novo Agendamento' }));
    const choice = screen.queryByTestId('agenda-choice-new-appointment');
    if (choice) fireEvent.click(choice);
    const input = await screen.findByLabelText('Wizard field');
    fireEvent.change(input, { target: { value: 'Texto fictício preservado' } });
    let release: () => void = () => {};
    gate = new Promise<void>(resolve => { release = resolve; });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh agenda' }));
    expect(screen.getByLabelText('Wizard field')).toBe(input);
    expect(input).toHaveValue('Texto fictício preservado');
    expect(screen.queryByText('Carregando agenda...')).not.toBeInTheDocument();
    await act(async () => { release(); await gate; });
    expect(screen.getByLabelText('Wizard field')).toBe(input);
    expect(input).toHaveValue('Texto fictício preservado');
  });
});
