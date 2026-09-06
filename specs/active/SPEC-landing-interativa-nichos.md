# SPEC: Landing Pública Interativa — Trilhas por Nicho (Barbearia × Salão)

**Status:** ready
**Criado:** 2026-08-13
**Prioridade:** alta

---

## Contexto

Origem: plano "AgendiX Interactive Experience" (intro neutra → seletor por scroll → trilha nichada), refinado em sessão de revisão CTO/CRO/UX em 13 Ago 2026. O plano original colocava a *experiência* na frente da *conversão*; esta spec inverte a prioridade.

**O que mudou do plano original e por quê:**

1. **Intro 100% neutra removida como gate.** Copy neutra ("beleza e estilo") não fala com barbeiro nem com salão — falha no teste dos 5 segundos para os dois públicos. Segmentação acontece na entrada (UTM); o seletor vira fallback para tráfego não segmentado.
2. **Scroll gate removido.** Scroll-jacking + momentum touch em mobile = abandono. Nada de sequestrar o gesto do usuário.
3. **CTA e prova social sobem para o topo.** No plano original, CTA só existia no estágio 3.
4. **Sem Three.js.** Não está no `package.json`, custa ~600KB de parse, e o gotcha #6 do projeto é explícito: barbeiro usa celular.
5. **"Dark Rose" corrigido:** o tema beauty real do DS é violeta (`#B794F6`). O `npm run lint` roda `check-design-debt.mjs` e **falha o build com cor fora dos tokens**.

---

## Decisões de arquitetura (registradas)

1. **Paths reais do repo:** páginas em `pages/`, componentes em `components/landing/`. Não existe `src/`.
2. **Rota `/` vira pública.** Hoje `/` está dentro do `ProtectedLayout` (não-autenticado → `/login`). Novo comportamento: `/` renderiza a Landing; se houver sessão ativa, redireciona para o Dashboard. Login continua em `/#/login` (link "Entrar" no header da landing).
3. **SEO na fase 1 (pragmática):** o conteúdo completo das duas trilhas existe no DOM no primeiro render (não depende de clique/scroll para existir). A camada interativa (destaque/expansão da trilha escolhida) é *progressive enhancement*. JSON-LD (`SoftwareApplication` + `FAQPage`) e meta/OG dinâmicos via `SEOHead`. **Limitação aceita:** HashRouter prejudica indexação profunda.
4. **Dívida de SEO registrada com gatilho:** quando SEO virar canal ativo de aquisição, extrair a landing para página estática fora do SPA (multi-page Vite ou prerender), com URLs limpas `/para-barbearias` e `/para-saloes`. Fora do escopo desta spec.
5. **Mídia = `<video>`, não canvas 3D.** `muted playsinline loop preload="none"`, poster estático sempre presente, `<source>` por media query (mobile ≤ 720p, desktop ≤ 1080p). Budget: poster + primeiro frame ≤ 300KB; vídeo mobile ≤ 1,2MB; desktop ≤ 2,5MB. Formatos: WebM (VP9) + MP4 (H.264) fallback. Compressão via ffmpeg na geração do asset.
6. **Vídeos fora do precache do PWA** (`vite-plugin-pwa` → `globIgnores` para `public/landing/videos/**`). Contexto: já existe bug aberto suspeito de SW cacheado — não aumentar a superfície.
7. **Tokens do DS, zero cor hardcoded.** Barber = `barber-accent` (`#C29B40`) / obsidian; beauty = `beauty-accent` (`#B794F6`). Tipografia Chivo/Inter conforme `DESIGN.md`. Gate: `check-design-debt` verde.
8. **Code-splitting por trilha:** `NicheTrailBarber` e `NicheTrailBeauty` via `React.lazy()` dentro de `<Suspense>` (regra do projeto) — só baixa a trilha escolhida. Animações: `IntersectionObserver` + CSS transitions. **Zero `setState` por frame de scroll.**
9. **Segmentação por param:** `?nicho=barbearia|salao` pré-seleciona trilha e tema; persiste em `localStorage` (`agendix_nicho`). Param influencia **apenas tema/copy de marketing** — nunca tenant, nunca `company_id` (regra multi-tenant intacta).
10. **Medição desde o dia 1:** `lib/analytics.ts` (wrapper fino, no-op sem `VITE_ANALYTICS_*` configurado; provider plugável). Eventos definidos na seção Medição. Sem chave hardcoded.
11. **A/B do gate:** param `?exp=flat` renderiza variante de controle (landing "flat": hero + seletor inline simples + trilhas empilhadas, sem transições). Hipótese "imersão converte mais" nasce testável.
12. **Trial = 20 dias em todo o projeto (decisão do dono, 13 Ago 2026).** A copy da landing usa 20 dias. **Bloqueio de launch:** o produto hoje está padronizado em 10 dias (Sprint 1 da Auditoria 360°) — antes do launch, localizar onde o trial é definido (registro/onboarding/Stripe/migrations), mudar para 20 dias e alinhar toda copy existente do app. Copy nunca diverge do produto.
13. **Prova social só com números reais.** Se não houver base de clientes/números verificáveis no launch, a faixa de prova social nasce oculta (feature flag `SOCIAL_PROOF_ENABLED = false` em `constants.ts`), não com métricas inventadas.
14. **Etapa 0 obrigatória antes de gerar qualquer asset:** pesquisa-âncora (concorrentes BR/intl, referências visuais premium, YouTube do nicho) consolidada em `research/landing-anchor.md` e aprovada pelo dono. Nenhum crédito Higgsfield é gasto sem âncora documentada — os prompts de geração dos 3 vídeos (hero, demo barber, demo beauty) são derivados dela.

