# Findings — Visual System

Auditor: ui-visual-system-auditor | Register: Impeccable `product`  
Escopo: tokens.css, useBrutalTheme, index.html, páginas críticas

---

### CRÍTICO-001: Três fontes de estilo competindo
- **Severidade:** CRÍTICO
- **Evidência:** `design-system/tokens.css`, `hooks/useBrutalTheme.ts`, `index.html:39-80` (tailwind.config inline + cores obsidian/silk/brutal/beauty)
- **Problema:** Mesmo accent dourado definido como `#C29B40`, `accent-gold`, `--color-accent` e classes Tailwind diferentes
- **Impacto:** Impossível garantir paridade barber/beauty × dark/light — genericidade sistêmica
- **Fix:** DS Lock: uma fonte (tokens.css) + useBrutalTheme só lê CSS vars; remover paletas mortas do index.html
- **Esforço:** Alto

### ALTO-002: Light mode sub-implementado no código legado
- **Severidade:** ALTO
- **Evidência:** `design-system/tokens.css:102-120` define barber light; ~80 arquivos com `isBeauty` hardcoded (`pages/Login.tsx`, `pages/ClientArea.tsx`)
- **Problema:** Telas legadas assumem fundo escuro (`bg-neutral-900`, `text-white/15`, `#0A0A0A`)
- **Impacto:** Toggle light quebra contraste e identidade — usuário desiste do modo claro
- **Fix:** Migrar páginas críticas para `useBrutalTheme().colors.*`; proibir hex de fundo em pages/
- **Esforço:** Alto

### ALTO-003: Accent como decoração, não só ação/estado
- **Severidade:** ALTO
- **Evidência:** `components/BrutalCard.tsx:59` — gradient overlay em todo card; `components/PublicLinkCard.tsx:110` — `border-l-4 border-accent-gold`
- **Problema:** Dourado/roxo perdem significado semântico quando everywhere
- **Impacto:** CTAs primários não se destacam; visual "template SaaS"
- **Fix:** Accent ≤10% superfície (Restrained); side-stripe ban; glow só em cardAccent variant
- **Esforço:** Médio

### MÉDIO-004: Escala tipográfica inconsistente
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:87` — `text-2xl md:text-3xl`; `components/BrutalCard.tsx:44` — `text-lg md:text-xl`; `components/ui/Card.tsx:54` — `text-base md:text-lg`
- **Problema:** Três escalas de título de card sem token `--text-h3`
- **Impacto:** Ritmo visual quebrado entre dashboard, settings e modais
- **Fix:** Escala fixa no DESIGN-SYSTEM: display / h1 / h2 / h3 / body / caption
- **Esforço:** Médio

### MÉDIO-005: Border-radius arbitrário (4 variantes dominantes)
- **Severidade:** MÉDIO
- **Evidência:** UISurfaceMap — `rounded-lg`, `xl`, `2xl`, `3xl`, `[1.5rem]` em `pages/Dashboard.tsx:190`
- **Problema:** Tudo "soft SaaS" — falta personalidade barber (mais sharp) vs beauty (mais soft) via tokens, não por arquivo
- **Impacto:** Os 4 temas parecem a mesma skin com cor trocada
- **Fix:** `radius.card`, `radius.button`, `radius.modal` em tokens — barber vs beauty pode divergir aqui
- **Esforço:** Baixo

### MÉDIO-006: Barber light usa beige quente genérico
- **Severidade:** MÉDIO
- **Evidência:** `design-system/tokens.css:103` — `--color-bg: #F5F1E8`
- **Problema:** Perto do band cream/sand AI default (Impeccable ban) — warmth no bg em vez de accent+tipo
- **Impacto:** Beauty light e barber light podem parecer "mesmo app claro"
- **Fix:** Manter cor fixa (constraint user) mas diferenciar via surface/card contrast e tipografia — não intensificar beige
- **Esforço:** Médio

### BAIXO-007: Animação fade-in uniforme em toda página
- **Severidade:** BAIXO
- **Evidência:** `components/Layout.tsx:48` — `animate-in fade-in duration-500` no main; `components/EmptyState.tsx:26` — idem
- **Problema:** Reflexo AI — cada seção entra igual; sem hierarquia motion
- **Impacto:** Sensação genérica; performance em low-end
- **Fix:** Motion só no hero; respeitar `prefers-reduced-motion` em animate-in (parcial em index.html:1061)
- **Esforço:** Baixo
