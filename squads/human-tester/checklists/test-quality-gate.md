# Checklist: Test Quality Gate

## Gate de Qualidade — Critérios de Aprovação

### 🧭 Navi (Explorer) — Happy Path
- [ ] Todas as 26 rotas carregam sem erro
- [ ] Todos os 13 modais abrem e fecham corretamente
- [ ] Login → Dashboard funciona
- [ ] Registro → Onboarding → Dashboard funciona
- [ ] Booking público completa agendamento
- [ ] Navegação mobile (bottom nav) funciona
- [ ] Menu sidebar navega para todas as páginas

### 💥 Havoc (Destroyer) — Negative Testing
- [ ] Nenhum formulário aceita dados vazios sem aviso
- [ ] Inputs inválidos mostram mensagem de erro
- [ ] Double-submit não cria duplicatas
- [ ] URLs manipuladas não expõem dados
- [ ] App não crasha com nenhum input testado
- [ ] Rotas protegidas redirecionam para login

### 🔬 Pixel (Meticulous) — Visual Quality
- [ ] Todas as páginas passam em mobile (375px)
- [ ] Todas as páginas passam em tablet (768px)
- [ ] Todas as páginas passam em desktop (1440px)
- [ ] Tema Brutal consistente em todas as páginas
- [ ] Tema Beauty consistente em todas as páginas
- [ ] Loading states visíveis em todas as páginas
- [ ] Empty states com mensagem amigável
- [ ] Error states sem stack traces expostas

### ⚡ Flash (Speedster) — Performance
- [ ] Nenhuma página com load > 4 segundos
- [ ] 80%+ das páginas com load < 2 segundos
- [ ] Zero console.error em navegação normal
- [ ] Navegação rápida (10 páginas) sem crash
- [ ] Filtros/buscas respondem em < 500ms
- [ ] Modais abrem em < 200ms

### 🛡️ Shield (Guardian) — Security
- [ ] Rotas autenticadas bloqueiam acesso sem login
- [ ] Rotas de owner bloqueiam acesso de staff
- [ ] Logout limpa todos os dados de sessão
- [ ] Nenhum XSS funcional encontrado
- [ ] Dados de tenant A não visíveis para tenant B
- [ ] Console não expõe tokens ou dados sensíveis
- [ ] Error messages não expõem detalhes internos

### Critérios de Aprovação

| Resultado | Condição |
|-----------|----------|
| **PASS** | 0 Critical, 0 High, todos os checks P0 passam |
| **PASS COM RESSALVAS** | 0 Critical, <= 3 High com workaround |
| **FAIL** | Qualquer Critical, ou > 3 High sem workaround |
