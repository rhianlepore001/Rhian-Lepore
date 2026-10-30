import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportDataWizard } from '../../components/ImportDataWizard';

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
    expect(await screen.findByText(/1 registro pronto/)).toBeTruthy();
    expect(api.commitImportBatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name:'Confirmar importação' }));
    expect(await screen.findByText(/1 importado/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name:'Desfazer esta importação' }));
    fireEvent.click(screen.getByRole('button', { name:'Confirmar desfazer' }));
    await waitFor(() => expect(api.undoImportBatch).toHaveBeenCalledWith('lote-ficticio'));
  });
});
