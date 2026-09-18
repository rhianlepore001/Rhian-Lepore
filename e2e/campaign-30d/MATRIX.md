# Campanha E2E 30 dias — Matriz-mestre

Orquestrador. Simulação de calendário D1–D30 (não espera real).  
Alvo: 1 gestor-barbeiro (owner) · 1 recepcionista (staff, label) · 3 barbeiros (staff) · clientes públicos.  
Produção: https://www.agendixstudio.com · HashRouter `/#/…`.

**Live autenticado: NO-GO** sem credenciais. Smoke anônimo só com slug DEMO.

Relatório sintético A+B+C: [`RELATORIO.md`](./RELATORIO.md). **Não relançar A/B/C.**

---

## Pacotes especialistas (Composer 2.5)

| ID | Nome | Status | Agente canônico | Escopo | Merge |
|---|---|---|---|---|---|
| **A** | Permissões e papéis (Q1/Q2) | **COMPLETO** | [bc-b1ae84eb](https://cursor.com/agents/bc-b1ae84eb-1d4d-549f-9576-67dc3701114c) | staff vs owner | 2026-09-18 |
| **B** | Inventário de superfícies | **COMPLETO** | [bc-e638dc10](https://cursor.com/agents/bc-e638dc10-6a1c-5917-aed7-2373c63cfe49) | B-01..B-48 + B-M01..M14 | 2026-09-18 |
| **C** | Gestor-barbeiro 30d | **COMPLETO** | [bc-b87f87de](https://cursor.com/agents/bc-b87f87de-48e1-56c1-8eec-3f6448519c9e) | owner D1–D30 | 2026-09-18 |
| **D** | Recepcionista | **TBD** | não mergear até o relatório | — | — |
| **E** | 3 colaboradores | **TBD** | não mergear até o relatório | — | — |
| **F** | Clientes booking+fila | **TBD** | não mergear até o relatório | — | — |

Duplicatas de lançamento (ignorar): A `bc-830d8a1e`, B `bc-1dc8a005`, C `bc-daeb09ba`.  
D/E/F: **não relançar**. Relatórios ainda TBD neste merge.

A cobre ACL Q1/Q2. B cobre rotas/gaps de produto (não reabrir `public_bookings` staff). C cobre checklist do **dono**; C-10 = duplicata de CAM-002.

---

## Achados canônicos (A+B+C, dedupe)

| ID | Sev. | Origem | Veredito | duplicate_of / anti-dupe |
|---|---|---|---|---|
| **CAM-001** | blocker | A-02, A-03, A-05 | Staff não vê/confirma booking público (fetch `user.id` + RLS dono + aceite com `user.id`). | B–F Agenda; C-11 é só o happy path **dono** |
| **CAM-002** | major | A-04, **C-10** | Aceitar visível staff+owner; Recusar só owner. C-10 **não** é finding novo. | D/E UI Agenda |
| **CAM-003** | note | A-06 | Q2 PASS: staff vê fila (nome/telefone). | F/D não reabrir “pode ver?” |
| **CAM-004** | note | A-07 | Cargo é label; RBAC `owner` \| `staff`. | D recepção |
| **CAM-005** | major | A-08 | `/#/financeiro` sem `OwnerRouteGuard`. | C-06 nav esconde; URL ainda abre |
| **CAM-006** | minor | B-32, C-17 | `/#/configuracoes/notificacoes` = Placeholder. Sino (B-16) ≠ esta página. | D/E settings |
| **CAM-007** | note | B-26 | Escolha de profissional + lembretes e-mail = **“Em breve”** (disabled). E2E asserta copy, não o toggle. | C D11 (só slug/toggle online) |
| **CAM-008** | minor | B-33 | Alterar senha in-app **“Recuperação em Breve”**. Recovery real = B-06/B-07. | — |
| **CAM-009** | note | B-34, C-18 | Auditoria/Lixeira/UI Preview = `DevRouteGuard`. Fora do smoke prod. | — |
| **CAM-010** | note | B-01 | Sem landing de marketing neste repo. Anônimo → `/#/login`. Autenticado `/#/` = Dashboard. | visual-critique já documenta |
| **CAM-011** | note | C-02, B-04 | Trial AgendiX = **20 dias** (`TRIAL_DAYS`). | PKG-15 |
| **CAM-012** | note | C-13 vs A | Fila **owner**: QR + Ajustes + add manual. Staff: vê/opera board, sem QR/Ajustes (já A). | D add-manual vs F join público |

E2E runtime (quando houver login) — não é reinvestigação:

1. Staff ≠ owner no aceite online (CAM-001, CAM-002)
2. Fila PII no board staff (CAM-003)
3. Owner: QR/Ajustes/add manual na fila (CAM-012)
4. Placeholders “Em breve” / Notificações / senha (CAM-006–008) — assert copy, não fluxo

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

## Mapa pacotes 30d vs A+B+C

| Pacote 30d | Status desenho | Quem preenche runtime |
|---|---|---|
| PKG-01 Setup gestor | **C D1–D8** | live owner |
| PKG-02 Convites | **C D9–D10** + B-05 | E claim |
| PKG-03 Agenda gestor | **C D11–D18** | live; assume CAM-001 |
| PKG-04 Agenda staff | desenho A; prova CAM-001/002 | **E TBD** |
| PKG-05 Recepção | desenho A CAM-004 | **D TBD** |
| PKG-06 Fila cliente | B-37/38 | **F TBD** |
| PKG-07 Fila operação | **C D19–D23** + CAM-012 | D add; E call |
| PKG-08 Booking público | B-35 | **F TBD** |
| PKG-09 Minha Área + clube | B-39/40, C D28 | **F TBD** |
| PKG-10 Financeiro | C D24–D26 + CAM-005 | live owner |
| PKG-11 Meus Insights | B-24 | **E TBD** |
| PKG-12 CRM | B-19/20 | live owner |
| PKG-13 Produtos | B-21 | live |
| PKG-14 Equipe ciclo | C D10 | live owner |
| PKG-15 Stripe/trial | C D29–D30, CAM-011 | skip live charge |
| PKG-16 Placeholders | CAM-006–010 | smoke copy |
| PKG-17 Segurança P0 | paralelo onda 18/set | não misturar CAM-001 |

---

## Protocolo merge D/E/F

1. Mapear para CAM-001…012 ou criar CAM-013+.
2. Aceitar staff / Recusar dono / fetch `user.id` → **CAM-001/002**.
3. Staff vê fila → **CAM-003**. Cargo label → **CAM-004**. Financeiro URL → **CAM-005**.
4. Placeholder notificações / Em breve / senha / landing / trial 20d / audit dev → CAM-006…011.
5. Não relançar A/B/C. Não reabrir `Agenda.tsx` `fetchPublicBookings`.

```
id: D-01
severity: blocker | major | minor | note
persona: gestor | recepcionista | barbeiro-N | cliente-publico
day: D12
package: D
duplicate_of: null | CAM-002
```

---

## GO/NO-GO

| Item | Estado pós A+B+C |
|---|---|
| Credenciais | ausentes neste orquestrador |
| Q1 staff aceita booking | **FAIL** CAM-001 |
| Q2 staff vê fila | **PASS** CAM-003 |
| Superfícies | inventário B fechado; sem landing marketing |
| Checklist owner 30d | C desenhado; **não executado** no browser |
| D/E/F | TBD |
| Stripe live | não |
| WhatsApp suporte | morto `#` (orquestrador; B-42 é wa.me de **cliente/negócio**, outro link) |

**NO-GO** live autenticado. A+B+C fecham desenho ACL + mapa + jornada do dono. Runtime = depois das credenciais e dos relatórios D/E/F.
