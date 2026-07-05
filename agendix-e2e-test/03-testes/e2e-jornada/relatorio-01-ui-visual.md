# Relatório Parcial — Agente 01 (UI / UX Visual)
# Frente: E2E — Jornada Completa (dono + colaborador + cliente)

**Data**: 2026-07-05
**Auditor**: Agente 01 (loop 2 do `agendix-e2e-test`)
**Ambiente**: produção (`https://rhian-lepore.vercel.app`)
**Conta**: bob.teste@gmail.com (dono, tema barber, 3 funcionários, 150 agendamentos)
**Método**: Playwright automatizado (22 screenshots em desktop 1440x900 + mobile 390x844) + análise programática de cores (PIL) + extração de DOM/CSS computado + cruzamento com relatórios 02/03/04/06.
**Screenshots**: `agendix-e2e-test/03-testes/e2e-jornada/screenshots/`

---

## Sumário executivo

- **1 P0 visual confirmado por análise de cores**: a página pública de agendamento (`/#/book/barbearia-bob`) é **99.9% preta** — sem accent, sem texto visível, sem identidade de marca. É a tela de conversão de cliente novo. Confirma P0-DS01 do agente 04 (`bg-${accentColor}` não gera CSS).
- **Tema barber funciona nas telas logadas**: todas as 10 telas internas têm accent dourado presente (rgb(201,162,74) e rgb(253,199,0)). Dark industrial consistente (rgb(18,16,14) como bg base).
- **Light text muito baixo em desktop (0.1-1.1%)**: texto pode estar pequeno demais ou com baixo contraste. Mobile é um pouco melhor (0.4-2.3%) mas ainda baixo.
- **Hierarquia do dashboard**: H1 "BARBEARIA BOB" a 24px, H2 a 16px. Diferença de tamanho entre H1 e H2 é pequena (8px) — hierarquia visual rasa.
- **4 P1s visuais**: onboarding banner persistente em todas as telas, notificação badge "2" não limpa, copy em pt-PT detectada na landing ("Bom te ver de novo" vs "Bom te ver" BR), botão "ASSINAR AGORA" preto sobre fundo escuro (contraste baixo).
- **Gap confirmado**: sem skeleton route-level (persistente desde 20260610: UI-011). LoadingFull com `bg-neutral-900` hardcoded (persistente: UI-011).

---

## Metodologia

### Playwright automatizado
- Spec: `e2e/audit-ui-producao.spec.ts`
- Config: `playwright.prod.config.ts` (sem webServer, direto em produção)
- Login via credenciais de teste (env vars)
- 11 rotas × 2 viewports = 22 screenshots full-page
- Metadados salvos em `metadata-desktop.json` e `metadata-mobile.json`
- Todas as telas carregaram sem erro fatal (hasFatal = false)

### Análise programática de cores (PIL/Pillow)
- Sampling de pixels a cada 10 (performance)
- Detecção de: bg escuro, texto claro, accent quente (gold/amber), cinza frio
- Top 3 cores por screenshot
- Comparação desktop vs mobile

### Extração DOM/CSS
- `browser_console` com `getComputedStyle` em body, h1, h2, buttons
- `browser_get_images` para assets da página
- `browser_snapshot` para árvore de acessibilidade

---

## Achados por severidade

### P0 — Bloqueante visual

#### P0-UI01 — Página pública de agendamento é 99.9% preta (sem accent, sem texto visível)

- **Rota**: `/#/book/barbearia-bob`
- **Screenshots**: `public-booking-desktop.png` (9.5kb), `public-booking-mobile.png` (5.9kb)
- **Análise de cores**:
  - Desktop: 99.9% rgb(18,16,14) (preto), 0.0% texto claro, **warm accent: NÃO**
  - Mobile: 99.6% rgb(18,16,14), 0.0% texto claro, **warm accent: NÃO**
- **Contraste com outras telas**: todas as 10 telas logadas têm warm accent presente. A página pública é a única sem accent.
- **Causa raiz** (cruzado com agente 04): `bg-${accentColor}` em `ProfessionalPortfolio` não gera CSS no build do Tailwind v4 (interpolação dinâmica não suportada).
- **Impacto**: cliente novo que clica no link do Instagram/WhatsApp vê uma tela preta. Primeira impressão = "site quebrado". Perde conversão.
- **Fix**: trocar `bg-${accentColor}` por classes estáticas mapeadas (ex: `bg-accent-gold`, `bg-accent-rose`) ou usar `style={{ backgroundColor: 'var(--color-accent)' }}`.
- **Esforço**: Baixo (1 commit, 6 componentes)
- **Risco**: Alto — é a tela de aquisição de cliente
- **Cruza com**: P0-DS01 (agente 04)

