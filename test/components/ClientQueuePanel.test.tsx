import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientQueuePanel } from '@/components/queue/ClientQueuePanel';
import type { QueueRecord } from '@/types/queue';

const { resolveClientQueueEntry, useQueueBoard, playQueueCallAlert } = vi.hoisted(() => ({
    resolveClientQueueEntry: vi.fn(),
    useQueueBoard: vi.fn(),
    playQueueCallAlert: vi.fn(),
}));

vi.mock('@/services/queue', () => ({
    resolveClientQueueEntry,
    isActiveQueueStatus: () => true,
    clearQueueTicket: vi.fn(),
    cancelQueueEntryPublic: vi.fn(),
}));
vi.mock('@/hooks/useQueueBoard', () => ({ useQueueBoard }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userType: null }) }));
vi.mock('@/utils/queueCallAlert', () => ({ playQueueCallAlert }));
vi.mock('@/services/publicBooking', () => ({ fetchPublicProfessionals: vi.fn() }));

describe('Fila pública', () => {
    it('avisa sobre a chamada quando a consulta detecta a mudança e toca uma única vez', async () => {
        const entry: QueueRecord = {
            id: 'ticket-1',
            business_id: 'tenant-a',
            client_name: 'Joana',
            client_phone: '11900000001',
            status: 'waiting',
            joined_at: new Date().toISOString(),
        };
        const calledEntry: QueueRecord = { ...entry, status: 'calling', called_at: new Date().toISOString() };
        resolveClientQueueEntry.mockResolvedValue(entry);
        useQueueBoard.mockReturnValue({ data: { position: 1 } });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const queryKey = ['queue', 'client-active', entry.business_id, entry.client_phone, 'salao-a'];

        render(
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <ClientQueuePanel businessId={entry.business_id} phone={entry.client_phone} slug="salao-a" />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(await screen.findByRole('heading', { name: 'Você é o próximo' })).toBeVisible();
        expect(playQueueCallAlert).not.toHaveBeenCalled();

        resolveClientQueueEntry.mockResolvedValue(calledEntry);
        await act(async () => { await client.invalidateQueries({ queryKey }); });
        expect(await screen.findByRole('heading', { name: 'É a sua vez!' })).toBeVisible();
        await waitFor(() => expect(playQueueCallAlert).toHaveBeenCalledOnce());

        await act(async () => { await client.invalidateQueries({ queryKey }); });
        expect(playQueueCallAlert).toHaveBeenCalledOnce();
    });
});
