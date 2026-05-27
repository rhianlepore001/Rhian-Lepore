# Perguntas para Validação — agendix

> Gerado pelo Reversa Revisor em 2026-05-06
> Nível: Detalhado

---

## Instruções

Responda cada pergunta no campo **Resposta** abaixo.
Quando terminar, digite `reversa` para que eu processe as respostas e atualize as specs.

---

## Q1 — Dual Onboarding System (Crítico)

**Problema:** Login verifica apenas `business_settings.onboarding_completed` (wizard legado). Se um owner completou o wizard novo (`onboarding_progress.is_completed=true`) mas o legado está `false`, o sistema entra em loop de redirect para `/onboarding`.

**Pergunta:** Como você quer resolver isso?
- [ ] Depreciar wizard legado e fazer login verificar `onboarding_progress.is_completed`
- [ ] Sincronizar ambos (quando um marca completo, marca o outro também)
- [ ] Manter como está (aceitar o loop como bug conhecido)
- [ ] Outro: __________

**Resposta:**
Depreciar o wizard legado como fonte de verdade e fazer o login verificar `onboarding_progress.is_completed`. Durante a transição, sincronizar ambos os campos para evitar loop em contas existentes. Fonte canônica: `onboarding_progress.is_completed`; `business_settings.onboarding_completed` fica apenas como compatibilidade temporária.

---

## Q2 — Transação Não-Atômica na Fila (Crítico)

**Problema:** Ao finalizar atendimento da fila, o sistema cria `appointment` e `finance_record` em duas operações separadas no client-side. Se a segunda falha (timeout, rede), fica com appointment `Completed` mas sem registro financeiro — comissão não é calculada e receita não aparece no relatório.

**Pergunta:** Existe plano para mover essa lógica para uma RPC atômica (BEGIN/COMMIT)?
- [ ] Sim, em andamento
- [ ] Não, comportamento aceitável
- [ ] Não havia percebido, vou corrigir
- [ ] Outro: __________

**Resposta:**
Não havia sido tratado corretamente; deve ser corrigido. A finalização da fila deve ir para uma RPC atômica com transação única: criar/buscar cliente, criar appointment `Completed`, criar `finance_record`, calcular comissão e atualizar `queue_entries` dentro do mesmo fluxo no banco. Se qualquer etapa falhar, tudo deve fazer rollback.

---

## Q3 — Staff Filtra Financeiro por Nome (Moderado)

**Problema:** Staff vê transações financeiras filtrando por `professionalName === fullName` no frontend. Se dois profissionais tiverem o mesmo nome, staff vê transações de ambos. Não há validação de unicidade de nome em `team_members`.

**Pergunta:** É intencional? Existe validação de nome único por empresa?
- [ ] Sim, nomes devem ser únicos (validação no banco)
- [ ] Não, é aceitável ver de outros com mesmo nome
- [ ] Deveria filtrar por `professional_id` (teamMemberId) em vez de nome
- [ ] Outro: __________

**Resposta:**
Deve filtrar por `professional_id` / `teamMemberId`, nunca por nome. Nome não é identificador confiável. Não deve haver dependência de unicidade de nome para segurança ou visibilidade financeira.

---

## Q4 — Memória Semântica Sem Limite (Moderado)

**Problema:** `client_semantic_memory` cresce indefinidamente (sem política de retenção). Cada registro tem embedding 768d. Isso pode degradar performance e aumentar custo de storage.

**Pergunta:** Qual política de retenção você deseja?
- [ ] Manter todos os registros indefinidamente
- [ ] Limitar a N registros por cliente (ex: 50)
- [ ] Arquivar/rotacionar após X meses
- [ ] Não se aplica (pouco volume esperado)
- [ ] Outro: __________

**Resposta:**
Limitar a quantidade de registros por cliente. Política inicial recomendada: manter no máximo 50 memórias semânticas ativas por cliente, priorizando as mais recentes/relevantes. Registros antigos devem ser arquivados ou removidos após 12 meses sem uso, dependendo do custo e volume real.

---

## Q5 — Portfólio Público do Profissional (Cosmético)

**Problema:** O portfólio público (`/pro/:slug`) foi marcado como 🟡 INFERIDO na spec. Não encontramos confirmação direta no código de que está em produção.

**Pergunta:** O portfólio público está ativo em produção?
- [ ] Sim, está ativo
- [ ] Não, ainda não implementado
- [ ] Foi implementado mas desativado
- [ ] Outro: __________

**Resposta:**
Está implementado no código pela rota `/pro/:slug`, mas deve ser tratado como funcionalidade beta/não essencial até validação em produção. Confirmar como "implementado, porém ainda precisa validação de uso real em produção".

---

## Q6 — Data Maturity Score (Moderado)

