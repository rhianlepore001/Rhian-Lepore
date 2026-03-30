# Tech Decisions — Onboarding Wizard Squad

## Decisões Técnicas e Justificativas

### 1. Overlay Engine Customizado (sem libs externas)

**Decisão:** Implementar o overlay do zero em React + Tailwind.

**Alternativas consideradas:**
- Driver.js — lightweight mas adiciona dependência externa
- Shepherd.js — robusto mas >50KB gzip
- Intro.js — comercial, pode ter conflitos com Tailwind

**Justificativa:**
- Controle total sobre animações e comportamento
- Sem risk de breaking changes em libs de terceiros
- Possibilidade de adaptar 100% ao tema Brutal/Beauty
- Footprint zero no bundle (código já existente no React)

---

### 2. State Machine com useReducer (sem Redux)

**Decisão:** `WizardContext.tsx` com `useReducer` para gerenciar estado do wizard.

**Alternativa considerada:** Zustand (já considerado no projeto mas não adotado)

**Justificativa:**
- Padrão do projeto (Context API only, ver CLAUDE.md)
- State machine bem definida com actions tipadas
- Sem dependência adicional

---

### 3. Persistência via Supabase (tabela dedicada)

**Decisão:** Tabela `onboarding_progress` separada das tabelas de negócio.

**Alternativa considerada:** `localStorage` apenas

**Justificativa:**
- Retomar em outro dispositivo/browser
- Multi-tenant isolation via RLS
- Analytics futuras (taxa de conclusão, abandono por step)

---

### 4. Overlay Spotlight via box-shadow

**Decisão:** Técnica de spotlight usando `box-shadow: 0 0 0 9999px rgba(0,0,0,0.75)`

**Alternativa considerada:** Canvas overlay, SVG cutout

**Justificativa:**
- Pure CSS, sem JS de renderização
- Animável com CSS transitions
- Funciona com qualquer border-radius do elemento

---

### 5. Pointer/Seta em SVG + CSS Animation

**Decisão:** Seta ASCII/SVG com `@keyframes wizard-pointer-bounce`

**Justificativa:**
- Leve (sem SVG lib)
- Facilmente configurável (↓ ← → ↑)
- Cor amber-400 é consistente com o design system

---

### 6. Rota HashRouter `/#/onboarding`

**Decisão:** Adicionar nova rota no padrão HashRouter existente.

**Justificativa:**
- Padrão do projeto (ver CLAUDE.md — HashRouter pattern)
- Lazy-loaded como todas as demais páginas
- Wrapper em `Suspense` com fallback padrão

---

### 7. Detecção de Primeiro Login em AuthContext

**Decisão:** Verificar `onboarding_progress.is_completed` após autenticação.

**Fluxo:**
```
login → auth.uid() → getOnboardingProgress(companyId) → null ou is_completed=false → navigate('/#/onboarding')
```

**Justificativa:**
- Transparente para o usuário (automático)
- Uma única verificação por login
- Supabase query com index em company_id (fast)

---

## Padrões de Código do Squad

```typescript
// SEMPRE: company_id do contexto
const { user } = useAuth();
const companyId = user!.company_id; // nunca de URL/form

// SEMPRE: error handling via AlertsContext
const { showAlert } = useAlerts();

// SEMPRE: loading state no submit
const [isLoading, setIsLoading] = useState(false);

// SEMPRE: typecheck nos dados de form
interface StepFormData {
  field: string;
}
```

## Compatibilidade

| Requisito | Valor |
|-----------|-------|
| React | 19.x |
| TypeScript | 5.8 |
| Tailwind | 3.x |
| Supabase | JS v2 |
| Browsers | Chrome 90+, Safari 14+, Firefox 88+ |
| Mobile | iOS 14+, Android 10+ |
| Min viewport | 380px width |
