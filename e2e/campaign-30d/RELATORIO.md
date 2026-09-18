# Relatório orquestrador — esqueleto A+B+C+F

Campanha simulada 30 dias · AgendiX · 2026-09-18  
Fontes: A permissões · B inventário · C gestor-barbeiro · **F clientes públicos**.  
**D (recepção) e E (3 staff): TBD.** Não relançar A/B/C/F. Plano E2E final + backlog só após D+E.

---

## 1. Vereditos fechados

| Questão | Resultado | Canônico |
|---|---|---|
| Colaborador aceita booking online? | **FAIL** | CAM-001, CAM-002 (C-10 = dupe). **Fora de F.** |
| Colaborador vê cliente na fila? | **PASS** | CAM-003 |
| Recepcionista ≠ barbeiro em ACL? | **Não** | CAM-004 |
| Submit público | INSERT `pending` + `get_active_booking_by_phone`. Sem RPC `create_public_booking`. | CAM-014 |
| Copy pós-submit | “AGENDAMENTO CONFIRMADO” com DB `pending` | CAM-013 |
| Trial | 20 dias | CAM-011 |
| OTP Minha Área | **Não** (telefone/localStorage) | CAM-018 |

---

## 2. Superfícies (B) + cliente (F)

Público vivo: `/#/book/:slug` · `/#/queue/:slug` · `/#/minha-area/:slug` · `/#/clube/:slug`.

**Não testar como feature:** CAM-006–010 (placeholders / landing / audit dev).  
**Reusar Playwright:** `ciclo-de-receita` (aceite = dono), `fila-digital-v2`, `queue-manual-add`, `club-capture`.

---

## 3. Jornada dono (C) vs cliente (F)

| Quem | Dias / IDs | Ligação |
|---|---|---|
| Owner | C D1–D30 | Aceita pending (D15); fila QR lado casa (D19) |
| Cliente | **F-C-01..30** (não são os C-01 do dono) | Submit pending; card “Aguardando” até o dono aceitar |
| Recepção | D TBD | |
| 3 barbeiros | E TBD | |

---

## 4. Achados canônicos

CAM-001…012 = A+B+C.  
CAM-013…019 = F (F-09, F-06/07, F-08, F-15, F-10/19, F-16, F-14).  
Tabela completa: [`MATRIX.md`](./MATRIX.md).

Backlog **ainda não priorizado em ranking único** — falta D+E.

---

## 5. TBD

| Pacote | Persona | Ao chegar |
|---|---|---|
| D | Recepcionista | Walk-in, add fila, CRM bloqueado |
| E | 3 barbeiros | CAM-001 prova runtime, insights, filtro agenda |
| **Final** | orquestrador | Plano E2E 30d consolidado + backlog P0→note |

---

## 6. GO / NO-GO

**NO-GO** autenticado sem credenciais.  
GO parcial anônimo: book + fila + copy CAM-013 se o slug existir.  
Desenho fechado: ACL (A) + mapa (B) + mês dono (C) + mês cliente (F).
