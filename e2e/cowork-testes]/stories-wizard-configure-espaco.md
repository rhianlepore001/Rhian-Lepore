# Stories — Wizard "Configure seu Espaço"

Análise realizada em 30/03/2026 no dashboard do AgenX (localhost:3000).

---

## EPIC 1: Bugs Críticos (Navegação Quebrada)

### STORY 1.1 — Corrigir step "Adicionar clientes" que não navega
**Prioridade:** 🔴 Crítica
**Tipo:** Bug

**Como** dono de barbearia usando o wizard pela primeira vez,
**Quero** clicar em "Adicionar clientes" e ser levado à página de cadastro de clientes,
**Para que** eu consiga completar esse passo do onboarding.

**Situação atual:** O botão tem `cursor: pointer`, não está `disabled`, mas clicar nele não faz absolutamente nada. Não navega, não abre modal, não dá feedback visual.

**Critérios de aceite:**
- [ ] Clicar no step "Adicionar clientes" navega para `/clientes` (ou abre modal de cadastro rápido)
- [ ] O wizard marca o step como "em progresso" ou "concluído" após a ação
- [ ] Ao voltar ao dashboard, o progresso é atualizado (ex: 2/6)

---

### STORY 1.2 — Corrigir step "Configurar horários" que vai para seção errada
**Prioridade:** 🔴 Crítica
**Tipo:** Bug

**Como** dono de salão configurando meus horários de atendimento,
**Quero** clicar em "Configurar horários" e ver a seção de dias e horários de atendimento,
**Para que** eu consiga definir quando meu estabelecimento funciona.

**Situação atual:** Navega para `/configuracoes/agendamento` mas mostra a seção "Escolha seu identificador único" (criação de link), não a seção de horários. O tooltip diz "Configure seus dias e horários" mas a tela mostra o campo de criar link de booking.

**Critérios de aceite:**
- [ ] Clicar no step redireciona para `/configuracoes/agendamento` E scrolla automaticamente até a seção de configuração de dias/horários
- [ ] A seção de horários fica visível e em destaque (highlight ou borda)
- [ ] O step é marcado como concluído quando o usuário salva os horários

---

### STORY 1.3 — Diferenciar destinos de "Configurar horários" e "Compartilhar link"
**Prioridade:** 🟡 Alta
**Tipo:** Bug/UX

**Como** usuário do wizard,
**Quero** que cada step me leve para o lugar certo e diferente,
**Para que** eu não fique confuso achando que são a mesma coisa.

**Situação atual:** Ambos os steps navegam para a mesma URL (`/configuracoes/agendamento`) sem diferenciação clara. O usuário pode achar que completou um step quando na verdade fez o outro.

**Critérios de aceite:**
- [ ] "Configurar horários" → `/configuracoes/agendamento` scrollado até a seção de dias/horários
- [ ] "Compartilhar link" → `/configuracoes/agendamento` scrollado até a seção de criação de link (comportamento atual, que já está correto)
- [ ] Cada step tem um anchor ou scroll automático para a seção correspondente

---

## EPIC 2: Bug do Tooltip/Tour Persistente

### STORY 2.1 — Corrigir tooltip do tour que persiste ao navegar
**Prioridade:** 🔴 Crítica
**Tipo:** Bug

**Como** usuário navegando pelo dashboard,
**Quero** que os tooltips do tour desapareçam quando saio da página do step,
**Para que** eles não bloqueiem o conteúdo do meu dashboard.

**Situação atual:** O tooltip "Configure seus dias e horários de atendimento" (com seta amarela ↓) fica grudado na tela após clicar em "Configurar horários" e voltar ao dashboard. Ele tem `position: fixed` e `z-index: 9999`, flutuando por cima dos cards "RECUPERADO", "VAGAS" e qualquer outro conteúdo. Só some ao navegar diretamente via URL (não pelo botão voltar do browser).

**Detalhes técnicos:**
- Elemento pai: `fixed z-[9999] flex flex-col items-center gap-1 pointer-events-none`
- Span filho: `text-xs text-amber-300 bg-black/80 px-2 py-1 rounded-full`
- O tooltip não é limpo no cleanup do componente de tour (falta `useEffect` cleanup ou event listener de route change)

**Critérios de aceite:**
- [ ] Tooltip some automaticamente ao sair da página do step
- [ ] Tooltip some ao clicar em "Fechar" ou "Parar tutorial"
- [ ] Tooltip some ao navegar de volta ao dashboard (via back ou link)
- [ ] Nenhum elemento `fixed z-[9999]` fica órfão no DOM após navegação

