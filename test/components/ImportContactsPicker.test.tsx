import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportDataWizard } from '../../components/ImportDataWizard';

vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', surface: '' } }) }));
vi.mock('../../components/ui', () => ({ Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button> }));

const api = {
  loadImportCandidates: vi.fn().mockResolvedValue([]),
  createImportBatch: vi.fn().mockResolvedValue('lote-ficticio'),
  loadImportRows: vi.fn().mockResolvedValue([]),
  commitImportBatch: vi.fn().mockResolvedValue({ total: 0, imported: 0, ignored: 0, updated: 0, pending: 0, error: 0, remaining: 0 }),
  undoImportBatch: vi.fn().mockResolvedValue({ undone: 0, preserved: 0 }),
  updateImportRow: vi.fn().mockResolvedValue(undefined),
  discardImportBatch: vi.fn().mockResolvedValue(undefined),
  saveImportMapping: vi.fn().mockResolvedValue(undefined),
  loadImportBatches: vi.fn().mockResolvedValue([]),
  loadImportMapping: vi.fn().mockResolvedValue(null),
  clearImportPending: vi.fn().mockResolvedValue(0),
  loadImportCategories: vi.fn().mockResolvedValue([]),
  loadImportSourceData: vi.fn().mockResolvedValue([]),
  clearImportSourceData: vi.fn().mockResolvedValue(0),
  purgeExpiredImportData: vi.fn().mockResolvedValue(undefined),
};

function openContacts(onClose?: () => void) {
  render(<ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Contatos do celular' }));
}

function installPicker(select: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select, getProperties: vi.fn().mockResolvedValue(['name', 'tel']) } });
  Object.defineProperty(window, 'ContactsManager', { configurable: true, value: function ContactsManager() {} });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  Reflect.deleteProperty(navigator, 'contacts');
  Reflect.deleteProperty(window, 'ContactsManager');
});

