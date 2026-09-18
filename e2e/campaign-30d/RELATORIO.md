# Relatório orquestrador — esqueleto A+B+C

Campanha simulada 30 dias · AgendiX · 2026-09-18  
Fontes: Pacote A permissões · Pacote B inventário · Pacote C gestor-barbeiro.  
**D/E/F: TBD** (não mergeados; não relançar A/B/C).

---

## 1. Vereditos fechados

| Questão | Resultado | Canônico |
|---|---|---|
| Colaborador aceita booking online? | **FAIL** | CAM-001, CAM-002 (C-10 = dupe) |
| Colaborador vê cliente na fila? | **PASS** | CAM-003 |
| Recepcionista ≠ barbeiro em ACL? | **Não** — cargo é label | CAM-004 |
| Trial produto | **20 dias** | CAM-011 |
| Landing marketing neste repo | **Não** | CAM-010 |

Elenco efetivo no produto: 1 `owner` + N `staff`. Recepcionista da campanha = staff com o mesmo ACL.

---

## 2. Superfícies (B) — o que testar vs ignorar

**Testar (produto vivo):** HashRouter `/#/login|register|book/:slug|queue/:slug|minha-area/:slug|clube/:slug` públicos; autenticado Agenda, Fila, Produtos; owner Clientes/CRM, Equipe, Insights, Clube, Ajustes (exceto placeholder).

**Assertar como gap, não como feature:** escolha de profissional + e-mail “Em breve” (CAM-007); página Notificações placeholder (CAM-006); alterar senha in-app “Em breve” (CAM-008); auditoria/lixeira só `isDev` (CAM-009).

**Reusar Playwright:** `ciclo-de-receita`, `fila-digital-v2`, `queue-manual-add`, `staff-invite-flow`, `equipe-sidebar-delete`, `staff-agenda-filter`, `agenda-*`, `login-gateway-theme`, `staff-insights-privacy`, `club-capture`, `bug-reporter*`. Não duplicar esses specs em D/E/F.

**Cobertura faltante (B, prioridade):** signup+onboarding+trial+paywall (P0); Minha Área (P0); CRM/produtos/financeiro dedicados (P1). Stripe sandbox só com chave teste.

---

## 3. Jornada do gestor-barbeiro (C) — D1–D30

Não executada no browser. Checklist para o live do **owner** (também corta na própria coluna):

- **D1–D10** entrada, wizard, catálogo, equipe (convite/reconvite). Claim do staff = E.
- **D11–D18** slug, agenda própria, Aceitar (dono), Recusar (dono), checkout, histórico. Não “provar” que staff Aceita — já FAIL.
- **D19–D23** fila: QR, Ajustes, add manual, call→serve→settle. Join do cliente = F.
- **D24–D30** financeiro, insights, clube dono, paywall/Stripe/2FA. Charge Stripe = skip live.

Critério de sucesso C: cada dia do checklist com esperado persistido no tenant (`company_id`), paywall só após trial expirado, dono inexclúivel.

---

## 4. Achados canônicos

Ver tabela CAM-001…012 em [`MATRIX.md`](./MATRIX.md).  
Única duplicata explícita B/C vs A: **C-10 → CAM-002**.

---

## 5. Seções TBD (D / E / F)

| Pacote | Persona | Preencher quando chegar o relatório |
|---|---|---|
| D | Recepcionista (staff) | Walk-in, add fila, bloqueio CRM/settings, CAM-004 |
| E | 3 barbeiros | Agenda filtro, checkout cadeira, CAM-001 prova, Meus Insights |
| F | Clientes públicos | `/#/book/:slug`, fila QR, Minha Área, clube Pix |

Até lá: não inventar resultados de D/E/F; não relançar B/C.

---

## 6. GO / NO-GO live

**NO-GO** autenticado sem `E2E_OWNER_*` / DEMO + 4 staff.  
GO parcial anônimo: login gateway + book/queue **se** slug existir.  
Produto A+B+C: desenho fechado para ACL, mapa de rotas e mês do dono.
