# Métricas do Negócio por Persona: Dono, Barbeiro e Colaborador

> Análise aprofundada do ponto de vista de quem usa o AgendiX no dia a dia.
> Foco especial na **Taxa de Ocupação**, métrica crítica para barbearias.

## 1. Taxa de Ocupação: a métrica central

### Definição

A **taxa de ocupação** mede o quanto da capacidade disponível de atendimento está realmente sendo usada.

**Fórmula base:**
```
Taxa de Ocupação = (Horários Ocupados / Horários Disponíveis) × 100
```

**Fórmula por profissional:**
```
Taxa de Ocupação do Barbeiro = (Horários com Agendamento / Horários de Trabalho) × 100
```

**Fórmula por negócio:**
```
Taxa de Ocupação da Barbearia = Σ(Horários Ocupados) / Σ(Horários Disponíveis de Todos os Profissionais) × 100
```

### Por que é importante

- **Dona/gerente**: decide se precisa contratar, demitir, abrir mais horários ou fazer promoções.
- **Barbeiro/colaborador**: sabe se está produzindo o suficiente para bater metas pessoais.
- **Concorrentes**: AppBarber, Booksy e Vagaro já mostram essa métrica de forma nativa.

### Benchmarks

| Faixa | Interpretação |
|-------|---------------|
| < 50% | Crítico — muito tempo ocioso, prejuízo ou quebra |
| 50-70% | Abaixo do ideal — espaço para crescer |
| 70-85% | Saudável — bom equilíbrio |
| 85-95% | Muito bom — próximo da capacidade máxima |
| > 95% | Saturation — risco de atrasos, burnout, perda de clientes |

### Variações importantes

1. **Ocupação por dia da semana** — sábado costuma ser 95%, terça 40%.
2. **Ocupação por horário** — manhã vs noite.
3. **Ocupação por profissional** — quem precisa de mais clientes.
4. **Ocupação por serviço** — serviços de maior ticket ocupam mais tempo.
5. **Ocupação real vs planejada** — considera no-shows e cancelamentos.

---

## 2. Persona: Dono da Barbearia

### O que o dono precisa ver toda manhã (dashboard)

| Métrica | Já existe no AgendiX? | Prioridade |
|---------|----------------------|------------|
| Faturamento do dia | Sim | Alta |
| Taxa de ocupação do dia/semana/mês | **Não** | **Alta** |
| Agenda de hoje | Sim | Alta |
| Horários vagos críticos (próximos 7 dias) | **Não** | Alta |
| Comissões pendentes | Sim | Alta |
| Ticket médio | Sim (insights) | Alta |
| Taxa de cancelamento/falta | **Não** | Alta |
| Receita perdida por no-shows | **Não** | Média |
| Receita por profissional | Sim (comissões) | Média |
| Receita por serviço/categoria | Parcial (serviço campeão) | Média |
| Taxa de recorrência de clientes | Sim | Média |
| Clientes em risco de churn | Sim | Média |
| LTV do cliente | **Não** | Média |
| Custo de aquisição de cliente (CAC) | **Não** | Média |
| Margem de lucro | **Não** | Média |
| Previsão de faturamento do mês | **Não** | Baixa |
| Produtos mais vendidos | **Não** | Baixa |
| Taxa de conversão de leads/marketing | **Não** | Baixa |

### Métricas faltantes que os concorrentes já têm

- **Booksy**: Stats & Reports com revenue by staff, occupancy rate, no-show protection impact.
- **Vagaro**: Dashboard widgets customizáveis com occupancy, utilization, payroll, marketing ROI.
- **AppBarber**: Relatórios gerenciais com taxa de ocupação, financeiro, estoque.
- **BestBarbers**: Resultados por barbeiro, assinaturas, totem.

### Oportunidade de diferenciação

Nenhum concorrente brasileiro parece fazer bem:
- **Comparativo de ocupação entre filiais** (multi-unidade).
- **Sugestão automática de campanhas** para preencher horários vagos.
- **Ocupação por tipo de cliente** (novo vs recorrente).
- **Alerta de queda de ocupação** por profissional.

---

## 3. Persona: Barbeiro / Colaborador

### O que o barbeiro precisa ver no app

| Métrica | Já existe no AgendiX? | Prioridade |
|---------|----------------------|------------|
| Agenda do dia | Sim | Alta |
| Faturamento do dia (dele) | Parcial | Alta |
| Taxa de ocupação pessoal | **Não** | **Alta** |
| Meta pessoal de faturamento | **Não** | Alta |
| Comissões a receber | Sim | Alta |
| Ticket médio pessoal | **Não** | Média |
| Clientes que voltaram com ele | **Não** | Média |
| Serviço mais pedido (dele) | **Não** | Média |
| Tempo médio de atendimento real | **Não** | Média |
| Avaliações/reviews recebidas | **Não** | Média |
| Ranking interno da equipe | **Não** | Baixa |

### Perspectiva do colaborador

> "Eu quero saber se estou cheio o suficiente para pagar minhas contas no fim do mês."

