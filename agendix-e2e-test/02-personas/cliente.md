# Persona 03 — Cliente Final

> **Fontes**: comparativo de mercado (AppBarber Cliente, Booksy Cliente, Trinks.com), App Store / Play Store reviews, expectativas de mercado (74% prefere agendar pelo celular — Opinion Box), regras de domínio G1-G4.

---

## Quem é

**Nome fictício**: **Camila Ferreira**, 29 anos.

**Perfil**: cliente da barbearia do Marcos. Vai cortar cabelo a cada 3-4 semanas. Já tem o barbeiro de confiança (Lucas). Marca pelo WhatsApp ou app. Às vezes liga. Prefere não ligar.

**Idade central**: 20-45 anos. **Mobile-first absoluto**. Tem WhatsApp, Instagram, talvez iFood. Não tem paciência pra site lento.

**Estilo de vida**: trabalha, tem rotina corrida. Quer resolver em 3 toques. "Quero meu horário, no dia que eu quero, com o barbeiro que eu confio."

**Tom de comunicação**: objetivo, sem floreio. "Corte + barba, sábado 14h, com o Lucas." "Mudei pra sexta 16h, pode ser?"

---

## O que ela faz (jornada típica)

### Cenário 1 — Cliente recorrente
```
Dia -7: "Tá na hora de cortar de novo"
Dia -7: Abre o link público / app do cliente
Dia -7: Vê o histórico (último corte foi há 4 semanas)
Dia -7: Toca "Marcar igual"
Dia -7: Escolhe data/horário disponível
Dia -7: Confirma
Dia -7: Recebe confirmação por WhatsApp
Dia -1: Recebe lembrete ("amanhã 14h com Lucas")
Dia 0:  Chega 5min antes, é atendido, paga (PIX ou cartão)
```

### Cenário 2 — Cliente novo (veio por Instagram)
```
Dia 0:  Vê post do barbeiro, "marca pelo link"
Dia 0:  Clica no link
Dia 0:  Vê perfil do barbeiro, avaliações, serviços
Dia 0:  Escolhe "Corte + barba"
Dia 0:  Escolhe "Lucas"
Dia 0:  Escolhe "Sábado 14h"
Dia 0:  Preenche nome + telefone (mínimo)
Dia 0:  Recebe confirmação por WhatsApp
Dia 0:  Salva o contato da barbearia
```

### Cenário 3 — Reagendamento
```
Dia -1: Lembrete: "amanhã 14h"
Dia -1: Cliente lembra que tem reunião
Dia -1: Abre app, toca no agendamento, escolhe "Reagendar"
Dia -1: Escolhe nova data
Dia -1: Confirma nova data
Dia -1: Sistema libera horário antigo
```

### Cenário 4 — No-show (não vai e não avisa)
```
Dia 0:  Cliente não aparece
Dia 0:  Barbeiro marca como "no_show" ou "completed" (varia por sistema)
Dia ?:  Cliente lembra, pede desculpa
Dia ?:  Marca de novo
```

---

## O que ela ODEIA

1. **Site pesado que demora pra abrir.** "Já desisti, vou ligar."
2. **App que pede download.** "Não vou baixar app só pra cortar cabelo."
3. **App que pede cadastro antes de mostrar agenda.** "Primeiro deixa eu ver se tem horário."
4. **Muitos passos até confirmar.** "Já cliquei 5 vezes, ainda não confirmei?"
5. **Confirmação por SMS (não WhatsApp).** "SMS é 2005, ninguém lê."
6. **Não conseguir reagendar.** "Tenho que cancelar e remarcar? Não dá pra trocar?"
7. **Não receber lembrete.** "Esqueci. Perdi o horário."
8. **Não saber quem vai atender.** "É com o Lucas ou com quem?"
9. **Receber promoção genérica.** "Salve 50% em qualquer serviço" não me interessa se eu sempre faço o mesmo.
10. **Pagamento forçado adiantado.** "Quero pagar no local, sem taxa."

---

## O que ela AMA

