import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportDataWizard } from '../../components/ImportDataWizard';
import { readImportFiles } from '../../utils/importFiles';

vi.mock('../../utils/importFiles', () => ({ readImportFiles: vi.fn().mockResolvedValue([{ name: 'trinks-ficticio.csv', identity: 'arquivo-ficticio', headers: ['Nome','Celular'], rows: [{ line: 2, values: ['Ana Fictícia','11987654321'] }], warnings: [], isContacts: false }]) }));
vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', surface: '' }, radius: { input: '' }, classes: { buttonPrimary: '', buttonSecondary: '', buttonGhost: '' } }) }));
vi.mock('../../components/ui', () => ({ Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button> }));

const api = {
  loadImportCandidates: vi.fn().mockResolvedValue([]),
  createImportBatch: vi.fn().mockResolvedValue('lote-ficticio'),
  loadImportRows: vi.fn().mockResolvedValue([{ id: 'linha-ficticia', row_number: 2, raw_data: { headers: ['Nome','Celular'], values: ['Ana Fictícia','11987654321'] }, normalized_data: { name:'Ana Fictícia', phones:['+5511987654321'], source_id:'arquivo-ficticio:2', issues:[] }, outcome:'pending', reason:null }]),
  commitImportBatch: vi.fn().mockResolvedValue({ total:1, imported:1, ignored:0, updated:0, pending:0, error:0, remaining:0 }),
  undoImportBatch: vi.fn().mockResolvedValue({ undone:1, preserved:0 }),
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

describe('trazer dados', () => {
  it('permite conferir os dados antes de importar e desfazer o lote', async () => {
    render(<ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trinks' }));
    const file = new File(['Nome,Celular\nAna Fictícia,11987654321'], 'trinks-ficticio.csv', { type:'text/csv' });
    fireEvent.change(screen.getByLabelText('Escolher arquivos'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name:'Analisar arquivos' }));
    expect(await screen.findByText('trinks-ficticio.csv')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name:'Preparar revisão' }));
    expect(await screen.findByText(/1 linha pronta/)).toBeTruthy();
    expect(api.commitImportBatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name:'Confirmar importação' }));
    expect(await screen.findByText(/1 importado/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name:'Desfazer esta importação' }));
    fireEvent.click(screen.getByRole('button', { name:'Confirmar desfazer' }));
    await waitFor(() => expect(api.undoImportBatch).toHaveBeenCalledWith('lote-ficticio'));
  });

  it('limpa dados antigos ao abrir e não usa termos técnicos nem "registro(s)"', async () => {
    render(<ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} />);
    await waitFor(() => expect(api.purgeExpiredImportData).toHaveBeenCalled());
    expect(document.body.textContent).not.toMatch(/registro\(s\)|\(s\)/);
  });

  async function openPreview(name: string, rows: { line: number; values: string[] }[], stored: unknown[], candidates: unknown[] = []) {
    vi.mocked(readImportFiles).mockResolvedValueOnce([{ name, identity: `${'c'.repeat(64)}:0`, headers: ['Nome', 'Celular'], rows, warnings: [], isContacts: false }] as never);
    api.loadImportCandidates.mockResolvedValue(candidates as never);
    api.loadImportRows.mockResolvedValue(stored as never);
    api.createImportBatch.mockClear();
    render(<ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trinks' }));
    fireEvent.change(screen.getByLabelText('Escolher arquivos'), { target: { files: [new File(['x'], name, { type: 'text/csv' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Analisar arquivos' }));
    await screen.findByText(name);
    return () => fireEvent.click(screen.getByRole('button', { name: 'Preparar revisão' }));
  }

  it('avisa em português claro quando o telefone já está cadastrado e não oferece criar', async () => {
    const duplicate = 'Este telefone já está cadastrado em outro cliente. Vincule ao cadastro existente ou ignore esta linha.';
    const prepare = await openPreview('duplicado.csv', [{ line: 2, values: ['Nome Diferente Fictício', '11999998888'] }], [
      { id: 'linha-dup', row_number: 2, raw_data: {}, normalized_data: { name: 'Nome Diferente Fictício', phones: ['+5511999998888'], source_id: 'x:2', issues: [] }, outcome: 'pending', reason: duplicate },
    ], [{ id: 'existente-ficticio', name: 'Cliente Existente Fictício', phone: '(11) 99999-8888', email: null, additional_phones: [] }]);
    prepare();
    expect(await screen.findAllByText(new RegExp('já está cadastrado'))).not.toHaveLength(0);
    const sent = api.createImportBatch.mock.calls[0][0].rows[0];
    expect(sent.reason).toBe(duplicate);
    expect(sent.normalized.source_scope).toMatch(/^c+:0$/);
    const select = screen.getByLabelText('Como continuar?') as HTMLSelectElement;
    const labels = Array.from(select.options).map(option => option.textContent);
    expect(labels.some(label => /Criar novo cadastro/.test(label || ''))).toBe(false);
    expect(labels.some(label => /Vincular a Cliente Existente Fictício/.test(label || ''))).toBe(true);
    expect(labels).toContain('Não importar esta linha');
  });

  it('marca o telefone repetido dentro do arquivo e só deixa ignorar', async () => {
    const prepare = await openPreview('repetido.csv', [
      { line: 2, values: ['Primeira Fictícia', '11977771111'] },
      { line: 3, values: ['Segunda Fictícia', '(11) 97777-1111'] },
    ], [
      { id: 'l1', row_number: 2, raw_data: {}, normalized_data: { name: 'Primeira Fictícia', phones: ['+5511977771111'], source_id: 'x:2', issues: [] }, outcome: 'pending', reason: null },
      { id: 'l2', row_number: 3, raw_data: {}, normalized_data: { name: 'Segunda Fictícia', phones: ['+5511977771111'], source_id: 'x:3', issues: [] }, outcome: 'pending', reason: 'Este telefone aparece mais de uma vez neste arquivo. Ajuste o telefone ou ignore esta linha.' },
    ]);
    prepare();
    await screen.findByText(/de atenção/);
    const rows = api.createImportBatch.mock.calls[0][0].rows;
    expect(rows[0].reason).toBeUndefined();
    expect(rows[1].reason).toMatch(/mais de uma vez/);
    const select = screen.getByLabelText('Como continuar?') as HTMLSelectElement;
    expect(Array.from(select.options).some(option => /Criar novo cadastro/.test(option.textContent || ''))).toBe(false);
  });

  it('usa nomes sem termos técnicos e sem lista cortada', async () => {
    const prepare = await openPreview('nomes.csv', [{ line: 2, values: ['Nome Fictício', 'abc'] }], [
      { id: 'l1', row_number: 2, raw_data: {}, normalized_data: { name: 'Nome Fictício', phoneText: 'abc', phones: [], source_id: 'x:2', issues: ['Confira os telefones.'] }, outcome: 'pending', reason: 'Confira os telefones.' },
    ]);
    prepare();
    await screen.findByText(/de atenção/);
    expect(screen.queryByText(/Identificação de origem/)).toBeNull();
    expect(screen.getByText('Código no sistema anterior')).toBeTruthy();
    const select = screen.getByLabelText('Como continuar?') as HTMLSelectElement;
    expect(select.options[0].textContent).toBe('Escolha uma opção');
    expect(select.className).toMatch(/min-w-0/);
  });

  it('mostra uma mensagem simples quando o arquivo não pode ser lido', async () => {
    vi.mocked(readImportFiles).mockRejectedValueOnce(new TypeError('x'));
    render(<ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trinks' }));
    fireEvent.change(screen.getByLabelText('Escolher arquivos'), { target: { files: [new File(['x'], 'a.csv')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Analisar arquivos' }));
    const message = await screen.findByText(/Não foi possível ler o arquivo/);
    expect(message.textContent).not.toMatch(/UTF/i);
    expect(message.textContent).toMatch(/novamente/);
  });
});
