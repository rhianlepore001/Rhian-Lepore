# 🏦 FINANCE SQUAD — Plano de Orquestração e Proteção do Backend

**Criado**: 2026-03-01
**Status**: 🔴 ATIVO — Problema crítico em produção
**Owner**: Agente Orquestrador (Claude)
**Contexto**: Módulo Financeiro não exibe dados + backend quebrando o projeto a cada mudança

---

## 🔍 DIAGNÓSTICO RAIZ (Root Cause Analysis)

### Problema 1 — Financeiro não mostra dados

**Causa raiz identificada:**

O `Finance.tsx` chama:
```typescript
supabase.rpc('get_finance_stats', {
  p_user_id: user.id,      // UUID string do Supabase Auth
  p_start_date: '...',
  p_end_date: '...'
})
```

Histórico de migrações mostra **5+ versões conflitantes** do mesmo RPC:

| Migration | Assinatura | Status |
|-----------|-----------|--------|
| `20260218_finance_system.sql` | `(uuid, timestamp, timestamp)` | Conflita |
| `20260218_update_finance_stats_rpc.sql` | Desconhecida | Conflita |
| `20260218_consolidate_finance_rpc_final.sql` | Desconhecida | Conflita |
| `20260228_definitive_finance_fix.sql` | `(text, text, text)` | "Definitiva" #1 |
| `20260301_finance_stats_v3_final.sql` | `(text, text, text)` | "Definitiva" #2 |

**Efeito**: Postgres resolve a chamada para a versão errada do RPC → retorna `null` → Finance exibe zeros.

### Problema 2 — Backend quebra o projeto a cada mudança

**Causa raiz identificada:**

- ❌ Sem contrato de interface (schema versionado)
- ❌ Sem testes de integração antes de cada migration
- ❌ Sem ambiente de staging (mudanças vão direto para produção)
- ❌ Sem checklist de segurança para migrations
- ❌ Sem rollback documentado por migration

---

## 🧑‍💼 ESTRUTURA DO SQUAD

### Squad Finance — 4 Agentes Especializados

```
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR (Claude)                     │
│   Coordena todos os agentes e mantém o protocolo ativo       │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌───▼──────────┐
    │  DEBUGGER   │ │  BACKEND   │ │   QA/TEST    │
    │   AGENT     │ │ SPECIALIST │ │    AGENT     │
    │             │ │            │ │              │
    │ Diagnostica │ │ Escreve    │ │ Valida antes │
    │ erros do    │ │ migrations │ │ e depois     │
    │ RPC ao vivo │ │ seguras    │ │ de cada fix  │
    └─────────────┘ └────────────┘ └──────────────┘
           │              │              │
           └──────────────▼──────────────┘
                  ┌───────────────┐
                  │  FRONTEND     │
                  │  SPECIALIST   │
                  │               │
                  │ Adapta o      │
                  │ Finance.tsx   │
                  │ se necessário │
                  └───────────────┘
```

### Papéis e Responsabilidades

| Agente | Arquivo | Responsabilidade no Finance |
|--------|---------|----------------------------|
| Orquestrador | Claude | Sequência de tarefas, protocolo Backend Guard |
| `debugger` | `.agent/agents/debugger.md` | Diagnosticar erro do RPC em produção |
| `backend-specialist` | `.agent/agents/backend-specialist.md` | Escrever migration corretiva segura |
| `qa-automation-engineer` | `.agent/agents/qa-automation-engineer.md` | Testes de integração pré/pós migration |
| `frontend-specialist` | `.agent/agents/frontend-specialist.md` | Adaptar Finance.tsx se necessário |

---

## 📋 PLANO DE EXECUÇÃO — 3 Fases

### FASE 1 — Diagnóstico ao Vivo (Debugger Agent)
**Objetivo**: Confirmar estado atual do banco antes de qualquer mudança

**Checklist de diagnóstico:**

