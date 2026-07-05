# Relatório Parcial — Agente 04 (Design System)
# Frente: E2E — Design System

**Data**: 2026-07-05
**Auditor**: Agente 04 (loop 2 do `agendix-e2e-test`)
**Método**: auditoria estática (greps + leitura de config/tokens/componentes). Sem navegação em produção.

---

## Sumário executivo (3-5 bullets)

- **1 P0**: interpolação dinâmica de classe Tailwind v4 (`bg-${accentColor}`) que **não gera CSS no build estático** — cor de marca fica invisível em 6 componentes, incluindo a tela pública de conversão `ProfessionalPortfolio`.
- **Tema do produto presente em ~60% das telas** (as que usam `useBrutalTheme()` → gold `#C9A24A` barber / violet `#A78BFA` beauty), mas **ausente em ~40%** que ainda usam o padrão legado `isBeauty + zinc/stone` — sem identidade de marca, genérico.
- **Telas públicas do cliente (`ClientArea`, `ProfessionalPortfolio`) são as mais críticas** e estão no grupo sem identidade de marca no light mode.
- **Duplicação de tokens** entre `index.html` e `tokens.css` — dois registros independentes dos mesmos valores que podem divergir silenciosamente.
- **Componentes deprecados** (`BrutalCard`, `BrutalButton`, `Modal` legado) ainda com 51 imports ativos.

---

## Estado atual do design system

- **Tokens canônicos**: definidos em `tokens.css` E `index.html` (duplicados — problema). Tema via `useBrutalTheme()`/`UIContext`.
- **Tema dark/light**: implementado, mas parte das telas usa ternário `isBeauty ? zinc : stone` em vez de tokens → não reflete marca.
- **Tema do produto (barber/beauty)**: parcialmente presente. Gold para barber, violet para beauty aparecem via `useBrutalTheme()`. Ausente em ~40% das telas legadas.
- **Tailwind v4 interpolações residuais**: SIM — 6 componentes ainda com `bg-${accentColor}` dinâmico (P0).

---

## Dívida por eixo

### Cores hardcoded / interpolação dinâmica (P0)
| Componente | Padrão | Problema |
|---|---|---|
| `ProfessionalPortfolio` | `bg-${accentColor}` | CSS não gerado — cor de marca invisível (tela pública!) |
| `SearchableSelect` | idem | idem |
| `ProfessionalSelector` | idem | idem |
| `MonthYearSelector` | idem | idem |
| `BusinessGalleryManager` | idem | idem |
| `UpsellSection` | idem | idem |

### Cores fora do tema (P1)
| Arquivo | Ocorrências | Problema |
|---|---|---|
| `ClientArea.tsx` (público) | 74x `isBeauty` + zinc/stone | Sem identidade de marca no light mode |
| 53 arquivos no total | 400+ ternários `isBeauty` | Paleta zinc/stone genérica em vez de tokens de marca |

### Espaçamentos / tipografia (P2)
- `text-[8px]` fora da escala tipográfica.
- `rounded-3xl` fora do `RADIUS_MAP`.
- `shadow-2xl` sem token.
- UPPERCASE labels em 274 ocorrências (verificar consistência).

### Componentes duplicados / deprecados (P1)
| Nome | Situação |
|---|---|
| `BrutalCard`, `BrutalButton`, `Modal` (legado) | Deprecados mas com **51 imports ativos** |

### Animações (P2)
- Mix de `duration-300/500/700` fora da spec (150-250ms).

### Z-index (P1)
- Valores arbitrários: `z-[999]`, `z-[9999]`, `z-[10000]` — sem escala definida.

---

## Achados por severidade

### 🔴 P0 — Bloqueantes

#### P0-DS01 — Interpolação dinâmica Tailwind v4 não gera CSS no build estático
- **Componentes**: `ProfessionalPortfolio`, `SearchableSelect`, `ProfessionalSelector`, `MonthYearSelector`, `BusinessGalleryManager`, `UpsellSection`
- **Problema**: `bg-${accentColor}` (e similares) não são detectados pelo scanner do Tailwind v4 → classe não existe no CSS de produção → cor de marca some.
- **Fix**: mapear valores para classes estáticas completas (mesma abordagem já aplicada em `SettingsSwitch`, `ClientCRM`, `AppointmentEditModal`, `PublicBooking`).
- **Prioridade**: `ProfessionalPortfolio` primeiro (tela pública de conversão).

---

### 🟠 P1 — Graves

- **P1-DS01** — `ClientArea.tsx` (público): 74 ocorrências de `isBeauty` com zinc/stone → sem marca no light mode.
- **P1-DS02** — 400+ ternários `isBeauty` em 53 arquivos com paleta genérica → migrar para tokens.
- **P1-DS03** — `BrutalCard`/`BrutalButton`/`Modal` deprecados com 51 imports ativos → consolidar.
- **P1-DS04** — Duplicação de tokens `index.html` vs `tokens.css` → fonte única de verdade.
- **P1-DS05** — Z-index arbitrários (`z-[999]`, `z-[9999]`, `z-[10000]`) → definir escala.

---

### 🟡 P2 — Polimento

`text-[8px]` fora da escala; `shadow-2xl` sem token; `duration-300/500/700` fora da spec; UPPERCASE em 274 ocorrências; `rounded-3xl` fora do `RADIUS_MAP`; cor do WhatsApp sem token.

### 🟢 P3 — Cosmético

4 achados menores (micro-inconsistências invisíveis a olho nu).

---

## Top 5 quick wins de design system

| # | O que | Onde | Esforço | Impacto | Risco |
|---|-------|------|---------|---------|-------|
| 1 | Classes estáticas em vez de `bg-${accentColor}` | `ProfessionalPortfolio` (público) | S | Alto (marca visível) | Baixo |
| 2 | Fonte única de tokens (remover duplicação) | `index.html` + `tokens.css` | S | Médio | Médio |
| 3 | Definir escala de z-index | tokens | XS | Médio | Baixo |
| 4 | `text-[8px]` → `text-xs` | vários | XS | Baixo | Baixo |
| 5 | `duration-*` padronizar em 150-250ms | vários | S | Baixo | Baixo |

---

## Top 3 dívidas estruturais

1. **Migração `isBeauty + zinc/stone` → tokens de marca** (400+ ocorrências, 53 arquivos) — sem isso ~40% do produto fica genérico. 2+ sprints.
2. **Consolidação de componentes deprecados** (`BrutalCard`/`BrutalButton`/`Modal`, 51 imports) — dívida que cresce a cada tela nova.
3. **Fonte única de tokens** — enquanto houver duplicação `index.html` vs `tokens.css`, divergências silenciosas vão reaparecer.

---

## Cruzamento com auditoria anterior (20260610)

- Migração Tailwind CDN → build estático: **resolvida** (mas expôs a classe de bug P0 das interpolações dinâmicas).
- Light mode sub-implementado: **parcial** — resolvido nas telas com `useBrutalTheme()`, ainda aberto nas telas `isBeauty` legadas.

---

## Recomendações por persona

- **Dono**: tema transmite profissionalismo nas telas migradas; genérico nas legadas (Configurações parciais).
- **Colaborador mobile**: tokens funcionam; atenção a `text-[8px]` (ilegível em tela pequena).
- **Cliente final**: **crítico** — `ClientArea` e `ProfessionalPortfolio` (as telas que ele vê) estão sem identidade de marca. Maior oportunidade de conversão.

Fim do relatório do Agente 04.
