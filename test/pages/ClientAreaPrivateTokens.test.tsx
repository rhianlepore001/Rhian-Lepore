import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClientArea } from '@/pages/ClientArea';
import { readQueueTicket } from '@/services/queue';
import { usePublicClientMembership, useCancelPublicClientMembership } from '@/hooks/useMemberships';
const fixtures = vi.hoisted(() => ({ cancel: vi.fn(), membership: { membership_id: 'm1' } as any }));
vi.mock('@/hooks/usePublicBooking', () => ({ useBusinessProfileBySlug: () => ({ data: { id: 'business-a', business_name: 'Espaço', user_type: 'beauty' } }) }));
vi.mock('@/hooks/useMemberships', () => ({
  usePublicClientMembership: vi.fn(() => ({ data: fixtures.membership, isPending: false })),
  useCancelPublicClientMembership: vi.fn(() => ({ mutateAsync: fixtures.cancel, isPending: false })),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/components/queue/ClientQueuePanel', () => ({ ClientQueuePanel: ({ businessId }: any) => <p>Senha {readQueueTicket(businessId)?.entryId}</p> }));
vi.mock('@/components/membership/ClientMembershipPanel', () => ({ ClientMembershipPanel: ({ onCancel }: any) => <button onClick={onCancel}>Cancelar meu plano</button> }));
vi.mock('@/components/membership/PublicClubFlow', () => ({ PublicClubFlow: () => <p>Planos disponíveis</p> }));
vi.mock('@/pages/PrivateBookingArea', () => ({ PrivateBookingArea: () => <p>Meu agendamento</p> }));
const token = 'a'.repeat(64);
function renderArea(query: string) {
  return render(<MemoryRouter initialEntries={[`/minha-area/espaco?${query}`]}><Routes><Route path="/minha-area/:slug" element={<ClientArea />} /></Routes></MemoryRouter>);
}
describe('anonymous private client portal', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks(); fixtures.membership = { membership_id: 'm1' }; fixtures.cancel.mockResolvedValue('m1'); });
  it('opens a queue link on another device without asking for a phone, name or account', async () => {
    renderArea(`tab=fila&queue=q1&token=${token}`);
    expect(await screen.findByText('Senha q1')).toBeInTheDocument();
    expect(readQueueTicket('business-a')).toMatchObject({ entryId: 'q1', token });
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('restores the membership panel and cancels via the private token without a phone gate', async () => {
    renderArea(`tab=clube&token=${token}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar meu plano' }));
    await waitFor(() => expect(fixtures.cancel).toHaveBeenCalledTimes(1));
    expect(usePublicClientMembership).toHaveBeenCalledWith('business-a', token);
    expect(useCancelPublicClientMembership).toHaveBeenCalledWith('business-a', token);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('asks for the establishment when there is no saved membership token', async () => {
    renderArea('tab=clube');
    expect(await screen.findByText(/Se perdeu o link, fale com o estabelecimento/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar meu plano' })).toBeNull();
  });
  it('does not render membership details for an invalid private link', async () => {
    fixtures.membership = null;
    renderArea(`tab=clube&token=${token}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Link privado inválido ou expirado');
    expect(screen.queryByRole('button', { name: 'Cancelar meu plano' })).toBeNull();
  });
});
