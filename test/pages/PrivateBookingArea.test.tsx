import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivateBookingArea } from '../../pages/PrivateBookingArea';
import { fetchPublicBookingById } from '../../services/publicBooking';

vi.mock('../../hooks/usePublicBooking', () => ({
  useBusinessProfileBySlug: () => ({ data: { id: 'business-a', business_name: 'Espaço Teste', region: 'BR' }, isLoading: false }),
  useBusinessSettings: () => ({ data: { enable_self_rescheduling: true } }),
  usePublicServices: () => ({ data: [] }),
  usePublicProfessionals: () => ({ data: [] }),
}));
vi.mock('../../services/publicBooking', () => ({ fetchPublicBookingById: vi.fn() }));
vi.mock('../../components/ClientBookingCard', () => ({ ClientBookingCard: ({ managementToken, booking }: any) => <div data-testid="private-card" data-token={managementToken}>{booking.customer_name}</div> }));
const token = 'a'.repeat(64);
function renderArea(query = '') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[`/minha-area/espaco${query}`]}><Routes><Route path="/minha-area/:slug" element={<PrivateBookingArea />} /></Routes></MemoryRouter>
  </QueryClientProvider>);
}
describe('private appointment area', () => {
  beforeEach(() => vi.resetAllMocks());
  it('asks only for the saved private link, without searching by phone', () => {
    renderArea();
    expect(screen.getByText(/abra o link privado/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(fetchPublicBookingById).not.toHaveBeenCalled();
  });
  it('denies invalid/expired link and never renders customer contact', async () => {
    vi.mocked(fetchPublicBookingById).mockResolvedValue(null);
    renderArea(`?booking=booking-a&token=${token}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Link privado inválido ou expirado');
    expect(screen.queryByTestId('private-card')).toBeNull();
  });
  it('loads only the authorized booking and passes its token to management actions', async () => {
    vi.mocked(fetchPublicBookingById).mockResolvedValue({ id: 'booking-a', business_id: 'business-a', customer_name: 'Contato deste pedido', customer_phone: '11999998888', service_ids: [] } as any);
    renderArea(`?booking=booking-a&token=${token}`);
    expect(await screen.findByTestId('private-card')).toHaveAttribute('data-token', token);
    expect(fetchPublicBookingById).toHaveBeenCalledWith('booking-a', 'business-a', token);
  });
  it('does not query malformed tokens', async () => {
    renderArea('?booking=booking-a&token=11999998888');
    await waitFor(() => expect(screen.getByText(/abra o link privado/)).toBeInTheDocument());
    expect(fetchPublicBookingById).not.toHaveBeenCalled();
  });
});
