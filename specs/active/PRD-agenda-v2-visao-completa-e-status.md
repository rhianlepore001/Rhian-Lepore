# PRD — Agenda v2 (Visão completa + Status visuais + Filtro por colaborador)

**Tipo:** PRD (Product Requirements Document)
**Destino:** handoff para `Claude Code` criar a SPEC técnica depois
**Data:** 2026-06-20
**Autor:** Rhian Lepore (com apoio de Hermes/Bob)
**Status:** RASCUNHO — pronto pra revisão

---

## 1. Contexto e problema

A tela de Agenda atual (`pages/Agenda.tsx`) tem três fricções reais que aparecem no uso diário da barbearia:

1. **Zoom da grade muito aberto** — pra ver um dia completo o dono precisa dar scroll vertical extenso. Em mobile (375px) o grid fica ilegível, com colunas cortadas e exige scroll horizontal duplo (data strip + avatares de profissionais).
2. **Dois carrosséis de scroll lateral empilhados** (date strip na linha 1123 + avatares de profissionais na linha 1157) — competem pela mesma área da tela, confundem o gesto do usuário e ocupam ~160px verticais que poderiam ser da grade.
3. **Lógica de histórico confusa** — não existe critério claro do que vira "histórico". O dono não consegue distinguir, olhando a agenda, quais agendamentos já foram concluídos, quais estão atrasados sem confirmação e quais simplesmente não aconteceram. Toda essa informação existe nos dados (`status` + `appointment_time` + `services.duration_minutes`), mas a UI não comunica.

Pior: **um colaborador (staff) hoje pode ver todos os agendamentos de todos os profissionais ao mesmo tempo** (`teamMembers` é listado sem filtro por role na linha 1167). Isso viola privacidade operacional — o barbeiro não precisa ver faturamento, dados de clientes ou agenda do dono. A R27 do módulo já documenta o filtro por `professional_id`, mas a UI não aplica pra staff.

---

## 2. Objetivos (o que esse PRD precisa entregar)

### Objetivo 1 — Ver o dia inteiro, de uma vez
A grade precisa caber na viewport do celular (375×667) sem scroll vertical, ou com scroll mínimo. Isso significa:
- Reduzir altura do slot pra caber 12h (8h–20h) em ~6 telas
- Remover um dos dois carrosséis horizontais (unificar)
- Manter legibilidade: nome do cliente, serviço, hora e status visíveis no bloco

### Objetivo 2 — Status visíveis em código de cor
O dono olha a grade e responde em <2s: "quem já atendi? quem está atrasado? quem faltou?". Cada status vira uma cor consistente em TODO o app (não só na agenda):

| Status visual | Cor | Significado |
|---|---|---|
| Verde | `#10B981` (emerald-500) | Concluído — atendimento finalizado com sucesso |
| Amarelo | `#F59E0B` (amber-500) | Por confirmar — passou o tempo estimado do serviço desde o horário marcado, mas ninguém marcou como concluído |
| Cor padrão | tema da barbearia | Estado normal — agendamento confirmado, dentro do horário |
| Cinza/Marrom escuro | `#57534E` (stone-600) | Não compareceu — cliente não apareceu |
| Vermelho | `#EF4444` (red-500) | Cancelado |

Bônus: badge pequeno "Editado" no canto do card se o agendamento foi alterado após criação.

### Objetivo 3 — Histórico como continuação, não como arquivo separado
**Decisão validada:** ao virar o dia, o dia anterior permanece visível na grade (acessível pelo date strip), contendo TODOS os agendamentos — confirmados, concluídos, cancelados, no-show. Não há "limpar" nem "mover pra histórico". O histórico é o passado, acessível pelo calendário. A distinção é só visual: status colorido deixa claro o que aconteceu.

### Objetivo 4 — Filtro de colaborador consciente do role
- **Owner:** continua vendo todos por padrão, pode filtrar pra um ou poucos (mantém comportamento atual).
- **Staff:** vê APENAS os seus agendamentos por padrão. Pode **incluir** outros colaboradores visualizando (scroll lateral nos avatares, multi-select), mas a regra é: nunca "todos de uma vez" sem o próprio.

