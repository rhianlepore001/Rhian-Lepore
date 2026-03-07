# 🏗️ [NOME DO MÓDULO] SQUAD — Plano de Orquestração

> **Como usar este template:** Copie este arquivo, renomeie para `[MODULO]_SQUAD.md` e preencha cada seção.
> Exemplo: `AGENDA_SQUAD.md`, `CRM_SQUAD.md`, `MARKETING_SQUAD.md`

**Criado**: YYYY-MM-DD
**Status**: 🟡 PLANEJAMENTO
**Owner**: Agente Orquestrador (Claude)
**Contexto**: [Descreva o módulo e o problema que este squad foi criado para resolver]

---

## 🧑‍💼 ESTRUTURA DO SQUAD

```
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR (Claude)                     │
│   Coordena todos os agentes e aplica os GATES obrigatórios  │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌───▼──────────┐
    │  DEBUGGER   │ │  BACKEND   │ │   QA/TEST    │
    │   AGENT     │ │ SPECIALIST │ │    AGENT     │
    │             │ │            │ │              │
    │ Diagnostica │ │ Escreve    │ │ Valida antes │
    │ o problema  │ │ migrations │ │ e depois     │
    │ antes do fix│ │ seguras    │ │ de cada fix  │
    └─────────────┘ └────────────┘ └──────────────┘
           │              │              │
           └──────────────▼──────────────┘
                  ┌───────────────┐
                  │  FRONTEND     │
                  │  SPECIALIST   │
                  │               │
                  │ Adapta a UI   │
                  │ se necessário │
                  └───────────────┘
```

### Papéis e Responsabilidades

| Agente | Arquivo | Responsabilidade neste Squad |
|--------|---------|------------------------------|
| Orquestrador | Claude | Sequência de tarefas, protocolo de proteção, comunicação com o dono |
| `debugger` | `.agent/agents/debugger.md` | Diagnosticar o problema antes de qualquer mudança |
| `backend-specialist` | `.agent/agents/backend-specialist.md` | Escrever migrations e lógica de negócio |
| `qa-automation-engineer` | `.agent/agents/qa-automation-engineer.md` | Testar antes e depois de cada mudança |
| `frontend-specialist` | `.agent/agents/frontend-specialist.md` | Adaptar a interface se necessário |

> **Remova agentes que não se aplicam. Adicione outros se necessário (ex: `database-architect` para mudanças complexas de schema).**

---

## 📐 CONTRATO DE INTERFACE

> Este é o contrato oficial deste módulo. Frontend e backend devem estar sempre alinhados.
> **Nunca mude uma assinatura sem atualizar este contrato primeiro.**

### RPC: `[nome_da_funcao]`

```typescript
// CHAMADA (arquivo onde é chamado, linha ~XXX)
supabase.rpc('[nome_da_funcao]', {
  p_user_id: user.id,        // string (UUID)
  p_param2: 'valor',         // string / number / boolean
})

// RETORNO esperado
{
  campo1: number,
  campo2: string,
  array_de_itens: Array<{
    id: string,
    nome: string,
    // ...
  }>
}

// ASSINATURA SQL CANÔNICA (não mudar sem atualizar este contrato)
CREATE OR REPLACE FUNCTION public.[nome_da_funcao](
  p_user_id   TEXT,
  p_param2    TEXT DEFAULT NULL
) RETURNS JSON ...
```

> Adicione uma entrada para cada RPC / função / endpoint deste módulo.

---

## 🛡️ PROTOCOLO DE PROTEÇÃO

> Este protocolo é **OBRIGATÓRIO** antes de qualquer mudança que toque neste módulo.

### Checklist Pré-Mudança (NUNCA PULE)

```
□ 1. BACKUP
     - Executar backup antes de qualquer mudança no banco
     - Confirmar que o backup foi gerado com sucesso

□ 2. DIAGNÓSTICO
     - Listar funções existentes no banco que serão afetadas
     - Confirmar o estado atual antes de qualquer alteração

□ 3. CONTRATO
     - A assinatura está documentada neste arquivo?
     - O chamador no frontend usa exatamente essa assinatura?

□ 4. DROP SEGURO (para migrations que alteram funções)
     - Usar identificação dinâmica de TODAS as assinaturas (pg_proc)
     - Nunca hardcoded — podem existir versões não documentadas

□ 5. ROLLBACK
     - A migration tem SQL de rollback documentado?
     - Exemplo: -- ROLLBACK: DROP FUNCTION IF EXISTS [funcao](text, text);
```

### Checklist Pós-Mudança (SEMPRE VALIDAR)

```
□ 1. Confirmar que apenas 1 versão da função existe no banco
□ 2. Testar a função diretamente via Supabase SQL Editor com dados reais
□ 3. Testar a página no browser e confirmar que os dados aparecem
□ 4. Rodar npm run typecheck — deve passar com 0 erros
□ 5. Rodar npm run lint — deve passar sem warnings
```

---

## 📋 CABEÇALHO PADRÃO PARA MIGRATIONS

> Adicione este comentário no topo de TODA nova migration deste módulo:

```sql
-- ============================================================
-- MIGRATION: [nome-da-migration].sql
-- Data: YYYY-MM-DD
-- Squad: [nome-do-squad]
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
| YYYY-MM-DD | [descrição] | [causa raiz] | [migration aplicada] | ⏳ / ✅ / ❌ |

**Padrão a observar:** Se o mesmo problema reincide, a causa raiz não foi resolvida. Investigue o padrão antes de aplicar mais um "fix definitivo".

---

## 🔍 DIAGNÓSTICO RÁPIDO (SQL para Supabase)

> Copie e execute no Supabase SQL Editor para diagnóstico. **Apenas leitura, sem mudanças.**

```sql
-- 1. Listar TODAS as versões de funções deste módulo
SELECT routine_name,
       string_agg(parameter_name || ':' || udt_name, ', ' ORDER BY ordinal_position) AS params
FROM information_schema.routines r
JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name IN ('[funcao_1]', '[funcao_2]')
GROUP BY routine_name, r.specific_name;

-- 2. Verificar se existem dados para o usuário de teste
-- SELECT COUNT(*) FROM [tabela_principal] WHERE user_id = 'SEU_USER_ID';

-- 3. Testar a função diretamente
-- SELECT [nome_da_funcao]('SEU_USER_ID', '2026-01-01', '2026-12-31');
```

---

## ✅ PRÓXIMOS PASSOS

### Para o Agente Orquestrador (Claude):
1. [ ] [Próxima ação imediata]
2. [ ] [Segunda ação]
3. [ ] [Implementar protocolo de proteção como padrão do squad]

### Para o Dono:
1. [ ] [Algo que o dono precisa fazer manualmente, ex: executar diagnóstico SQL]
2. [ ] [Decisão de negócio pendente]

---

**Última atualização**: YYYY-MM-DD
**Próxima revisão**: [Após qual evento este squad deve ser revisado]
