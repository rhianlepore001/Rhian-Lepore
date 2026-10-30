# Rollback da confirmação de importação

O SQL correspondente remove as operações de confirmação e desfazer, o histórico de registros criados, os gatilhos e as colunas adicionadas aos cadastros. Ele **apaga o histórico necessário para desfazer lotes, os dados adicionais de origem e os telefones adicionais** armazenados na coluna criada pela migração. Antes de executá-lo, faça backup e confirme que esses dados não serão necessários. O rollback não remove nem reverte clientes e serviços importados.

As mudanças são aditivas na migração. Teste em um banco isolado antes de qualquer aplicação; a migração não foi aplicada em produção.