1. **Link público sem login.** "Clicou, viu horário, marcou. Sem cadastro."
2. **Histórico claro.** "Meu último corte foi há 4 semanas. Tá lá."
3. **"Book again" em 1 toque.** "Mesmo corte, mesmo barbeiro, próxima data disponível."
4. **Reagendamento em 2 toques.** "Não vou poder sábado, troca pra sexta."
5. **Lembrete por WhatsApp 1h antes.** "Acabei esquecendo, valeu o aviso."
6. **Ver avaliação do barbeiro.** "Lucas tem 4.9 estrelas em 200 avaliações. Confio."
7. **Ver portfólio do barbeiro.** "Ele tem foto de cortes parecidos com o que eu quero."
8. **PIX como pagamento opcional.** "Se quiser, paga antes. Se não, paga lá."
9. **Confirmação instantânea.** "Confirmado. Sábado 14h, corte + barba com Lucas."
10. **Salvar o barbeiro como favorito.** "Sempre marco com o mesmo."

---

## Frases literais (de reviews e marketing)

- *"Skip the phone tag and back-and-forth DMs. With Booksy, your next appointment is just a tap away."* — Booksy
- *"Tap away. Reschedule or cancel directly in the app in seconds."* — Booksy
- *"It also keeps track of all of your past appointments so you can literally just click 'book again', then change the appropriate time & date if need be."* — App Store Booksy
- *"Agendar seu horário, gravar lembretes, receber notícias e promoções, receber mensagens de retorno, responder a pesquisa de satisfação, avaliar a barbearia, consultar histórico, pagar online"* — AppBarber Cliente
- *"74% dos consumidores brasileiros preferem agendar serviços pelo celular"* — Opinion Box, citado por Barbeiro.app
- *"I prefer to just book with the app and pay cash in person"* — Play Store Booksy (frustração)

---

## Regra derivada (cross-ref `regras-dominio.md`)

| Regra | Implicação pro Agendix |
|---|---|
| **G1** — UNIQUE(business_id, phone) | Cliente não duplica se cadastrar 2x. Bom. |
| **G2** — `public_clients` espelha em `clients` | Cliente do app público vira cliente do CRM sem o dono precisar cadastrar. Bom. |
| **G3** — `loyalty_tier` | Fidelidade existe. Auditar se aparece no app do cliente. |
| **G4** — churn detectado | Cliente sumido. Auditar se o dono recebe sugestão de reativação. |

**Regra nova (a confirmar)**: cliente pode **cancelar sem política rígida**, mas se a política for "24h antes sem cobrança", o sistema tem que mostrar isso na hora do cancelamento.

---

## Como a auditoria usa essa persona

- **Agente 01 (UI)**: o link público (`/#/agendar/:slug`) é mobile-first? Carrega em < 3s? Tem preview antes do login?
- **Agente 02 (copy)**: o tom é "você, cliente" ou "Schedule / Book now"? Tem "caro cliente" (formal demais) ou "ei, beleza!" (informal demais)?
- **Agente 03 (fluxo)**: do clique no link até confirmar, **3 cliques**? Se > 5, é fricção invisível.
- **Agente 04 (design system)**: o tema do produto reflete a barbearia? Cliente vê cor de marca? Ou vê "mais um app genérico"?
- **Agente 06 (domínio)**: cliente público espelha em cliente CRM? Tem UNIQUE por telefone? Política de cancelamento é configurável?

---

## O que essa persona prioriza na sprint

1. **P0**: link público carrega rápido, mobile-first, sem cadastro pra ver agenda
2. **P0**: reagendar em 2 toques
3. **P0**: cancelar com política clara
4. **P0**: lembrete por WhatsApp 1h antes
5. **P1**: histórico visível com "book again" em 1 toque
6. **P1**: avaliação do barbeiro / barbearia
7. **P1**: PIX opcional (não obrigatório)
8. **P2**: portfólio do barbeiro
9. **P2**: salvar barbeiro favorito
10. **P3**: copy, microcopy, polimento
