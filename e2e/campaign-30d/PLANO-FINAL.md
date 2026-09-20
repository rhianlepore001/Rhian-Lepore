# Plano E2E 30 dias — entregável final (A–F)

Campanha **simulada** (calendário D1–D30, não espera real).  
Barbearia: 1 gestor-barbeiro · 1 recepcionista (staff, cargo label) · 3 barbeiros (staff) · clientes públicos.  
Produção: https://www.agendixstudio.com · HashRouter `/#/…`.  
Âncora sugerida (Pacote D): `E2E_ANCHOR_DATE=2026-09-01` → `/#/agenda?date=2026-09-DD`.  
Viewport: 390×844 + 1280×800.

Pacotes: A permissões · B inventário · C dono · **D recepção** · E 3 barbeiros · F clientes.  
**Não relançar A–F.** Canônicos: [`MATRIX.md`](./MATRIX.md).

---

## 1. Quadro de respostas (código, A+D+E)

| # | Pergunta | Veredito | Evidência (não reabrir) |
|---|---|---|---|
| **Q1** | Colaborador (não-dono) aceita/confirma booking online? | **FAIL** | **CAM-001** A-02/03/05, E-01..E-05, D-01..D-03: `fetchPublicBookings` / realtime `business_id = user.id`; RLS `Owner can manage public_bookings`; `handleAcceptBooking` com `user.id`; INSERT `appointments` sem policy staff. **CAM-002** Aceitar visível, Recusar só dono (A-04, C-10, E-06, D-04). **D-05** sino: `AlertsContext` também filtra `user.id`. |
| **Q2** | Colaborador vê cliente na fila digital? | **PASS** | **CAM-003** A-06, E-11, D-07: rota `/#/fila`; RLS view/update; nome/telefone; chamar/iniciar/checkout. Staff **sem** QR/Ajustes (**CAM-012**, D-28). Add manual **funciona** via RPC (D-08) apesar do SPEC F4 (**CAM-021**). |

Recepcionista = **mesmo RBAC `staff`** (CAM-004, D-06, E-07). Cargo não muda permissão.

---

## 2. Plano mestre 30 dias (C ‖ D ‖ E ‖ F)

Uma loja, quatro contextos. **Não** repetir o mesmo clique em duas personas.

Contextos Playwright (quando houver credenciais): `owner` · `recepcao` · `barbeiro1|2|3` · `anon` (sem login).  
Cliente F não precisa de conta AgendiX — telefone / localStorage.

### Onda 0 — identidade (D0 / D1 manhã)

| Quem | Faz | Não faz |
|---|---|---|
| Owner (C) | Se tenant novo: wizard, serviços, horários, slug, 4 convites (recepção + C1–C3). Se DEMO: smoke slug + equipe. | Claim staff |
| Recepção (D) | `d00-invite`: register `?company=&member=`, onboarding staff, sidebar sem Clientes/Ajustes | Wizard dono |
| C1–C3 (E) | E-D1..D6 convite + login; deep link settings → `/` | Aceitar booking |
| Cliente | — | — |

### Semana 1 — D1–D7 abertura

| Dia | Owner | Recepção | Barbeiros | Cliente |
|---|---|---|---|---|
| D1 | Seed 1 appointment próprio | Walk-in **Agenda** (D-09) | Filtro self | — |
| D2 | — | Vê senha na fila | — | QR `/#/queue/:slug` join (F-C-15) |
| D3 | — | Add manual fila (D-08 / CAM-021) | — | — |
| D4 | — | Chamar → iniciar → checkout fila | Um barbeiro serve a senha se `per_professional` | Painel `?tab=fila` |
| D5 | — | Fila por profissional | Filtro **Todos** (E-13) | — |
| D6 | — | Checkout agenda PIX (D-13) | — | — |
| D7 | — | `/#/fila/historico` | — | Duplicata fila (F-C-18) |

### Semana 2 — D8–D14 rotina