---

### STORY 2.2 — Limpar estado do tour ao navegar entre páginas
**Prioridade:** 🟡 Alta
**Tipo:** Bug

**Como** desenvolvedor do AgenX,
**Quero** que o estado do tour seja resetado ao trocar de rota,
**Para que** não existam elementos fantasma no DOM.

**Critérios de aceite:**
- [ ] Implementar cleanup no `useEffect` do componente de tour que remove tooltips ao desmontar
- [ ] Adicionar listener de route change que limpa overlays do tour
- [ ] Testar navegação: Dashboard → Step → Dashboard → verificar que nenhum tooltip persiste

---

## EPIC 3: Erros de Console (Estabilidade)

### STORY 3.1 — Tratar erro em loop de `useAIOSDiagnostic`
**Prioridade:** 🟡 Alta
**Tipo:** Bug técnico

**Como** desenvolvedor,
**Quero** que o hook `useAIOSDiagnostic` não dispare erros em cascata no console,
**Para que** o dashboard não fique poluído com 75+ erros por sessão e não degrade a performance.

**Situação atual:** O hook em `useAIOSDiagnostic.ts:20` dispara "Error fetching AIOS diagnostic" aproximadamente 6 vezes por ciclo, a cada ~2 minutos. São chamadas de polling sem tratamento de falha (sem retry com backoff, sem fallback, sem silenciamento após N falhas).

**Critérios de aceite:**
- [ ] Implementar retry com exponential backoff (ex: 1s, 2s, 4s, 8s, max 30s)
- [ ] Após 3 falhas consecutivas, parar de fazer polling e mostrar estado de fallback na UI
- [ ] Logar erro apenas 1x (não repetir o mesmo erro em cada ciclo)
- [ ] Erros não aparecem no console em produção (usar `console.warn` apenas em dev)

---

### STORY 3.2 — Tratar erro em loop de dashboard data
**Prioridade:** 🟡 Alta
**Tipo:** Bug técnico

**Como** desenvolvedor,
**Quero** que o fetch de dados do dashboard tenha tratamento de erro gracioso,
**Para que** o usuário veja um estado de fallback em vez de dados vazios silenciosos.

**Situação atual:** `Logger.ts:25` dispara "Error fetching dashboard data" ~4x por ciclo, repetindo a cada 2 minutos.

**Critérios de aceite:**
- [ ] Implementar retry com backoff
- [ ] Mostrar skeleton/loading state enquanto tenta recuperar
- [ ] Após falhas, mostrar banner: "Não foi possível carregar os dados. Tente novamente." com botão de retry manual
- [ ] Reduzir logs duplicados

---

### STORY 3.3 — Resolver warning de credenciais Supabase
**Prioridade:** 🟢 Baixa
**Tipo:** Melhoria técnica

**Como** desenvolvedor,
**Quero** configurar as variáveis de ambiente corretamente no host,
**Para que** o warning "Usando credenciais de fallback do Supabase" não apareça.

**Situação atual:** `supabase.ts:4` mostra warning de fallback credentials em toda inicialização.

**Critérios de aceite:**
- [ ] Variáveis de ambiente configuradas no `.env` do host
- [ ] Warning não aparece quando as variáveis estão corretas
- [ ] Em dev, o warning é informativo (não repetitivo)

---

## EPIC 4: UX para Usuários Leigos

### STORY 4.1 — Melhorar visual do step concluído ("Cadastrar serviços")
**Prioridade:** 🟡 Alta
**Tipo:** Melhoria UX

**Como** dono de barbearia que acabou de completar um passo,
**Quero** ver claramente que o passo foi concluído com uma mensagem positiva,
**Para que** eu me sinta motivado a continuar o setup.

**Situação atual:** O step "Cadastrar serviços" aparece com texto ~~riscado~~ (strikethrough) e `opacity: 0.5`. Parece bugado ou cancelado. O check verde existe mas a combinação riscado + opaco transmite negatividade.

**Critérios de aceite:**
- [ ] Step concluído mostra: ícone de check verde + texto normal (sem riscado) + fundo levemente verde/escuro
- [ ] Texto pode mudar para "Serviços cadastrados ✓" ou similar
- [ ] Opacity do step concluído é no mínimo 0.7 (legível mas visualmente "feito")

