# Design Review: AgendiX vs Concorrência

> Análise de UI/UX e métricas de negócio conduzida com Playwright + screenshots reais dos concorrentes.
> Foco: menu lateral, menu mobile, configurações, dashboard e métricas financeiras.

## 1. Concorrentes analisados

| Concorrente | Origem | Destaque | O que fizeram bem |
|-------------|--------|----------|-------------------|
| **AppBarber** | Brasil | Maior player nacional | Taxa de ocupação nativa, relatórios gerenciais, estoque, comandas |
| **Booksy** | EUA/Polônia | Marketplace + SaaS | Stats & Reports com cash flow, team performance, occupancy rate |
| **Vagaro** | EUA | All-in-one | Dashboard widgets customizáveis, payroll, marketing performance |
| **BestBarbers** | Brasil | App próprio + gestão | Dark mode elegante, cards expansivos, métricas de resultados reais |
| **Zoca** | EUA | Marketing/AI-first | Alto contraste, agentes de crescimento, métricas de leads |
| **Reservio** | Europa | Agenda simples | Navegação limpa, pagamentos, gestão de pessoal |

Screenshots salvos em: `e2e/screenshots/competitors/`

---

## 2. Menu lateral (desktop)

### O que vimos nos concorrentes

- **AppBarber**: menu vertical ícone + label, agrupamento por módulos (agenda, financeiro, estoque, relatórios).
- **Booksy/Vagaro**: sidebar minimalista, ícones finos, separação clara entre "operar" (agenda/clientes) e "crescer" (marketing/relatórios).
- **BestBarbers**: navegação por cards expansivos na landing; no app provavelmente usa sidebar compacta.

### Estado atual do AgendiX (`components/Sidebar.tsx`)

- Sidebar fixa de `w-64`, com logo, itens de `NAVIGATION_ITEMS` e logout.
- Itens atuais: Dashboard, Agenda, Fila Digital, Clientes CRM, Produtos, Financeiro, Ajustes.
- Boa base, mas **todos os itens de gestão estão no menu principal**, o que sobrecarrega a navegação.

### Recomendações

1. **Agrupar por contexto de uso**, não por entidade:
   - **Operar**: Dashboard, Agenda, Fila Digital, Clientes CRM
   - **Estoque/Produtos**: Produtos (e futuramente Compras/Fornecedores)
   - **Dinheiro**: Financeiro, Comissões, Relatórios
   - **Crescer**: Marketing, Links Públicos, Campanhas
   - **Configurar**: Ajustes (com sub-itens)

2. **Mover "Equipe" e "Serviços" para a sidebar? Não.**
   - Na sidebar eles competiriam com as ações diárias.
   - Melhor manter em **Configurações** como está, mas tornar o acesso mais rápido (ex: atalho no header ou no dashboard).
   - Exceção: se o dono gerencia equipe todos os dias, criar um grupo "Equipe" na sidebar com **Equipe** e **Serviços** (já que um depende do outro).

3. **Destacar o item ativo com mais peso**: fundo sólido + ícone preenchido, sem borda dupla.

4. **Adicionar indicador de progresso/alerta** próximo ao item (ex: comissões pendentes, metas atrasadas).

---

## 3. Menu mobile

### Estado atual do AgendiX (`components/BottomMobileNav.tsx` + `MoreOptionsDrawer.tsx`)

- **Bottom nav flutuante** com 5 slots: Agenda, Clientes, [+ Ações rápidas], Financeiro, Mais.
- **"Mais" abre um drawer bottom sheet quadrado** (`MoreOptionsDrawer`) que ocupa ~90% da tela, com grid 2 colunas.
- Problemas levantados pelo Rhian:
  - O drawer é "feio quadrado".
  - Tampa quase toda a tela.
  - Falta elegância na entrada.

### O que os concorrentes fazem

- **AppBarber**: app nativo com bottom tab + drawer lateral no mobile.
- **Booksy**: navegação por abas inferiores arredondadas, perfil desliza da direita com fundo blur.
- **Vagaro**: bottom nav com centro elevado (floating CTA), menu "Mais" em lista vertical.
- **BestBarbers**: landing com dark mode; no app, provavelmente usa navegação inferior com cards.

### Proposta para o AgendiX

Substituir o `MoreOptionsDrawer` por um **painel vertical deslizante da direita**, tipo iOS Sheet ou Notion mobile:

