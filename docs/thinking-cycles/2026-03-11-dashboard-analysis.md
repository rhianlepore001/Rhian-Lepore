# Ciclo de Pensamento Humano: Auditoria do Dashboard

**Data:** 11/03/2026
**Alvo:** `Dashboard.tsx` e `implementation_plan.md`
**Squad:** Human Thinking (Sophia, Luna, Spark, Rex, Edge)

---

## 🧠 Fases do Ciclo

### 1. Sophia (Pensamento Crítico)
- **Risco de Dados:** O plano foca em estética (UX), mas o Dashboard é movido a dados. Se o `useDashboardData` retornar arrays vazios ou nulos em bordas de região (PT vs BR), o layout pode colapsar.
- **Trade-off:** A decisão de manter todos os modais no mesmo arquivo facilita a leitura mas degrada a performance de carregamento inicial (Lazy loading ignorado).
- **Questionamento:** Por que o `isStaff` esconde quase tudo do Dashboard? O staff não deveria ter acesso a métricas de produtividade individual?

### 2. Luna (UX Reviewer)
- **Fricção Mobile:** O banner de notificações no topo pode causar um "fold" muito agressivo, escondendo as métricas de lucro.
- **Acessibilidade:** Botões de rodapé com `text-[11px]` falham em testes de usabilidade para dedos grandes ou visão cansada.
- **Carga Cognitiva:** O `SetupCopilot` e o `DataMaturityBadge` competem pela atenção do usuário quando o score é baixo.

### 3. Spark (Ideator)
- **Feature Sugerida:** "Action Center" preditivo. Em vez de apenas listar lógicas, sugerir ações baseadas no dia da semana (ex: "Sexta-feira costuma ser lotada, quer abrir horário extra?").
- **UI Dinâmica:** BrudarCards que piscam sutilmente em neon quando uma meta é atingida.

### 4. Rex (Reformulator)
- **Refatoração:** Substituir condicionais de cor inline por uma estrutura de `theme-tokens` integrada ao Tailwind.
- **Unificação:** O `ComandoDoDia` e o `DashboardHero` poderiam ser unificados em um único "Status Shell" para economizar espaço vertical.

### 5. Edge (Optimizer)
- **Métrica Alvo:** Reduzir o tempo de interatividade (TTI) movendo modais para `React.lazy`.
- **Limpeza:** Há lógica de formatação de moeda espalhada que deveria estar centralizada no `formatCurrency`.

---

## 📋 Top 5 Ações Recomendadas

1. **[Quick Win]** Aumentar touch targets de links pequenos no Dashboard para 44px (ex: "Ver histórico").
2. **[Refactor]** Implementar `React.lazy` para os 4 modais pesados no final do arquivo.
3. **[UX]** Ajustar hierarquia entre `SetupCopilot` e `DataMaturityBadge` (um deve ser secundário).
4. **[Design]** Padronizar tokens de cor neon via CSS Variables em vez de JS ternaries.
5. **[Performance]** Verificar se `SmartNotificationsBanner` faz requisições pesadas que bloqueiam a renderização do Hero.
