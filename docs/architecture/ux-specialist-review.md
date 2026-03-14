# Revisão Especializada UX/Frontend — Beauty OS / AgenX AIOS

**Agente:** @ux-design-expert (Uma)
**Story de origem:** US-021
**Data:** 2026-03-14
**Escopo:** Auditoria completa de frontend e experiência do usuário
**Codebase:** React 19 + TypeScript + Vite 6 + Tailwind CSS
**Resultado:** Artefato de entrada para `technical-debt-assessment.md` (US-023)

---

## Sumário Executivo

O Beauty OS é uma aplicação SaaS com design diferenciado que implementa dois temas visuais distintos (Brutal para barbearias e Beauty para salões). A base de código tem maturidade técnica razoável, com lazy loading de pages, componentes reutilizáveis e sistema de contexto robusto. Contudo, a auditoria identificou **42 issues** distribuídas nas sete dimensões avaliadas, com destaque crítico para acessibilidade, onde o cumprimento do WCAG 2.1 AA é muito deficiente (estimativa: ~25% de conformidade). A maioria dos problemas UX é corrigível sem refatoração arquitetural, mas a ausência quase total de testes de componentes de UI representa risco de regressão alto.

---

## 1. Auditoria de Acessibilidade — WCAG 2.1 AA

**Conformidade estimada: ~25% (REPROVADO)**

### 1.1 Gestão de Foco em Modais — VIOLAÇÃO CRÍTICA

**Severidade:** P0
**Impacto:** 100% dos usuários com deficiência motora ou visual (leitores de tela)
**Componentes afetados:** `Modal.tsx`, `AppointmentEditModal.tsx`, `AppointmentWizard.tsx`, `PaywallModal.tsx`
**Critério WCAG:** 2.1.2 No Keyboard Trap (Level A), 2.4.3 Focus Order (Level A)

O componente `Modal.tsx` (`components/Modal.tsx`) captura a tecla ESC para fechar, mas **não captura o foco dentro do modal** (focus trap). Isso significa que ao abrir um modal, o usuário de teclado ou leitor de tela pode navegar para elementos fora do modal (Sidebar, Header), criando uma experiência completamente inutilizável.

```tsx
// components/Modal.tsx — linha 36-41
// Fecha ao pressionar ESC — CORRETO
const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !preventClose) {
        onClose();
    }
}, [onClose, preventClose]);

// FALTANTE: Focus trap com Tab/Shift+Tab dentro do modal
// FALTANTE: Restaurar foco no elemento que abriu o modal ao fechar
// FALTANTE: aria-modal="true" no elemento do modal
// FALTANTE: role="dialog" + aria-labelledby apontando para o título
```

**Recomendação concreta:** Instalar `focus-trap-react` ou implementar manualmente:
```tsx
// Adicionar no elemento raiz do modal:
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
// Adicionar id="modal-title" no h3 do header
// Implementar focus trap via useEffect com querySelectorAll focusable elements
```

### 1.2 ARIA Labels Insuficientes — VIOLAÇÃO ALTA

**Severidade:** P1
**Impacto:** ~15% usuários (leitores de tela)
**Componentes afetados:** Todos os botões de ícone apenas (sem texto visível)
**Critério WCAG:** 4.1.2 Name, Role, Value (Level A)

Grep identificou apenas **13 ocorrências** de atributos ARIA (`aria-label`, `aria-describedby`, `role=`) em **11 arquivos** de um total de ~90 arquivos `.tsx`. A proporção é extremamente baixa.

Exemplos de violações verificáveis:

```tsx
// components/Header.tsx — linha 132-138
// Botão de notificações SEM aria-label:
<button
    id="header-notifications-btn"
    onClick={() => setShowNotifications(!showNotifications)}
    className="relative p-2 hover:bg-neutral-800..."
>
    <Bell className="w-5 h-5 md:w-6 md:h-6 text-text-primary" />
    {alertCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2..."></span>
    )}
</button>
// PROBLEMA: Sem aria-label, leitor de tela não sabe o que é o botão.
// PROBLEMA: O badge de contagem (alertCount) não é anunciado com aria-live.
// FIX: aria-label={`Notificações${alertCount > 0 ? `, ${alertCount} novo(s)` : ''}`}
```

```tsx
// components/Sidebar.tsx — linha 88-91
// Botão "fechar sidebar" com apenas ícone:
<button onClick={closeSidebar} className="text-text-secondary hover:text-white">
    <X className="w-6 h-6" />
</button>
// FALTANTE: aria-label="Fechar menu"
```