```
┌─────────────────────────────┐
│  [blur overlay - 30% black] │
│                             │
│   ┌─────────────────────┐   │
│   │ 👤 User              │   │
│   │                     │   │
│   │ ▸ Início            │   │
│   │ ▸ Fila Digital      │   │
│   │ ▸ Produtos          │   │
│   │ ▸ Marketing         │   │
│   │ ▸ Insights          │   │
│   │ ▸ Ajustes           │   │
│   │                     │   │
│   │ ─────────────────── │   │
│   │ Sair                │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Especificações técnicas sugeridas:**

- **Posicionamento**: `fixed top-0 right-0 h-full w-[85vw] max-w-[320px]`
- **Overlay**: `backdrop-blur-xl bg-black/30` (clicável para fechar)
- **Animação de entrada**: `translate-x-full → translate-x-0` com `cubic-bezier(0.16, 1, 0.3, 1)` e ~400ms
- **Animação de saída**: `translate-x-0 → translate-x-full` com easing out ~250ms
- **Conteúdo**: lista vertical com ícone + label (não grid), separadores sutis
- **Header do painel**: avatar, nome do negócio, nome do usuário, botão fechar
- **Não usar bottom sheet**: evita o formato "quadrado" e tampar tudo

**Acessibilidade:**
- `aria-expanded`, `role="dialog"`, `aria-label="Menu de navegação"`
- Fechar com `Esc` e swipe para direita

---

## 4. Configurações

### Estado atual (`pages/settings/*` + `SettingsLayout.tsx`)

Itens de configuração:
- Geral
- Agendamento
- Equipe
- Serviços
- Comissões
- Assinatura
- Segurança
- Preview UI (dev)
- Auditoria (dev)
- Erros (dev)
- Lixeira (dev)

### Problemas

1. **Configurações são muitas e algumas poderiam ser ações primárias**:
   - **Equipe** e **Serviços** são cadastros que o dono edita com frequência. Estar escondido em "Ajustes" aumenta a fricção.
   - **Comissões** é financeiro — faz mais sentido dentro de Financeiro do que em Configurações.

2. **Mobile**: lista vertical dentro de drawer + nav horizontal rolável. É funcional, mas poluído.

### Recomendações

| Item atual | Proposta |
|------------|----------|
| **Equipe** | Mover para sidebar como "Equipe" ou criar atalho no Dashboard; manter configurações avançadas em Ajustes/Equipe |
| **Serviços** | Mover para sidebar como "Serviços"; configurações de agendamento por serviço ficam em Ajustes/Serviços |
| **Comissões** | Mover para Financeiro > Comissões (já existe aba no Financeiro) |
| **Agendamento** | Renomear para "Horários & Políticas" (mais claro) |
| **Geral** | Manter, mas separar Identidade Visual, Dados do Negócio e Políticas em seções |
| **Assinatura** | Manter, mas destacar trial/expiração no header |
| **Segurança** | Manter |

**Sidebar revisada (sugestão):**

```
Dashboard
Agenda
Fila Digital
Clientes CRM
Serviços
Equipe
Produtos
Financeiro
  └─ Comissões
  └─ Relatórios
Marketing
Ajustes
```

---

## 5. Dashboard & Métricas financeiras

### Métricas atuais no AgendiX

**Dashboard (`pages/Dashboard.tsx`):**
- Faturamento hoje
- Agenda de hoje
- Oportunidades (action items)
- Meta mensal (progresso)
- Saúde do negócio (score + ticket médio, serviço mais pedido, taxa de recorrência)
- Dica para hoje

**Financeiro (`pages/Finance.tsx`):**
- Receitas, despesas, comissões pendentes, lucro, crescimento
- Receita por método de pagamento
- Gráfico de área (receita vs despesa)
- Histórico mensal

**Insights (`pages/Reports.tsx`):**
- Média por atendimento
- Crescimento vs semana anterior
- Recorrência de clientes
- Clientes em risco
- Serviço campeão
- Top clientes

### O que os concorrentes medem e o AgendiX ainda não

| Métrica | AppBarber | Booksy | Vagaro | BestBarbers | Status AgendiX |
|---------|-----------|--------|--------|-------------|----------------|
| **Taxa de ocupação** | ✅ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Horários vagos / disponibilidade** | ✅ | ✅ | ✅ | ✅ | Parcial (agenda) |
| **Tempo médio de atendimento** | ✅ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Ticket médio** | ✅ | ✅ | ✅ | ✅ | ✅ Tem |
| **Receita por profissional** | ✅ | ✅ | ✅ | ✅ | ✅ Tem (comissões) |
| **Taxa de cancelamento/falta** | ✅ | ✅ | ✅ | ✅ | Parcial |
| **LTV (lifetime value) do cliente** | ❌ | ✅ | ✅ | ✅ | Parcial (top clientes) |
| **Custo de aquisição de cliente (CAC)** | ❌ | ✅ | ✅ | ❌ | ❌ NÃO TEM |
| **Taxa de recorrência** | ✅ | ✅ | ✅ | ✅ | ✅ Tem |
| **Produtos mais vendidos** | ✅ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Receita por serviço/categoria** | ✅ | ✅ | ✅ | ✅ | Parcial (serviço campeão) |
| **Previsão de faturamento** | ❌ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Payroll / folha** | ❌ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Receita perdida (no-shows)** | ❌ | ✅ | ✅ | ✅ | ❌ NÃO TEM |
| **Meta de ocupação por profissional** | ✅ | ✅ | ✅ | ✅ | ❌ NÃO TEM |

### Métricas prioritárias a adicionar

1. **Taxa de ocupação** (solicitada pelo Rhian)
   - Fórmula: `horários ocupados / horários disponíveis × 100`
   - Por dia, semana, mês
   - Por profissional e por unidade (futuro)
   - Benchmark: 70-85% é saudável

2. **Horários vagos críticos**
   - Próximos 7 dias com disponibilidade
   - Sugestão de campanha para preencher

3. **Taxa de cancelamento e faltas**
   - `% de agendamentos cancelados / no-shows`
   - Comparativo mensal

4. **Tempo médio de atendimento real vs planejado**
   - Ajuda a ajustar duração dos serviços

5. **Receita perdida (no-shows e cancelamentos)**
   - Valor que deixou de entrar

6. **LTV do cliente**
   - Total gasto / número de clientes únicos no período
   - Segmentar por cliente

7. **Produtos mais vendidos** (quando estoque estiver maduro)

8. **Previsão de faturamento do mês**
   - Baseado nos agendamentos confirmados

9. **Meta de ocupação por profissional**
   - Permite gamificação interna

### Sugestão de novo card no Dashboard

```
┌─────────────────────────────────────┐
│  Taxa de Ocupação          78%      │
│  47 de 60 horários preenchidos      │
│  ████████████████████░░░░           │
│  +12% vs semana passada             │
└─────────────────────────────────────┘
```

---

## 6. Referências visuais capturadas

Todas as imagens estão em `e2e/screenshots/competitors/`:

- `appbarber-home-{desktop,mobile}.png` — landing com funcionalidades e preços
- `booksy-biz-{desktop,mobile}.png` — landing B2B
- `booksy-stats-reports-{desktop,mobile}.png` — dashboard de métricas
- `vagaro-{desktop,mobile}.png` — marketplace + footer com features
- `vagaro-reports-{desktop,mobile}.png` — reporting software
- `zoca-{desktop,mobile}.png` — dark mode, agentes, métricas
- `bestbarbers-{desktop,mobile}.png` — funcionalidades brasileiras
- `reservio-{desktop,mobile}.png` — agenda europeia

---

## 7. Próximos passos recomendados

1. **Menu mobile**: implementar drawer lateral direito com blur, substituindo `MoreOptionsDrawer`.
2. **Sidebar**: agrupar itens por contexto; avaliar mover Equipe/Serviços para sidebar.
3. **Configurações**: mover Comissões para Financeiro; simplificar mobile.
4. **Dashboard**: adicionar card Taxa de Ocupação.
5. **Financeiro/Insights**: adicionar taxa de cancelamento, horários vagos, receita perdida, LTV.
6. **Design tokens**: aproveitar o dark mode do BestBarbers e a limpeza da Booksy sem copiar.

---

*Relatório gerado automaticamente com Playwright + análise de UI/UX.*

> Para aprofundamento em métricas por persona (dono, barbeiro, colaborador) e foco especial na Taxa de Ocupação, veja `metrics-by-persona.md`.