Justificativa: em fluxo real de barbearia, um barbeiro pode precisar confirmar um agendamento que o parceiro esqueceu de marcar como concluído. O PRD permite isso sem expor a agenda completa.

---

## 3. Histórias de usuário

### H1 — Dono vê o dia completo
> Como **dono de barbearia**, quero abrir a agenda e ver o dia inteiro (8h–20h) de todos os meus profissionais em uma tela só, sem precisar ficar scrollando pra cima e pra baixo, pra ter visão geral do fluxo do dia.

**Critério de aceitação:**
- Em viewport mobile 375×667, o grid cobre pelo menos 8h visíveis sem scroll vertical
- Em viewport desktop 1280×800, o grid cobre 12h visíveis

### H2 — Dono identifica status por cor
> Como **dono de barbearia**, quero olhar a grade e identificar em 2 segundos quais clientes já foram atendidos, quais estão atrasados sem confirmação, e quais não apareceram, pra priorizar ações.

**Critério de aceitação:**
- Concluído = verde
- Atrasado (passou tempo estimado + 15min sem status) = amarelo
- Cancelado = vermelho
- No-show = cinza/marrom
- Editado = badge "Editado" visível no card
- Cores consistentes em agenda, dashboard e detalhes

### H3 — Staff vê seus agendamentos, pode incluir outros
> Como **colaborador (barbeiro)**, quero abrir o app no celular e ver só os meus agendamentos do dia, com opção de incluir colegas pra confirmar algo específico, sem nunca ver a agenda de todos ao mesmo tempo.

**Critério de aceitação:**
- Default: staff vê só os seus
- Multi-select de outros colaboradores via scroll lateral nos avatares
- Nunca habilitado "Todos" como botão único pro staff
- Owner mantém o "Todos" disponível

### H4 — Histórico acessível pelo calendário
> Como **dono de barbearia**, quero ver o que aconteceu no dia 14 de junho (por exemplo) sem perder o contexto, e distinguir visualmente quem compareceu, quem faltou, quem cancelou, sem precisar entrar em cada agendamento.

**Critério de aceitação:**
- Navegar pro dia passado via date strip mostra os mesmos blocos com cores de status
- Nada some do banco
- Modal de detalhes continua acessível

### H5 — UX mobile sem scroll horizontal duplo
> Como **usuário mobile (qualquer role)**, quero usar o app sem confusão de gestos, sem dois carrosséis competindo, com data strip e avatares em um único componente horizontal.

**Critério de aceitação:**
- Único scroll horizontal na área de navegação (data + profissionais juntos OU sobrepostos)
- Sem perda de funcionalidade

---

## 4. Fora de escopo (explícito)

Pra evitar scope creep, essas coisas **não entram** neste PRD:

- ❌ Refatorar RLS, RPCs ou schema do banco
- ❌ Mexer no AppointmentWizard, CheckoutModal ou AppointmentEditModal
- ❌ Adicionar novos status no banco (vamos usar o que já existe)
- ❌ Internacionalização de mensagens
- ❌ Notificações push ou e-mail baseadas em status
- ❌ Integração WhatsApp
- ❌ Real-time subscription novo
- ❌ Exportação CSV/PDF do histórico
- ❌ Métricas/dashboard novo (as cores é que vão pra dashboard, mas não se cria dashboard novo)

Se algum desses virar prioridade, é PRD separado.

---

## 5. Dependências e premissas

**Premissas validadas:**
- ✅ Status `Completed`, `Cancelled` já existem no enum do banco
- ✅ `services.duration_minutes` já existe e é populado
- ✅ R27 (staff vê só os seus) já está documentada mas não aplicada na UI
- ✅ Date strip com 7 dias já existe
- ❓ Status `NoShow` — **validar se existe no enum do banco** ou se precisa migration. Se não existir, manter o uso de `Cancelled` com `notes='Não compareceu'` como fallback (decisão da SPEC técnica).