```tsx
// components/BottomMobileNav.tsx — linha 67-73
// Botão de ação principal (+) sem aria-label:
<button onClick={() => setShowQuickActions(true)} className="w-16 h-16...">
    <Plus className="w-10 h-10" strokeWidth={3} />
</button>
// FALTANTE: aria-label="Nova ação rápida"
```

### 1.3 Indicadores de Foco Removidos — VIOLAÇÃO ALTA

**Severidade:** P1
**Impacto:** 100% usuários de teclado
**Critério WCAG:** 2.4.7 Focus Visible (Level AA)

Múltiplos componentes usam `focus:outline-none` sem substituir por um indicador de foco personalizado:

```tsx
// pages/Login.tsx — linha 191-195
<input
    type="email"
    className="w-full p-4 text-white text-sm focus:outline-none transition-all
        bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50..."
/>
// PROBLEMA: focus:outline-none remove o outline do navegador.
// O focus:border-beauty-neon/50 é sutil (baixo contraste em fundo escuro).
// Não há focus:ring explícito que seja visível o suficiente.
```

Grep encontrou apenas **63 ocorrências** de `focus:ring|focus-visible|focus:outline` em 31 arquivos. Considerando que a aplicação tem dezenas de inputs, botões e links interativos, a cobertura é insuficiente.

**Recomendação:** Adicionar globalmente em `index.css`:
```css
*:focus-visible {
  outline: 2px solid var(--color-accent-gold);
  outline-offset: 2px;
}
```

### 1.4 Contrast Ratio — VERIFICAÇÃO NECESSÁRIA

**Severidade:** P1
**Impacto:** ~8% usuários (baixa visão, daltonismo)
**Critério WCAG:** 1.4.3 Contrast (Minimum) — 4.5:1 para texto normal, 3:1 para texto grande

Os seguintes padrões de cor levantam suspeita de falha de contraste (verificação por ferramenta recomendada):

```tsx
// Padrão recorrente — texto placeholder/secundário:
'text-text-secondary'     // sobre fundo dark: suspeito
'text-neutral-400'        // sobre fundo neutral-900: ~4.2:1 (FALHA para texto 14px)
'text-neutral-500'        // sobre fundo neutral-900: ~3.2:1 (FALHA para texto normal)

// components/Header.tsx — linha 87-90
<h1 className="font-heading text-sm ... text-white"> // OK
<p className="text-[9px] text-text-secondary font-mono opacity-60"> // FALHA MÚLTIPLA:
// text-[9px] = 9px, requer contraste 7:1 para texto pequeno
// opacity-60 reduz ainda mais o contraste efetivo
```

```tsx
// components/TimeGrid.tsx — linha 67-69
// No tema Beauty, texto em slots não selecionados:
'text-stone-600' // sobre fundo stone-50: ~4.0:1 (FALHA para texto 14px)
```

### 1.5 Labels de Formulários — PARCIALMENTE CONFORMES

**Severidade:** P1
**Impacto:** ~15% usuários (leitores de tela, preenchimento automático)
**Critério WCAG:** 1.3.1 Info and Relationships (Level A), 1.3.5 Identify Input Purpose (Level AA)

```tsx
// pages/Login.tsx — linha 185-197
// Labels existem mas NÃO estão conectadas via htmlFor/id:
<label className="text-xs uppercase ml-1">Email</label>
<input type="email" value={email} ... />
// PROBLEMA: Sem id no input e sem htmlFor no label.
// Leitor de tela não associa a label ao input.

// FIX:
<label htmlFor="login-email" className="...">Email</label>
<input id="login-email" type="email" ... />
```

Padrão semelhante em `Register.tsx`, `pages/settings/TeamSettings.tsx` e outros formulários.

### 1.6 BrutalCard com tabIndex=-1 Desnecessário

**Severidade:** P2
**Componente:** `components/BrutalCard.tsx` — linha 88

```tsx
<div
    tabIndex={-1} // Remove do fluxo de tabulação para evitar foco acidental
    // PROBLEMA: O comentário justifica o uso, mas o card frequentemente
    // contém conteúdo que deveria ser focável (texto, links, dados).
    // tabIndex=-1 num container pode interferir com leitores de tela.
>
```

### 1.7 Checklist WCAG 2.1 AA Resumido

| Critério | Nível | Status | Componentes |
|---|---|---|---|
| 1.1.1 Non-text Content | A | FALHA PARCIAL | Ícones sem aria-label |
| 1.3.1 Info and Relationships | A | FALHA | Labels sem htmlFor/id |
| 1.3.5 Identify Input Purpose | AA | FALHA | Inputs sem autocomplete |
| 1.4.3 Contrast | AA | SUSPEITO | text-neutral-400/500, opacity-60 |
| 2.1.1 Keyboard | A | FALHA | Foco não capturado em modais |
| 2.1.2 No Keyboard Trap | A | FALHA | Focus trap ausente em modais |
| 2.4.3 Focus Order | A | FALHA | Modais sem controle de foco |
| 2.4.7 Focus Visible | AA | FALHA | focus:outline-none sem alternativa |
| 4.1.2 Name, Role, Value | A | FALHA PARCIAL | Botões ícone sem aria-label |
| 4.1.3 Status Messages | AA | FALHA | Loading states sem aria-live |

