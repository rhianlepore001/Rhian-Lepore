---
schemaVersion: 1
generatedAt: 2026-05-17T17:50:00Z
reversa:
  version: "1.0.0"
kind: discard_log
producedBy: curator
---

# Discard Log

> Registro detalhado de regras descartadas na curadoria, com justificativa e rastreabilidade.

---

## Vinculadas a mudanca de paradigma

### BR-DESCARTAR-001 -- Fallback client-side do checkout

- **Origem**: agenda.md R11, gaps.md G3
- **Regra legado**: Se RPC `complete_appointment` falhar, fallback faz UPDATE em `appointments` + INSERT em `finance_records` separadamente no client-side.
- **Por que descarta**: No paradigma alvo (funcional leve), o checkout e uma mutation TanStack Query que chama uma RPC atomica. O conceito de "fallback client-side que faz 2 operacoes separadas" e artefato do paradigma procedural onde o componente orquestrava transacoes. No alvo, a atomicidade vive no banco (BEGIN/COMMIT), nao no cliente.
- **Como o paradigma novo absorve**: Hook `useCheckout` -> mutation -> RPC atomica. Se falhar, retry automatico via TanStack Query. Sem fallback manual.
- **Risco de descartar**: Nenhum. O fallback era compensacao de um problema (G3). Resolver o problema elimina a necessidade do fallback.

### BR-DESCARTAR-002 -- Finalizacao da fila client-side

- **Origem**: queue.md R19, gaps.md G2
- **Regra legado**: Finalizacao da fila executa 4 operacoes sequenciais no client-side: criar cliente, criar appointment, criar finance_record, atualizar queue_entry.
- **Por que descarta**: Mesmo caso do checkout. Transacao manual no cliente e artefato do paradigma procedural. No alvo, vira RPC atomica chamada via mutation.
- **Como o paradigma novo absorve**: Hook `useFinishQueue` -> mutation -> RPC `finish_queue_entry` com transacao. Decisao validada em questions.md Q2.
- **Risco de descartar**: Nenhum. Eliminado pela correcao do gap G2.

---

## Nao vinculadas a paradigma (bugs, dividas, deprecacoes)

### BR-DESCARTAR-003 -- Filtro financeiro por nome

- **Origem**: finance.md (legado), gaps.md G4, questions.md Q3
- **Regra legado**: Staff filtra transacoes por `professionalName === fullName`.
- **Por que descarta**: Bug de seguranca. Dois profissionais com mesmo nome veem dados um do outro. Substituido por filtro por `professional_id` (BR-MIGRAR-034).
- **Risco de descartar**: Nenhum. Correcao de bug.

### BR-DESCARTAR-004 -- isDev por email hardcoded

- **Origem**: auth.md R5, permissions.md L2
- **Regra legado**: `isDev = email === 'rleporesilva@gmail.com'`
- **Por que descarta**: Nao escalavel, nao seguro para multiplos desenvolvedores. Na v1, substituir por flag em `profiles.is_dev` ou variavel de ambiente, sem hardcode de email.
- **Risco de descartar**: Baixo. Funcionalidade de debug deve existir, mas implementada de forma adequada.

### BR-DESCARTAR-005 -- Wizard legado como source of truth

- **Origem**: gaps.md G1, questions.md Q1
- **Regra legado**: Login verifica `business_settings.onboarding_completed` (wizard legado) para redirect de onboarding.
- **Por que descarta**: Causa loop de redirect (G1). Source of truth migra para `onboarding_progress.is_completed`. Campo legado mantido apenas para compatibilidade temporaria.
- **Risco de descartar**: Nenhum. Decisao validada em Q1.

### BR-DESCARTAR-006 -- Dev alternando user_type via localStorage

- **Origem**: auth.md R12
- **Regra legado**: Dev com email hardcoded pode alternar `user_type` globalmente via localStorage key `rhian_lepore_dev_type`.
- **Por que descarta**: Mecanismo de debug acoplado a email hardcoded (BR-DESCARTAR-004). Na v1, debug tools devem ser condicionais a flag explícita (env var ou profile flag), nao a localStorage.
- **Risco de descartar**: Nenhum para usuarios finais. Dev perde conveniencia, mas ganha seguranca.

---

## Resumo

| Tipo | Quantidade |
|---|---|
| Vinculadas a paradigma | 2 |
| Nao vinculadas (bugs/dividas) | 4 |
| **Total descartadas** | **6** |