---

### STORY 4.2 — Adicionar descrições em todos os steps do wizard
**Prioridade:** 🟡 Alta
**Tipo:** Melhoria UX

**Como** dona de salão que nunca usou um sistema de gestão,
**Quero** ver uma explicação curta em cada passo do wizard,
**Para que** eu entenda o que preciso fazer antes de clicar.

**Situação atual:** Apenas "Adicionar equipe" tem descrição ("Cadastre os profissionais que atendem no seu espaço."). Os outros 5 steps são rótulos secos sem contexto.

**Descrições sugeridas:**
- **Cadastrar serviços:** "Defina os cortes, tratamentos e valores que você oferece."
- **Adicionar clientes:** "Importe ou cadastre seus clientes para agendar e fidelizar."
- **Configurar horários:** "Defina os dias e horários que seu espaço funciona."
- **Compartilhar link:** "Gere um link para seus clientes agendarem online."
- **Criar agendamento:** "Teste o sistema criando seu primeiro agendamento."

**Critérios de aceite:**
- [ ] Todos os 6 steps têm uma descrição de 1 linha abaixo do título
- [ ] Descrições usam linguagem simples (sem jargão técnico)
- [ ] Descrições ficam visíveis sem precisar expandir

---

### STORY 4.3 — Melhorar indicador de progresso
**Prioridade:** 🟡 Alta
**Tipo:** Melhoria UX

**Como** dono de barbearia no meio do setup,
**Quero** ver claramente quanto falta para terminar,
**Para que** eu saiba se vale a pena continuar agora ou se falta muito.

**Situação atual:** Mostra "1/6 completo" — formato genérico. A barra de progresso existe mas não tem semântica acessível.

**Critérios de aceite:**
- [ ] Texto muda para "Passo 1 de 6 concluído — faltam 5!" (ou similar, mais humano)
- [ ] Barra de progresso tem `role="progressbar"`, `aria-valuenow`, `aria-valuemax`
- [ ] Porcentagem opcional: "17% pronto"
- [ ] Ao completar 6/6, mostrar mensagem de celebração

---

### STORY 4.4 — Destacar visualmente o próximo passo recomendado
**Prioridade:** 🟡 Alta
**Tipo:** Melhoria UX

**Como** usuário que acabou de completar um step,
**Quero** saber qual é o próximo passo recomendado sem ter que adivinhar,
**Para que** eu siga o fluxo natural sem me perder.

**Situação atual:** Nenhum step tem destaque de "faça agora". "Configurar horários" tem um background levemente diferente mas é sutil demais.

**Critérios de aceite:**
- [ ] O próximo step pendente tem borda dourada ou badge "PRÓXIMO"
- [ ] O step ativo tem leve animação (pulse ou glow suave) para atrair o olho
- [ ] Os steps futuros ficam visualmente mais apagados que o próximo

---

### STORY 4.5 — Remover redundância "Parar tutorial" vs "Fechar (X)"
**Prioridade:** 🟢 Média
**Tipo:** Melhoria UX

**Como** usuário do wizard,
**Quero** ter uma única forma clara de fechar o wizard,
**Para que** eu não fique confuso sobre a diferença entre os dois botões.

**Situação atual:** Existem dois botões que parecem fazer a mesma coisa: "◼ Parar tutorial" e o botão "X" (Fechar). Não é claro qual fecha o wizard permanentemente e qual apenas minimiza.

**Critérios de aceite:**
- [ ] Manter apenas o "X" para fechar/minimizar o wizard
- [ ] Se "Parar tutorial" tiver função diferente (ex: desativar permanentemente), renomear para "Não mostrar mais" com confirmação
- [ ] Se ambos fazem a mesma coisa, remover um deles

---

### STORY 4.6 — Adicionar mensagem de conclusão ao completar 6/6
**Prioridade:** 🟢 Média
**Tipo:** Melhoria UX

**Como** dono de barbearia que acabou de configurar tudo,
**Quero** ver uma mensagem de parabéns e saber que estou pronto,
**Para que** eu sinta que o setup foi concluído com sucesso.

**Critérios de aceite:**
- [ ] Ao completar 6/6, o wizard mostra: "Tudo pronto! Seu espaço está configurado. 🎉"
- [ ] Botão de CTA muda para "Começar a usar" ou "Ver minha agenda"
- [ ] O wizard pode ser reaberto depois pelo botão "Tour" no header