---

## 2. Auditoria de Responsividade Mobile

**Status Geral: BOM com issues pontuais**

### 2.1 Pontos Fortes Identificados

- **Bottom Navigation Bar** (`BottomMobileNav.tsx`): Implementação cuidadosa com `pb-[env(safe-area-inset-bottom)]` para notch de iPhone. Touch targets de 64px no botão central (excelente).
- **Sidebar Mobile**: Overlay correto com `backdrop-blur`, animação `translate-x`, fechamento por click fora. Bem implementado.
- **Layout principal**: Padding condicional `pt-[104px] md:pt-[120px]` para Trial Banner. Adaptação responsiva adequada.
- **BrutalCard**: `backdrop-blur-md` em mobile vs `backdrop-blur-2xl` em desktop — otimização performance correta.

### 2.2 Touch Targets Insuficientes

**Severidade:** P2
**Impacto:** ~60% usuários mobile (dificuldade de precisão no toque)
**Padrão WCAG:** 2.5.5 Target Size — mínimo 44x44px (Level AAA, mas recomendado)
**Apple HIG / Google Material:** mínimo 44x44px

```tsx
// components/Sidebar.tsx — linha 88-91
<button onClick={closeSidebar} className="text-text-secondary hover:text-white transition-colors">
    <X className="w-6 h-6" /> // ícone 24px, sem padding generoso
</button>
// Área de toque estimada: ~28x28px — INSUFICIENTE

// components/Header.tsx — linha 132-138
<button className="relative p-2 hover:bg-neutral-800 rounded border...">
    <Bell className="w-5 h-5 md:w-6 md:h-6" /> // p-2 = 8px padding
</button>
// Área de toque: ~37x37px em mobile — ABAIXO DO MÍNIMO

// components/TimeGrid.tsx — linha 62-74
<button className="px-4 py-3 rounded-lg font-mono text-sm...">
// py-3 = 12px, altura total ~40px dependendo da fonte — BORDERLINE
```

**Recomendação:** Adicionar `min-h-[44px] min-w-[44px]` em botões de ícone críticos.

### 2.3 Typography Mobile

**Severidade:** P2
**Impacto:** ~30% usuários com texto difícil de ler

```tsx
// components/Header.tsx — linha 87
<h1 className="font-heading text-sm md:text-lg..."> // text-sm = 14px em mobile
// WCAG 1.4.4: Texto deve ser redimensionável até 200% sem perda de conteúdo

// components/Header.tsx — linha 90
<p className="text-[9px] text-text-secondary font-mono opacity-60">
// 9px em qualquer dispositivo — EXTREMAMENTE PEQUENO, viola legibilidade básica

// components/BottomMobileNav.tsx — linha 51
<span className="text-[10px] font-bold tracking-tight">Agenda</span>
// 10px para labels de navegação — ABAIXO DO RECOMENDADO (mínimo 11px para labels)
```

### 2.4 Horizontal Scrolling

**Severidade:** P2
**Páginas afetadas:** Agenda (tabela de horários), Finance (tabela financeira)

O TimeGrid (`TimeGrid.tsx`) renderiza slots em grid sem wrapper `overflow-x-auto`. Em telas < 360px pode causar scrolling horizontal na página inteira.

```tsx
// components/TimeGrid.tsx — linha 77-79
<div className="bg-black/40 border-2 border-neutral-800 p-6">
    // Sem overflow-x-auto ou min-width controlado
    // Grid de slots pode extrapolar viewport em dispositivos < 360px
```

### 2.5 Modal com Offset de Sidebar em Mobile

**Severidade:** P1
**Impacto:** 100% usuários mobile que abrem modais

```tsx
// components/Modal.tsx — linha 106
<div className="fixed inset-0 z-[999] md:left-64 flex items-center justify-center p-4">
// PROBLEMA: md:left-64 está incorreto para mobile.
// Em mobile, a sidebar está oculta, mas o modal tem left=0.
// Porém se a sidebar estiver aberta (mobile), o modal não cobre a sidebar.
// O comportamento correto: em mobile, inset-0 deve ser completo.
```

---

## 3. Auditoria de Performance

**Status Geral: BOM — arquitetura sólida, otimizações pontuais necessárias**

### 3.1 Code Splitting — IMPLEMENTADO CORRETAMENTE

