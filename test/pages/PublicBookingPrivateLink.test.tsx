import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicBooking } from '../../pages/PublicBooking';
import { fetchEditBooking } from '../../services/publicBooking';

const fixture = vi.hoisted(() => ({ business: { id: 'business-a', business_name: 'Espaço Teste', user_type: 'beauty', region: 'BR' }, services: [{ id: 's1', name: 'Serviço teste', price: 40, duration_minutes: 30 }], empty: [], settings: { enable_self_rescheduling: true } }));
vi.mock('../../hooks/usePublicBooking', () => ({
  useBusinessProfileBySlug: () => ({ data: fixture.business, isLoading: false }),
  useBusinessSettings: () => ({ data: fixture.settings, isFetched: true }),
  usePublicServices: () => ({ data: fixture.services }),
  usePublicCategories: () => ({ data: fixture.empty }),
  usePublicProfessionals: () => ({ data: fixture.empty }),
  usePublicGallery: () => ({ data: fixture.empty }),
  usePublicProducts: () => ({ data: fixture.empty }),
  useCancelPublicBooking: () => ({ mutateAsync: vi.fn() }),
  useSubmitPublicBooking: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../services/publicBooking', () => ({ fetchEditBooking: vi.fn(), fetchFullDates: vi.fn().mockResolvedValue([]) }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: {}, accent: {}, classes: {}, shadow: {}, radius: {}, font: {} }) }));
vi.mock('../../hooks/useZonedAvailableSlots', () => ({ useZonedAvailableSlots: () => ({ slots: [], leadTimeMinutes: 0 }) }));
vi.mock('../../components/ui', () => ({ useToast: () => ({ showToast: vi.fn() }), Button: ({ children }: any) => <button>{children}</button>, Checkbox: () => null, ConfirmModal: () => null }));
vi.mock('../../components/membership/PublicBookingMemberships', () => ({ PublicBookingMemberships: () => null }));
vi.mock('../../components/PublicBusinessHeader', () => ({ PublicBusinessHeader: () => null }));
vi.mock('../../components/GoogleReviewPrompt', () => ({ GoogleReviewPrompt: () => null }));
function renderPage(params: string) {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[`/book/espaco${params}`]}><Routes><Route path="/book/:slug" element={<PublicBooking />} /></Routes></MemoryRouter></QueryClientProvider>);
}
describe('public booking edit capability', () => {
  beforeEach(() => vi.clearAllMocks());
  it('blocks editing without a private token instead of creating another appointment', async () => {
    renderPage('?edit=booking-a');
    expect(await screen.findByRole('alert')).toHaveTextContent('Link privado inválido ou expirado');
    expect(screen.queryByRole('button', { name: /continuar/i })).toBeNull();
    expect(fetchEditBooking).not.toHaveBeenCalled();
  });
  it('blocks a wrong/expired edit link without presenting the new-booking form', async () => {
    vi.mocked(fetchEditBooking).mockResolvedValue(null);
    renderPage(`?edit=booking-a&token=${'a'.repeat(64)}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Link privado inválido ou expirado');
    await waitFor(() => expect(fetchEditBooking).toHaveBeenCalledWith('booking-a', 'business-a', 'a'.repeat(64)));
    expect(screen.queryByText('Serviço teste')).toBeNull();
  });
});
