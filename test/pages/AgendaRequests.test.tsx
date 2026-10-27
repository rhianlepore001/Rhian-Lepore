import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Agenda } from '../../pages/Agenda';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fictional-owner' }, companyId: 'fictional-company', region: 'BR', role: 'owner', userType: 'barber' }) }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useSettings', () => ({ useBusinessSettings: () => ({ data: { timezone: 'America/Sao_Paulo', machine_fee_enabled: false, debit_fee_percent: 0, credit_fee_percent: 0 } }) }));
vi.mock('../../hooks/useAgendaBlocks', () => ({ useAgendaBlocks: () => ({ data: [] }), useCreateAgendaBlock: () => ({}), useDeleteAgendaBlock: () => ({}) }));
vi.mock('../../hooks/useWhatsAppTemplates', () => ({ useWhatsAppTemplates: () => ({ templates: {}, isEnabled: () => true, render: () => '' }) }));
vi.mock('../../hooks/useAppTour', () => ({ useAppTour: vi.fn() }));
vi.mock('../../hooks/usePendingPublicBookingsLive', () => ({ usePendingPublicBookingsLive: vi.fn() }));
vi.mock('../../hooks/useStaffAppointmentPermission', () => ({ useStaffAppointmentPermission: () => ({ lockProfessionalToSelf: false }) }));
vi.mock('../../components/CheckoutModal', () => ({ CheckoutModal: () => null }));
vi.mock('../../components/agenda/AgendaBlockForm', () => ({ AgendaBlockForm: () => null }));
vi.mock('../../components/agenda/AgendaResourceGrid', () => ({ AgendaResourceGrid: () => null }));
vi.mock('../../components/agenda/AgendaDayScroller', () => ({ AgendaDayScroller: () => null }));
vi.mock('../../components/agenda/AgendaPublicLinkBar', () => ({ AgendaPublicLinkBar: () => null }));
const wizardProps: { current: any } = { current: null };
vi.mock('../../components/AppointmentWizard', () => ({ AppointmentWizard: (props: any) => { wizardProps.current = props; return null; } }));

const calls: string[] = [];
const rpcCalls: string[] = [];

function Driver() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/agenda?date=2026-12-16')}>Próximo dia</button>;
}

const count = (table: string) => calls.filter(t => t === table).length;
const snapshot = () => ({
  appointments: count('appointments'),
  services: count('services'),
  clients: count('clients'),
  service_categories: count('service_categories'),
  team_members: count('team_members'),
  profiles: count('profiles'),
  business_settings: count('business_settings'),
  pending_public_bookings: rpcCalls.filter(n => n === 'list_company_pending_public_bookings').length,
});

describe('Agenda: requisições na montagem e na troca de dia', () => {
  beforeEach(() => {
    calls.length = 0;
    rpcCalls.length = 0;
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      calls.push(table);
      const data = table === 'team_members' ? [{ id: 'pro-fictional', name: 'Profissional Fictício', active: true }] : [];
      const query: any = {
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
        single: () => Promise.resolve({ data: { business_name: 'Empresa Fictícia' }, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'in', 'order', 'not', 'limit', 'is']) query[m] = () => query;
      return query;
    }) as any);
    vi.mocked(supabase.rpc).mockImplementation(((name: string) => { rpcCalls.push(name); return Promise.resolve({ data: [], error: null }); }) as any);
  });

  it('busca cada dado uma única vez ao abrir e só os dados do dia ao trocar de dia', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/agenda?date=2026-12-15']}><Driver /><Agenda /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.queryByText('Carregando agenda...')).not.toBeInTheDocument());
    await new Promise(r => setTimeout(r, 50));

    expect(snapshot()).toEqual({
      appointments: 1, services: 1, clients: 1, service_categories: 1,
      team_members: 1, profiles: 1, business_settings: 0, pending_public_bookings: 1,
    });

    const before = snapshot();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }));
    await waitFor(() => expect(count('appointments')).toBe(before.appointments + 1));
    await new Promise(r => setTimeout(r, 50));
    const after = snapshot();
    expect({
      appointments: after.appointments - before.appointments,
      services: after.services - before.services,
      clients: after.clients - before.clients,
      service_categories: after.service_categories - before.service_categories,
      team_members: after.team_members - before.team_members,
      profiles: after.profiles - before.profiles,
      business_settings: after.business_settings - before.business_settings,
      pending_public_bookings: after.pending_public_bookings - before.pending_public_bookings,
    }).toEqual({ appointments: 1, services: 0, clients: 0, service_categories: 0, team_members: 0, profiles: 0, business_settings: 0, pending_public_bookings: 0 });
  });

  it('cadastrar cliente pela Agenda invalida só a lista de clientes; concluir o wizard recarrega o dia', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/agenda?date=2026-12-15']}><Agenda /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.queryByText('Carregando agenda...')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Novo Agendamento' }));
    const choice = screen.queryByTestId('agenda-choice-new-appointment');
    if (choice) fireEvent.click(choice);
    await waitFor(() => expect(wizardProps.current).not.toBeNull());
    const before = snapshot();
    wizardProps.current.onRefreshClients();
    await waitFor(() => expect(count('clients')).toBe(before.clients + 1));
    expect(count('services')).toBe(before.services);
    expect(count('team_members')).toBe(before.team_members);

    const mid = snapshot();
    await wizardProps.current.onSuccess(new Date(2026, 11, 15, 10, 0), { id: 'apt-1', professionalId: 'pro-fictional' });
    await waitFor(() => expect(count('appointments')).toBeGreaterThan(mid.appointments));
    expect(count('services')).toBe(mid.services);
  });
});
