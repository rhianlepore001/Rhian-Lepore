---
target: landing pública (pages/Landing.tsx + components/landing)
total_score: 28
p0_count: 2
p1_count: 2
timestamp: 2026-08-30T14-28-07Z
slug: pages-landing-tsx
---
# Critique — Landing pública AgendiX (`pages/Landing.tsx`)

Method: dual-agent (A: design review · B: detector determinístico)

## Anti-Patterns Verdict

**Não é slop — mas tem pele de máquina em pontos-chave.** O detector determinístico saiu limpo (0 findings; check-design-debt ok). A revisão humana achou o que o detector não escaneia:

- **Assinatura de AI #1:** `.landing-eyebrow` (linha + mono 0.64rem + tracking) repetido em ~8 seções + rails "02/03/05/07" com sequência quebrada (nunca existem 04 e 06) + `landing-card-index` decorativo. Cruza a proibição do próprio DESIGN.md:335 ("eyebrow em cada seção = gramática de AI"). Números de seção que não mapeiam nada = perfume tipográfico.
- **Assinatura de AI #2:** `pain-grid` = identical card grid (ícone + título + texto ×3), banida pelo PRODUCT.md e pela skill.
- **Detector × revisão:** as regras automáticas não cobrem eyebrow/spread nem mock fake — concordância parcial só nos bans técnicos (zero side-stripe, zero gradient text).

## Design Health Score — Nielsen 10 (28/40 — Good)

| # | Heurística | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Status do sistema | 3 | Trail inativa em `opacity: 0.78` é estado ambíguo |
| 2 | Match mundo real | 3 | "Trilhas" e "AO VIVO" fogem do vocabulário do dono |
| 3 | Controle e liberdade | 4 | Switcher + `<details>` nativo + "Voltar às trilhas" |
| 4 | Consistência | 2 | Weight 900 em todos os títulos viola a Single-Display Rule |
| 5 | Prevenção de erros | 3 | CTA do hero leva a `/register` sem nicho |
| 6 | Reconhecer > lembrar | 3 | Índice "01 / 07" não mapeia nada navegável |
| 7 | Flexibilidade | 3 | Sem atalho para preço — preço não existe na página |
| 8 | Estética minimalista | 2 | Chrome de microtexto compete com o conteúdo |
| 9 | Recuperação de erros | 3 | Fallback de vídeo (poster + bg sólido) correto |
| 10 | Ajuda | 2 | FAQ não responde "quanto custa depois dos 20 dias?" |
| **Total** | | **28/40** | **Good — endereçar áreas fracas** |

## Overall Impression

Esqueleto de designer, pele de máquina em pontos-chave. A copy pt-BR autoral ("do primeiro clique ao Pix no bolso") e o hairline grid editorial dão voz real; o que puxa para "IA fez isso" é o chrome repetitivo (eyebrow ×8, índices órfãos) e o mock fake de dashboard. A maior oportunidade: trocar cada visual fake por **uma frase de dado real** e reduzir o chrome pela metade.

## What's Working

1. **Copy autoral de domínio** (`components/landing/content.ts`): voz do dono, zero anglicismo, gaps reais do produto (Pix direto, balcão, comissão) — é o que impede a página de ser template.
2. **Arquitetura de decisão limpa:** gate binário, switcher com `aria-pressed`, tema coerente, `prefers-reduced-motion` respeitado, analytics de `niche_switched` com de/para.
3. **Linguagem visual coesa e cuidado técnico:** hairline grid com borda do accent, ledger de domínio, anti-FOUC, `<noscript>` de qualidade, focus-visible em tudo, `SEOHead` reusando o id do JSON-LD do index.

## Priority Issues

### P0 — Zoom bloqueado + microtexto generalizado
- **O quê:** `index.html:8` (`maximum-scale=1.0, user-scalable=no`) + texto de 8.8–11.5px em 6+ lugares (`.landing-ledger-foot` 0.56rem, `.landing-product-topbar/label` 0.55rem, `.landing-section-rail` 0.58rem, `.landing-trust-list` 0.62rem, `.landing-sticky-cta > span` 0.58rem, `.landing-footer` 0.6rem).
- **Por que importa:** público 40+ no celular sob sol; WCAG 1.4.4; DESIGN.md proíbe caption < 12px.
- **Fix:** remover `maximum-scale`/`user-scalable=no`; piso 0.75rem; reduzir quantidade de chrome, não só tamanho.
- **Comando:** `/impeccable typeset` + `/impeccable harden`