describe('seleção dos contatos do celular', () => {
  it('seleciona múltiplos contatos e preserva os nomes e telefones antes de preparar o lote', async () => {
    const select = vi.fn().mockResolvedValue([
      { name: ['Ana Fictícia'], tel: ['(11) 98765-4321', '+55 11 97654-3210'] },
      { name: ['Bruno Fictício'], tel: ['+55 21 98888-7777'] },
    ]);
    installPicker(select);
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    expect(select).toHaveBeenCalledWith(['name', 'tel'], { multiple: true });
    await screen.findByRole('button', { name: 'Preparar revisão' });
    expect(api.createImportBatch).not.toHaveBeenCalled();
    expect(api.commitImportBatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.createImportBatch).toHaveBeenCalledTimes(1));
    const batch = api.createImportBatch.mock.calls[0][0] as { companyId: string; rows: { normalized: { name: string; phones: string[] } }[] };
    expect(batch.companyId).toBe('empresa-ficticia');
    expect(batch.rows.map(row => row.normalized.name)).toEqual(['Ana Fictícia', 'Bruno Fictício']);
    expect(batch.rows[0].normalized.phones).toEqual(['+5511987654321', '+5511976543210']);
    expect(batch.rows[1].normalized.phones).toEqual(['+5521988887777']);
    expect(api.commitImportBatch).not.toHaveBeenCalled();
  });

  it('não prepara lote se o usuário cancelar a seleção', async () => {
    installPicker(vi.fn().mockResolvedValue([]));
    openContacts();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' })); });
    expect(screen.getByLabelText('Escolher arquivos')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Preparar revisão' })).toBeNull();
    expect(api.createImportBatch).not.toHaveBeenCalled();
    expect(api.commitImportBatch).not.toHaveBeenCalled();
  });

  it('mantém a importação por arquivo disponível quando o navegador não oferece o seletor', async () => {
    openContacts();
    await act(async () => {});
    expect(screen.getByLabelText('Escolher arquivos')).toBeTruthy();
    expect(api.createImportBatch).not.toHaveBeenCalled();
  });

  it('mantém a importação por arquivo quando o seletor falha', async () => {
    installPicker(vi.fn().mockRejectedValue(new Error('Indisponível')));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Escolher arquivos')).toBeTruthy();
    expect(api.createImportBatch).not.toHaveBeenCalled();
  });

  it('sinaliza para revisão um contato sem telefone', async () => {
    installPicker(vi.fn().mockResolvedValue([{ name: ['Contato sem número'], tel: [] }]));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.createImportBatch).toHaveBeenCalledTimes(1));
    const batch = api.createImportBatch.mock.calls[0][0] as { rows: { normalized: { name: string; phones: string[] }; reason?: string; issues: string[] }[] };
    expect(batch.rows[0].normalized.name).toBe('Contato sem número');
    expect(batch.rows[0].normalized.phones).toEqual([]);
    expect(batch.rows[0].issues).toContain('Confira o telefone.');
  });

  it('apresenta o contato na revisão e apenas confirma o cadastro após o usuário autorizar', async () => {
    api.loadImportRows.mockResolvedValueOnce([{ id: 'linha-1', row_number: 1, raw_data: {}, normalized_data: { name: 'Ana Fictícia', phones: ['+5511987654321'], source_id: 'linha-1', issues: [] }, outcome: 'pending', reason: null }] as never);
    api.commitImportBatch.mockResolvedValueOnce({ total: 1, imported: 1, ignored: 0, updated: 0, pending: 0, error: 0, remaining: 0 });
    installPicker(vi.fn().mockResolvedValue([{ name: ['Ana Fictícia'], tel: ['11987654321'] }]));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    const confirm = await screen.findByRole('button', { name: 'Confirmar importação' });
    expect(screen.getByText(/Ana Fictícia.*\+5511987654321/)).toBeTruthy();
    expect(api.commitImportBatch).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.commitImportBatch).toHaveBeenCalledWith('lote-ficticio'));
  });

  it('usa identificadores diferentes ao selecionar os mesmos contatos em importações distintas', async () => {
    installPicker(vi.fn().mockResolvedValue([{ name: ['Ana Fictícia'], tel: ['11987654321'] }]));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.discardImportBatch).toHaveBeenCalledTimes(1));
    cleanup();
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.discardImportBatch).toHaveBeenCalledTimes(2));
    const scope = (index: number) => (api.createImportBatch.mock.calls[index][0] as { rows: { normalized: { source_scope: string } }[] }).rows[0].normalized.source_scope;
    expect(scope(0)).toMatch(/^picker-/);
    expect(scope(1)).toMatch(/^picker-/);
    expect(scope(0)).not.toBe(scope(1));
  });

  it('desabilita navegação, fechamento e escolha de arquivos enquanto o seletor está aberto', async () => {
    let finish: (contacts: never[]) => void = () => {};
    const pending = new Promise<never[]>(resolve => { finish = resolve; });
    installPicker(vi.fn().mockReturnValue(pending));
    const close = vi.fn();
    openContacts(close);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Selecionar contatos do celular' })).toBeDisabled();
    expect(screen.getByLabelText('Escolher arquivos')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analisar arquivos' })).toBeDisabled();
    await act(async () => { finish([]); await pending; });
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeEnabled();
    expect(close).not.toHaveBeenCalled();
  });

  it('preserva contato com nome e telefone vazios como pendência', async () => {
    installPicker(vi.fn().mockResolvedValue([{ name: [], tel: [] }]));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.createImportBatch).toHaveBeenCalledTimes(1));
    const batch = api.createImportBatch.mock.calls[0][0] as { rows: { issues: string[] }[] };
    expect(batch.rows).toHaveLength(1);
    expect(batch.rows[0].issues).toEqual(expect.arrayContaining(['Confira o nome.', 'Confira o telefone.']));
  });

  it('preserva mais de 20 telefones sem salvar o mapeamento automático', async () => {
    const phones = Array.from({ length: 21 }, (_, index) => `1198000${String(index).padStart(4, '0')}`);
    installPicker(vi.fn().mockResolvedValue([{ name: ['Contato Fictício'], tel: phones }]));
    openContacts();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar contatos do celular' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar revisão' }));
    await waitFor(() => expect(api.discardImportBatch).toHaveBeenCalled());
    const batch = api.createImportBatch.mock.calls[0][0] as { rows: { normalized: { phones: string[] } }[] };
    expect(batch.rows[0].normalized.phones).toEqual(phones.map(phone => `+55${phone}`));
    expect(api.saveImportMapping).not.toHaveBeenCalled();
  });
});
