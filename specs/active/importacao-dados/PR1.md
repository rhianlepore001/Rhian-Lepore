# Importação de dados — PR 1 (em construção)

O PR 1 deve permitir que o responsável traga clientes e serviços de outros aplicativos, revise dúvidas, importe e desfaça o lote com segurança. Agendamentos, histórico, profissionais e calendários pertencem ao PR 2.

## Base implementada

- Leitura de CSV mantém colunas, linhas vazias e posição da linha original.
- Leitura inicial de XLSX preserva abas e posição das células; arquivos com fórmulas ou células mescladas são recusados explicitamente. Datas de planilha, formatos avançados e compatibilidade entre navegadores ainda precisam de validação.
- Leitura inicial de VCF preserva propriedades e múltiplos telefones. Dados codificados em base64 ou quoted-printable são recusados explicitamente e ainda precisam de suporte.
- Mapeamento por apelidos distingue colunas desconhecidas e escolhas ambíguas.
- Normalização inicial de telefone BR/PT, data, preço e duração; identificação de possíveis duplicados sem vinculação automática. As regras de telefone ainda requerem validação mais completa.
- A migração aditiva `20261029074503_import_staging.sql` cria tabelas de lotes, linhas de preparação, vínculos de origem e mapeamentos, com RLS para o dono da empresa e rollback documentado. Nenhuma migração foi aplicada em produção.
- Preparação em lotes de até 100 linhas por solicitação, com indicação explícita quando a preparação é parcial e descarte por empresa; ainda não há interface nem confirmação de importação.
- Orientações iniciais por origem, incluindo mensagens prontas para solicitar dados ao suporte. Não há presets de colunas validados por aplicativo.
- Testes isolados das políticas de preparação e rollback em PostgreSQL, com empresas fictícias. O harness reproduz funções de autenticação; não comprova o estado de nenhum banco remoto.

## Pendente antes de concluir o PR 1

- Fluxo completo no onboarding e em Ajustes; instruções por origem, arquivos múltiplos, integração dos leitores e presets por aplicativo.
- VCF completo, múltiplos telefones na ficha, IDs externos e armazenamento sem perda de colunas.
- Revisão de conflitos, uso dos vínculos de origem no fluxo, idempotência de gravação, execução em lotes e registro do resultado de cada linha.
- Relatório, download de pendências, limpeza dos dados temporários e desfazer seguro que preserve alterações posteriores.
- Garantias de ausência de envios e de consentimento automático, testes de desfazer e teste e2e com arquivos fictícios Trinks e Fresha.

Nenhuma interface de importação ou gravação foi ativada enquanto essas garantias não estiverem implementadas. A base isolada não constitui uma importação utilizável.