---

## EPIC 5: Acessibilidade (a11y)

### STORY 5.1 — Adicionar aria-labels nos botões do wizard
**Prioridade:** 🟡 Alta
**Tipo:** Acessibilidade

**Como** usuário com deficiência visual usando leitor de tela,
**Quero** que os botões do wizard tenham labels descritivos,
**Para que** eu consiga navegar pelo wizard sem depender de visão.

**Situação atual:** Nenhum dos 6 botões do wizard tem `aria-label`, `role`, ou `aria-describedby`. Zero acessibilidade.

**Critérios de aceite:**
- [ ] Cada botão tem `aria-label` descritivo (ex: "Passo 2: Adicionar equipe — Opcional")
- [ ] Steps concluídos têm `aria-label` indicando conclusão (ex: "Passo 1: Cadastrar serviços — Concluído")
- [ ] Step disabled tem `aria-disabled="true"`
- [ ] O container do wizard tem `role="navigation"` e `aria-label="Wizard de configuração"`

---

### STORY 5.2 — Adicionar semântica à barra de progresso
**Prioridade:** 🟢 Média
**Tipo:** Acessibilidade

**Como** usuário com deficiência visual,
**Quero** que a barra de progresso seja anunciada pelo leitor de tela,
**Para que** eu saiba quantos passos faltam.

**Situação atual:** A barra de progresso não tem `role="progressbar"`, `aria-valuenow`, nem `aria-valuemax`.

**Critérios de aceite:**
- [ ] Barra tem `role="progressbar"`
- [ ] `aria-valuenow="1"` (dinâmico)
- [ ] `aria-valuemax="6"`
- [ ] `aria-label="Progresso da configuração: 1 de 6 passos concluídos"`

---

### STORY 5.3 — Restaurar focus outline nos botões
**Prioridade:** 🟢 Média
**Tipo:** Acessibilidade

**Como** usuário que navega por teclado (Tab),
**Quero** ver onde está o foco ao navegar pelos steps,
**Para que** eu saiba qual botão vou ativar ao pressionar Enter.

**Situação atual:** Todos os botões têm `outline: none`. Navegação por Tab não mostra indicação visual de foco.

**Critérios de aceite:**
- [ ] Botões do wizard mostram `outline` ou `ring` visível ao receber foco via Tab
- [ ] Estilo de foco é consistente com o design system (ex: `ring-2 ring-amber-400`)
- [ ] Focus outline não aparece em cliques com mouse (usar `focus-visible` ao invés de `focus`)

---

## EPIC 6: Navegação de Retorno

### STORY 6.1 — Adicionar botão "Voltar ao wizard" nas páginas de step
**Prioridade:** 🟢 Média
**Tipo:** Melhoria UX

**Como** usuário que clicou num step e foi para outra página,
**Quero** ter um botão fácil para voltar ao wizard no dashboard,
**Para que** eu não precise usar o botão voltar do browser ou procurar o caminho.

**Situação atual:** Ao clicar num step (ex: "Adicionar equipe"), o usuário vai para `/configuracoes/equipe` e não tem como voltar ao wizard facilmente. Ao usar o botão voltar do browser, aparece o prompt "Você parou em X — quer continuar?" que é útil, mas um botão direto na página seria melhor.

**Critérios de aceite:**
- [ ] Nas páginas de destino dos steps, exibir banner ou botão fixo: "↩ Voltar ao setup"
- [ ] O botão leva de volta ao dashboard com o wizard visível
- [ ] O banner só aparece se o usuário veio do wizard (não se acessou a página diretamente)

---

## Resumo de Prioridades

| Prioridade | Stories | Esforço estimado |
|---|---|---|
| 🔴 Crítica | 1.1, 1.2, 2.1 | ~4-6h total |
| 🟡 Alta | 1.3, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1 | ~8-12h total |
| 🟢 Média/Baixa | 3.3, 4.5, 4.6, 5.2, 5.3, 6.1 | ~4-6h total |

**Recomendação de ordem de execução:**
1. Primeiro resolver os 3 bugs críticos (1.1, 1.2, 2.1) — são bloqueadores de onboarding
2. Depois adicionar descrições nos steps (4.2) e destacar próximo passo (4.4) — maior impacto UX com menor esforço
3. Corrigir os erros de console (3.1, 3.2) — profissionalismo e performance
4. Ajustes de polimento e a11y por último
