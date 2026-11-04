import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Clients } from '../../pages/Clients';

const auth = { user: { id: 'responsavel' }, companyId: 'empresa', region: 'BR', role: 'owner' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: {}, accent: {}, radius: {}, status: {} }) }));
vi.mock('../../hooks/useDraftFields', () => ({ useDraftFields: () => ({ clear: vi.fn(), hasDraft: false }) }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => null }));
vi.mock('../../services/crm', () => ({
  syncPublicClientsToCrm: vi.fn().mockResolvedValue(undefined),
  fetchClientAppointmentStats: vi.fn().mockResolvedValue([]),
  enrichClients: () => [],
  filterEnrichedClients: () => [],
  createClient: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => {
    const query = { select: () => query, eq: () => query, neq: () => query, order: () => query, overrideTypes: () => Promise.resolve({ data: [], error: null }) };
    return query;
  } },
}));
vi.mock('../../components/ui', () => ({
  Button: ({ children, icon: _icon, variant: _variant, size: _size, fullWidth: _fullWidth, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  PageHeader: ({ title, action }: any) => <header><h1>{title}</h1>{action}</header>,
  Modal: ({ open, title, children }: any) => open ? <section role="dialog" aria-label={title}>{children}</section> : null,
  EmptyState: ({ title, action }: any) => <div>{title}{action}</div>,
  SkeletonCard: () => null,
  ErrorState: () => <div>Erro</div>,
  Input: (props: any) => <input {...props} />,
  Card: ({ children }: any) => <div>{children}</div>,
}));

function mount() {
  return render(<MemoryRouter initialEntries={['/clientes']}><Routes>
    <Route path="/clientes" element={<Clients />} />
    <Route path="/configuracoes/importar" element={<p>Página de importação</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => { auth.role = 'owner'; });

describe('importação pela página de clientes', () => {
  it('permite que o responsável navegue até a importação pelo cadastro de cliente', async () => {
    mount();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Adicionar cliente' }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar cliente' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Novo cliente' });
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: /Importar dos contatos/i }));
    expect(await screen.findByText('Página de importação')).toBeTruthy();
  });

  it('não mostra a opção de importação para profissionais da equipe', async () => {
    auth.role = 'staff';
    mount();
    await screen.findByText(/Seus clientes aparecem aqui/);
    expect(screen.queryByRole('button', { name: 'Adicionar cliente' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Importar dos contatos/i })).toBeNull();
  });
});
