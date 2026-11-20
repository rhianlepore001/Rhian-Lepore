import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Clients } from '../../pages/Clients';
import { ImportDataSettings } from '../../pages/settings/ImportDataSettings';
import type { CreateImportBatchInput, StoredImportBatch, StoredImportRow } from '../../services/importStaging';
import type { ClientRecord } from '../../types/crm';

const { clients, staging } = vi.hoisted(() => ({
  clients: [] as ClientRecord[],
  staging: {
    createImportBatch: vi.fn(),
    loadImportRows: vi.fn(),
    updateImportRow: vi.fn(),
    commitImportBatch: vi.fn(),
    undoImportBatch: vi.fn(),
    loadImportBatches: vi.fn(),
  },
}));

const auth = { user: { id: 'responsavel' }, companyId: 'empresa', region: 'BR', role: 'owner' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: {}, accent: {}, radius: {}, status: {} }) }));
vi.mock('../../hooks/useDraftFields', () => ({ useDraftFields: () => ({ clear: vi.fn(), hasDraft: false }) }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => null }));
vi.mock('../../components/SettingsLayout', () => ({ SettingsLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('../../services/importStaging', () => ({
  ...staging,
  loadImportCandidates: vi.fn(async () => clients),
  purgeExpiredImportData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/crm', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/crm')>(),
  syncPublicClientsToCrm: vi.fn().mockResolvedValue(undefined),
  fetchClientAppointmentStats: vi.fn().mockResolvedValue([]),
  createClient: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => {
    const query = { select: () => query, eq: () => query, neq: () => query, order: () => query, overrideTypes: () => Promise.resolve({ data: [...clients], error: null }) };
    return query;
  } },
}));
vi.mock('../../components/ui', () => ({
  Button: ({ children, icon: _icon, variant: _variant, size: _size, fullWidth: _fullWidth, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  PageHeader: ({ title, action }: any) => <header><h1>{title}</h1>{action}</header>,
  Modal: ({ open, title, children }: any) => open ? <section role="dialog" aria-label={title}>{children}</section> : null,
  EmptyState: ({ title, description, action }: any) => <div><p>{title}</p>{description && <p>{description}</p>}{action}</div>,
  SkeletonCard: () => null,
  ErrorState: () => <div>Erro</div>,
  Input: (props: any) => <input {...props} />,
  Card: ({ children }: any) => <div>{children}</div>,
}));

function mount() {
  return render(<MemoryRouter initialEntries={['/clientes']}><Routes>
    <Route path="/clientes" element={<Clients />} />
    <Route path="/configuracoes/importar" element={<ImportDataSettings />} />
  </Routes></MemoryRouter>);
}

async function openFromClients() {
  fireEvent.click((await screen.findAllByRole('button', { name: 'Adicionar cliente' }))[0]);
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: /Importar dos contatos/i })); });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.role = 'owner';
  clients.length = 0;
  staging.loadImportBatches.mockResolvedValue([]);
});

afterEach(() => vi.unstubAllGlobals());

