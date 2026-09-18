# Campanha E2E 30 dias — Matriz-mestre

Orquestrador. Simulação de calendário D1–D30 (não espera real).  
Alvo: 1 gestor-barbeiro (owner) · 1 recepcionista (staff, label) · 3 barbeiros (staff) · clientes públicos.  
Produção: https://www.agendixstudio.com · HashRouter `/#/…`.

**Live autenticado: NO-GO** sem credenciais. Smoke anônimo só com slug DEMO.

Relatório sintético A+B+C+E+F: [`RELATORIO.md`](./RELATORIO.md). **Não relançar A/B/C/E/F.**

---

## Pacotes especialistas (Composer 2.5)

| ID | Nome | Status | Agente canônico | Escopo | Merge |
|---|---|---|---|---|---|
| **A** | Permissões e papéis (Q1/Q2) | **COMPLETO** | [bc-b1ae84eb](https://cursor.com/agents/bc-b1ae84eb-1d4d-549f-9576-67dc3701114c) | staff vs owner | 2026-09-18 |
| **B** | Inventário de superfícies | **COMPLETO** | [bc-e638dc10](https://cursor.com/agents/bc-e638dc10-6a1c-5917-aed7-2373c63cfe49) | B-01..B-48 + B-M01..M14 | 2026-09-18 |
| **C** | Gestor-barbeiro 30d | **COMPLETO** | [bc-b87f87de](https://cursor.com/agents/bc-b87f87de-48e1-56c1-8eec-3f6448519c9e) | owner D1–D30 | 2026-09-18 |
| **D** | Recepcionista | **TBD** | aguardar relatório; não relançar | — | — |
| **E** | 3 colaboradores | **COMPLETO** | [bc-5fdc69cc](https://cursor.com/agents/bc-5fdc69cc-f23c-52f7-92a1-1105776aee34) | C1‖C2‖C3; E-01..E-14; E-D1..30 | 2026-09-18 |
| **F** | Clientes booking+fila | **COMPLETO** | [bc-7742ea7b](https://cursor.com/agents/bc-7742ea7b-ff79-5997-828a-e20e65f677ae) | book/queue/Minha Área; F-C-01..30 | 2026-09-18 |

Duplicatas de lançamento (ignorar): A `bc-830d8a1e`, B `bc-1dc8a005`, C `bc-daeb09ba`.  
**Não relançar A/B/C/E/F.** Falta **D** → aí sim plano E2E 30d final + backlog P0 ranqueado.

E reforça Q1 FAIL (E-01..E-05 = CAM-001) e Q2 PASS (E-11 = CAM-003). C3 no E com label Recepcionista = **CAM-004** (mesmo ACL); jornada de balcão continua **Pacote D**.

---

## Achados canônicos (A+B+C+E+F, dedupe)

| ID | Sev. | Origem | Veredito | duplicate_of / anti-dupe |
|---|---|---|---|---|
| **CAM-001** | blocker | A-02/03/05, **E-01..E-05** | Staff não vê/confirma booking público: fetch+realtime `user.id`; RLS owner-only; aceite com `user.id`; INSERT `appointments` sem policy staff (E-05). | E-D12/D13 **FAIL esperado**; não reabrir |
| **CAM-002** | major | A-04, C-10, **E-06** | Aceitar visível staff; Recusar só owner; toast genérico “Erro ao aceitar”. | E-D14 |
| **CAM-003** | note | A-06, **E-11** | Q2 PASS: `/fila`; RLS view/update; **chamar/iniciar/checkout fila OK**. | E-D16..D20, D23 |
| **CAM-004** | note | A-07, **E-07** | Cargo Barbeiro/Recepcionista cosmética. E-D15 C3≡C1. | **D** não retestar ACL; só jornada balcão |
| **CAM-005** | major | A-08, **E-08** | `/#/financeiro` sem guard; “Meu Financeiro” scoped. | E-D26 |
| **CAM-006** | minor | B-32, C-17 | `/#/configuracoes/notificacoes` = Placeholder. Sino (B-16) ≠ esta página. | D/E settings |
| **CAM-007** | note | B-26 | Escolha de profissional + lembretes e-mail = **“Em breve”** (disabled). E2E asserta copy, não o toggle. | C D11 (só slug/toggle online) |
| **CAM-008** | minor | B-33 | Alterar senha in-app **“Recuperação em Breve”**. Recovery real = B-06/B-07. | — |
| **CAM-009** | note | B-34, C-18 | Auditoria/Lixeira/UI Preview = `DevRouteGuard`. Fora do smoke prod. | — |
| **CAM-010** | note | B-01 | Sem landing de marketing neste repo. Anônimo → `/#/login`. Autenticado `/#/` = Dashboard. | visual-critique já documenta |
| **CAM-011** | note | C-02, B-04 | Trial AgendiX = **20 dias** (`TRIAL_DAYS`). | PKG-15 |
| **CAM-012** | note | C-13 vs A | Fila **owner**: QR + Ajustes + add manual. Staff: vê/opera board, sem QR/Ajustes (já A). | D add-manual vs F join público |
| **CAM-013** | major | **F-09** | Tela de sucesso: **“AGENDAMENTO CONFIRMADO”** com row `pending`. Mentira de copy vs A (só dono confirma). | F-C-01, F-C-07 |
| **CAM-014** | blocker | F-04, **F-06**, **F-07** | Submit = INSERT direto (sem `create_public_booking`). Sem lock; servidor não revalida slot → double-book / slot stale. | F-C-23, F-C-24 |
| **CAM-015** | major | **F-08** | `public_booking_enabled` / lead time / max por dia **não** no INSERT público. | C D11 settings vs F submit |
| **CAM-016** | major | **F-15** | Minha Área cancel = UPDATE direto; provavelmente falha silenciosa (sem policy UPDATE anon). | F-C-12 |
| **CAM-017** | minor | **F-10**, **F-19** | Realtime anon pode não entregar pós-drop SELECT; fallback poll RPC. | — |
| **CAM-018** | note | **F-16** | Gate Minha Área = telefone/localStorage; **sem OTP** (P0.7 conhecido). | não misturar com CAM-001 |
| **CAM-019** | minor | F-14 | Histórico Minha Área: match de telefone **exato** (sem `phones_match`). | F-C-25 |
| **CAM-020** | major | **E-09** | Agenda: staff **não** conclui (toast “Apenas o dono…” / `complete_appointment`). Fila checkout **pode** (E-D23). | E-D22 vs D23; não misturar com CAM-001 |
| **CAM-021** | minor | **E-10**, CAM-012 | SPEC F4: staff não add manual; UI mostra “Adicionar cliente” (header + empty). Drift. | E-D21; D recepção |
| **CAM-022** | note | **E-14** | Staff sem `teamMemberId` → empty órfão (`staffLinkAccountMessage`). | E-D10 |

E-12 convite e E-13 filtro **Todos** = desenho de teste (PKG-02 / `staff-agenda-filter`), não bugs novos.

E2E runtime — não é reinvestigação:

1. Staff ≠ owner aceite online (CAM-001, CAM-002) — **E-D12/13 FAIL esperado**
2. Fila call/serve/checkout staff (CAM-003)
3. Concluir na **Agenda** falha; na **fila** fecha (CAM-020)
4. Add cliente fila staff (CAM-021)
5. Copy CONFIRMADO vs pending (CAM-013) — anônimo
6. Double-book / cancel silencioso (CAM-014, CAM-016)

---

## Inventário B (rotas canônicas)

Público: `/#/login` · `/#/register` · `/#/forgot-password` · `/#/update-password` · `/#/termos` · `/#/privacidade` · `/#/book/:slug` · `/#/queue/:slug` · `/#/queue-status/:id` · `/#/minha-area/:slug` · `/#/clube/:slug` · `/#/pro/:slug`.

Auth ambos: `/#/` · `/#/agenda` · `/#/fila` · `/#/fila/historico` · `/#/produtos` · `/#/staff-onboarding`.

Owner (`OwnerRouteGuard` salvo financeiro): `/#/clientes` · `/#/clientes/:id` · `/#/insights` · `/#/configuracoes/*` · `/#/clube/assinantes`. `/#/financeiro` = CAM-005.

Staff-only nav: `/#/meus-insights`.

Dev: `/#/configuracoes/auditoria` · `lixeira` · `ui-preview` · demos Playwright.

Playwright **reusar** (não reescrever): `ciclo-de-receita`, `staff-invite-flow`, `equipe-sidebar-delete`, `fila-digital-v2`, `queue-manual-add`, `staff-agenda-filter`, `agenda-*`, `login-gateway-theme`, `nav-spa-rotation`, `staff-insights-privacy`, `club-capture`, `bug-reporter*`, `ui-polish-screens`.

Gaps de cobertura B (novos specs, não inventário): signup/onboarding/trial/paywall/Stripe (P0), CRM/produtos/financeiro (P1), Minha Área estável (P0).

---

## Checklist C (owner D1–D30) — herda A

| Dias | Tema | Pacote 30d | Notas |
|---|---|---|---|
| D1–D4 | Gateway barber, trial 20d, wizard 6 passos, cockpit | PKG-01 | C-01..C-04, C-07 |
| D5–D8 | Geral, serviços, card dono inexclúivel | PKG-01 | C-08 |
| D9–D10 | Convite / soft-delete / reconvite | PKG-02, PKG-14 | fora: claim staff = E |
| D11 | Slug + reservas online | PKG-03 | CAM-007 não testar como feature |
| D12–D14 | CRUD agenda na **própria coluna** | PKG-03 | |
| D15–D16 | Aceitar / Recusar públicos | PKG-03 | D16 Recusar = dono; Aceitar staff = CAM-001/002 |
| D17–D18 | Checkout; excluir histórico só owner | PKG-03, PKG-10 | |
| D19–D23 | Fila owner QR/settings/manual/call/settle | PKG-07 | cliente = F |
| D24–D27 | Financeiro + Insights | PKG-10 | staff Insights = E |
| D28 | Clube dono | PKG-09 lado dono | adesão pública = F |
| D29–D30 | Assinar Stripe / paywall expirado / 2FA | PKG-15 | skip charge live; C-B04 Stripe |

Bloqueadores C (B-C01..07): credenciais owner, pending via F/SQL, e-mail staff, Stripe, admin `trial_ends_at`, slug, deep-link frio → wizard.

---

## Matriz paralela E — C1 ‖ C2 ‖ C3 (barbeiros staff)

Mesmo RBAC. Label Recepcionista em C3 só para CAM-004. Balcão (walk-in/CRM) = **Pacote D**.

| Onda | Dias | Os 3 | Esperado |
|---|---|---|---|
| Identidade | E-D1..D6 | convite `?company=&member=`, register, relogin, denied settings | E-12; D6 redirect owner |
| Agenda + Q1 | E-D7..D15 | filtro self / **Todos** (E-13); wizard; órfão (E-14); booking público → **não aceita** | CAM-001/002 FAIL; D15 C3≡C1 |
| Fila Q2 | E-D16..D21 | ver / chamar / servir / checkout / no_show; tentar add | CAM-003 PASS; CAM-021 D21 |
| Close + negativos | E-D22..D30 | Faturar Agenda FAIL (CAM-020); fila checkout PASS; overdue sem Faturar; financeiro deep link; insights/equipe/assinatura denied; produtos venda sem CRUD | E-D26 CAM-005 |

## Mapa pacotes 30d vs A+B+C+E+F

| Pacote 30d | Status desenho | Quem preenche runtime |
|---|---|---|
| PKG-01 Setup gestor | **C D1–D8** | live owner |
| PKG-02 Convites | **C D9–D10** + **E-D1..D6** | live 3 staff |
| PKG-03 Agenda gestor | **C D11–D18** | live; assume CAM-001 |
| PKG-04 Agenda staff | **E-D7..D15, D22, D24** | CAM-001/002/020 |
| PKG-05 Recepção | desenho A CAM-004 | **D TBD** |
| PKG-06 Fila cliente | **F F-C-15..22** | live anônimo + F |
| PKG-07 Fila operação | C D19–D23 + **E-D16..D21, D23** | CAM-003, CAM-021 |
| PKG-08 Booking público | **F F-C-01..06, 23–27** | live; CAM-013–015 |
| PKG-09 Minha Área + clube | **F F-C-07..14** + C D28 | CAM-016–018; clube dono = C |
| PKG-10 Financeiro | C D24–D26 + CAM-005 | live owner |
| PKG-11 Meus Insights | B-24 | E (privacidade já spec); D29 insights **denied** |
| PKG-12 CRM | B-19/20 | live owner |
| PKG-13 Produtos | B-21 | live |
| PKG-14 Equipe ciclo | C D10 | live owner |
| PKG-15 Stripe/trial | C D29–D30, CAM-011 | skip live charge |
| PKG-16 Placeholders | CAM-006–010 | smoke copy |
| PKG-17 Segurança P0 | paralelo onda 18/set | não misturar CAM-001 |

---

## Cenários cliente F (F-C-01..30) — não confundir com C-01 do dono

Submit: INSERT `public_bookings` `pending` + `get_active_booking_by_phone`. **Não há** RPC `create_public_booking` no repo.

| Bloco | IDs F | Tema |
|---|---|---|
| Descoberta / book | F-C-01..06 | slug, submit pending, produtos, CTA clube |
| Minha Área | F-C-07..14 | card Aguardando, edit/rebook, cancel (CAM-016), clube |
| Fila | F-C-15..22 | QR join, duplicata, `?tab=fila`, book+fila no mesmo dia |
| Bordas | F-C-23..30 | double-book, slot stale, phone match, INSERT confirmed rejeitado, PT/MB WAY, smoke prod |

P0 sugerido F: F-C-01, F-C-07, F-C-15, F-C-18, F-C-27, F-C-30.  
Confirmado na Minha Área só depois do **dono** aceitar (CAM-001) — background fora de F.

## Protocolo merge D

1. Mapear para CAM-001…022 ou CAM-023+.
2. Aceitar staff / Recusar / fetch `user.id` → **CAM-001/002**. Fila ver/chamar → **CAM-003**. Cargo label → **CAM-004**.
3. Add manual fila / F4 → **CAM-021**. Concluir Agenda → **CAM-020**. Financeiro URL → **CAM-005**.
4. Copy CONFIRMADO / race INSERT / cancel Minha Área → F. Não reabrir E-01..E-05.
5. Não relançar A/B/C/E/F.
6. **Com D:** emitir plano E2E 30d consolidado + backlog P0 ranqueado.

```
id: D-01
severity: blocker | major | minor | note
persona: gestor | recepcionista | barbeiro-N | cliente-publico
day: D12
package: D
duplicate_of: null | CAM-002
```

---

## Backlog rascunho (ranking final **após D**)

P0 candidatos já nomeados (não ranquear contra achados D ainda):

1. **CAM-001** — staff não aceita booking online (E-01..E-05)
2. **CAM-013** — copy “CONFIRMADO” vs `pending`
3. **CAM-014** — INSERT sem lock / sem revalidar slot
4. **CAM-016** — cancel Minha Área silencioso

P1 na fila: CAM-002, CAM-015, CAM-020. P2: CAM-005, CAM-021.

## GO/NO-GO

| Item | Estado pós A+B+C+E+F |
|---|---|
| Q1 staff aceita booking | **FAIL** CAM-001 (E reforça) |
| Q2 staff vê/opera fila | **PASS** CAM-003 (E-11) |
| 3 barbeiros 30d | E-D1..30 desenhado; **não executado** |
| D recepção | **TBD** |
| Plano E2E final | espera D |

**NO-GO** autenticado sem credenciais. Smoke anônimo: F-C-01 + CAM-013.