---

### P1 — Graves visuais

#### P1-UI01 — Light text percentual muito baixo em desktop (0.1-1.1%)
- **Dados**: todas as 10 telas desktop têm light_text_pct entre 0.1% e 1.1%. Mobile é um pouco melhor (0.4-2.3%).
- **Interpretação**: texto pode estar pequeno demais, com baixo contraste, ou muito espaçado (pouco texto visível na viewport).
- **Telas mais críticas**: `ajustes-servicos-desktop` (0.1%), `produtos-desktop` (0.4%)
- **Fix**: auditar `font-size` mínima (mínimo 14px em desktop, 16px em mobile) e contraste WCAG AA.
- **Esforço**: Médio (auditar componente por componente)

#### P1-UI02 — Hierarquia H1→H2 rasa (24px → 16px)
- **Dados**: dashboard H1 "BARBEARIA BOB" a 24px, H2 "Agenda cheia" a 16px. Diferença de apenas 8px.
- **Impacto**: hierarquia visual não guia o olho. Dono não sabe o que é mais importante.
- **Benchmark**: Material Design recomenda H1 2x o H2. Tailwind: text-3xl (30px) → text-xl (20px).
- **Fix**: H1 para 30px (text-3xl) ou H2 para 14px (text-sm). Aumentar diferença.
- **Esforço**: Baixo

#### P1-UI03 — Banner "PERÍODO DE TESTE GRÁTIS: 2 DIAS RESTANTES" persistente em todas as telas
- **Dados**: snapshot mostra o banner no topo de todas as 10 telas logadas.
- **Impacto**: dono que já decidiu ficar vê isso toda hora. É pressão desnecessária. Reduz área útil da tela.
- **Fix**: mostrar só no dashboard, ou dismissible com "Não quero ver isso".
- **Esforço**: Baixo

#### P1-UI04 — Botão "ASSINAR AGORA" preto sobre fundo escuro
- **Dados**: `bg: rgb(0,0,0)` (preto puro) sobre `bodyBg: rgb(18,16,14)` (preto quente). Contraste mínimo.
- **Classes**: `bg-black text-white px-3 py-1 rounded-full text-xs`
- **Impacto**: botão de conversão (assinatura) quase invisível.
- **Fix**: trocar `bg-black` por `bg-accent` (dourado) ou `bg-white text-black`.
- **Esforço**: Baixo (1 commit)

#### P1-UI05 — Copy pt-PT na landing de produção BR
- **Dados**: landing page mostra "Bom te ver de novo" e "14 DIAS GRÁTIS" (pt-PT). BR seria "Bom te ver" e "14 DIAS GRÁTIS" (aceitável, mas "Bom te ver de novo" é pt-PT).
- **Impacto**: cliente BR percebe que o sistema não é brasileiro. Quebra posicionamento "feito pra barbearia BR".
- **Cruza com**: agente 02 (copy)
- **Fix**: `useTenantLocale` deve retornar pt-BR para domínios `.vercel.app` e `.com.br`.
- **Esforço**: Baixo

---

### P2 — Polimento visual

| # | Onde | Problema | Dados | Fix |
|---|---|---|---|---|
| P2-UI01 | Dashboard | Card "Saúde do negócio" score 52 sem cor de status (verde/amarelo/vermelho) | DOM: texto sem cor de status | Adicionar cor baseada no score (≥70 verde, 40-69 amarelo, <40 vermelho) |
| P2-UI02 | Agenda | Cards de agendamento com `bg: rgba(0,0,0,0)` (transparente) | DOM: cards sem bg próprio | Adicionar `bg-theme-card` para distinguir do fundo |
| P2-UI03 | Agenda | Botões de profissional sem estado ativo visual claro | DOM: `bg: rgba(0,0,0,0)` em TODOS os botões | Adicionar `bg-accent/10` no botão ativo |
| P2-UI04 | Ajustes/serviços | 87.3% da tela é rgb(18,16,14) — quase só fundo, pouco conteúdo | PIL: 87.3% bg puro | Empty state provavelmente raso. Adicionar ilustração ou CTA |
| P2-UI05 | Produtos | 85.1% da tela é bg puro — mesmo problema que ajustes/serviços | PIL: 85.1% bg | Idem |
| P2-UI06 | Todos | `LoadingFull` com `bg-neutral-900` hardcoded (persistente UI-011) | Código (agente 04) | Trocar por `bg-theme-bg` |
| P2-UI07 | Todos | Sem skeleton route-level (persistente UI-011) | Código + snapshot | Adicionar `<Suspense fallback={<RouteSkeleton/>}>` em rotas lazy |
| P2-UI08 | Landing | "CRIAR CONTA — 14 DIAS GRÁTIS" mas config diz 10 dias | DOM + memory | Atualizar copy pra "10 DIAS GRÁTIS" ou alinhar config |

