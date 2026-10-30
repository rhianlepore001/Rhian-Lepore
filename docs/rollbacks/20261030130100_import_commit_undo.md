# Rollback da confirmação de importação

A migração `20261030130100_import_commit_undo.sql` adiciona a confirmação e o desfazer em partes, a conferência de uso antes de remover (planos, reservas, atendimentos, financeiro e outros), a função de comparação sem acento, os índices de nome, e-mail e telefones adicionais, o histórico do que foi criado, a revisão dos cadastros e a limpeza por retenção.

O rollback (`20261030130100_import_commit_undo.rollback.sql`) remove essas funções, tabelas, gatilhos, índices e colunas. Ele **apaga o histórico necessário para desfazer lotes, os dados de origem e os telefones adicionais** guardados no cadastro do cliente. O rollback não remove nem reverte clientes e serviços importados.

## Antes de executar (backup)

1. Faça backup das tabelas que serão apagadas e confirme que o backup abre. Exemplo, em um banco de apoio ou no painel do Supabase: `pg_dump --data-only --table=public.import_batches --table=public.import_staging_rows --table=public.import_column_mappings --table=public.import_source_links --table=public.import_created_records --table=public.import_created_categories`.
2. Os clientes e serviços importados **não** são removidos pelo rollback. Se for preciso desfazer uma importação, use o botão «Desfazer importação» antes do rollback; depois dele o histórico necessário some.
3. Teste primeiro em um banco isolado (`scripts/test-sql-import-commit.sh` faz isso com dados fictícios).

## Ordem de aplicação

- **Subir:** aplique as três migrações, na ordem do nome do arquivo, **antes** de publicar a nova versão do aplicativo. O aplicativo novo chama funções que só existem depois das migrações.
- **Voltar:** primeiro retire a versão nova do aplicativo (ou desligue a importação), depois execute os rollbacks na ordem inversa: `20261030130200`, `20261030130100`, `20261030130000`.

Teste isolado: `scripts/test-sql-import-commit.sh` (cria um banco temporário, aplica as migrações, roda os testes e executa os rollbacks, conferindo que nada sobrou).