| Dia | Owner | Recepção | Barbeiros | Cliente |
|---|---|---|---|---|
| D8 | Grade 3 dias | Nav Fila / Agenda `?date=` | Wizard na própria coluna | `/#/book/:slug` submit pending (F-C-01) |
| D9 | — | `/#/meus-insights` (sem receita casa) | Idem insights próprios | Card Minha Área **Aguardando** (F-C-07) — não “Confirmado” até dono |
| D10 | — | Copiar link público (se visível; D-16 staff pode sumir) | Órfão só se sem `teamMemberId` (CAM-022) | Produtos no book (F-C-05) |
| D11 | Slug + toggle online (C); **não** testar “Em breve” como feature (CAM-007) | — | — | CTA clube (F-C-06) |
| D12 | CRUD na **própria** coluna | — | Q1: lista pública **vazia** (FAIL esperado) | — |
| D13 | Editar/remarcar | — | Clicar Aceitar se UI → toast erro (CAM-002) | — |
| D14 | Cancelar / no-show dono | `/#/produtos` (sem CRUD) | Recusar **ausente** | Rebook/edit intents (F-C-10/11) |

### Semana 3 — D15–D21 booking + fila pico

| Dia | Owner | Recepção | Barbeiros | Cliente |
|---|---|---|---|---|
| D15 | Cria **pending** público (ou deixa F criar) | Painel solicitações **vazio** (D-16 / CAM-001) | Idem Q1 FAIL | Submit + copy **CONFIRMADO** vs pending (**CAM-013**) |
| D16 | — | Aceitar se botão → falha (D-17) | E-D12/13 | Double-book 2 abas (**CAM-014**) |
| D17 | — | Recusar ausente (D-19) | — | Cancel Minha Área (**CAM-016**) |
| D18 | **Aceitar** pending (único caminho que confirma) | Banner atrasados só Info (D-14) | — | Card vira Confirmado **depois** disto |
| D19 | QR + Ajustes fila (só dono) | Header **sem** QR/Ajustes (D-28) | Chamar/servir | Walk-in QR |
| D20 | — | Faltou na Agenda (D-12 / CAM-024 — pode falhar RLS) | no_show fila | Pix “Já paguei” (confirmação = casa) |
| D21 | — | Add cliente fila de novo | E-D21 SPEC drift | Book + fila no mesmo dia (F-C-21) |

### Semana 4 — D22–D30 caixa, limites, bordas

| Dia | Owner | Recepção | Barbeiros | Cliente |
|---|---|---|---|---|
| D22 | — | Deep links `/clientes` `/insights` `/configuracoes` `/clube/assinantes` → `/` + toast | Faturar Agenda → toast dono (**CAM-020**) | Slug inválido (F-C-02) |
| D23 | — | — | Checkout **fila** PASS | INSERT `confirmed` anon rejeitado (F-C-27) |
| D24 | Financeiro KPIs | `/#/financeiro` → Meu Financeiro (**CAM-005**) | overdue sem Faturar | Phone match histórico (CAM-019) |
| D25 | Comissões | Smoke D1+D3+D16+D25 | Denied equipe/assinatura | PT/MB WAY se região PT |
| D26 | Insights `/insights` | — | `/#/insights` redirect | — |
| D27 | Vê pendências públicas | — | — | Clube Pix pending vs ativo |
| D28 | Planos clube dono | Header fila sem QR | Produtos venda sem cadastrar | — |
| D29 | Trial banner / planos (sem charge live) | — | — | — |
| D30 | Paywall só se trial expirado (admin); 2FA opcional | Smoke recepção | Smoke 3 cadeiras | Smoke prod F-C-30 se slug DEMO |

Sábado = D7, D14, D21, D28 (volume fila). Domingo = empty/histórico, não forçar volume.

---

## 3. Backlog priorizado (A–F)

Severidade de campanha: **P0** quebra o mês da loja ou a confiança do cliente; **P1** fluxo secundário / ACL enganosa; **P2** drift/spec/UX; **note** = documentar, não ticket urgente.