---

### P3 — Cosmético visual

| # | Onde | Problema |
|---|---|---|
| P3-UI01 | Dashboard | Badge de notificação "2" não limpa após visualizar |
| P3-UI02 | Agenda | Iniciais dos profissionais (B, BF, DS, MS) sem separador visual claro entre dono e staff |
| P3-UI03 | Landing | Logo 1024x1024 carregado em tamanho pequeno — overkill de payload |
| P3-UI04 | Mobile | Bottom nav presente mas não auditei se touch targets ≥ 48dp (precisa medição manual) |

---

## Análise de cores — resumo por tela

| Tela | Dark bg % | Light text % | Warm accent | Top color |
|---|---|---|---|---|
| Dashboard (d) | 90.7% | 0.7% | SIM | rgb(26,24,22) 39.8% |
| Dashboard (m) | 84.5% | 1.2% | SIM | rgb(26,24,22) 33.9% |
| Agenda (d) | 87.7% | 0.7% | SIM | rgb(18,16,14) 51.0% |
| Agenda (m) | 84.5% | 1.3% | SIM | rgb(18,16,14) 42.2% |
| Fila Digital (d) | 91.3% | 0.5% | SIM | rgb(18,16,14) 47.1% |
| Fila Digital (m) | 86.9% | 1.1% | SIM | rgb(26,24,22) 25.4% |
| Clientes CRM (d) | 90.4% | 0.8% | SIM | rgb(18,16,14) 39.6% |
| Clientes CRM (m) | 84.8% | 0.8% | SIM | rgb(18,16,14) 25.5% |
| Produtos (d) | 92.6% | 0.4% | SIM | rgb(18,16,14) 85.1% |
| Produtos (m) | 84.0% | 0.9% | SIM | rgb(18,16,14) 51.2% |
| Financeiro (d) | 90.6% | 1.1% | SIM | rgb(18,16,14) 50.6% |
| Financeiro (m) | 82.9% | 1.5% | SIM | rgb(18,16,14) 41.0% |
| Insights (d) | 90.7% | 1.1% | SIM | rgb(18,16,14) 47.4% |
| Insights (m) | 88.1% | 2.3% | SIM | rgb(26,24,22) 38.0% |
| Ajustes/geral (d) | 91.7% | 0.6% | SIM | rgb(18,16,14) 41.3% |
| Ajustes/geral (m) | 89.8% | 0.8% | SIM | rgb(26,24,22) 40.0% |
| Ajustes/equipe (d) | 88.6% | 0.4% | SIM | rgb(18,16,14) 50.6% |
| Ajustes/equipe (m) | 83.8% | 0.9% | SIM | rgb(18,16,14) 22.7% |
| Ajustes/serviços (d) | 93.6% | 0.1% | SIM | rgb(18,16,14) 87.3% |
| Ajustes/serviços (m) | 91.9% | 0.4% | SIM | rgb(18,16,14) 69.0% |
| **Public booking (d)** | **99.9%** | **0.0%** | **NÃO** | **rgb(18,16,14) 99.9%** |
| **Public booking (m)** | **99.6%** | **0.0%** | **NÃO** | **rgb(18,16,14) 99.4%** |

**Padrões observados**:
- rgb(18,16,14) = bg base do tema barber (presente em 100% das telas)
- rgb(26,24,22) = bg de card/surface (presente em 90% das telas)
- rgb(201,162,74) = accent dourado mobile (presente em telas com elementos ativos)
- rgb(253,199,0) = accent amarelo-vivo (botões/highlights em desktop)
- **Public booking é outlier**: 99.9% preto = nada renderizado com cor

---

## DOM/CSS computado — dashboard

| Elemento | Cor | Tamanho | Fonte |
|---|---|---|---|
| body bg | rgb(18,16,14) | — | tema barber |
| body text | rgb(240,235,224) | — | warm white |
| body font | Inter, sans-serif | — | — |
| H1 "BARBEARIA BOB" | rgb(240,235,224) | 24px | — |
| H2 "Agenda cheia" | rgb(240,235,224) | 16px | — |
| data-theme | barber | — | html attr |
| html class | "notranslate low-end-device" | — | — |

