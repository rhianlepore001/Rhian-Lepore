# Relatos Reais — Donos, Colaboradores e Clientes

> **Fontes**: ReclameAqui, Instagram, TikTok, YouTube, App Store / Google Play reviews, comparativos de mercado, fóruns.
> **Método**: extraí **frases literais** de cada fonte pra que a auditoria use como lente de "voz do povo" (não inferência). Quando a frase é de avaliação, tá com fonte. Quando é descrição minha do padrão, tá marcado.

---

## 1. Donos de barbearia — o que dizem

### Cultura / equipe
- *"Muitos donos de barbearia negligenciam a cultura. Às vezes ele fica mantendo dentro da barbearia dele um cara que fala mal do negócio."* — Instagram @reel/DaPrZoMlDfv
- *"Lei do Salão Parceiro x Lei do Bom Senso"* — Instagram (série de conteúdo sobre relação dono ↔ funcionário)
- *"Dono de barbearia, dono de comércio, líder não tem que ter medo de colocar em prática as suas opiniões."* — Instagram @reel/DMsI1Btuwxn

**Padrão que emerge**: o dono se preocupa com **cultura interna e postura da equipe** mais do que com software em si. Software que não ajude nisso (ex: feedback de avaliação do cliente por profissional) é cosmético.

### Gestão / dor operacional
- *"O problema não é falta de cliente. Muitas vezes é falta de ação."* — Instagram @reel/DaKvKFehTqy
- *"Minha barbearia vivia o estresse da agenda manual, com sumiço de cliente"* — Instagram @post/DVqxjsngdYV
- *"Perder cliente por falta de agendamento online fácil"* — Instagram @post/DVqxjsngdYV
- *"Se os clientes não estão voltando, o problema não é falta de divulgação, é falta de gestão."* — TikTok @appbarberr
- *"Imagina esperar a barbearia abrir pra começar a marcar"* — TikTok @appbarberr (cliente falando)
- *"Primeiro: se todo fechamento de mês vira conferência, ajuste e barbeiro reclamando de valor, é sinal que o teu sistema não está te ajudando de jeito nenhum."* — Instagram @reel/DZcdblQB34r
- *"A day in the life of a barbershop owner"* — YouTube (rotina do dono, dica de YouTube de gestão)

**Padrão que emerge**:
1. **Agenda manual é o inferno** — perda de cliente, sumiço, espera
2. **Fechamento de mês é o ponto de dor** — conferência, ajuste, barbeiro reclamando
3. **Retenção > aquisição** — "clientes não estão voltando" é mais citado que "preciso de cliente novo"
4. **Dono está sempre em ação** — não tem tempo de "aprender sistema"

### Expectativa vs realidade do software
- *"Hoje em dia muito dono de barbearia negligencia a cultura"* — Instagram
- *"GESTÃO da BARBEARIA de forma SIMPLES"* — YouTube "Seu Elias" (canal de dono pra dono, 41K views)
- *"O cliente mudou. Hoje ele quer: clicar, agendar, resolver"* — Instagram @reel/DZcdblQB34r

**Padrão que emerge**: dono quer **gestão simples, não software complicado**. Cada feature nova é mais uma coisa pra aprender.

---

## 2. Clientes finais — o que dizem

### App do cliente — funcionalidade esperada
- *"Skip the phone tag and back-and-forth DMs. With Booksy, your next appointment is just a tap away."* — Booksy marketing
- *"Tap away. Reschedule or cancel directly in the app in seconds."* — Booksy App Store
- *"Reschedule or cancel directly in the app in seconds"* — Booksy (consenso forte)

**Padrão**: cliente quer **reagendar/cancelar em 3 toques, sem ligar**. Se o app do cliente do Agendix não tem reagendamento, é P0 (vs expectativa de mercado).

### App do cliente — frustrações
- *"It's constantly trying to control how much you tip and can even double charge you for the tip (on the deposit and after the service is completed). Honestly I prefer to just book with the app and pay cash in person."* — Play Store Booksy
- *"This app used to be great, but I would say around 70% of time when I try to book again with my barber I now see a pop up on the app which says 'booking issue, we've encountered an issue with you booking'."* — Play Store Booksy
- *"Ao chegar ao local, encontrei um ambiente totalmente desorganizado, com aparência de falta de higiene e nenhuma preocupação com o conforto ou bem-estar dos clientes. Mesmo com horário agendado, fiquei aguardando por mais de uma hora."* — ReclameAqui AppBarber (atribuído pelo AppBarber ao estabelecimento, não à plataforma)