---

## O que o visitante vê

### Fluxo A — Tráfego segmentado (anúncio com `?nicho=barbearia` ou `?nicho=salao`)

1. Cai direto na landing já com tema e copy do nicho (sem seletor).
2. Hero: headline orientada a outcome do nicho + subheadline + CTA "Testar grátis por 20 dias" + microcopy de redução de risco ("Sem cartão. Importa sua agenda atual. Suporte no WhatsApp.").
3. Faixa de prova social (se flag ativa): números reais + logos.
4. Scroll normal (sem hijack): seções de dor → solução → demonstração em vídeo → depoimentos → CTA final.
5. Pode trocar de nicho a qualquer momento (toggle no topo, sempre visível).
6. CTA sticky no mobile (bottom bar) presente em toda a página → `/#/register?nicho=<nicho>`.

### Fluxo B — Tráfego direto/orgânico (sem param)

1. Hero com headline de categoria (outcome compartilhado: agenda cheia, caixa certo, zero planilha) + CTA.
2. Prova social (se ativa).
3. **Seletor de nicho** (dois `<button>` gigantes, acessíveis por teclado/leitor de tela): "Tenho uma Barbearia" (gold/obsidian) × "Tenho um Salão" (violeta). No mobile empilham verticalmente.
4. Ao escolher: transição CSS suave de tema (≤ 400ms) e scroll automático para a trilha — sem prender o gesto, sem tela intermediária.
5. Escolha persiste em `localStorage`.

### Fluxo C — Retorno

1. `localStorage` tem nicho → landing abre já nichada, com opção de troca no topo.
2. Sem param e sem storage → Fluxo B.

### Ordem de seções (cada trilha)

1. Hero nichado (headline outcome + CTA + microcopy risco + poster/vídeo de fundo sutil)
2. Prova social (flag)
3. Dores (3 cards com as dores reais do nicho — ver Copy)
4. Como resolve (3-4 features com telas reais do produto, não mockups com dados inventados)
5. Vídeo de demonstração nichado (lazy, `preload="none"`, clique para tocar com som)
6. Depoimentos reais (se houver; senão a seção não renderiza)
7. FAQ (3-5 perguntas — alimenta o JSON-LD `FAQPage`)
8. CTA final + footer (links `/termos`, `/privacidade`, "Entrar")

---

## Copy — diretrizes

- **Headlines orientadas a outcome, nunca a categoria** ("sistema definitivo" ❌). Exemplos de partida (iterar via A/B):
  - Barber: "Agenda cheia, comissão certa, zero planilha."
  - Beauty: "Sua equipe agenda, seu caixa fecha, você dorme tranquila."
- **Dores por nicho (conteúdo real do produto):**
  - Barber: divisão de comissão sem erro; venda de produtos no balcão; velocidade no celular; clube de assinatura (diferencial real — ver SPEC-clube-assinatura-mvp1).
  - Beauty: agendamento de múltiplos serviços; gestão de equipe (manicure/cabelo/maquiagem); pacotes; no-show.
- **Microcopy de redução de risco ao lado de todo CTA:** sem cartão, importação da agenda, suporte WhatsApp, trial real.
- **Nada de manifesto institucional acima da dobra.** "Quem somos" vira seção abaixo do FAQ ou página própria.
- Telas de demonstração = **screenshots reais do app** (há material em `*.png` na raiz e em `agendix-e2e-test/`). Métricas inventadas são proibidas.

---

## Medição (eventos — `lib/analytics.ts`)

| Evento | Props | Disparo |
|---|---|---|
| `landing_view` | `nicho` (barbearia/salao/neutro), `exp` (immersive/flat), `origem` (utm) | mount da Landing |
| `niche_selected` | `nicho`, `metodo` (param/seletor/storage) | escolha no seletor ou detecção |
| `niche_switched` | `de`, `para` | toggle de troca |
| `cta_click` | `nicho`, `posicao` (hero/sticky/final) | todo CTA → register |
| `scroll_depth` | `profundidade` (25/50/75/100) | IntersectionObserver |
| `demo_video_play` | `nicho` | play no vídeo de demonstração |

No-op em dev sem env; nunca lança erro em produção (try/catch interno).

---

## O que muda no sistema