A **taxa de ocupação pessoal** é a métrica mais importante para o barbeiro, mais até que faturamento bruto. Um barbeiro pode faturar R$ 8.000/mês, mas se trabalha 12h por dia todos os dias, está esgotado. Outro pode faturar R$ 6.000 em 8h/dia — e é mais sustentável.

### Exemplo de card para o barbeiro

```
Sua Ocupação Hoje
████████░░ 80%
8 de 10 horários preenchidos

Meta pessoal: R$ 450/dia
Realizado: R$ 320
Faltam: R$ 130 (2 cortes)
```

---

## 4. Persona: Cliente Final

### O que o cliente gostaria de ver (app de agendamento)

| Métrica/Info | Por que importa |
|--------------|----------------|
| Tempo de espera estimado | Evita chegar cedo demais |
| Avaliação do profissional | Escolhe com confiança |
| Serviços mais populares | Descobre novos serviços |
| Promoções baseadas em horários vagos | Benefício real |
| Histórico de cortes | Lembra do último serviço |
| Pontos de fidelidade | Incentiva retorno |

---

## 5. Matriz de métricas: Concorrentes vs AgendiX

| Métrica | AppBarber | Booksy | Vagaro | BestBarbers | AgendiX |
|---------|-----------|--------|--------|-------------|---------|
| Taxa de ocupação | ✅ | ✅ | ✅ | ✅ | ❌ |
| Horários vagos críticos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Taxa de cancelamento/falta | ✅ | ✅ | ✅ | ✅ | ❌ |
| Receita perdida (no-shows) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Ticket médio | ✅ | ✅ | ✅ | ✅ | ✅ |
| LTV do cliente | ❌ | ✅ | ✅ | ✅ | ❌ |
| CAC | ❌ | ✅ | ✅ | ❌ | ❌ |
| Receita por profissional | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receita por serviço | ✅ | ✅ | ✅ | ✅ | Parcial |
| Recorrência | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clientes em risco | ❌ | ✅ | ✅ | ✅ | ✅ |
| Produtos mais vendidos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Margem de lucro | ❌ | ✅ | ✅ | ❌ | ❌ |
| Tempo médio de atendimento | ✅ | ✅ | ✅ | ✅ | ❌ |
| Meta de ocupação por profissional | ✅ | ✅ | ✅ | ❌ | ❌ |
| Previsão de faturamento | ❌ | ✅ | ✅ | ✅ | ❌ |
| Payroll/folha | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ocupação por filial | ❌ | ✅ | ✅ | ❌ | ❌ |

---

## 6. Oportunidades de inovação (onde ninguém domina)

1. **Taxa de ocupação ajustada por ticket médio**
   - Um horário ocupado com corte de R$ 80 vale mais que um de R$ 30.
   - Criar "Ocupação Financeira": `(Receita Real / Receita Máxima Possível) × 100`.

2. **Alerta inteligente de queda de ocupação**
   - "Sua ocupação de terças caiu 15% no último mês. Criar campanha de desconto para terças?"

3. **Simulador de cenários**
   - "Se você aumentar a ocupação de 60% para 75%, seu faturamento sobe R$ X/mês."

4. **Ocupação por canal de agendamento**
   - Quanto vem do app, WhatsApp, Instagram, walk-in.

5. **Ocupação por tipo de cliente**
   - Novo vs recorrente: novos clientes costumam ocupar horários de maior valor?

6. **Comparativo entre profissionais com privacidade**
   - Dono vê ranking completo; barbeiros veem apenas a própria posição.

---

## 7. Recomendações de implementação para o AgendiX

### Fase 1 — Must-have (dashboard)

1. **Card Taxa de Ocupação no Dashboard**
   - Hoje / semana / mês
   - Por profissional
   - Comparativo com período anterior

2. **Card Horários Vagos Críticos**
   - Próximos 7 dias com baixa ocupação
   - Botão de ação: criar campanha

3. **Taxa de Ocupação no Insights (`/insights`)**
   - Histórico mensal
   - Por profissional
   - Por dia da semana / horário

### Fase 2 — Financeiro e operacional

4. Taxa de cancelamento e faltas
5. Receita perdida por no-shows
6. Tempo médio de atendimento real vs planejado
7. LTV do cliente

### Fase 3 — Colaborador

8. Dashboard do barbeiro (`/meus-insights`) com ocupação pessoal
9. Meta pessoal de faturamento
10. Ranking interno (visível apenas para quem autorizar)

### Fase 4 — Diferenciais

11. Ocupação Financeira (ajustada por ticket)
12. Simulador de cenários
13. Sugestão automática de campanhas para horários vagos

---

## 8. Referências

- Booksy Business Blog: "Salon Performance Metrics: 6 KPIs for Spa, Salon & Barbershop Success"
- Barber Doza: "5 KPIs to Measure Success for Barbers"
- The Barber Supplier: "Important Barber Shop KPIs You Should Be Tracking"
- AppBarber: vídeos no TikTok/Instagram sobre "Como Calcular a Taxa de Ocupação"

*Documento complementar ao `design-review-competitors.md`.*
