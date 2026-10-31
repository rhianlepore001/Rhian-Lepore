import type { ImportSource } from '@/services/importStaging';

export interface ImportSourceGuide {
  id: ImportSource;
  label: string;
  instructions: string;
  supportRequest?: string;
  helpUrl?: string;
}

const supportRequest = 'Olá! Gostaria de receber uma cópia dos meus clientes e serviços em planilhas, incluindo telefones, e-mails, datas de nascimento, observações, categorias, preços, durações e os identificadores de cada cadastro, quando disponíveis. Por favor, me informem como obter os arquivos. Obrigado!';

export const IMPORT_SOURCES: ImportSourceGuide[] = [
  { id: 'trinks', label: 'Trinks', instructions: 'Na área de clientes, escolha Exportar ou Excel. Na área de serviços, escolha Exportar. Salve os arquivos para selecioná-los aqui.', helpUrl: 'https://ajuda.trinks.com/importacao-exportacao-de-lista-de-clientes' },
  { id: 'fresha', label: 'Fresha', instructions: 'Na lista de clientes e no catálogo de serviços, abra Opções e escolha exportar. Salve os arquivos em Excel ou CSV para selecioná-los aqui.', helpUrl: 'https://www.fresha.com/help-center/knowledge-base/clients/58-export-your-client-list' },
  { id: 'appbarber', label: 'AppBarber', instructions: 'Peça ao suporte uma cópia dos seus clientes e serviços. Você pode usar a mensagem abaixo.', supportRequest },
  { id: 'booksy', label: 'Booksy', instructions: 'Peça ao suporte uma cópia dos seus clientes e serviços. Você pode usar a mensagem abaixo.', supportRequest },
  { id: 'avec', label: 'Avec', instructions: 'Procure a opção de exportar clientes e serviços no seu aplicativo. Se precisar de ajuda, peça os arquivos ao suporte.' },
  { id: 'spreadsheet', label: 'Outra planilha', instructions: 'Escolha os arquivos com seus clientes e serviços. Você poderá conferir as informações antes de concluir.' },
  { id: 'contacts', label: 'Contatos do celular', instructions: 'Exporte os contatos do celular para um arquivo de contatos e selecione esse arquivo aqui.' },
];

export function getImportSource(id: ImportSource): ImportSourceGuide {
  const source = IMPORT_SOURCES.find(item => item.id === id);
  if (!source) throw new Error('Origem não encontrada.');
  return source;
}