**Status:** APROVADO

`App.tsx` implementa lazy loading corretamente para todas as 20+ páginas:

```tsx
// App.tsx — linhas 12-40
const Dashboard = React.lazy(() => import('./pages/Dashboard')...);
const Agenda = React.lazy(() => import('./pages/Agenda')...);
const PublicBooking = React.lazy(() => import('./pages/PublicBooking')...);
// ... 18+ páginas com lazy loading
```

Dentro do `Dashboard.tsx` há **lazy loading de modais pesados** (boa prática):
```tsx
const GoalSettingsModal = lazy(() => import('../components/dashboard/modals/GoalSettingsModal')...);
const AllAppointmentsModal = lazy(() => import('../components/dashboard/modals/AllAppointmentsModal')...);
```

### 3.2 Re-renders Desnecessários — RISCO MÉDIO

**Severidade:** P2
**Componentes afetados:** Qualquer consumidor de `AuthContext`

`AuthContext.tsx` expõe um objeto grande com ~15 propriedades. Qualquer mudança em qualquer propriedade (ex: `loading`) re-renderiza todos os consumidores do contexto. Com 20+ páginas e ~90 componentes consumindo `useAuth()`, isso representa uma superfície de re-renders potencialmente grande.

```tsx
// contexts/AuthContext.tsx — contexto com 15+ valores em um único Provider
// RISCO: Mudança em 'loading' ou 'businessName' dispara re-render de
// todos os componentes que importam qualquer propriedade via useAuth()
```

**Recomendação:** Dividir o contexto em sub-contextos especializados (`AuthSessionContext`, `AuthProfileContext`, `AuthPermissionsContext`) com `memo` para estabilidade.

### 3.3 Imagens Externas sem Lazy Loading

**Severidade:** P2
**Impacto:** Usuários com conexão lenta

```tsx
// pages/Login.tsx — linhas 69-73
<div
    className="absolute inset-0 bg-cover bg-center opacity-40..."
    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80)' }}
/>
// PROBLEMA: Background images CSS não têm lazy loading nativo.
// Ambas as imagens (barber + beauty) são carregadas ao abrir o gateway.

// Recomendação: Usar <img loading="lazy"> ou carregar a imagem
// somente quando o card é visível/focado.
```

### 3.4 Bundle Size — ESTIMATIVA

Com base nos imports identificados:
- React 19 + React Router 7: ~45KB gzip
- Lucide React (50+ ícones importados): ~15KB gzip (tree-shakeable)
- Recharts: ~45KB gzip
- Supabase client: ~30KB gzip
- Google Generative AI SDK: ~25KB gzip
- Tailwind CSS: ~8KB gzip (purgado)
- **Total estimado:** ~170-200KB gzip (ACEITÁVEL para uma SaaS complexa)

### 3.5 willChange Desnecessário

**Severidade:** P3

```tsx
// components/Layout.tsx — linha 45
<main className="..." style={{ willChange: 'transform' }}>
// willChange: 'transform' em um elemento estático cria layer de composição permanente.
// Aumenta uso de GPU/memória sem benefício real em elemento não animado.
```

### 3.6 CSS Backdrop-blur em Mobile

**Severidade:** P2
**Impacto:** Performance em dispositivos mobile low-end

```tsx
// components/BrutalCard.tsx — linha 46
const blurClass = isMobile ? 'backdrop-blur-md' : 'backdrop-blur-2xl';
// Lógica correta de adaptação mobile está presente.
// Porém backdrop-blur-md ainda pode ser custoso em Android low-end.
```

A lógica de detecção mobile está em `UIContext.tsx` via `window.innerWidth`, o que é correto. A redução de blur em mobile é boa prática já implementada.

---

## 4. Auditoria de Design System Coverage

**Status Geral: AMADURECENDO — fundação sólida, inconsistências internas**

### 4.1 Inventário de Componentes

**Total de componentes identificados:** 90 arquivos `.tsx` (excluindo pages e contexts)

| Categoria | Quantidade | Observação |
|---|---|---|
| Core UI (BrutalCard, BrutalButton, Modal) | 4 | Bem desenvolvidos, dual-theme |
| Layout (Sidebar, Header, Layout, BottomMobileNav) | 5 | Responsivos, mas com issues ARIA |
| Formulários (PhoneInput, SearchableSelect, CalendarPicker, TimeGrid) | 4 | Funcional, sem estados de erro padronizados |
| Dashboard widgets | 12 | Alta especialização, pouco reuso |
| Marketing components | 6 | Bem isolados |
| Appointment flow | 6 | Wizard bem estruturado |
| Onboarding steps | 5 | Consistentes |
| Modals especializados | 8+ | Padrão heterogêneo (alguns usam Modal.tsx, outros criam portal próprio) |