```sql
-- EXECUTAR NO SUPABASE SQL EDITOR (diagnóstico apenas, sem mudanças)

-- 1. Listar TODAS as versões do RPC que existem hoje
SELECT routine_name, data_type,
       string_agg(parameter_name || ':' || udt_name, ', ' ORDER BY ordinal_position) AS params
FROM information_schema.routines r
JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name = 'get_finance_stats'
GROUP BY routine_name, data_type, r.specific_name;

-- 2. Verificar se existem dados para o usuário
SELECT COUNT(*) FROM appointments WHERE status = 'Completed';
SELECT COUNT(*) FROM finance_records WHERE type IN ('revenue', 'expense');

-- 3. Testar o RPC diretamente (substituir com um user_id real)
-- SELECT get_finance_stats('SEU_USER_ID_AQUI', '2026-03-01', '2026-03-31');
```

**Resultado esperado**: Identificar qual versão do RPC está ativa e se há dados.

---

### FASE 2 — Fix Cirúrgico (Backend Specialist Agent)

> ⚠️ **REGRA DE ORO**: Toda migration deve seguir o protocolo Backend Guard (ver seção abaixo).

**Ação**: Aplicar o SQL abaixo **somente após Fase 1 confirmar o diagnóstico**.

```sql
-- MIGRATION: 20260301_finance_canonical_v4.sql
-- PROPÓSITO: Eliminar DEFINITIVAMENTE o conflito de assinaturas
-- PRÉ-REQUISITO: Fase 1 executada e confirmada

-- PASSO 1: Eliminar TODAS as versões (inclui variações não documentadas)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'get_finance_stats'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
    RAISE NOTICE 'Removido: %', r.sig;
  END LOOP;
END;
$$;

-- PASSO 2: Criar versão canônica única
-- (usar o conteúdo de 20260301_finance_stats_v3_final.sql que já está correto)

-- PASSO 3: Validar que apenas 1 versão existe
SELECT COUNT(*) as versoes_do_rpc
FROM pg_proc
WHERE proname = 'get_finance_stats';
-- Resultado deve ser: 1
```

---

### FASE 3 — Proteção Permanente (QA + Backend Agents)

Implementar os 3 pilares de proteção (ver seção Backend Guard abaixo).

---

## 🛡️ PROTOCOLO: BACKEND GUARD

> Este protocolo é **OBRIGATÓRIO** antes de qualquer migration que toque em RPCs ou tabelas usadas pelo Finance, Dashboard ou Agenda.

### Checklist Pré-Migration (NUNCA PULE)

```
□ 1. BACKUP
     - Executar scripts/backup-supabase.js antes de qualquer mudança
     - Confirmar que o backup foi gerado com sucesso

□ 2. DIAGNÓSTICO
     - Listar funções existentes no banco que serão afetadas
     - Confirmar que o ambiente é de desenvolvimento (não produção direta)

□ 3. CONTRATO
     - A assinatura do RPC está documentada neste arquivo?
     - O chamador no frontend usa exatamente essa assinatura?

□ 4. DROP SEGURO
     - A migration usa DROP com identificação dinâmica de TODAS as assinaturas?
     - (Usar pg_proc para encontrar todas as versões, não hardcoded)

□ 5. ROLLBACK
     - A migration tem comentário com SQL de rollback documentado?
     - Exemplo: -- ROLLBACK: DROP FUNCTION IF EXISTS get_finance_stats(text, text, text);
```

### Checklist Pós-Migration (SEMPRE VALIDAR)

```
□ 1. Confirmar que apenas 1 versão do RPC existe
□ 2. Testar o RPC diretamente via SQL Editor com dados reais
□ 3. Testar a página Finance no browser e confirmar que dados aparecem
□ 4. Rodar npm run typecheck — deve passar com 0 erros
□ 5. Registrar a migration no MIGRATION_LOG.md
```

---

## 📐 CONTRATO DE INTERFACE — RPCs do Finance

> Este é o contrato oficial. Frontend e backend devem estar sempre alinhados.

### `get_finance_stats`

```typescript
// CHAMADA (Finance.tsx linha ~129)
supabase.rpc('get_finance_stats', {
  p_user_id: user.id,        // string (UUID do Supabase Auth)
  p_start_date: 'YYYY-MM-DD', // string
  p_end_date: 'YYYY-MM-DD'   // string
})

// RETORNO esperado (JSON)
{
  revenue: number,
  expenses: number,
  pendingExpenses: number,
  commissions_pending: number,
  profit: number,
  revenue_by_method: { pix: number, dinheiro: number, cartao: number },
  chart_data: Array<{ name: string, receita: number, despesas: number }>,
  transactions: Array<{
    id: string,
    created_at: string,
    barber_name: string,
    client_name: string,
    service_name: string,
    description: string,
    amount: number,
    expense: number,
    type: 'revenue' | 'expense',
    commission_paid: boolean,
    payment_method: string | null,
    status: 'paid' | 'pending'
  }>
}

// ASSINATURA SQL CANÔNICA (não mudar sem atualizar este contrato)
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id   TEXT,   -- ← SEMPRE TEXT (não UUID)
  p_start_date TEXT DEFAULT NULL,
  p_end_date   TEXT DEFAULT NULL
) RETURNS JSON ...
```