**Problema:** Os critérios exatos de cálculo do Data Maturity Score (peso de cada fator: agendamentos, idade da conta, bookings públicos, etc.) não foram encontrados no frontend. O cálculo é feito na RPC `get_dashboard_stats`.

**Pergunta:** Você tem acesso à fórmula exata do score?
- [ ] Sim, está documentada em outro lugar
- [ ] Não, foi criada empiricamente
- [ ] Não me lembro, preciso verificar
- [ ] Outro: __________

**Resposta:**
Sim. A fórmula está na RPC `get_dashboard_stats`, especialmente na migration `20260321_clarify_dashboard_revenue.sql`. Fórmula atual:
- até 20 pontos por total de agendamentos: `appointments_total >= 10 ? 20 : appointments_total * 2`
- até 20 pontos por agendamentos no mês: `appointments_this_month >= 5 ? 20 : appointments_this_month * 4`
- 20 pontos se houver pelo menos 1 agendamento concluído no mês
- 20 pontos se houver public bookings
- até 20 pontos por idade da conta: `account_days_old >= 30 ? 20 : account_days_old`
Score final limitado a 100.

---

## Q7 — Loyalty Tier (Moderado)

**Problema:** A lógica exata de cálculo do Loyalty Tier (Bronze→Silver→Gold→Platinum) não foi encontrada no frontend. Pode estar em RPC ou trigger.

**Pergunta:** Você sabe onde está essa lógica?
- [ ] Sim, em uma RPC específica
- [ ] Sim, em um trigger no banco
- [ ] Sim, calculado no frontend (não encontramos)
- [ ] Não sei, preciso verificar
- [ ] Outro: __________

**Resposta:**
Sim, está calculado no frontend em `utils/tierSystem.ts`. Regra atual:
- Bronze: 0-5 visitas
- Silver: 6-15 visitas
- Gold: 16-30 visitas
- Platinum: 31+ visitas

Observação: há inconsistência de idioma no código, pois alguns pontos usam `Prata` enquanto o tipo espera `Silver`. Isso deve ser padronizado.

---

## Q8 — Comissão com Múltiplos Profissionais (Moderado)

**Problema:** Se um agendamento tem múltiplos profissionais (ex: corte + barba com profissionais diferentes), como a comissão é dividida? A spec não encontrou essa lógica.

**Pergunta:** Como funciona comissão com múltiplos profissionais no mesmo agendamento?
- [ ] Cada profissional recebe comissão sobre o serviço que executou
- [ ] Apenas o profissional principal recebe comissão
- [ ] Não é suportado (1 profissional por agendamento)
- [ ] Outro: __________

**Resposta:**
Não é suportado hoje. O modelo atual considera 1 profissional principal por agendamento via `appointments.professional_id`. A comissão é calculada para esse profissional sobre o valor/base do agendamento. Para múltiplos profissionais, seria necessário modelar serviços por profissional, por exemplo uma tabela `appointment_services` com `service_id`, `professional_id`, `price` e `commission_rate`.

---

## Q9 — Dia de Acerto no Dia 31 (Cosmético)

**Problema:** `commission_settlement_day_of_month` aceita 1-31. Se configurado como 31 e o mês tem 30 dias (ou fevereiro), o comportamento não está documentado.

**Pergunta:** Como o sistema deve comportar-se quando o dia de acerto não existe no mês?
- [ ] Usa o último dia do mês
- [ ] Usa o dia 1 do mês seguinte
- [ ] Não permite configurar dia 31
- [ ] Outro: __________

**Resposta:**
Usar o último dia válido do mês. Se o dia configurado for 31 e o mês tiver 30 dias, o acerto ocorre no dia 30. Em fevereiro, ocorre no dia 28 ou 29. Essa regra evita pular acertos para o mês seguinte.

---

## Q10 — Appointments Overdue (Cosmético)

**Problema:** A spec não encontrou regra de negócio para quando um agendamento se torna "overdue" (passou do horário sem ser completado/cancelado). Apenas comparação com `new Date()` ou há tolerância?

**Pergunta:** Existe tolerância para agendamentos atrasados? (ex: considera overdue após 15 min do horário)
- [ ] Sim, tolerância de ___ minutos
- [ ] Não, considera overdue imediatamente após o horário
- [ ] Não há conceito de overdue no sistema
- [ ] Outro: __________

**Resposta:**
Hoje o sistema considera overdue imediatamente após `appointment_time < now` para status `Confirmed` ou `Pending`, sem tolerância. Regra desejada: adicionar tolerância de 15 minutos para evitar alertas prematuros. Um agendamento só deve ser considerado atrasado se passou mais de 15 minutos do horário marcado sem ser concluído ou cancelado.

---

*Respostas processadas e incorporadas às specs em 2026-05-17.*