| Pri | ID | Problema | Pacotes | Ação de produto (não neste PR) |
|---|---|---|---|---|
| **P0** | **CAM-001** | Staff/recepção **não** vê nem confirma booking online | A, D, E | Fetch/realtime/`handleAccept` com `companyId`; policy staff SELECT/UPDATE `public_bookings` + INSERT appointment tenant |
| **P0** | **CAM-014** | INSERT público sem lock / sem revalidar slot → double-book | F | RPC atômica ou constraint de overlap |
| **P0** | **CAM-013** | Success “AGENDAMENTO CONFIRMADO” com row `pending` | F | Copy “solicitação enviada / aguardando a casa” |
| **P0** | **CAM-016** | Cancel Minha Área = UPDATE direto; falha silenciosa | F | RPC DEFINER anon com prova de telefone, ou esconder Cancelar |
| **P1** | **CAM-002** | Aceitar visível; Recusar só dono; toast genérico | A, C, D, E | Esconder Aceitar até CAM-001 ou RPC staff |
| **P1** | **CAM-015** | lead time / max/dia / `public_booking_enabled` não no INSERT | F | Enforce no WITH CHECK ou RPC |
| **P1** | **CAM-020** | Concluir na Agenda bloqueado (toast); fila checkout OK; D-13 sugere checkout agenda 2xx | E, D | Um caminho só: staff cobra via checkout, não via Faturar |
| **P1** | **CAM-023** | Sino/`AlertsContext` `business_id=user.id` — recepção sem alerta de pending (D-05) | D | Mesmo tenant que CAM-001 |
| **P1** | **CAM-024** | “Faltou” staff pode falhar RLS UPDATE `appointments` (D-12) | D | Policy UPDATE staff ou RPC |
| **P2** | **CAM-005** | `/#/financeiro` sem `OwnerRouteGuard` | A, D, E | Guard **ou** documentar Meu Financeiro como feature |
| **P2** | **CAM-021** | SPEC F4 vs UI “Adicionar cliente”; recepção **precisa** (D-08 PASS) | E, D | Decisão: legalizar add staff **ou** esconder e dar só à recepção (hoje não existe role) |
| **P2** | **CAM-017** | Realtime anon frágil | F | Confiar no poll |
| **P2** | **CAM-019** | Histórico telefone exact match | F | `phones_match` |
| **P2** | **CAM-006–008** | Placeholders notificações / senha / “Em breve” | B, C | Assert copy; não E2E de feature |
| note | CAM-004, 009–012, 018, 022, 025 | Label cargo; dev-only; trial 20d; sem landing; OTP ausente; órfão; link público staff | — | Não ticket P0 |

WhatsApp suporte `#` (orquestrador) = P2 link morto, fora da operação da loja.

---

## 4. GO / NO-GO live browser

| Item | Estado |
|---|---|
| Credenciais owner + recepção + 3 staff | **Ausentes** neste orquestrador |
| DEMO `agendix.demo.barber@example.com` | Senha rotacionada; seed **não** aplicado aqui |
| Stripe | **Não** cobrar live |
| Specs `e2e/recepcionista/*` | **Propostos pelo D, não commitados** neste branch |
| Q1/Q2 | Já estáticos; live só **prova** (FAIL/PASS esperados) |

**NO-GO** execução autenticada de 30 dias **sem** `E2E_OWNER_*`, `E2E_STAFF_*` (×4) e slug.

**GO parcial anônimo** se o slug DEMO existir: F-C-01, F-C-15, **CAM-013** (copy), F-C-02 slug ruim. Sem isso, nem o parcial.

Desbloqueio humano: 5 logins + slug + **não** Stripe live + âncora de data. Aí: onda 0 convites → S1 recepção/fila → S3 Q1 FAIL + Aceitar **dono** → S4 caixa.

---

## 5. O que NÃO retestar (já estático)

Não reler Agenda/RLS para “descobrir” Q1. Live no máximo 1 prova por persona.

- CAM-001 camadas fetch / RLS / `user.id` / INSERT appointment (A, D, E)
- CAM-003 SELECT fila staff
- CAM-004 RBAC binário / cargo label
- CAM-007 toggles “Em breve”
- CAM-009 auditoria/lixeira `isDev`
- CAM-010 ausência de landing neste repo
- CAM-011 `TRIAL_DAYS = 20`
- Inexistência de RPC `create_public_booking` (F)
- OwnerRouteGuard em `/clientes` `/insights` `/configuracoes/*` `/clube/assinantes` (lista B)
- Playwright já existente: `ciclo-de-receita` (aceite **dono**), `staff-agenda-filter`, `fila-digital-v2`, `queue-manual-add`, `staff-invite-flow`, `staff-insights-privacy` — **reusar**, não reescrever

---

## 6. Ordem de execução live (quando GO)

1. Anônimo: book + fila + CAM-013  
2. Owner: Aceitar um pending (único Q1 positivo)  
3. Recepção: walk-in agenda + add fila + checkout fila + denied CRM  
4. Um barbeiro: Q1 FAIL + filtro Todos + checkout fila  
5. Minha Área: cancel (CAM-016) + card após aceite dono  
6. Owner: financeiro do checkout  
7. Negativos: deep links, financeiro staff, Faturar Agenda staff  

Parar no primeiro P0 inesperado (ex.: staff **consegue** aceitar — regressão inversa de CAM-001).