**Botões do dashboard**:
| Botão | bg | color | radius | Classes notáveis |
|---|---|---|---|---|
| ASSINAR AGORA | rgb(0,0,0) | white | 99999px | `bg-black text-white rounded-full` |
| Sair | transparent | rgb(107,98,82) | 12px | `hover:text-red-400` |
| Notificação | rgb(26,24,22) | rgb(240,235,224) | 4px | `bg-theme-card` |
| Avatar "B" | transparent | rgb(240,235,224) | 4px | — |

---

## Cruzamento com outros agentes

| Achado UI | Cruza com | Severidade combinada |
|---|---|---|
| P0-UI01 (public booking preta) | P0-DS01 (agente 04: `bg-${accentColor}`) | P0 confirmado |
| P1-UI02 (H1→H2 raso) | UI-004 (20260610: hierarquia dashboard) | P1 persistente |
| P1-UI03 (banner trial persistente) | — (novo) | P1 |
| P1-UI04 (botão ASSINAR preto) | — (novo) | P1 |
| P1-UI05 (copy pt-PT) | P1-C02 (agente 02: copy) | P1 composto |
| P2-UI06 (LoadingFull hardcoded) | UI-011 (20260610) + P1-DS04 (agente 04) | P1 persistente |
| P2-UI07 (sem skeleton route) | UI-011 (20260610) | P2 persistente |
| P2-UI08 (14 dias vs 10 dias) | — (novo, memory: "plano gratuito 10 dias") | P2 |

---

## Validações que precisam ser manuais (olho humano)

Os screenshots estão salvos em `agendix-e2e-test/03-testes/e2e-jornada/screenshots/`. Rhian, abre estes no desktop e valida:

1. **`public-booking-*.png`** — confirmar visualmente que a tela está preta/invisível
2. **`dashboard-desktop.png`** — hierarquia visual guia o olho? O que aparece primeiro?
3. **`agenda-desktop.png`** — cards de agendamento tem consistência? Cores de status (confirmado/cancelado) aparecem?
4. **`clientes-crm-desktop.png`** — tem `alert()` nativo visível? Empty state é decente?
5. **`fila-digital-desktop.png`** — fila visualmente clara? Estado de cada cliente (waiting/calling/serving) tem cor?
6. **`ajustes-servicos-desktop.png`** — 87.3% vazio. Confirmar empty state raso.
7. **Comparar desktop vs mobile** de cada tela — algo quebra no mobile?

---

## Gaps de cobertura

- **Sem análise visual humana**: os screenshots foram coletados mas não foi possível fazer inspeção visual com olho (vision provider indisponível no servidor). A análise de cores (PIL) detectou o P0-UI01 mas pode ter perdido nuances visuais (espaçamento quebrado, alinhamento, overlay de modal).
- **Touch targets não medidos**: não validei se botões mobile têm ≥ 48dp. Precisa medição manual.
- **Estados de erro não capturados**: só capturei estados de sucesso. Faltam screenshots de: formulário com erro, empty state real, loading state, sem permissão.
- **Tela de login não capturada**: o Playwright loga direto sem capturar a tela de login. Precisa captura manual.
- **Onboarding wizard não capturado**: a conta já completou onboarding. Precisa conta nova.
- **Staff view não capturada**: só loguei como dono. Faltam telas do colaborador.

---

## Sugestão de sprint

### Sprint 1 (P0 + quick wins P1)
- P0-UI01 / P0-DS01: trocar `bg-${accentColor}` por classes estáticas em `ProfessionalPortfolio` (público)
- P1-UI04: botão "ASSINAR AGORA" preto → accent dourado
- P1-UI03: banner trial só no dashboard + dismissible
- P2-UI08: alinhar "14 dias" vs "10 dias" na copy

### Sprint 2 (P1 restantes)
- P1-UI01: auditar font-size mínima e contraste
- P1-UI02: aumentar H1 para 30px
- P1-UI05: corrigir pt-PT → pt-BR na landing
- P2-UI01..P2-UI05: cores de status, cards com bg, empty states

### Sprint 3+ (estruturais visuais)
- P2-UI06/07: LoadingFull com token + skeleton route-level
- Capturar estados de erro, empty, loading, sem permissão
- Capturar staff view e onboarding wizard