describe('importação pela página de clientes', () => {
  it('permite que o responsável navegue até a importação pelo cadastro de cliente', async () => {
    mount();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Adicionar cliente' }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar cliente' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Novo cliente' });
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: /Importar dos contatos/i }));
    expect(await screen.findByRole('heading', { name: 'Contatos do celular' })).toBeTruthy();
  });

  it('revisa os contatos selecionados, confirma o lote, volta à lista e permite desfazer pelo histórico', async () => {
    let rows: StoredImportRow[] = [];
    let history: StoredImportBatch[] = [];
    staging.createImportBatch.mockImplementation(async (batch: CreateImportBatchInput) => {
      rows = batch.rows.map(row => ({
        id: String(row.rowNumber), row_number: row.rowNumber, raw_data: row.raw, display_name: String(row.normalized?.name || ''),
        normalized_data: row.normalized ?? null, outcome: 'pending', reason: row.issues?.join(' ') || row.reason || null,
      }));
      return 'lote-contatos';
    });
    staging.loadImportRows.mockImplementation(async () => rows);
    staging.loadImportBatches.mockImplementation(async () => history);
    staging.updateImportRow.mockImplementation(async (_company, _batch, id, normalized) => {
      rows = rows.map(row => row.id === id ? { ...row, normalized_data: normalized, reason: null } : row);
    });
    staging.commitImportBatch.mockImplementation(async () => {
      rows = rows.map(row => {
        if (row.reason) return row;
        if (row.normalized_data?.decision === 'skip') return { ...row, outcome: 'ignored', reason: 'Ignorado a pedido.', normalized_data: null };
        clients.push({ id: row.id, name: String(row.normalized_data?.name), phone: (row.normalized_data?.phones as string[])[0] } as ClientRecord);
        return { ...row, outcome: 'imported', reason: 'Cadastro criado.', normalized_data: null };
      });
      history = [{ id: 'lote-contatos', source: 'contacts', status: 'completed', kind: 'client', created_at: '2026-11-20', expected_rows: rows.length }];
      return {
        total: rows.length, imported: rows.filter(row => row.outcome === 'imported').length,
        ignored: rows.filter(row => row.outcome === 'ignored').length,
        pending: rows.filter(row => row.outcome === 'pending').length,
        updated: 0, error: 0, remaining: 0,
      };
    });
    staging.undoImportBatch.mockImplementation(async () => {
      clients.length = 0;
      history = history.map(batch => ({ ...batch, status: 'undone' }));
      return { undone: 2, preserved: 0 };
    });
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), {
      contacts: { select: vi.fn().mockResolvedValue([
        { name: [' Ana ', ' Silva '], tel: ['+55 (11) 98765-4321', '5511987654321', '(11) 3333-4444'] },
        { tel: ['(21) 98888-7777'] },
        { name: ['Número inválido'], tel: ['abc'] },
        { name: ['Sem telefone'] },
      ]) },
    }));

    mount();
    await openFromClients();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));

    const confirm = await screen.findByRole('button', { name: 'Confirmar importação' });
    expect(staging.createImportBatch).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'empresa', source: 'contacts' }));
    expect(rows[0].normalized_data).toMatchObject({ name: 'Ana Silva', phones: ['+5511987654321', '+551133334444'] });
    expect(staging.commitImportBatch).not.toHaveBeenCalled();

    fireEvent.change(screen.getAllByLabelText('Nome')[0], { target: { value: 'Bruno Santos' } });
    fireEvent.change(screen.getAllByLabelText('Como continuar?')[0], { target: { value: 'create' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar escolha' })[0]);
    await waitFor(() => expect(screen.getByText(/2 contatos prontos/)).toBeTruthy());
    fireEvent.change(screen.getAllByLabelText('Como continuar?')[0], { target: { value: 'skip' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar escolha' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Salvar escolha' })).toHaveLength(1));
    fireEvent.click(confirm);

    expect(await screen.findByText(/2 novos clientes/)).toBeTruthy();
    expect(screen.getByText(/2 contatos ficaram de fora/)).toBeTruthy();
    expect(screen.getByText(/^Contato 3: Número inválido.*Ignorado a pedido/)).toBeVisible();
    expect(screen.getByText(/^Contato 4: Sem telefone.*Confira o telefone/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ver clientes' }));
    expect(await screen.findByText('Ana Silva')).toBeTruthy();
    expect(screen.getByText('Bruno Santos')).toBeTruthy();

    await openFromClients();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Contatos do celular.*Concluída/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer esta importação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desfazer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('2 removidos');
    expect(staging.undoImportBatch).toHaveBeenCalledWith('lote-contatos');
    fireEvent.click(screen.getByRole('button', { name: 'Ver clientes' }));
    await screen.findByText('Nenhum cliente cadastrado');
  });

  it('não mostra a opção de importação para profissionais da equipe', async () => {
    auth.role = 'staff';
    mount();
    expect(await screen.findByText('Os clientes cadastrados pelo negócio aparecem aqui.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar cliente' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Importar dos contatos/i })).toBeNull();
  });
});
