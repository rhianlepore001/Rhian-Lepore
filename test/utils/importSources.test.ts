import { describe, expect, it } from 'vitest';
import { IMPORT_SOURCES, getImportSource } from '../../utils/importSources';

describe('orientações por origem', () => {
  it('oferece todas as origens solicitadas', () => {
    expect(IMPORT_SOURCES.map(source => source.id)).toEqual(['trinks', 'fresha', 'appbarber', 'booksy', 'avec', 'spreadsheet', 'contacts']);
  });
  it('oferece um pedido pronto de clientes e serviços quando é necessário contatar o suporte', () => {
    for (const id of ['appbarber', 'booksy'] as const) {
      const source = getImportSource(id);
      expect(source.supportRequest).toContain('clientes');
      expect(source.supportRequest).toContain('serviços');
    }
  });
});
