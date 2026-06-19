# Findings — Estados UI

Auditor: ui-states-auditor | Register: Impeccable `product`

---

### ALTO-001: Loading global é spinner fullscreen genérico
- **Severidade:** ALTO
- **Evidência:** `App.tsx:51-55` — `LoadingFull` com `border-t-2 border-white` fixo (assume dark)
- **Problema:** Não usa tokens; light mode spinner ilegível; zero estrutura (skeleton)
- **Impacto:** Flash branco/preto ao trocar rota — sensação lenta
- **Fix:** Route-level skeleton matching layout (sidebar + content placeholders)
- **Esforço:** Médio

### ALTO-002: Clients empty state sem CTA primário
- **Severidade:** ALTO
- **Evidência:** `pages/Clients.tsx:234` — `"Nenhum cliente ainda."` sem botão visível no grep; form de cadastro em modal separado
- **Problema:** Empty não ensina próximo passo ("Cadastre seu primeiro cliente" + botão)
- **Impacto:** Dono novo vê lista vazia e não sabe o que fazer
- **Fix:** EmptyState com CTA "Adicionar cliente" abrindo modal existente
- **Esforço:** Baixo

### MÉDIO-003: Erros de agenda são toast genérico
- **Severidade:** MÉDIO
- **Evidência:** `pages/Agenda.tsx:324,417,439` — `'Erro ao excluir...'`, `'Erro ao aceitar...'` sem recovery action
- **Problema:** Toast desaparece; usuário não sabe se retry ou contatar suporte
- **Impacto:** Perda de agendamento = perda de receita; frustração
- **Fix:** Toast com action "Tentar novamente" + código amigável para suporte
- **Esforço:** Médio

### MÉDIO-004: BrutalButton disabled sem aria-busy em loading
- **Severidade:** MÉDIO
- **Evidência:** `components/BrutalButton.tsx:91` — `disabled={disabled || loading}` sem `aria-busy`; compare `components/ui/Button.tsx:67-68`
- **Problema:** Screen reader não distingue loading de disabled
- **Impacto:** Acessibilidade + feedback visual fraco em submits
- **Fix:** Paridade com ui/Button states
- **Esforço:** Baixo

### MÉDIO-005: Dashboard loading parcial não verificado
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:171` — `loading` de useDashboardData; KPIs renderizam com zeros?
- **Problema:** Não verificado no browser — risco de flash $0,00 antes dos dados
- **Impacto:** Dono vê faturamento zero e entra em pânico
- **Fix:** Skeleton nos KPI cards enquanto loading; nunca mostrar 0 como placeholder
- **Esforço:** Baixo

### MÉDIO-006: Form validation inconsistente entre auth e settings
- **Severidade:** MÉDIO
- **Evidência:** `pages/Login.tsx` — campos com validação; `pages/settings/GeneralSettings.tsx` — padrão misto
- **Problema:** Nem todo input usa ui/Input error prop
- **Impacto:** Erros descobertos só no submit
- **Fix:** Input error state obrigatório no DS; zod errors inline
- **Esforço:** Médio

### BAIXO-007: Placeholder route sem empty state útil
- **Severidade:** BAIXO
- **Evidência:** `pages/Placeholder.tsx` — rota `/configuracoes/notificacoes`
- **Problema:** Tela stub no menu de settings
- **Impacto:** Confiança B2B — feature anunciada mas vazia
- **Fix:** Remover do nav ou empty "Em breve" com expectativa clara
- **Esforço:** Baixo
