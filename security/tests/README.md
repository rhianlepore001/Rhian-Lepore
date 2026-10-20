# Validações locais

Use somente fixtures fictícios. Não aponte estas verificações para produção. Nenhuma chave real é necessária. Os testes de Edge transpõem o código real para um harness com Stripe, Supabase e Resend substituídos; não verificam imports remotos/Deno/gateway.

## Frontend e handlers

```sh
export VITE_SUPABASE_URL=http://127.0.0.1:54321
export VITE_SUPABASE_ANON_KEY=fictional-local-anon
npm run typecheck
npm run lint
VITE_OPENROUTER_API_KEY= VITE_GEMINI_API_KEY= GEMINI_API_KEY= npm run build
npm test -- --run
```

Teste focal: `npm test -- --run security/attacks test/utils/checkoutAllowlist.test.ts`.

## PostgreSQL

Requer binários PostgreSQL 17 (incluindo uuid-ossp). Configure `PGBIN` para o diretório que contém initdb, pg_ctl e psql. O runner cria um cluster novo em diretório temporário privado, com socket Unix e `listen_addresses=''`; não aceita URL/credenciais de banco. Encerra o servidor ao terminar e não remove dados preexistentes. Arquivos de fixture em `/tmp/agendix-security.*` contêm somente dados fictícios e ficam disponíveis para inspeção nessa instância.

```sh
PGBIN=/usr/lib/postgresql/17/bin bash security/tests/local-postgres.sh billing-cycle
PGBIN=/usr/lib/postgresql/17/bin bash security/tests/local-postgres.sh identity
PGBIN=/usr/lib/postgresql/17/bin bash security/tests/local-postgres.sh tenant-matrix
PGBIN=/usr/lib/postgresql/17/bin bash security/tests/local-postgres.sh residual-privacy
```

Os SQLs em `attacks/` exigem conexão por socket Unix e marcador `agendix.security_fixture=on`, definido apenas no processo psql do runner. Executá-los diretamente sem esse contexto falha antes da criação de dados.

- `billing-cycle`: prova original → teste inicialmente vermelho → migration 2x → regressão → rollback exato de definição/ACL → prova original novamente → reaplicação → regressão → corrida de dois customers, um commit e um conflito. Dados de cada execução de billing.sql são revertidos por transação.
- `billing-baseline`: deliberadamente falha antes da correção. `billing-reproduce-before`: comprova o comportamento original. Ambos carregam o estado anterior à migration nova; não são gates de aprovação.
- `identity`: impede role/company/id, INSERT/UPSERT/DELETE e edição de perfil externo, preservando UPDATE legítimo do dono.
- `tenant-matrix`: 210 verificações em dez tabelas com expressões de policies extraídas das migrations reais. Esquema mínimo, sem todos os triggers/constraints de negócio. Grants mais amplos no fixture isolam o comportamento RLS. O final reproduz também a permissão excessiva das policies ALL de equipe/financeiro: WARNING não significa controle aprovado.
- `residual-privacy`: prova **problemas abertos**, exigindo que PII/alteração por telefone e acesso de staff inativo sejam reproduzidos. Exit 0 significa reprodução bem-sucedida do risco, **não segurança aprovada**.

Os scripts oficiais `scripts/test-sql-*.sh` continuam nos diretórios do projeto. Reproduzem snapshots históricos e precisam ser interpretados separadamente do estado final implantado. Não execute scripts remotos nem a configuração Playwright de produção.

## Inventário e catálogo

`python3 security/tests/inventory.py` atualiza `source-inventory.json`. É inventário por regex de declarações históricas, com hashes dos arquivos e linhas; não resolve DO dinâmico, overloads/renames nem estado efetivo de CREATE/DROP. Inclui USING/WITH CHECK e operações/papéis nas declarações de policies.

`catalog.sql` contém apenas consultas de metadados, em transação READ ONLY, para uma cópia **local autorizada e fiel**. Não contém consultas de linhas de clientes. O resultado desse catálogo não foi obtido de produção.

## Evidências desta execução

Resumo rastreável: `results.md`. Logs somente de fixtures e ferramentas: `/workspace/scratch/agendix-audit/evidence/`. A primeira instância foi substituída entre 18 e 19/10, perdendo `/tmp`; os resultados anteriores permanecem nos retornos das ferramentas e as regressões principais foram reexecutadas. Nenhum resultado foi inferido a partir de compilação.
