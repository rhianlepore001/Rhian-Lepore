# Findings — Componentes

Auditor: ui-component-auditor | Register: Impeccable `product`

---

### CRÍTICO-001: Dois sistemas de Card coexistem
- **Severidade:** CRÍTICO
- **Evidência:** `components/BrutalCard.tsx` (~50 usos) vs `components/ui/Card.tsx` (~18 usos); padding/header diferentes (p-6 md:p-8 vs p-5 md:p-6)
- **Problema:** Mesma affordance, shells diferentes — BrutalCard tem gradient overlay, ui/Card não
- **Impacto:** Modal em settings parece de outro produto que dashboard
- **Fix:** Deprecar BrutalCard → ui/Card com variants `default|accent|glow`; codemod gradual
- **Esforço:** Alto

### CRÍTICO-002: Dois Modals com APIs incompatíveis
- **Severidade:** CRÍTICO
- **Evidência:** `components/ui/Modal.tsx` (`open`) vs `components/Modal.tsx` (`isOpen` + FocusTrap); z-index `999` em ambos
- **Problema:** ui/Modal sem focus-trap; legacy Modal com FocusTrap mas prop diferente
- **Impacto:** Comportamento de dialog inconsistente; risco a11y
- **Fix:** Um Modal canônico: `<Modal open onClose>` + focus-trap + portal; alias deprecated
- **Esforço:** Médio

### ALTO-003: BrutalButton vs ui/Button — alturas diferentes no mesmo size
- **Severidade:** ALTO
- **Evidência:** `components/BrutalButton.tsx:48-49` md=`h-12`; `components/ui/Button.tsx:20` md=`h-11 min-h-[44px]`
- **Problema:** Form em Finance usa BrutalButton; Products usa ui/Button — misalignment vertical
- **Impacto:** Forms parecem amadores; densidade inconsistente
- **Fix:** Button canônico com sizes tokenizados; BrutalButton wrapper deprecated
- **Esforço:** Médio

### ALTO-004: EmptyState duplicado com APIs diferentes
- **Severidade:** ALTO
- **Evidência:** `components/EmptyState.tsx` (`message`, `ctaLabel`) vs `components/ui/EmptyState.tsx` (`title`, `description`, `action`)
- **Problema:** Dashboard importa legacy (`pages/Dashboard.tsx:13`); Products pode usar ui/
- **Impacto:** Empty states visualmente similares mas CTAs wired diferente — manutenção impossível
- **Fix:** Unificar em ui/EmptyState; adapter temporário no legacy
- **Esforço:** Baixo

### MÉDIO-005: Ghost card pattern no BrutalCard
- **Severidade:** MÉDIO
- **Evidência:** `components/BrutalCard.tsx:58-59` — `absolute inset-0 bg-gradient-to-b from-white/[0.02]`
- **Problema:** Impeccable ban — border+shadow+gradient ghost stack
- **Impacto:** Cards "flutuam" genericamente sem hierarquia
- **Fix:** Card default = border OR shadow; gradient só variant `elevated` explícita
- **Esforço:** Baixo

### MÉDIO-006: Modais custom sem usar shell compartilhado
- **Severidade:** MÉDIO
- **Evidência:** `components/CheckoutModal.tsx`, `components/CommissionPaymentHistory.tsx:108` — fullscreen shells próprios
- **Problema:** Cada modal reinventa header, padding, close button
- **Impacto:** Checkout (fluxo crítico) não herda fixes globais de a11y
- **Fix:** Modal `size="full"` + slots header/body/footer
- **Esforço:** Médio

### MÉDIO-007: Skeleton triplicado
- **Severidade:** MÉDIO
- **Evidência:** `components/ui/Skeleton.tsx`, `components/SkeletonLoader.tsx`, `pages/Dashboard.tsx:16` import SkeletonLoader
- **Problema:** Loading shapes diferentes por tela
- **Impacto:** Perceived performance inconsistente
- **Fix:** SkeletonCard pattern único no DESIGN-SYSTEM
- **Esforço:** Baixo

### BAIXO-008: UiPreview não é referência real de produção
- **Severidade:** BAIXO
- **Evidência:** `pages/settings/UiPreview.tsx` — cataloga ui/*; app usa Brutal*
- **Problema:** Design system documentado ≠ design system usado
- **Impacto:** Devs implementam no lugar errado
- **Fix:** UiPreview deve refletir componentes canônicos pós-migração; badge "deprecated" nos Brutal*
- **Esforço:** Baixo