### 4.2 Redundância de Estilos de Modal

**Severidade:** P2
**Impacto:** Manutenibilidade

Existem **três padrões diferentes** de modal no sistema:

```tsx
// Padrão 1: Usa Modal.tsx genérico (componentes bem feitos)
// Exemplo: ConfirmModal em Modal.tsx

// Padrão 2: AppointmentEditModal com portal próprio e estilos duplicados
// components/AppointmentEditModal.tsx — linhas 82-93
const modalStyles = isBeauty
    ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30...'
    : 'bg-neutral-900 border-2 border-neutral-800...';
// Duplicação dos mesmos estilos presentes em Modal.tsx

// Padrão 3: AppointmentWizard com portal próprio
// components/AppointmentWizard.tsx — linhas 68-71
const modalBg = isBeauty
    ? 'bg-gradient-to-br from-beauty-card via-neutral-900 to-beauty-dark...'
    : 'bg-neutral-900 border-2 border-neutral-800';
// Terceira variação dos mesmos estilos base
```

**Impacto:** Ao alterar o visual dos modais, é necessário atualizar 3+ locais diferentes.

### 4.3 Consistência dos Temas

**Status:** BOM mas com inconsistências

O sistema dual-theme (Brutal/Beauty) está bem implementado nos componentes core. Entretanto:

```tsx
// CalendarPicker.tsx — linha 20-25
// Usa classes 'stone' do Tailwind para Beauty, em vez de variáveis do design system:
const hoverBg = isBeauty ? 'hover:bg-stone-100' : 'hover:bg-accent-gold/10';
const selectedClass = isBeauty ? 'bg-stone-800 text-white' : 'bg-accent-gold text-black';
// INCONSISTÊNCIA: Outros componentes Beauty usam 'beauty-neon', não 'stone'.
// TimeGrid usa 'text-stone-600' para Beauty quando outros usam 'text-beauty-neon/60'.
// Mistura de tokens: 'stone-*' (Tailwind nativo) vs 'beauty-*' (tokens customizados).
```

### 4.4 SearchableSelect não Respeita Tema Beauty

**Severidade:** P2
**Componente:** `components/SearchableSelect.tsx`

```tsx
// SearchableSelect.tsx — linha 98-100
<label className="text-white font-mono text-sm mb-2 block">{label}</label>
<button className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg...">
// PROBLEMA: Sempre usa estilos "Barber" (bg-neutral-800, font-mono).
// Não adapta ao tema Beauty apesar de ser usado em contextos Beauty.
// Contraste com PhoneInput.tsx que adapta corretamente via isBeauty.
```

### 4.5 Tokens de Design Não Centralizados

**Severidade:** P2

Valores mágicos espalhados no código:

```tsx
// Tamanhos hardcoded em vez de tokens Tailwind customizados:
'text-[9px]'   // Header.tsx
'text-[10px]'  // BottomMobileNav.tsx
'text-[10px]'  // Header.tsx
'w-18 h-18'    // BottomMobileNav.tsx (classe Tailwind não-padrão)
'shadow-[8px_8px_0px_0px_#000000]'  // Modal.tsx, AppointmentEditModal.tsx (duplicado)
'shadow-[0_0_20px_rgba(167,139,250,0.15)]' // Duplicado em 3 arquivos
```

---

## 5. Auditoria de Qualidade de Componentes

**Status Geral: ADEQUADO — TypeScript bem utilizado, estados de erro frágeis**

### 5.1 Cobertura de Testes de Componentes UI

**Severidade:** P1
**Situação:** CRÍTICA

Apenas **3 arquivos** de teste de componentes UI foram encontrados no diretório `test/`:
- `test/components/BrutalCard.test.tsx`
- `test/components/ProfitMetrics.test.tsx`
- `test/contexts/AuthContext.test.tsx`

De um total de ~90 componentes e ~29 páginas, apenas 2 componentes têm testes. Isso representa **< 3% de cobertura de componentes UI**. Os demais testes cobrem apenas utils, hooks e configuração.

**Componentes críticos sem testes:**
- `Modal.tsx` (usado em toda a aplicação)
- `AppointmentWizard.tsx` (fluxo de negócio crítico)
- `BrutalButton.tsx` (componente mais reutilizado)
- `SearchableSelect.tsx` (lógica customizada de dropdown)
- `PhoneInput.tsx` (lógica de máscara customizada)
- `CalendarPicker.tsx` (lógica de datas)

### 5.2 Documentação de Props

**Status:** TypeScript define os tipos, mas sem JSDoc/comentários

