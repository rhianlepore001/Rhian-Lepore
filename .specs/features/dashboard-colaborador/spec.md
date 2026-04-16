# SPEC — Dashboard do Colaborador (Visão Restrita)

**Feature:** dashboard-colaborador
**Prioridade:** 3 (depende de checkout-comanda + comissoes-pagamento)
**Scope:** Medium
**Decisões relacionadas:** D-002, D-003

---

## Contexto

O Dashboard já tem lógica condicional por role — staff vê `MeuDiaWidget` e owner vê widgets completos. Porém a visão do staff é muito limitada: não mostra faturamento líquido próprio, não permite criar agendamentos para colegas facilmente, e não bloqueia acesso a rotas financeiras.

### O que já existe
- `Dashboard.tsx` — condicional `isStaff` (staff vê `MeuDiaWidget`)
- `AuthContext.tsx` — `role`, `companyId`, `teamMemberId` disponíveis
- `Agenda.tsx` — staff já pode ver agenda da barbearia
- `OwnerRouteGuard` — já bloqueia algumas rotas para staff

### O que falta
- Faturamento líquido próprio no dashboard do staff
- Consulta de estoque (somente leitura)
- Bloqueio de rotas financeiras com redirect + toast
- Garantir que staff pode criar/editar/cancelar agendamentos de colegas

---

## Requisitos

### REQ-F1-01: Dashboard do staff — agenda do dia
**Como** colaborador,
**quero** ver meus próximos agendamentos ao entrar no app,
**para que** eu saiba meu dia de trabalho rapidamente.

**Critérios de aceitação:**
- [ ] Dashboard do staff exibe agenda do dia em ordem cronológica
- [ ] Mostra: horário, cliente, serviço, status
- [ ] Atendimentos concluídos aparecem com badge "Concluído"
- [ ] Botão "Concluir" disponível nos agendamentos pendentes (D-003)

### REQ-F1-02: Faturamento líquido próprio
**Como** colaborador,
**quero** ver quanto vou receber no período atual,
**para que** eu acompanhe minha comissão sem depender do dono.

**Critérios de aceitação:**
- [ ] Card no dashboard: "Seu faturamento líquido: R$ X,XX"
- [ ] Valor = soma de comissões do período atual (usando ciclo mês cheio — D-001)
- [ ] NUNCA mostra faturamento bruto da barbearia
- [ ] NUNCA mostra dados financeiros de outros colaboradores
- [ ] Query usa `finance_records WHERE professional_id = teamMemberId AND commission_paid = false`

### REQ-F1-03: Criação de agendamento para colegas
**Como** colaborador,
**quero** criar agendamentos para qualquer colega,
**para que** eu ajude na organização da agenda (ex: recepcionista).

**Critérios de aceitação:**
- [ ] Botão "Novo agendamento" disponível no dashboard do staff
- [ ] Dropdown de profissionais inclui todos os colegas ativos
- [ ] Sem notificação ao colega (D-002)
- [ ] Agendamento criado aparece na agenda do colega

### REQ-F1-04: Edição e cancelamento de agendamentos
**Como** colaborador,
**quero** poder editar ou cancelar agendamentos de qualquer colega,
**para que** a equipe funcione de forma colaborativa.

**Critérios de aceitação:**
- [ ] Staff pode editar agendamentos de qualquer profissional da mesma barbearia
- [ ] Staff pode cancelar agendamentos de qualquer profissional
- [ ] Cancelamento de agendamento já concluído → bloqueado (EC-F2-03)
- [ ] RLS permite UPDATE/DELETE para todos da mesma barbearia

### REQ-F1-05: Consulta de estoque
**Como** colaborador,
**quero** consultar o estoque de produtos,
**para que** eu saiba o que está disponível sem perguntar ao dono.

**Critérios de aceitação:**
- [ ] Staff tem acesso à tela de estoque em modo somente leitura
- [ ] Sem botões de adicionar/editar/remover para staff
- [ ] Exibe: nome do produto, quantidade, status (disponível/baixo/esgotado)

### REQ-F1-06: Bloqueio de rotas financeiras
**Como** sistema,
**quero** impedir que colaboradores acessem dados financeiros da barbearia,
**para que** a privacidade do dono seja preservada.

**Critérios de aceitação:**
- [ ] Staff tenta acessar `/#/finance` → redireciona para `/#/dashboard`
- [ ] Toast: "Acesso restrito ao dono da barbearia"
- [ ] Staff tenta acessar `/#/reports` → mesmo comportamento
- [ ] Staff tenta acessar qualquer rota de Settings (exceto perfil pessoal) → redireciona
- [ ] Menu lateral não exibe links para rotas bloqueadas

---

## Tabela de Permissões

| Ação | Owner | Staff |
|---|---|---|
| Ver faturamento bruto total | ✅ | ❌ |
| Ver faturamento líquido próprio | ✅ | ✅ (só o dele) |
| Criar agendamento para colega | ✅ | ✅ |
| Editar agendamento de colega | ✅ | ✅ |
| Cancelar agendamento de colega | ✅ | ✅ |
| Concluir atendimento (qualquer) | ✅ | ✅ (D-003) |
| Ver/editar configurações | ✅ | ❌ |
| Ver estoque (consulta) | ✅ | ✅ |
| Editar estoque | ✅ | ❌ |
| Ver comissões de outros | ✅ | ❌ |

---

## Edge Cases

### EC-F1-01: Staff acessa rota financeira via URL
- **Comportamento:** `OwnerRouteGuard` redireciona para `/dashboard` + toast "Acesso restrito ao dono"

### EC-F1-02: Staff sem agendamentos no dia
- **Comportamento:** Mensagem amigável: "Nenhum agendamento para hoje. Aproveite o descanso!" (ou equivalente)

### EC-F1-03: Staff com comissão zero
- **Comportamento:** Card de faturamento mostra "R$ 0,00" — não esconde o card

### EC-F1-04: Staff tenta ver relatório de comissão de outro
- **Comportamento:** RLS filtra automaticamente — retorna apenas dados próprios. UI nunca expõe dados de outros.

---

## RLS

- `appointments` SELECT: liberado para todos da mesma barbearia (via `user_id`)
- `appointments` UPDATE/DELETE: liberado para todos da mesma barbearia (qualquer staff pode editar/cancelar)
- `finance_records` SELECT para staff: apenas `WHERE professional_id = team_member_id do staff logado`
- `products` / `inventory` SELECT: liberado para todos; INSERT/UPDATE/DELETE: apenas owner

---

## Arquivos Impactados

| Arquivo | Ação | Motivo |
|---|---|---|
| `pages/Dashboard.tsx` | MODIFICAR | Expandir visão do staff (faturamento líquido, botão agendamento) |
| `components/StaffEarningsCard.tsx` | **CRIAR** | Card de faturamento líquido do staff |
| `components/sidebar/` ou `App.tsx` | MODIFICAR | Esconder links de menu para rotas bloqueadas |
| `App.tsx` ou route guards | MODIFICAR | Adicionar redirect + toast para rotas financeiras |
| `pages/Agenda.tsx` | VERIFICAR | Confirmar que staff já pode criar/editar para colegas |
