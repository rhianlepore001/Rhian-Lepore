# Task: Inspect Flow (Pixel — Meticulous)

## Metadata
- agent: meticulous
- elicit: true
- tool: playwright (browser MCP)
- inputs: [target_page, theme, breakpoint]
- outputs: [inspection_report, visual_issues, screenshots]

## Description
Pixel inspeciona cada detalhe visual e funcional de uma página,
verificando consistência, responsividade e todos os estados possíveis.

## Steps

### 1. Escolher Escopo
```
elicit:
  question: "O que inspecionar?"
  options:
    1: "Uma página específica (detalhar)"
    2: "Todas as páginas públicas"
    3: "Todas as páginas autenticadas"
    4: "Comparação entre temas (Brutal vs Beauty)"
    5: "Responsividade completa (mobile/tablet/desktop)"
    6: "INSPEÇÃO TOTAL (tudo)"
```

### 2. Para Cada Página — Checklist Visual
Via Playwright, em cada rota:

**Layout & Tipografia:**
- [ ] Título visível e correto
- [ ] Textos sem truncamento inesperado
- [ ] Fontes corretas por tema (mono/sans)
- [ ] Hierarquia visual clara (h1 > h2 > h3)
- [ ] Espaçamentos consistentes (padding/margin)

**Cores & Tema:**
- [ ] Cores seguem o tema ativo (Brutal/Beauty)
- [ ] Contraste suficiente para leitura
- [ ] Estados de hover/focus com cores diferentes
- [ ] Glassmorphism/sombras aplicados

**Componentes:**
- [ ] Botões com estados (normal, hover, active, disabled)
- [ ] Inputs com placeholder e labels
- [ ] Cards com proporções corretas
- [ ] Ícones Lucide carregando corretamente
- [ ] Charts/gráficos renderizando com dados

**Estados da Página:**
- [ ] Loading: skeleton ou spinner visível
- [ ] Vazio: mensagem "nenhum dado" com ilustração
- [ ] Erro: mensagem amigável (não stack trace)
- [ ] Sucesso: toast ou confirmação visual

### 3. Responsividade (3 Breakpoints)
Via Playwright viewport resize:
- **Mobile (375x812):** Bottom nav, cards empilhados, menu hambúrguer
- **Tablet (768x1024):** Sidebar toggle, grid 2 colunas
- **Desktop (1440x900):** Sidebar expandido, grid 3+ colunas

Para cada breakpoint verificar:
- [ ] Sem scroll horizontal
- [ ] Elementos não sobrepõem
- [ ] Touch targets >= 44px (mobile)
- [ ] Texto legível sem zoom

### 4. Relatório de Inspeção
- Tabela de issues por severidade
- Screenshots comparativos (before/after se possível)
- Lista de inconsistências entre páginas
- Score visual por página (1-10)
