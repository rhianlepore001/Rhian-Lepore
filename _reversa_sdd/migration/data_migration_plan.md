---
schemaVersion: 1
generatedAt: 2026-05-17T18:40:00Z
reversa:
  version: "1.0.0"
kind: data_migration_plan
producedBy: designer
---

# Data Migration Plan

> Plano de migracao de dados para o AGENX v1.

---

## Contexto

A migracao do AGENX e **in-place**: mesma stack, mesmo banco, mesmo schema na maioria das tabelas. Portanto, nao ha ETL tradicional. A migracao de dados e composta por:

1. **Migrations incrementais** (novas tabelas, colunas, RPCs)
2. **Backfills** (correcao de dados existentes)
3. **Nenhuma exportacao/importacao entre bancos**

---

## Mapeamento legado -> novo

| Entidade legado | Acao | Entidade alvo | Tipo | Fase |
|---|---|---|---|---|
| profiles | Manter | profiles | 1:1 | 1 |
| business_settings | Manter | business_settings | 1:1 | 1 |
| onboarding_progress | Manter | onboarding_progress | 1:1 | 1 |
| appointments | Manter | appointments | 1:1 | 2 |
| public_bookings | Manter | public_bookings | 1:1 | 3 |
| public_clients | Manter | public_clients | 1:1 | 3 |
| queue_entries | Manter | queue_entries | 1:1 | 4 |
| finance_records | Manter | finance_records | 1:1 | 5 |
| commission_payments | Manter | commission_payments | 1:1 | 5 |
| goal_settings | Manter | goal_settings | 1:1 | 5 |
| clients | Manter | clients | 1:1 | 6 |
| client_semantic_memory | Manter | client_semantic_memory | 1:1 | 6 |
| team_members | Manter | team_members | 1:1 | 8 |
| services | Manter | services | 1:1 | cross |
| service_categories | Manter | service_categories | 1:1 | cross |
| business_galleries | Manter | business_galleries | 1:1 | 8 |
| audit_logs | Manter | audit_logs | 1:1 | nenhuma |
| system_errors | Manter | system_errors | 1:1 | nenhuma |
| aios_logs | Manter | aios_logs | 1:1 | nenhuma |
| ai_knowledge_base | Manter | ai_knowledge_base | 1:1 | nenhuma |
| (nao existe) | Criar | products | NOVO | 9 |
| (nao existe) | Criar | product_sales | NOVO | 9 |

---

## Migrations incrementais

### Fase 1: Identity

```sql
-- Backfill: sincronizar onboarding flags para contas existentes
UPDATE business_settings bs
SET onboarding_completed = true
FROM onboarding_progress op
WHERE op.company_id = bs.user_id AND op.is_completed = true AND bs.onboarding_completed = false;
```

- **Tratamento de invalidos**: se onboarding_progress nao existir para uma conta, manter business_settings.onboarding_completed como esta
- **Idempotencia**: UPDATE condicional (WHERE ... = false)

### Fase 4: Queue

```sql
-- Nova RPC: finish_queue_entry (ver target_data_model.md)
-- Backfill: nenhum necessario (dados da fila sao diarios)
```

### Fase 9: Products

```sql
-- Novas tabelas: products e product_sales (ver target_data_model.md)
-- Nova RPC: sell_product (ver target_data_model.md)
-- Backfill: nenhum (tabela nova, comeca vazia)
```

---

## Backfills

| Fase | Backfill | Query | Validacao |
|---|---|---|---|
| 1 | Sincronizar onboarding flags | UPDATE business_settings... (acima) | COUNT(*) WHERE onboarding_completed != is_completed deve ser 0 |
| 5 | Nenhum obrigatorio | - | Verificar finance_records com professional_id NULL |

---

## Estrategia de ETL

Nao ha ETL. Todas as mudancas sao migrations Supabase executadas via `supabase migration`:

1. Criar migration: `supabase migration new <nome>`
2. Escrever SQL
3. Testar em staging: `supabase db push` (local ou preview)
4. Aplicar em producao: via deploy Supabase

### Idempotencia

- CREATE TABLE: `IF NOT EXISTS`
- CREATE OR REPLACE FUNCTION: idempotente por definicao
- UPDATE backfills: condicional (WHERE coluna != valor_desejado)
- CREATE INDEX: `IF NOT EXISTS`

---

## Cutover de dados

Nao ha cutover de dados tradicional. As migrations sao aplicadas incrementalmente por fase:

1. Migration e executada em staging
2. Testada com dados reais (dump ou preview)
3. Aplicada em producao
4. Frontend deployado (Vercel)
5. Validacao pos-deploy

### Sequencia de migrations por fase

| Fase | Migrations | Dependencias |
|---|---|---|
| 1 | Backfill onboarding | Nenhuma |
| 4 | RPC finish_queue_entry | Nenhuma |
| 5 | (auditoria RLS) | Fase 2 |
| 9 | CREATE products + product_sales + RPC sell_product | Nenhuma |

---

## Validacao de qualidade pos-migration

| Check | Query | Fase |
|---|---|---|
| Onboarding sincronizado | `SELECT COUNT(*) FROM business_settings bs JOIN onboarding_progress op ON op.company_id = bs.user_id WHERE bs.onboarding_completed != op.is_completed` = 0 | 1 |
| finance_records com professional_id | `SELECT COUNT(*) FROM finance_records WHERE professional_id IS NULL AND type = 'revenue'` -> investigar se > 0 | 5 |
| Products tabela criada | `SELECT COUNT(*) FROM products` = 0 (tabela nova vazia) | 9 |
| Product sales tabela criada | `SELECT COUNT(*) FROM product_sales` = 0 (tabela nova vazia) | 9 |
| RLS products funciona | Testar com owner, staff e anonimo | 9 |
| RLS product_sales funciona | Testar com owner, staff e usuario de outro tenant | 9 |
| RPC finish_queue_entry funciona | Testar com entrada de fila real | 4 |
| Integridade referencial | `SELECT COUNT(*) FROM appointments WHERE client_id NOT IN (SELECT id FROM clients)` = 0 | 2 |
| Sem orfaos financeiros | `SELECT COUNT(*) FROM finance_records WHERE appointment_id IS NOT NULL AND appointment_id NOT IN (SELECT id FROM appointments)` = 0 | 5 |

---

## Riscos de dados

| Risco | Mitigacao |
|---|---|
| Backfill corrompe dados | Testar em staging com dump; migration condicional |
| RPC nova quebra fluxo existente | Parallel run controlado apenas ate validar nova RPC; fallback legado nao deve fazer operacoes financeiras separadas em producao apos cutover |
| RLS nova bloqueia acesso | Testar com roles diferentes antes de aplicar |
| Perda de dados | Backup antes de cada migration em producao |