- `App.tsx` — `/` sai do `ProtectedLayout` e vira rota pública (`Landing`); sessão ativa → redirect Dashboard. `React.lazy()` + `<Suspense>` conforme padrão.
- `pages/Landing.tsx` **(novo)** — orquestra hero, prova social, seletor (fallback), trilhas lazy, FAQ, CTA sticky.
- `components/landing/` **(novos)** — `HeroIntro.tsx`, `NicheGate.tsx`, `NicheTrailBarber.tsx` (lazy), `NicheTrailBeauty.tsx` (lazy), `StickyCta.tsx`, `SocialProof.tsx`, `LandingFaq.tsx`, `SEOHead.tsx`.
- `hooks/useNiche.ts` **(novo)** — resolve nicho (param > storage > null), persiste, expõe `setNicho`/`trocarNicho`.
- `lib/analytics.ts` **(novo)** — contrato de eventos acima.
- `index.html` — title/description/OG da landing, JSON-LD base, `<noscript>` com pitch estático + link para `/#/register` (SPA não funciona sem JS — degradação honesta).
- `vite.config.ts` — `globIgnores` do PWA para vídeos da landing.
- `constants.ts` — flag `SOCIAL_PROOF_ENABLED`.
- `public/landing/` **(novos assets)** — posters (WebP) + vídeos (webm/mp4) por nicho.
- `e2e/landing.spec.ts` **(novo)** — ver Teste E2E.

## O que NÃO muda

- Auth, `ProtectedLayout`, `OwnerRouteGuard`, multi-tenant (`company_id` sempre da sessão — o param `?nicho=` nunca toca em tenant).
- Fluxo de `Register`/`Login` (a landing apenas linka; `?nicho=` só pré-seleciona tema no onboarding, se suportado — caso contrário é ignorado sem quebrar).
- Trial do produto: 20 dias, conforme decisão explícita do dono (ver Decisão 12).
- `vercel.json` (rewrite catch-all permanece; fase 1 é SPA).
- Temas `barber`/`beauty` do DS — a landing consome, não estende.

## Edge cases

- `?nicho=xyz` (inválido) → ignora, renderiza neutro (Fluxo B).
- `prefers-reduced-motion: reduce` → sem autoplay de vídeo (só poster), transições viram cortes, sem parallax.
- Vídeo falha / 4G lento → poster estático permanece (é o default visual; vídeo é enhancement).
- Mobile 390px → seletor empilha, CTA vira bottom bar sticky, sem scroll horizontal.
- JS desabilitado → `<noscript>` com headline, 3 bullets e link de cadastro.
- Usuário logado acessa `/` → redirect para Dashboard (nunca vê landing).
- Troca de nicho no meio do scroll → troca de tema sem perder posição de scroll.
- iOS Safari → `playsinline` + `muted` obrigatórios; som só após gesto do usuário.
- Service worker → vídeos não entram em precache; posters com hash de cache-busting.

## Teste E2E (`e2e/landing.spec.ts` — Playwright)

```
1. GET /#/?nicho=barbearia → trilha barber visível, acento gold aplicado, seletor NÃO visível
2. GET /#/ → seletor visível; click "Tenho um Salão" → tema violeta aplicado, trilha beauty no DOM
3. CTA sticky presente em 390px; click → /#/register?nicho=salao
4. Duas trilhas presentes no HTML inicial (page.content()) sem nenhum clique — prova de SEO fase 1
5. Emular prefers-reduced-motion → vídeo sem autoplay, poster visível
6. Escolher barbearia → recarregar /#/ → abre nichada (localStorage)
7. Trocar nicho pelo toggle → tema e copy mudam sem reload
8. Teclado: Tab até o seletor + Enter → mesma transição do clique
```

## Arquivos envolvidos

- `App.tsx` — rota `/` pública + redirect se autenticado
- `pages/Landing.tsx` — novo
- `components/landing/*.tsx` — novos (8 componentes)
- `hooks/useNiche.ts` — novo
- `lib/analytics.ts` — novo
- `index.html` — meta/OG/JSON-LD/noscript da landing
- `vite.config.ts` — exclude de vídeos do precache PWA
- `constants.ts` — flag de prova social
- `public/landing/` — posters + vídeos (pipeline Higgsfield → ffmpeg; geração é etapa separada, landing não bloqueia sem eles)
- `e2e/landing.spec.ts` — novo

## Done when

- [ ] `npm run typecheck` verde
- [ ] `npm run lint` verde — incluindo `check-design-debt` (zero cor fora dos tokens)
- [ ] `npm run build` verde
- [ ] `npm test` verde
- [ ] `e2e/landing.spec.ts` verde (8 cenários)
- [ ] Lighthouse mobile (simulated 4G): LCP ≤ 2,5s, CLS ≤ 0,1; payload inicial ≤ 1,5MB (sem vídeo)
- [ ] Conteúdo das duas trilhas presente no HTML sem interação (view-source)
- [ ] Trial de 20 dias aplicado **no produto** (registro/onboarding/Stripe/migrations) e copy do app alinhada — não só na landing
- [ ] `research/landing-anchor.md` consolidado e aprovado antes de gerar vídeos (Decisão 14)
- [ ] Eventos de analytics disparando (verificação manual em dev)
- [ ] Testado em Chrome Android real (390px) — gotcha #6 do projeto