### P0 — Desonestidade visual: "AO VIVO" e dados fake
- **O quê:** `ProductVisual.tsx:29` ("AO VIVO" sobre mock estático), barras/linhas fake em `Landing.css:847–884`, ledger com gradientes fake 62%/78%.
- **Por que importa:** viola anti-reference "dashboard genérico de SaaS" e mente sobre estado num produto cujo pitch é confiança.
- **Fix:** trocar barras por uma linha de dado real ("Hoje · 8 atendimentos · R$ 480 no caixa") no formato ledger; deletar "AO VIVO".
- **Comando:** `/impeccable clarify`

### P1 — Assinatura de AI: eyebrow em toda seção + índices órfãos + grid idêntica
- **O quê:** eyebrow ×8, rails numéricos quebrados, pain-grid de 3 cards idênticos.
- **Por que importa:** padrão que um olho treinado lê como "IA fez isso"; contradiz DESIGN.md e PRODUCT.md.
- **Fix:** eyebrow só no hero e no final-cta; rails viram navegação real contígua ou morrem; quebrar simetria do pain-grid.
- **Comando:** `/impeccable quieter` + `/impeccable layout`

### P1 — Página 2×: trilhas e FAQ duplicadas
- **O quê:** as duas trilhas completas sempre no DOM (ativa 1.0 / inativa 0.78); FAQ mantém dois grupos com o inativo a 0.52.
- **Por que importa:** carga cognitiva dobrada, vale emocional longo, esmaecido parece bug.
- **Fix:** trail inativa colapsa para bloco-resumo de 1 tela ("Prefere salão? Ver trilha do salão →"); FAQ mostra só o grupo ativo.
- **Comando:** `/impeccable adapt`

### P2 — Contraste real colapsa sob o vídeo
- **O quê:** tokens do DS passam AA, mas a landing usa `color-mix(... sand-50 38–55%, transparent)` sobre vídeo (ledger foot ≈ 3.5:1).
- **Por que importa:** contraste que varia com o frame do vídeo não é verificável (PRODUCT.md:43 exige ferramenta).
- **Fix:** tokens opacos (sand-300/400) no ledger/trust-list; wash ≥ 85% nas zonas de texto; switcher com alvo ≥ 44px.
- **Comando:** `/impeccable colorize` + `/impeccable harden`

## Persona Red Flags

- **Jordan (first-timer):** CTA do hero → `/register` sem nicho empurra o commit antes da decisão; nenhum preço pós-trial na página inteira; "AO VIVO" sugere demo que não existe.
- **Riley (stress tester):** JSON-LD diz `price: "0"` mas a página nunca diz preço; trocar de nicho baixa um segundo vídeo 720p; landing força `data-mode: dark` ignorando a preferência salva pelo anti-FOUC.
- **Casey (mobile distraído):** texto do sticky CTA a 9.3px ilegível em movimento; switcher do header com alvo de 36px < 44px; **pinch-zoom desabilitado** — dupla punição.

## Minor Observations

- `og:image` relativo no `index.html:21` — crawlers sem JS leem OG quebrado (SEOHead só conserta pós-hidratação).
- `theme-color: #121212` diverge de sand-950 `#12100E`; manifest fixo em `barber` mesmo no nicho beauty.
- HashRouter + canonical `/` = versão indexável é sempre a neutra; nichos invisíveis para SEO (limitação estrutural a documentar).
- "Você dorme tranquila" (beauty) assume gênero — vale teste.
- SocialProof é placeholder sem prova; se `SOCIAL_PROOF_ENABLED` ligar sem dado real, vira desonestidade.
- JSON-LD FAQ mistura perguntas dos dois nichos — aceitável, mas por pouco.
- Detector: 2 `backdrop-filter` (ledger, sticky) são funcionais, não decorativos — false positives do scan manual, mantidos.

## Questions to Consider

1. Se o vídeo congelar no poster num 3G real, o hero convence sozinho? Por que trocar de nicho baixa 720p novo em vez de reusar o loop?
2. O produto promete "sem ruído" e o marketing desenha ruído fake. O que aconteceria se cada visual fosse **uma frase de dado real** — e nada mais?
3. "Trilhas" é a metáfora de quem fez a página ou de quem abre o salão às 9h? E se o gate fosse a página inteira — uma decisão, dois cartões, zero scroll?
