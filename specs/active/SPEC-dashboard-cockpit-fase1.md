# SPEC: Dashboard Cockpit Fase 1

**Status:** in_progress  
**Criado:** 2026-08-03  
**Prioridade:** alta

---

## O que o cliente final vê

Dashboard vira cockpit do **agora**, não pilha de cards:

1. **Próximo atendimento** (herói) + CTA Abrir na Agenda + “depois” (próximos 2)
2. **KPIs do dia** (owner: receita, agenda, fila, horários livres; staff: concluídos, pendentes, comissões)
3. **Precisa da sua atenção** (só se houver itens)
4. **Agenda de hoje** (lista com status)
5. **Oportunidades + metas + saúde** (coluna direita no desktop; abaixo no mobile) — compactos

## O que muda no sistema

- `pages/Dashboard.tsx` reorganizado em layout cockpit
- Novos componentes presentacionais em `components/dashboard/`
- `fetchTodayAppointments` no service (hoje, todos os status)
- Staff sem receita bruta da loja no herói/KPIs

## O que NÃO muda

- Rotas, RLS, sidebar, Insights, Financeiro
- Estoque baixo (adiado)
- Visual “roxo SaaS” da referência (usamos tokens AgendiX)

## Edge cases

- Sem agendamentos hoje → empty state no herói + CTA Agendar
- Sem alertas → inbox some
- Data maturity baixa → saúde continua, copy educativa
- Staff → não vê faturamento/fila da loja/saúde financeira completa

## Done when

- [ ] Owner e staff têm hierarquia “agora → atenção → agenda”
- [ ] typecheck, lint, build, test verdes
- [ ] Prints desktop + mobile do cockpit
