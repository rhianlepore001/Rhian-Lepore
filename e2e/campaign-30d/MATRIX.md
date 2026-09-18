# Campanha E2E 30 dias — Matriz-mestre

Orquestrador. Simulação de calendário D1–D30 (não espera real).  
Alvo: uma barbearia — 1 gestor-barbeiro (owner) · 1 recepcionista (staff, cargo label) · 3 barbeiros (staff) · clientes públicos (book + fila + Minha Área).  
Produção: https://www.agendixstudio.com · HashRouter `/#/…`.

**Live E2E autenticado: NO-GO** até haver credenciais (owner + 4 staff) e seed/slug. Smoke anônimo só se o slug DEMO existir.

---

## Pacotes especialistas (Composer 2.5)

| ID | Nome | Status | Agente | Persona / dias | Merge |
|---|---|---|---|---|---|
| **A** | Permissões e papéis (Q1/Q2) | **COMPLETO** | [bc-b1ae84eb](https://cursor.com/agents/bc-b1ae84eb-1d4d-549f-9576-67dc3701114c) · IDLE · sem PR | staff vs owner · transversal | 2026-09-18 |
| B | (aguardando relatório) | ABERTO | — | não reabrir A | merge sem redo A |
| C | (aguardando relatório) | ABERTO | — | não reabrir A | merge sem redo A |
| D | (aguardando relatório) | **FILA** | concurrency cloud-agent | lança quando houver slot | |
| E | (aguardando relatório) | **FILA** | concurrency cloud-agent | lança quando houver slot | |
| F | (aguardando relatório) | **FILA** | concurrency cloud-agent | lança quando houver slot | |

Pacote A cobre **somente** RBAC, aceite de booking online e visibilidade da fila. B–F não devem reinvestigar `public_bookings` staff, RLS owner-only de bookings, nem `OwnerRouteGuard` de `/clientes`/`/insights`/`/configuracoes`.

---

## Achados canônicos (dedupe do Pacote A)

Fonte A: A-02, A-03, A-04, A-05, A-06, A-07, A-08.  
A-02 + A-03 + A-05 são **um** defeito em três camadas → um id canônico.

| ID canônico | Sev. | Origem A | Persona | Veredito | Não duplicar em |
|---|---|---|---|---|---|
| **CAM-001** | blocker | A-02, A-03, A-05 | colaborador / recepção | Staff **não** vê nem confirma booking público. Fetch `business_id = user.id`; RLS `auth.uid() = business_id`; `handleAcceptBooking` grava com `user.id`. | B–F Agenda/booking |
| **CAM-002** | major | A-04 | colaborador | UI mostra **Aceitar** para staff; **Recusar** só dono. Botão enganoso se a lista um dia aparecer. | B–F UI Agenda |
| **CAM-003** | note | A-06 | colaborador | Q2 **PASS**: `/#/fila` liberada; staff vê nome/telefone; RLS `Staff can view company queue`. | B–F fila (não reabrir “pode ver?”) |
| **CAM-004** | note | A-07 | recepção vs barbeiro | RBAC binário `owner` \| `staff`. `team_members.role` é **label** (Barbeiro/Recepcionista). | B–F papéis |
| **CAM-005** | major | A-08 | staff | `/#/financeiro` **sem** `OwnerRouteGuard` (deep link). Nav esconde; URL abre “Meu Financeiro”. | B–F financeiro/ACL |

E2E obrigatório (não é reinvestigação — é prova de runtime):

1. **Staff ≠ owner no aceite online** — colaborador não lista pendentes; dono lista e Aceitar/Recusar. (CAM-001, CAM-002)
2. **Fila PII para staff** — nome + telefone do cliente no board `/#/fila`. (CAM-003)

---

## Mapa A → pacotes de 30 dias

Pacote A **não** executou o calendário. Só fechou premissas de ACL. Os pacotes operacionais abaixo herdam A e **não** reabrem Q1/Q2.

| Pacote 30d | Dias | Persona | Status vs A | Fora (anti-dupe) |
|---|---|---|---|---|
| PKG-01 Setup gestor | D1–D2 | owner | pendente B–F | ACL staff |
| PKG-02 Convites equipe | D1–D2 | owner+staff | pendente | Q1 booking |
| PKG-03 Agenda gestor | D3–D10, D21, D23–D27 | owner | pendente; **assume CAM-001** | “staff consegue aceitar?” |
| PKG-04 Agenda staff | D3–D13 | barbeiros | pendente; **prova E2E CAM-001/002** | RLS policy text |
| PKG-05 Recepção | D3–D15 | recepcionista=staff | pendente; **assume CAM-004** | inventar role recepção |
| PKG-06 Fila cliente | D3–D28 | cliente | pendente | “staff vê a fila?” |
| PKG-07 Fila operação | D3–D28 | owner+staff | pendente; **prova E2E CAM-003 (PII)** | reabrir SELECT RLS |
| PKG-08 Booking público | D2–D28 | cliente | pendente | aceite staff |
| PKG-09 Minha Área + clube | D5–D28 | cliente | pendente | |
| PKG-10 Financeiro gestor | D15, D21, D30 | owner | pendente | |
| PKG-11 Meus Insights | D15, D30 | staff | pendente | |
| PKG-12 CRM | D4–D20 | owner | pendente; staff bloqueado (A, sem id novo) | `/clientes` OwnerRouteGuard |
| PKG-13 Produtos | D8–D18 | owner+staff | pendente | |
| PKG-14 Equipe/comissões | D18, D30 | owner | pendente | |
| PKG-15 Stripe/trial | D20 | owner | skip se sem chave teste | |
| PKG-16 Suporte/links | D1 | todos | WhatsApp `#` já no orquestrador | |
| PKG-17 Segurança P0 | após D2 | especialista | paralelo; não misturar com CAM-001 | |

Calendário D1–D30 completo: relatório do orquestrador (turno anterior). Não repetir aqui.

---

## Protocolo de merge B–F

Ao chegar relatório B–F:

1. Mapear cada finding para CAM-* existente ou criar CAM-00N novo.
2. Se o texto for “staff não vê public_bookings / Aceitar enganoso / fila visível / cargo é label / financeiro sem guard” → **duplicate_of** CAM-001…005. Não reabrir.
3. Atualizar só a linha do pacote na tabela A–F e anexar ids novos na tabela canônica.
4. Não reler Agenda.tsx nem policies de `public_bookings` por causa de A.

Formato de finding (especialistas):

```
id: B-01
severity: blocker | major | minor | note
persona: gestor | recepcionista | barbeiro-N | cliente-publico
day: D12
package: B
duplicate_of: null | CAM-001
steps / expected / actual / evidence
```

---

## GO/NO-GO (inalterado pelo Pacote A)

| Item | Estado |
|---|---|
| Credenciais E2E/DEMO neste ambiente | ausentes |
| Seed DEMO em produção | não aplicado por este orquestrador |
| Stripe live | não usar |
| WhatsApp suporte | morto (`SUPPORT_WHATSAPP_URL = '#'`) |
| Q1 staff aceita booking | **FAIL** (CAM-001) — produto, não só teste |
| Q2 staff vê fila | **PASS** (CAM-003) — validar PII no browser quando houver login |

**NO-GO** live autenticado sem credenciais. Pacote A não desbloqueia browser; só fecha o desenho de ACL.
