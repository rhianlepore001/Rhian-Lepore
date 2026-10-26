import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartRebooking } from '../../components/dashboard/SmartRebooking';
import { ClientMembershipPanel } from '../../components/membership/ClientMembershipPanel';
import type { PublicClientMembership } from '../../services/memberships';
import type { WhatsAppTemplateOverride } from '../../utils/whatsappTemplates';
import * as service from '../../services/whatsappTemplates';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    companyId: 'tenant-a',
    role: 'owner',
    userType: 'beauty',
    region: 'PT',
  }),
}));
vi.mock('../../hooks/useSmartRebooking', () => ({
  useSmartRebooking: () => ({
    loading: false,
    suggestions: [
      {
        clientId: 'alex',
        clientName: 'Cliente Exemplo',
        clientPhone: '000000000',
        urgency: 'now',
        avgCadenceDays: 30,
        daysSinceLastVisit: 40,
        avgTicket: 50,
      },
    ],
  }),
}));
vi.mock('../../hooks/useMemberships', () => ({
  usePublicPixConfig: () => ({ data: null }),
}));
vi.mock('../../services/whatsappTemplates', () => ({
  fetchWhatsAppTemplates: vi.fn(),
  fetchPublicWhatsAppTemplates: vi.fn(),
  saveWhatsAppTemplate: vi.fn(),
}));

function mount(children: React.ReactNode, row: WhatsAppTemplateOverride) {
  vi.mocked(service.fetchWhatsAppTemplates).mockResolvedValue([row]);
  vi.mocked(service.fetchPublicWhatsAppTemplates).mockResolvedValue([row]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('pontos de envio com mensagens carregadas', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([true, false])(
    'convite para nova visita: ativa=%s',
    async (enabled) => {
      mount(<SmartRebooking />, {
        message_key: 'rebooking',
        enabled,
        body: 'Vamos agendar, {primeiro_nome}?',
      });
      await waitFor(() =>
        expect(service.fetchWhatsAppTemplates).toHaveBeenCalledWith('tenant-a'),
      );
      await waitFor(() =>
        expect(screen.getByTitle('Enviar WhatsApp')).toHaveAttribute(
          'href',
          enabled
            ? 'https://wa.me/351000000000?text=Vamos%20agendar%2C%20Cliente%3F'
            : 'https://wa.me/351000000000',
        ),
      );
    },
  );
  for (const state of ['pending', 'overdue'] as const) {
    it.each([true, false])(`assinatura ${state}: ativa=%s`, async (enabled) => {
      const membership = {
        effective_status: state,
        stored_status: state,
        plan_name: 'Essencial',
        service_names: [],
        price_cents: 5000,
        usage_this_period: 0,
      } as unknown as PublicClientMembership;
      mount(
        <ClientMembershipPanel
          membership={membership}
          slug="studio"
          isBeauty
          region="PT"
          businessPhone="000000000"
          businessName="Negócio Exemplo"
          clientName="Cliente Exemplo"
        />,
        {
          message_key:
            state === 'pending' ? 'membership_pending' : 'membership_overdue',
          enabled,
          body: 'Meu plano {plano}, aqui é {primeiro_nome}.',
        },
      );
      await waitFor(() =>
        expect(service.fetchPublicWhatsAppTemplates).toHaveBeenCalledWith(
          'studio',
        ),
      );
      const link = screen.getByRole('link', {
        name:
          state === 'pending'
            ? 'Falar com o estabelecimento'
            : 'Falar para renovar',
      });
      await waitFor(() =>
        expect(link).toHaveAttribute(
          'href',
          enabled
            ? 'https://wa.me/351000000000?text=Meu%20plano%20Essencial%2C%20aqui%20%C3%A9%20Cliente.'
            : 'https://wa.me/351000000000',
        ),
      );
    });
  }
});
