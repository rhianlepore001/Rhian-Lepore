# Priorização de Telas — Fase 3

**Run:** `20260610_120000` | **N = 4** | Confirmado pelo usuário

---

## Decisão

| # | Tela | Rota | Findings ligados |
|---|------|------|------------------|
| 1 | Dashboard | `/#/` | UI-004, UI-017, UI-018, UI-003, UI-011 |
| 2 | Agenda | `/#/agenda` | UI-003, UI-006, UI-014, UI-023 |
| 3 | Login | `/#/login` | UI-005, UI-001, UI-029 |
| 4 | Financeiro | `/#/financeiro` | UI-003, UI-006, UI-016, UI-028 |

---

## Justificativa por tela

### 1. Dashboard
- **Uso:** Primeira tela após login — dono e staff
- **Findings:** Hierarquia ausente (CRÍTICO), KPI grid genérico, link comissões quebrado
- **Prova de tema:** 4 combinações barber/beauty × dark/light no widget stack
- **Mobile:** 390px — KPI + MeuDia + banners na mesma dobra

### 2. Agenda
- **Uso:** Fluxo diário — core do produto
- **Findings:** BrutalCard/Button legado, erros técnicos expostos, toasts sem recovery
- **Prova de tema:** TimeGrid + wizard — componentes densos

### 3. Login
- **Uso:** Porta de entrada + escolha de segmento (barber/beauty)
- **Findings:** Hardcoded dark (`#0A0A0A`), light mode não aplicado
- **Prova de tema:** Showcase de identidade dourado vs roxo sem alterar brand

### 4. Financeiro
- **Uso:** Decisão de negócio — faturamento, lucro, comissões
- **Findings:** ~24 BrutalCard, modais custom, tabelas sem padrão ui/Table
- **Prova de tema:** Densidade de dados em dark e light

---

## Fora do escopo (N=4) — deferred

| Tela | Motivo defer |
|------|--------------|
| Public Booking | Alta prioridade futura; Login cobre face pública parcial |
| Clients | Quick win UI-012; baixo impacto visual |
| Settings | Herda shell após remediação dashboard |

---

## Intocáveis (confirmado)

- Logo e identidade de marca
- Paleta accent (dourado barber, roxo beauty)
- Escopo = craft visual nos 4 modos, não rebranding

---

## Ordem de remediação sugerida (Fases 5-7)

1. **Login** — prova rápida dos 4 temas (standalone, menor superfície)
2. **Dashboard** — maior impacto percebido
3. **Agenda** — fluxo operacional mobile
4. **Financeiro** — maior esforço (densidade + modais)

---

## Artefato

Ver `critical-screens.json` para schema machine-readable.