### `mark_expense_as_paid`

```typescript
// CHAMADA (Finance.tsx)
supabase.rpc('mark_expense_as_paid', {
  p_record_id: transaction.id,  // string (UUID)
  p_user_id: user.id            // string
})
// RETORNO: void (sem retorno)

// ASSINATURA SQL CANÔNICA
CREATE OR REPLACE FUNCTION public.mark_expense_as_paid(
  p_record_id TEXT,
  p_user_id   TEXT
) RETURNS VOID ...
```

### `get_monthly_finance_history`

```typescript
// CHAMADA (Finance.tsx — aba Histórico)
supabase.rpc('get_monthly_finance_history', {
  p_user_id: user.id,      // string
  p_months_count: 12       // integer
})
// RETORNO: JSON array de meses

// ASSINATURA SQL CANÔNICA
CREATE OR REPLACE FUNCTION public.get_monthly_finance_history(
  p_user_id      TEXT,
  p_months_count INTEGER DEFAULT 12
) RETURNS JSON ...
```

---

## 🚨 REGRA ANTI-QUEBRAR-PROJETO

> Implementar como comentário no topo de TODA nova migration:

```sql
-- ============================================================
-- MIGRATION: [nome-da-migration].sql
-- Data: YYYY-MM-DD
-- Squad: [finance/agenda/crm]
-- Afeta RPCs: [lista de funções alteradas]
-- Afeta Tabelas: [lista de tabelas alteradas]
-- Contrato validado: SIM/NÃO
-- Rollback: [SQL de rollback aqui]
-- Testado em staging: SIM/NÃO
-- ============================================================
```

---

## 📊 HISTÓRICO DE INCIDENTES

| Data | Problema | Causa | Fix Aplicado | Status |
|------|----------|-------|-------------|--------|
| 2026-02-18 | Finance sem dados | Múltiplos RPCs conflitantes | `consolidate_finance_rpc_final.sql` | ❌ Reincidiu |
| 2026-02-28 | Finance sem dados | Idem + novos conflitos | `definitive_finance_fix.sql` | ❌ Reincidiu |
| 2026-03-01 | Finance sem dados | Idem | `finance_stats_v3_final.sql` | ⏳ Em verificação |
| 2026-03-01 | RPCs faltantes | mark_expense, monthly_history | `finance_missing_rpcs.sql` | ⏳ Em verificação |

**Padrão**: O problema reincide porque cada "fix definitivo" não elimina dinamicamente TODAS as versões — usa DROP hardcoded com assinaturas específicas que podem não cobrir todas as variações.

---

## ✅ PRÓXIMOS PASSOS IMEDIATOS

### Para o Agente Orquestrador (Claude):

1. **AGORA** — Executar Fase 1 (diagnóstico SQL) no Supabase SQL Editor
2. **AGORA** — Verificar se as migrations de 01/03 já foram aplicadas ao banco
3. **SE NÃO APLICADAS** — Aplicar `20260301_finance_stats_v3_final.sql` + `20260301_finance_missing_rpcs.sql`
4. **APÓS FIX** — Rodar o diagnóstico de Fase 1 novamente para confirmar apenas 1 RPC
5. **IMPLEMENTAR** — Backend Guard como protocolo padrão do Squad Backend

### Para o Usuário:

Antes de qualquer nova migration:
1. Executar `node scripts/backup-supabase.js`
2. Consultar o CONTRATO DE INTERFACE neste arquivo
3. Executar o checklist Pré-Migration
4. Nunca criar um novo "fix definitivo" sem antes executar o diagnóstico dinâmico de `pg_proc`

---

**Última atualização**: 2026-03-01
**Próxima revisão**: Após Fase 1 executada
