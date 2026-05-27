# Lacunas Identificadas (Gaps) — agendix

> Gerado pelo Reversa Revisor em 2026-05-06
> Nível: Detalhado
> Categorização por severidade: Crítico / Moderado / Cosmético

---

## Crítico (bloqueiam reimplementação ou causam inconsistência de dados)

### G1 — Dual Onboarding System Não Sincronizado
- **Spec afetada:** `sdd/onboarding.md`, `sdd/auth.md`
- **Descrição:** Login verifica apenas `business_settings.onboarding_completed` (wizard legado). Se owner completou wizard novo (`onboarding_progress.is_completed=true`) mas legado está `false`, entra em loop de redirect.
- **Impacto:** Usuário preso em loop de onboarding mesmo após completar.
- **Mitigação sugerida:** Sincronizar flags ou depreciar wizard legado.
- **Confiança:** 🟢

### G2 — Transação Não-Atômica na Finalização da Fila
- **Spec afetada:** `sdd/agenda.md`, `sdd/queue.md`
- **Descrição:** Finalização da fila cria appointment e finance_record em operações client-side separadas. Se a segunda falha, fica com appointment Completed sem registro financeiro.
- **Impacto:** Dados inconsistentes — atendimento concluído sem receita/comissão.
- **Mitigação sugerida:** Mover para RPC atômica com BEGIN/COMMIT.
- **Confiança:** 🟢

### G3 — Transação Não-Atômica no Checkout (Fallback)
- **Spec afetada:** `sdd/agenda.md`
- **Descrição:** Fallback client-side do checkout faz UPDATE + INSERT separadamente. Mesmo risco de G2.
- **Impacto:** Appointment completed sem finance_record.
- **Mitigação sugerida:** Fallback deve ser uma única RPC ou transação.
- **Confiança:** 🟢

---

## Moderado (funcionam mas têm riscos ou comportamentos não documentados)

### G4 — Staff Filtra Financeiro por Nome (não por ID)
- **Spec afetada:** `sdd/finance.md`, `sdd/staff-team.md`
- **Descrição:** Staff filtra transações por `professionalName === fullName`. Sem validação de unicidade de nome.
- **Impacto:** Staff com mesmo nome que outro vê transações de ambos.
- **Mitigação sugerida:** Filtrar por `professional_id` (teamMemberId).
- **Confiança:** 🟢

### G5 — Memória Semântica Sem Limite de Retenção
- **Spec afetada:** `sdd/clients-crm.md`, `sdd/ai-assistant.md`
- **Descrição:** `client_semantic_memory` cresce indefinidamente sem política de retenção.
- **Impacto:** Degradação de performance e custo de storage.
- **Mitigação sugerida:** Implementar limite de registros por cliente ou rotação.
- **Confiança:** 🟢

### G6 — Lógica do Loyalty Tier Não Encontrada
- **Spec afetada:** `sdd/clients-crm.md`
- **Descrição:** Cálculo de tier (Bronze→Platinum) não encontrado no frontend. Pode estar em RPC ou trigger.
- **Impacto:** Impossível reimplementar lógica de tier sem acesso ao código server-side.
- **Mitigação sugerida:** Documentar fórmula ou localizar RPC/trigger.
- **Confiança:** 🔴

### G7 — Critérios do Data Maturity Score Não Documentados
- **Spec afetada:** `sdd/dashboard.md`
- **Descrição:** Pesos de cada fator do score não encontrados no frontend. Cálculo está na RPC.
- **Impacto:** Impossível reimplementar score sem acesso à fórmula.
- **Mitigação sugerida:** Documentar fórmula ou localizar RPC.
- **Confiança:** 🔴

### G8 — Comissão com Múltiplos Profissionais Não Documentada
- **Spec afetada:** `sdd/finance.md`, `sdd/staff-team.md`
- **Descrição:** Se agendamento tem múltiplos profissionais, como comissão é dividida?
- **Impacto:** Lacuna na regra de negócio financeira.
- **Mitigação sugerida:** Documentar comportamento.
- **Confiança:** 🔴

### G9 — Edição de Booking Sobrescreve Appointment Histórico
- **Spec afetada:** `sdd/agenda.md`, `sdd/public-booking.md`
- **Descrição:** Se cliente edita booking e owner aceita, faz UPDATE no appointment original. Se cliente já foi atendido, dados históricos mudam.
- **Impacto:** Perda de histórico de agendamentos anteriores.
- **Mitigação sugerida:** Criar novo appointment e manter original como histórico.
- **Confiança:** 🟢

### G10 — Dev Route Guard vs Owner Route Guard
- **Spec afetada:** `sdd/settings.md`, `sdd/security-audit.md`
- **Descrição:** settings.md lista 10 sub-páginas mas não deixa claro quais são devOnly. security-audit.md menciona DevRouteGuard mas não OwnerRouteGuard.
- **Impacto:** Confusão no mapeamento de permissões.
- **Mitigação sugerida:** Explicitar quais rotas são devOnly.
- **Confiança:** 🟢

---

## Cosmético (não afetam funcionalidade, mas podem ser melhorados)

### G11 — Portfólio Público Não Confirmado
- **Spec afetada:** `sdd/staff-team.md`
- **Descrição:** `/pro/:slug` marcado como 🟡 INFERIDO. Não confirmado se está em produção.
- **Impacto:** Baixo — funcionalidade não essencial.
- **Mitigação sugerida:** Confirmar com usuário.
- **Confiança:** 🟡

### G12 — Dia de Acerto no Dia 31
- **Spec afetada:** `sdd/finance.md`, `sdd/settings.md`
- **Descrição:** `commission_settlement_day` aceita 1-31. Comportamento em meses com < 31 dias não documentado.
- **Impacto:** Baixo — caso de borda raro.
- **Mitigação sugerida:** Documentar fallback (último dia do mês).
- **Confiança:** 🟡

### G13 — Appointments Overdue
- **Spec afetada:** `sdd/agenda.md`
- **Descrição:** Não há regra de negócio documentada para quando agendamento se torna "overdue".
- **Impacto:** Baixo — estado é classificação visual, não persistida.
- **Mitigação sugerida:** Documentar tolerância (se houver).
- **Confiança:** 🟡

### G14 — Fila — Cliente Pode Entrar Múltiplas Vezes
- **Spec afetada:** `sdd/queue.md`
- **Descrição:** Não há verificação de duplicata na fila. Cliente pode ter múltiplas entradas.
- **Impacto:** Baixo — owner pode gerenciar manualmente.
- **Mitigação sugerida:** Adicionar verificação por telefone.
- **Confiança:** 🟢

### G15 — Fila — Timeout de "Calling" Não Implementado
- **Spec afetada:** `sdd/queue.md`
- **Descrição:** Entrada em `calling` fica indefinidamente se owner não atender.
- **Impacto:** Baixo — owner pode chamar novamente.
- **Mitigação sugerida:** Adicionar timeout (ex: 5 min).
- **Confiança:** 🟢

---

## Resumo por Severidade

| Severidade | Quantidade |
|------------|------------|
| Crítico | 3 |
| Moderado | 7 |
| Cosmético | 5 |
| **Total** | **15** |

---

*Gerado pelo Reversa Revisor em 2026-05-06. Nível: Detalhado.*