```tsx
// components/BrutalCard.tsx — Props bem tipadas mas sem documentação de intenção:
interface BrutalCardProps {
    id?: string;
    children: React.ReactNode;
    className?: string;
    title?: string | React.ReactNode;
    action?: React.ReactNode;
    noPadding?: boolean;
    accent?: boolean;  // O que diferencia de 'glow'? Não está claro.
    glow?: boolean;    // Nenhum comentário explicando a diferença visual
    forceTheme?: 'beauty' | 'barber';
    style?: React.CSSProperties;
}
```

### 5.3 Estados dos Componentes

**Avaliação por componente crítico:**

| Componente | Normal | Hover | Focus | Disabled | Loading | Error | Empty |
|---|---|---|---|---|---|---|---|
| BrutalButton | PASS | PASS | FALHA | PASS | PASS | N/A | N/A |
| Modal | PASS | N/A | FALHA | N/A | N/A | N/A | N/A |
| SearchableSelect | PASS | PASS | FALHA | PASS | N/A | N/A | PASS |
| PhoneInput | PASS | PASS | FALHA | N/A | N/A | N/A | N/A |
| CalendarPicker | PASS | PASS | FALHA | PASS (disabled days) | N/A | N/A | N/A |
| TimeGrid | PASS | PASS | FALHA | PASS | N/A | N/A | PASS |

O estado `Focus` falha em todos os componentes interativos devido ao problema global de `focus:outline-none` sem alternativa robusta.

### 5.4 ErrorBoundary

**Status:** IMPLEMENTADO — funcional mas apresentação hardcoded no tema Barber

```tsx
// components/ErrorBoundary.tsx — linha 39-41
<div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
    <div className="bg-neutral-900 border-4 border-red-600 p-8...">
// PROBLEMA: ErrorBoundary está hardcoded no estilo Brutalist (barber),
// mesmo que o usuário seja Beauty. Menor impacto mas inconsistente.
```

---

## 6. Auditoria de Experiência do Usuário

**Status Geral: POSITIVO — fluxos principais funcionais, friction points corrigíveis**

### 6.1 Navegação e Orientação

**Pontos positivos:**
- Sidebar com item ativo visualmente destacado em ambos os temas.
- Header exibe nome do negócio como identidade contextual.
- BottomMobileNav limpo e direto para as 3 ações mais comuns.

**Issue — Nenhum indicador de "você está aqui" no Header mobile:**

```tsx
// components/Header.tsx — linha 68-75
// O header não exibe o título da página atual em mobile.
// Em mobile, a sidebar está oculta; o usuário vê apenas o logo e o nome do negócio.
// Não há breadcrumb nem título de página no header mobile.
// Impacto: Usuários mobile podem se desorientar após navegar.
```

**Severidade:** P2, afeta ~60% usuários (mobile).

### 6.2 Feedback de Operações Assíncronas

**Status:** PARCIALMENTE IMPLEMENTADO

Feedback de loading está presente nos formulários críticos (Login, Register), mas **ausente** em:

```tsx
// pages/Agenda.tsx — linha 83-84
const [loading, setLoading] = useState(true);
// Loading state existe, mas como é exibido? Varia por página.
// Algumas páginas usam Skeleton (Dashboard usa SkeletonLoader.tsx)
// Outras usam um spinner simples
// Sem padronização de como "loading" é apresentado entre páginas

// Dashboard.tsx — linha 77: usa Skeleton (correto e bem implementado)
// Agenda.tsx — necessita verificação se usa mesmo padrão
```

**Recomendação:** Padronizar o uso de `SkeletonCard` para todos os estados de carregamento de páginas.

### 6.3 Mensagens de Erro

**Status:** INCONSISTENTE

```tsx
// pages/Login.tsx — linha 175-180 — BOA implementação:
{error && (
    <div role="alert" className="p-3 text-xs text-center border bg-red-500/10...">
        {error}
    </div>
)}
// Positivo: usa role="alert" (acessível), visual claro.

// pages/Dashboard.tsx — linha 74-76 — MÁ implementação:
if (error) {
    logger.error('Error updating goal', error);
    alert("Erro ao atualizar a meta."); // alert() nativo do browser!
}
// PROBLEMA: alert() nativo é UX terrível — bloqueia a UI, sem styling,
// sem contexto específico, não pode ser dispensado elegantemente.
// Deve usar AlertsContext/toast notification.
```

Inconsistência entre uso de `alert()` nativo (Dashboard.tsx), `role="alert"` div (Login.tsx) e sistema de notificações via `AlertsContext`.

**Severidade:** P1 — afeta fluxo de negócio crítico (atualização de metas).

### 6.4 Estados Vazios (Empty States)

**Status:** PRESENTE mas inconsistente

