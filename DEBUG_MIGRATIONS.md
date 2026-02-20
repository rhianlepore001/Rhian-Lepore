# Debug Report - Migrações Não Aplicadas

## Problema Identificado
Múltiplas funções RPC retornando 404 (Not Found):
- `get_commissions_due`
- `log_error`
- Outras funções financeiras e operacionais

## Root Cause
**Migrações sem prefixo de data não são executadas automaticamente pelo Supabase.**

O Supabase CLI executa migrações em ordem alfabética baseada no nome do arquivo. Arquivos sem o prefixo `YYYYMMDD_` não são reconhecidos como migrações pendentes.

## Migrações Afetadas (Sem Prefixo)
- `commissions_rpc.sql` → Renomeado para `20260218_commissions_rpc.sql`
- `commissions_enhancement.sql` → Renomeado para `20260218_commissions_enhancement.sql`
- `finance_system.sql`
- `fix_complete_appointment.sql`
- `fix_expense_calculation.sql`
- `fix_rpc_ambiguity.sql`
- `full_schema_fix.sql`
- `new_insights_rpc.sql`
- `professional_booking_system.sql`
- `onboarding_setup.sql`
- `reset_and_setup.sql`
- `security_fix.sql`
- `update_commission_rpc.sql`
- `update_finance_stats_rpc.sql`
- `queue_system.sql`
- `fix_rls_policies_authenticated.sql`
- E outras...

## Solução Imediata
Aplicar as migrações manualmente via Supabase Dashboard ou CLI:

```bash
# Opção 1: Supabase CLI (Recomendado)
supabase db push

# Opção 2: Aplicar manualmente via SQL Editor no Dashboard
# Copiar e colar o conteúdo de cada arquivo SQL
```

## Prevenção
1. **Sempre usar prefixo de data** ao criar novas migrações: `YYYYMMDD_nome_descritivo.sql`
2. **Usar Supabase CLI** para gerar migrações: `supabase migration new nome_descritivo`
3. **Revisar migrations/** periodicamente para identificar arquivos sem padrão
