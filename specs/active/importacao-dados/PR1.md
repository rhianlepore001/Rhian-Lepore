# Importação de dados — PR 1 (em construção)

O PR 1 deve permitir que o responsável traga clientes e serviços de outros aplicativos, revise dúvidas, importe e desfaça o lote com segurança. Agendamentos, histórico, profissionais e calendários pertencem ao PR 2.

## Base implementada

- Leitura de CSV mantém colunas, linhas vazias e posição da linha original.
- Mapeamento por apelidos distingue colunas desconhecidas e escolhas ambíguas.
- Normalização de telefone BR/PT, data, preço e duração; identificação de possíveis duplicados sem vinculação automática.
- Teste isolado das políticas atuais de clientes com empresas fictícias. Este teste reproduz as políticas no harness e não comprova o estado de nenhum banco remoto.

## Pendente antes de concluir o PR 1

- Fluxo completo no onboarding e em Ajustes; instruções por origem, arquivos múltiplos CSV/XLSX/VCF e presets por aplicativo.
- Preparação persistente por empresa, mapeamento manual salvo, múltiplos telefones, IDs externos e armazenamento sem perda de colunas.
- Migração aditiva com rollback e testes de RLS por empresa e de autorização de dono/gestor; nenhuma migração foi criada ou aplicada nesta etapa.
- Revisão de conflitos, vínculos por origem, idempotência, execução em lotes e registro do resultado de cada linha.
- Relatório, download de pendências, limpeza dos arquivos temporários e desfazer seguro que preserve alterações posteriores.
- Garantias de ausência de envios e de consentimento automático, testes de desfazer e teste e2e com arquivos fictícios Trinks e Fresha.

Nenhuma interface de importação ou gravação foi ativada enquanto essas garantias não estiverem implementadas. A base isolada não constitui uma importação utilizável.