**Dependências externas:**
- Nenhuma. Tudo é refactor de UI + possível pequena migration de enum.

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Em telas com muitos profissionais (>8), grade fica apertada | Média | Médio | Largura mínima por coluna + scroll horizontal já existente |
| Staff reclama de não ver "tudo" (UX cultural) | Baixa | Baixo | Onboarding explica o filtro; atalho "incluir parceiro" é óbvio |
| Cor amarela confunde com "pendente" já existente | Média | Médio | SPEC técnica decide se "atrasado" é novo status ou subestado de Pending |
| Performance com 50+ agendamentos no mesmo dia | Baixa | Baixo | Posicionamento absoluto é performático; sem re-render caro |
| Migration de enum quebrar RLS existente | Baixa | Alto | Testar com usuário real antes (padrão do AGENTS.md) |

---

## 7. Critérios de aceite globais (Definition of Done)

- [ ] Em viewport 375×667, abrir agenda de um dia com 5+ profissionais mostra pelo menos 8h visíveis sem scroll vertical
- [ ] Carrossel horizontal único (não dois empilhados)
- [ ] Cada status tem cor distinta e consistente em agenda + detalhes
- [ ] Staff sem filtro vê só os seus; nunca vê "Todos" como opção
- [ ] Staff pode adicionar colegas via multi-select
- [ ] Dia anterior continua visível com cores de status (não some, não vira "arquivo")
- [ ] Badge "Editado" aparece em agendamentos com `updated_at > created_at`
- [ ] Sem regressão em booking público, fila digital, checkout, wizard
- [ ] Testes E2E cobrem: filtros por role, cores por status, navegação histórica
- [ ] Mobile first: validar em Chrome Android antes de merge

---

## 8. Métricas de sucesso (pós-launch)

Como o AgendiX está em validação inicial, métricas são mais qualitativas:

- **Qualitativa:** donos relatam "consigo ver o dia todo de uma olhada" em pesquisa de satisfação (NPS ou entrevista quinzenal)
- **Quantitativa (leve):** tempo médio gasto na página de agenda por sessão (evento `page_view` → `page_leave` do Supabase Analytics) — meta: **redução de 30%** vs baseline pré-feature
- **Suporte:** zero tickets sobre "não consigo ver minha agenda" nas 2 primeiras semanas

---

## 9. Perguntas em aberto (pra SPEC responder)

A SPEC técnica vai precisar decidir:

1. **`NoShow` é novo status no enum ou usamos `Cancelled` com flag?**
   - Sugestão: criar enum se for simples; se já existe, usar.
2. **"Atrasado" é auto-detectado ou manual?**
   - PRD atual: amarelo = auto (passou `appointment_time + duration_minutes + 15min` sem mudança de status)
   - Alternativa: marcar manualmente no modal de detalhes
3. **Edição gera `updated_at > created_at` ou flag específica?**
   - Sugestão: usar `updated_at` que já existe por default no Supabase
4. **Cores no tema beauty (claro) são as mesmas?**
   - PRD assume: mesma cor base, ajustar opacidade se contraste ficar ruim
5. **`Faturado` vs `Completed` são sinônimos?**
   - R11 diz que `complete_appointment` vira status `Completed`. Verde = Completed. Sem `Faturado` separado.

---

## 10. Próximos passos

1. **Rhian:** revisar este PRD, ajustar pontos em aberto se necessário
2. **Rhian (você mesmo):** abrir Claude Code, entregar este PRD + acesso ao repo, pedir a SPEC técnica baseada no template `specs/_template.md` (ou similar)
3. **Claude Code:** gerar SPEC com decisões técnicas, plano de tasks TDD, schema changes, mocks
4. **Rhian + Hermes (Bob):** revisar a SPEC, quebrar em tasks executáveis
5. **Hermes:** executar task por task com subagentes (1 task = 2 reviews: spec compliance + code quality)

---

*PRD finalizado. Entregar este arquivo ao Claude Code como insumo para a SPEC.*
