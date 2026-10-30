# Importação de dados — PR 1

O fluxo traz clientes e serviços no onboarding e em Ajustes, com origem, orientações, arquivos, mapeamento, revisão, prévia, confirmação, relatório e desfazer por lote. Agendamentos, histórico, profissionais e calendários pertencem ao PR 2.

- CSV, XLSX e VCF aceitam vários arquivos; o leitor XLSX percorre abas e preserva dados originais, fórmulas com valor armazenado e células mescladas para consulta. O leitor VCF preserva propriedades e telefones adicionais, com suporte a codificações comuns. Formatos inválidos ou recursos que não podem ser interpretados com segurança são recusados explicitamente; fórmulas sem resultado armazenado e planilhas criptografadas não são avaliadas.
- Os apelidos incluem presets para Trinks, Fresha, AppBarber, Booksy e Avec; escolhas de mapeamento podem ser salvas por empresa, origem e tipo. O usuário confirma dúvidas e possíveis duplicados, sem mesclagem automática.
- As migrações aditivas `20261029074503_import_staging.sql` e `20261030090723_import_commit_undo.sql` fornecem preparação, vínculos de origem, confirmação em lotes, histórico e desfazer; seus rollbacks estão em `supabase/rollbacks/`. RLS restringe o acesso à empresa e ao responsável. Nenhuma migração foi aplicada em produção.
- O relatório identifica cada linha, preserva pendências e permite baixá-las. Campos originais ficam disponíveis ao responsável para download e remoção explícita; os arquivos enviados não são armazenados. O desfazer protege registros alterados e registros com referências posteriores.
- A importação não envia mensagens nem atribui consentimento de marketing. Há limites de tamanho e linhas, gravação em blocos e recuperação pelo histórico após interrupções.
- Testes de políticas, execução e rollback usam PostgreSQL isolado com empresas fictícias. O teste ponta a ponta usa navegador e uma API simulada; não comprova a configuração de um banco remoto nem a fidelidade de todas as exportações dos fornecedores.