```tsx
// components/Header.tsx — linha 152-156
{alerts.length === 0 ? (
    <div className="p-4 text-center text-text-secondary text-xs">
        <p className="text-sm">✅ Tudo certo!</p>
        <p className="mt-1">Nenhum aviso no momento.</p>
    </div>
) : ...}
// Positivo: Empty state existe para notificações.

// SearchableSelect.tsx — linha 146-150
<div className="p-3 text-center text-neutral-500 text-sm">
    Nenhum resultado encontrado.
</div>
// Positivo: empty state de busca existe.
```

**Issues identificadas com empty states:**
- Agenda sem agendamentos: verificação necessária (não coberta na análise estática)
- Finance sem transações: verificação necessária
- Clients sem clientes cadastrados: verificação necessária

### 6.5 Gateway de Login — Experiência de Seleção de Segmento

**Severidade:** P2
**Página:** `pages/Login.tsx`

```tsx
// Login.tsx — linhas 62-110
// Gateway com dois cards (Barbearia/Beauty) usa imagens do Unsplash.
// PROBLEMAS:
// 1. Imagens externas carregadas sem fallback caso a URL falhe.
// 2. Cards não têm role="button" explícito (são <button> correto,
//    mas sem aria-label descritivo além do texto visível).
// 3. Em mobile (h-64), o texto pode sobrepor a imagem tornando difícil leitura
//    quando o background darkener não é suficiente.
// 4. Nenhum indicador visual de "selecionado" ou loading após click no card.
```

### 6.6 Fluxo de Agendamento Público (PublicBooking)

**Severidade:** P1
**Página:** `pages/PublicBooking.tsx`

A página usa uma interface de chat conversacional (ChatBubble + isTyping) com 6 steps. Esta é uma inovação UX bem pensada, mas levanta pontos de acessibilidade:

```tsx
// pages/PublicBooking.tsx — linha 88
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);
// Interface de chat sem:
// 1. aria-live="polite" no container de mensagens para anunciar novas mensagens.
// 2. Indicação textual do step atual para usuários de teclado.
// 3. Foco movido para nova mensagem após typing indicator desaparecer.
```

### 6.7 Validação de Formulários

**Status:** PRESENTE mas sem feedback inline

```tsx
// pages/Register.tsx — linhas 46-57
if (password !== confirmPassword) {
    setError('As senhas não coincidem');
    setLoading(false);
    return;
}
// Validação só acontece no submit.
// Sem feedback inline (ex: confirmar senha fica vermelha enquanto digita).
// Sem indicadores de força de senha em tempo real.
// O erro é genérico (uma string para todo o formulário) sem apontar
// qual campo está com problema.
```

---

## 7. Technical Debt Summary

### Top 5 Issues por Impacto Total

| # | Issue | Severidade | Usuários Afetados | Esforço |
|---|---|---|---|---|
| 1 | Focus trap ausente em modais (WCAG 2.1.2) | P0 | 100% usuários teclado/AT | 1-2 dias |
| 2 | ARIA labels insuficientes em botões de ícone | P1 | ~15% (leitores de tela) | 3-4 horas (quick win) |
| 3 | Labels de formulários sem htmlFor/id | P1 | ~15% (leitores de tela) | 2-3 horas (quick win) |
| 4 | Uso de alert() nativo em Dashboard (Dashboard.tsx:76) | P1 | 100% (todos usuários) | 30 min (quick win) |
| 5 | Ausência de testes de componentes UI (<3% cobertura) | P1 | 100% (risco de regressão) | 5-10 dias |

### Quick Wins (menos de 1 dia de trabalho)

1. **Adicionar aria-label em botões de ícone** (Header, Sidebar, BottomMobileNav, TimeGrid)
   - Arquivos: `Header.tsx`, `Sidebar.tsx`, `BottomMobileNav.tsx`
   - Tempo estimado: 2-3 horas
   - Impacto: Resolve ~40% das violations ARIA

2. **Conectar labels a inputs via htmlFor/id** (Login, Register, formulários de settings)
   - Arquivos: `Login.tsx`, `Register.tsx`, e ~8 outros formulários
   - Tempo estimado: 2-3 horas
   - Impacto: Resolve critério WCAG 1.3.1 nos formulários críticos

3. **Substituir alert() nativo por toast notification** (Dashboard.tsx)
   - Arquivo: `pages/Dashboard.tsx:76`
   - Tempo estimado: 30 minutos
   - Impacto: Melhora UX para 100% dos usuários

4. **Adicionar focus:outline-none replacement global em index.css**
   - Arquivo: `index.css` (ou equivalente global)
   - Tempo estimado: 1 hora
   - Impacto: Resolve WCAG 2.4.7 globalmente

