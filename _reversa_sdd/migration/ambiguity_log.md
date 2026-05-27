---
schemaVersion: 1
generatedAt: 2026-05-17T17:50:00Z
reversa:
  version: "1.0.0"
kind: ambiguity_log
producedBy: curator
lastUpdatedBy: orchestrator
lastUpdatedAt: 2026-05-17T17:54:00Z
---

# Ambiguity Log

> Registro consolidado de itens ambiguos, lacunas e decisoes pendentes ao longo do pipeline de migracao.

---

## PENDENTES

(nenhum)

---

## RESOLVIDOS COM DECISAO HUMANA

| ID | Descricao | Decisao | Prioridade | Decidido em |
|---|---|---|---|---|
| AMB-001 | Comissao com multiplos profissionais | Manter 1 profissional por agendamento na v1. Modelar `appointment_services` so se virar requisito comercial. | Pos-v1/beta | 2026-05-17 |
| AMB-002 | Portfolio publico `/pro/:slug` | Manter como feature secundaria. Nao bloqueia v1. | Pos-v1/beta | 2026-05-17 |
| AMB-003 | Fila sem verificacao de duplicata | Adicionar verificacao por telefone. | v1 obrigatoria | 2026-05-17 |
| AMB-004 | Fila sem timeout de `calling` | Timeout de 5 min; volta para `waiting` (NAO marca no_show automaticamente). | v1 obrigatoria | 2026-05-17 |
| AMB-005 | Edicao de booking sobrescreve historico | Criar novo appointment e manter original como historico. | v1 obrigatoria | 2026-05-17 |
| AMB-006 | Permissoes de staff em RPCs | Auditar e adicionar validacao server-side nas RPCs criticas. | v1 obrigatoria | 2026-05-17 |
| AMB-007 | Memoria semantica sem limite | Limite de 50/cliente e regra desejada; implementacao pode ficar pos-v1 se RAG nao for essencial para lancamento. | Pos-v1/beta | 2026-05-17 |
| AMB-008 | Edicao de booking com appointment soft-deleted | INSERT novo appointment em vez de UPDATE. | v1 obrigatoria | 2026-05-17 |

---

## REFERIDOS A CODIFICACAO

(sera preenchido ao final do pipeline)