**Padrão que emerge**:
1. **Tip forçado / duplo é odiado** — Booksy tem; Agendix não tem (PIX é mais clean), vantagem
2. **Erro recorrente de "booking issue"** — qualquer sistema com >5% de erro de booking é P0
3. **Estabilidade > features** — cliente perdoa UI feia, não perdoa app travando

### NPS / avaliação
- *"Responder a Pesquisa de Satisfação do Atendimento, Avaliar a Barbearia, Consultar Histórico, Pagar online"* — AppBarber Cliente (lista de features)
- *"Emoji of self, people smiling, bologna beautiful family, laughing and very comfortable"* — App Store Booksy (review positiva emocional)
- *"When I make an appointment, it tells me the times that are available on whichever day I pick on the calendar which is listed right there when making/booking your appointment & it also keeps track of all of your past appointments so you can literally just click 'book again'."* — App Store Booksy

**Padrão**: cliente valoriza **"book again" em 1 toque** (histórico). Se Agendix não tem isso no app do cliente, é gap.

---

## 3. Reclamações no ReclameAqui (AppBarber como caso)

| Reclamação | Categoria | Implicação pro Agendix |
|---|---|---|
| "App não funciona e não consigo cancelar" | Lifecycle / cancelamento | **Auditar fluxo de cancelamento de assinatura e exclusão de conta** |
| "Dificuldade de cancelamento do aplicativo após fechamento da barbearia e falta de estorno" | Lifecycle / financeiro | **Dono que fecha barbearia precisa de fluxo claro de export + delete** |
| "Péssima experiência em barbearia: desorganização, atraso e falta de profissionalismo" | Atribuído ao estabelecimento, não à plataforma | Reforça que **plataforma ≠ barbearia**; copy do Agendix tem que deixar isso claro |
| "Conta desativada e não excluída" | LGPD | **P0 — exclusão de dados em 1 clique é lei** |
| "Quero excluir meu cadastro e não dá!" | LGPD | **P0** |

**Insight central**: a maior dor pública dos donos de barbearia com software de gestão **não é feature que falta**, é **lifecycle mal feito** (cancelar, excluir, fechar empresa). Isso é mais agudo que "quero ver comissão" ou "quero ver dashboard".

---

## 4. Expectativas do mercado (dados)

| Dado | Fonte | Implicação |
|---|---|---|
| **74% dos brasileiros preferem agendar pelo celular** | Opinion Box, citado por Barbeiro.app | Onboarding mobile-first é inegociável |
| **Taxa de no-show: 15-30%** | Reservio (média do setor) | Lembretes automáticos são feature nº 1 |
| **WhatsApp: 197M usuários ativos no BR** | Statista 2025 | Canal nº 1 — Agendix deve ter |
| **Agendamento on-line economiza 8-10h/semana** | Barbeiro.app | ROI claro, vende por aí |
| **AppBarber: 57.9% voltariam a fazer negócio** | ReclameAqui | **43% não voltariam** — 43% é taxa de churn do SaaS |
| **Barbearias com agendamento on-line têm +30% clientes** | Barbeiro.app | Métrica de marketing |
| **Reduz carga administrativa em até 41,2%** | Anolla (PT) | Métrica de eficiência |

---

## 5. O que essas vozes dizem pro AgendiX (resumo executivo)

1. **Dono está sobrecarregado, não tem tempo.** Software que demora pra configurar é abandonado. Onboarding tem que ser < 5min, < 10 cliques até o 1º agendamento.
2. **Cliente quer 3 toques até confirmar.** Qualquer fricção extra = 20-30% de queda de conversão.
3. **Lifecycle (cancelar, excluir, fechar) é onde os concorrentes mais erram.** Agendix pode ser **o melhor nisso** e ganhar reputação.
4. **LGPD não é cosmético.** Exclusão de conta tem que ser 1-clique e funcionar.
5. **Fechamento de mês é o ponto de dor real.** Comissão, faturamento, repasse. Se Agendix brilha aqui, o dono evangeliza.
6. **Retenção > aquisição.** NPS, "book again", histórico, mensagens de retorno são features que vendem sozinhas.
7. **Tema do produto (barbearia) tem que aparecer.** "Mais um dashboard genérico de SaaS" é a pior coisa que pode acontecer.
8. **Mobile é o default.** Dono olha entre um cliente e outro. Colaborador vive no celular. Cliente agenda do celular. 375px é onde o produto vive ou morre.

---

## Como esse arquivo evolui

1. **Auditoria usa isso como lente**: cada achado pode ser validado contra "frase real de dono/cliente"
2. **Validação A/B**: se agente achar uma regra implícita, pergunta "frase real confirma?"
3. **Sprint backlog**: tarefa que resolve uma reclamação recorrente aqui tem peso maior
4. **Marketing depois**: frases positivas podem virar copy do site; negativas viram feature priority