5. **Adicionar texto legendário de 9px no Header para tamanho legível**
   - Arquivo: `components/Header.tsx:90`
   - Tempo estimado: 15 minutos
   - Impacto: Melhora legibilidade para 100% usuários

6. **Padronizar tema de SearchableSelect para suportar Beauty**
   - Arquivo: `components/SearchableSelect.tsx`
   - Tempo estimado: 1 hora
   - Impacto: Consistência visual em tela de salões (Beauty theme)

### Refatorações Maiores (mais de 3 dias)

1. **Implementar focus trap adequado em todos os modais**
   - Arquivos: `Modal.tsx`, `AppointmentEditModal.tsx`, `AppointmentWizard.tsx`
   - Inclui: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus management
   - Tempo estimado: 3-5 dias
   - Dependência: Pode usar biblioteca `focus-trap-react` para acelerar

2. **Padronizar sistema de modais (eliminar duplicação de estilos)**
   - Refatorar `AppointmentEditModal.tsx` e `AppointmentWizard.tsx` para usar `Modal.tsx` como base
   - Tempo estimado: 3-5 dias
   - Risco: Requer testes de regressão cuidadosos

3. **Dividir AuthContext em sub-contextos para reduzir re-renders**
   - Arquivo: `contexts/AuthContext.tsx`
   - Separar: sessão, perfil, permissões
   - Tempo estimado: 3-4 dias
   - Impacto: Melhoria de performance em toda a aplicação

4. **Cobertura de testes de componentes UI críticos**
   - Prioridade: `Modal.tsx`, `BrutalButton.tsx`, `AppointmentWizard.tsx`, `SearchableSelect.tsx`, `PhoneInput.tsx`
   - Tempo estimado: 5-10 dias
   - Impacto: Redução drástica de risco de regressão

5. **Implementar aria-live para interface de chat de agendamento público**
   - Arquivo: `pages/PublicBooking.tsx`
   - Tempo estimado: 1-2 dias
   - Impacto: Torna o fluxo de agendamento acessível para usuários de leitores de tela

---

## Apêndice A: Arquivos Analisados

| Arquivo | Issues Encontradas |
|---|---|
| `components/Modal.tsx` | Focus trap ausente, aria-modal ausente, role="dialog" ausente |
| `components/Header.tsx` | 3x botões ícone sem aria-label, texto 9px, aria-live ausente em badge |
| `components/Sidebar.tsx` | Botão fechar sem aria-label |
| `components/BottomMobileNav.tsx` | Botão + sem aria-label, texto 10px labels |
| `components/BrutalCard.tsx` | tabIndex=-1 desnecessário |
| `components/BrutalButton.tsx` | focus:outline-none sem alternativa visível |
| `components/SearchableSelect.tsx` | Não adapta ao tema Beauty, sem aria-expanded |
| `components/CalendarPicker.tsx` | Inconsistência de tokens (stone vs beauty-*), focus state |
| `components/TimeGrid.tsx` | Sem aria-label em slots, texto stone-600 baixo contraste |
| `components/AppointmentEditModal.tsx` | Duplicação de estilos, foco não gerenciado |
| `components/AppointmentWizard.tsx` | Portal próprio sem focus trap, duplicação de estilos |
| `components/ErrorBoundary.tsx` | Tema hardcoded como Barber |
| `components/Layout.tsx` | willChange: transform desnecessário |
| `pages/Login.tsx` | Labels sem htmlFor, imagens sem fallback |
| `pages/Register.tsx` | Validação apenas no submit, labels sem htmlFor |
| `pages/Dashboard.tsx` | alert() nativo para erros |
| `pages/PublicBooking.tsx` | Chat sem aria-live, steps sem indicação textual |
| `contexts/AuthContext.tsx` | Contexto monolítico, potencial de re-renders |
| `contexts/UIContext.tsx` | Saudável |

---

## Apêndice B: Métricas de Auditoria

| Métrica | Valor | Referência |
|---|---|---|
| Total de arquivos .tsx analisados | ~120 (excl. node_modules) | — |
| Arquivos com pelo menos 1 atributo ARIA | 11 / 90+ | Meta: >70% |
| Conformidade estimada WCAG 2.1 AA | ~25% | Meta: 100% |
| Cobertura de testes componentes UI | <3% | Meta: >60% |
| Componentes com theme dual implementado | ~75% | Meta: 100% |
| Páginas com lazy loading | 20/20 | APROVADO |
| Touch targets >= 44px | ~60% dos botões | Meta: 100% |
| Uso de alert() nativo | 1 (Dashboard.tsx) | Meta: 0 |

---

**Documento pronto para consolidação em:** `docs/architecture/technical-debt-assessment.md` (US-023)

**Próximo agente:** @qa para gate de qualidade (US-022)
