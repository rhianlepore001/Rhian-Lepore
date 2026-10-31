# Rollback dos limites e da retenção de importações

A migração `20261030130200_import_retention_limits.sql` adiciona os contadores de linhas e tamanho de cada lote (com limite aplicado no banco), a limpeza dos dados de origem quando um cliente ou serviço é excluído e, **somente se a extensão pg_cron existir**, o agendamento diário da limpeza. Em produção o pg_cron não está instalado: a limpeza de dados com mais de 30 dias roda na próxima importação e quando o assistente é aberto.

O rollback (`20261030130200_import_retention_limits.rollback.sql`) remove contadores, gatilhos e o agendamento, e restaura a versão anterior da proteção do histórico. Não apaga clientes, serviços nem histórico.

## Antes de executar (backup)

1. Faça backup das tabelas que serão apagadas e confirme que o backup abre. Exemplo, em um banco de apoio ou no painel do Supabase: `pg_dump --data-only --table=public.import_batches --table=public.import_staging_rows --table=public.import_column_mappings --table=public.import_source_links --table=public.import_created_records --table=public.import_created_categories`.
2. Os clientes e serviços importados **não** são removidos pelo rollback. Se for preciso desfazer uma importação, use o botão «Desfazer importação» antes do rollback; depois dele o histórico necessário some.
3. Teste primeiro em um banco isolado (`scripts/test-sql-import-commit.sh` faz isso com dados fictícios).

## Ordem de aplicação

- **Subir:** aplique as três migrações, na ordem do nome do arquivo, **antes** de publicar a nova versão do aplicativo. O aplicativo novo chama funções que só existem depois das migrações.
- **Voltar:** primeiro retire a versão nova do aplicativo (ou desligue a importação), depois execute os rollbacks na ordem inversa: `20261030130200`, `20261030130100`, `20261030130000`.
