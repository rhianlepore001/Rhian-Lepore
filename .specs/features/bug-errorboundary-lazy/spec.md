# SPEC — Bug: Rotas lazy sem ErrorBoundary — tela branca sem recuperação

**Feature:** bug-errorboundary-lazy
**Prioridade:** 2
**Scope:** Medium
**Stack:** React 19 + TypeScript + HashRouter

---

## Contexto

`App.tsx` usa `React.lazy()` para todas as rotas, envoltas em `<Suspense fallback={<LoadingFull />}>`. Quando um import dinâmico falha (rede instável, CDN timeout, chunk expirado após deploy), o Suspense não captura o erro — o componente não renderiza e a tela fica em estado indefinido (branco ou spinner infinito).

`components/ErrorBoundary.tsx` existe com UI de erro + botão "Recarregar Página" (`window.location.reload()`), mas **NÃO está aplicado em nenhuma rota** em `App.tsx`.

### O que já existe
- `components/ErrorBoundary.tsx` — classe component com `getDerivedStateFromError`, `componentDidCatch` (loga via Logger), UI amigável com botão de reload
- `App.tsx` — `ProtectedLayout` com `<Suspense>` sem `<ErrorBoundary>` wrapper
- `LoadingFull` — spinner de carregamento usado como Suspense fallback

### O que falta
- Envolver o `<Suspense>` dentro de `ProtectedLayout` com `<ErrorBoundary>`
- Envolver o `<Suspense>` raiz de `AppRoutes` com `<ErrorBoundary>`

---

## Requisitos

### REQ-EB-01: Rotas lazy protegidas por ErrorBoundary
**Como** usuário,
**quero** ver uma tela de erro com botão de recuperação quando uma página falha ao carregar,
**para que** eu não fique preso em tela branca sem saber o que fazer.

**Critérios de aceitação:**
- [ ] WHEN import dinâmico de qualquer rota lança exceção THEN `ErrorBoundary` captura e renderiza UI de erro
- [ ] UI de erro mostra mensagem clara + botão "Recarregar Página"
- [ ] Botão executa `window.location.reload()`
- [ ] Em desenvolvimento (`import.meta.env.DEV`), mensagem técnica do erro é exibida abaixo da UI principal

### REQ-EB-02: ErrorBoundary aplicado em dois níveis
**Critérios de aceitação:**
- [ ] `ProtectedLayout` tem `<ErrorBoundary>` envolvendo o `<Suspense>` interno (rotas autenticadas)
- [ ] `AppRoutes` (ou equivalente) tem `<ErrorBoundary>` raiz envolvendo o `<Suspense>` externo
- [ ] Rotas públicas (`/book/:slug`, `/queue/:id`) também estão cobertas

### REQ-EB-03: Sem novo componente criado
**Critérios de aceitação:**
- [ ] O `ErrorBoundary.tsx` existente é usado diretamente — sem criar variantes
- [ ] Texto "Sistema Interrompido" mantido (já comunica urgência)
- [ ] NÃO criar um ErrorBoundary por rota — dois pontos de aplicação são suficientes

---

## Edge Cases

- WHEN ErrorBoundary captura erro durante navegação THEN o erro não se propaga para ErrorBoundary pai
- WHEN usuário recarrega e o import funciona THEN a tela carrega normalmente — sem estado residual
- WHEN o erro ocorre em rota pública (`/book/:slug`) THEN usuário vê tela de erro em vez de branco

---

## Decisão de design inline

Usar o `ErrorBoundary` existente sem criar variantes. Dois pontos de aplicação:
1. Dentro de `ProtectedLayout`, envolvendo o `<Suspense>` que renderiza as rotas autenticadas
2. Envolvendo o `<Suspense>` raiz em `AppRoutes`

NÃO criar ErrorBoundary por rota — overhead desnecessário.
NÃO alterar o `handleReset` (`window.location.reload()` é aceitável para MVP).

---

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `App.tsx` | MODIFICAR — adicionar `<ErrorBoundary>` envolvendo `<Suspense>` em 2 lugares |
| `components/ErrorBoundary.tsx` | VERIFICAR — possível ajuste menor no subtexto para mencionar "Erro ao carregar a página" |

---

## Done when

- [ ] `ProtectedLayout` tem `<ErrorBoundary>` acima do `<Suspense>` interno
- [ ] `AppRoutes` tem `<ErrorBoundary>` raiz acima do `<Suspense>` externo
- [ ] Teste: `throw new Error('test')` temporário em qualquer lazy route exibe tela de ErrorBoundary (não tela branca)
- [ ] Botão "Recarregar Página" funciona e retorna para a rota correta
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
