# Persona 01 — Dono / Owner

> **Fontes**: PRODUCT.md, DECISIONS.md, GLOSSARY.md, comparativo de mercado (AppBarber, Trinks, Booksy, Barbeiro.app), frases literais de donos reais em Instagram/TikTok/YouTube/ReclameAqui.

---

## Quem é

**Nome fictício**: **Marcos Pereira**, 38 anos.

**Perfil**: dono de barbearia de bairro (zona sul de SP ou interior, 1-3 unidades), 3-8 anos no negócio. Antes era barbeiro, agora administra. Tem 2-4 funcionários. Faturamento R$ 15-30k/mês. Não é programador, não é designer. Celular na mão o dia todo.

**Idade central**: 30-45 anos. Pode ser mais novo (25-30, "barbeiro influencer") ou mais velho (45-55, "dono tradicional").

**Estilo de vida**: trabalha 10-12h/dia, 6 dias por semana. Atende clientes, gerencia equipe, paga contas, fecha mês. Pouco tempo pra aprender software novo. Tem WhatsApp aberto o dia todo. Usa Instagram pra marketing.

**Tom de comunicação**: direto, sem enrolação. "Manda o relatório do mês", "quanto entrou hoje?", "tem cliente esperando?". Não fala "potencialize", "transforme", "agregue valor". Fala "fechou?", "deu?", "tá no sistema?".

---

## O que ele faz no dia (jornada típica)

```
07:00  Acorda, abre a barbearia (se tiver unidade física)
08:00  Verifica agenda do dia no celular
09:00  Atende clientes
12:00  Almoço rápido (geralmente na própria barbearia)
13:00  Atende mais
17:00  Verifica faturamento parcial do dia ("quanto entrou?")
18:00  Atende últimos clientes
19:00  Fecha caixa, fecha comanda do dia, confere comissão dos funcionários
20:00  Vai pra casa, mas fica de olho no WhatsApp
22:00  Posta story no Instagram, responde cliente

Eventual: fechamento de mês, contratação/demissão, expansão (2ª unidade)
```

**Tela mais aberta do dia**: `/agenda` (mobile) e `/reports` (notebook, fim do mês).

**O que ele NÃO faz**:
- Não lê tutorial
- Não assiste vídeo de 10min explicando feature
- Não muda tema dark/light pensando "ah, vou testar"
- Não aceita "precisa configurar 5 coisas antes" sem ter motivo

---

## O que ele ODEIA

1. **Perder tempo aprendendo software.** "Já tenho que fechar mês, não vou ler manual."
2. **Língua estrangeira na interface.** "Schedule" / "Book now" / "Sign in" = lixo. Tem que ser pt-BR.
3. **Dashboard genérico de SaaS.** Big number + sparkline + 3 cards idênticos. "Isso aqui é pra quê?"
4. **Confusão entre ele (dono) e o funcionário (staff).** "Quando eu olho a agenda, por que aparece meu nome e não 'Você'?"
5. **Sistema perguntando o que ele já sabe.** "Você é o dono?" — ele clicou em 'cadastrar', então é dono. Não pergunta.
6. **Sistema calculando comissão pra ele.** "Eu sou o dono, eu ganho o lucro. Por que tem 40% de comissão na minha linha?"
7. **No-show sem aviso.** "Perdi 1h porque o cliente não apareceu e ninguém avisou."
8. **Cancelamento de conta difícil.** Se ele decidir fechar a barbearia, tem que conseguir encerrar tudo e exportar dados.
9. **"Potencialize", "transforme", "agregue valor".** Linguagem de coach, não de software.
10. **Tema lavado, cor cinza-azulada, ícone sem propósito.** "Parece que o sistema é pra escritório, não pra barbearia."

---

## O que ele AMA

1. **Ver o faturamento do dia em 1 olhar.** "Tá no sistema: R$ 2.847 hoje. Beleza."
2. **Comissão automática.** "O Bruno fez 8 cortes hoje, 8x45 = R$ 360, 40% = R$ 144 dele. Tá lá, sem eu calcular."
3. **Lembretes automáticos por WhatsApp.** "Reduziu no-show de 25% pra 8% em 2 meses. Valeu o sistema."
4. **Histórico do cliente.** "O João veio em maio, julho, setembro. Tá sumido. Manda mensagem."
5. **Relatórios que fecham o mês em 5min.** "Faturamento, despesa, comissão de cada um, ticket médio. Tá lá, fecho o mês."
6. **Tema dark brutal** (versão barber). "Parece barbearia, não Excel."
7. **Onboarding curto.** "Cadastrei, configurei 1 serviço, cadastrei 1 barbeiro, agendei o primeiro cliente em 5 minutos."
8. **Cancelar/excluir conta em 1 clique.** "Fechou a barbearia, exportei tudo, deletei. Sem dor."
9. **"Book again"** do cliente. "Cliente antigo volta sozinho, sem eu precisar lembrar."
10. **Status de tela claro.** "Tô carregando, deu erro, deu certo, sem permissão. Sei onde estou."

---

## Frases literais (de donos reais)

- *"Otimize seu tempo"* — AppBarber marketing
- *"Fidelize seu cliente"* — AppBarber marketing
- *"Aumente seu faturamento"* — AppBarber marketing
- *"Aumente seu movimento em até 40%"* — AppBarber marketing
- *"O problema não é falta de cliente. Muitas vezes é falta de ação."* — Instagram
- *"Se os clientes não estão voltando, o problema não é falta de divulgação, é falta de gestão."* — TikTok
- *"Primeiro: se todo fechamento de mês vira conferência, ajuste e barbeiro reclamando de valor, é sinal que o teu sistema não está te ajudando de jeito nenhum."* — Instagram
- *"Minha barbearia vivia o estresse da agenda manual, com sumiço de cliente"* — Instagram
- *"GESTÃO da BARBEARIA de forma SIMPLES"* — YouTube (canal "Seu Elias", 41K views)
- *"Não possuo CNPJ. Posso utilizar? Sim. Tanto PJ quanto PF."* — AppBarber FAQ
- *"Teste grátis 30 dias sem compromisso"* — AppBarber marketing

---

## Como a auditoria usa essa persona

- **Agente 01 (UI)**: o que essa pessoa vê primeiro na tela `/dashboard`? É faturamento? É agenda? É ação? Hierarquia tá clara?
- **Agente 02 (copy)**: o tom é o de "parceiro que entende de barbearia" ou "SaaS genérico americano traduzido"? Tem "potencialize" / "transforme"?
- **Agente 03 (fluxo)**: do clique "cadastrar" até o 1º agendamento, quantos cliques? (Benchmark AppBarber: trial 30d + 3 passos.) Se > 10 cliques, é fricção invisível.
- **Agente 04 (design system)**: o tema barber reflete o nicho? "Mais um dashboard genérico" = P1.
- **Agente 06 (domínio)**: tem regra de "dono não recebe comissão"? Tem "registro = sempre dono"? Tem LGPD (excluir conta)?

---

## O que essa persona prioriza na sprint

1. **P0**: lifecycle (cancelar, excluir, fechar empresa)
2. **P0**: vazamento entre tenants (ele é dono, vê dado de outra empresa = P0)
3. **P0**: comissão do dono NÃO é calculada (regra A4 do `regras-dominio.md`)
4. **P1**: comissão de funcionário aparece corretamente
5. **P1**: dashboard com faturamento do dia em 1º plano
6. **P1**: onboarding < 5min até 1º agendamento
7. **P1**: tema barber reflete o nicho
8. **P2**: relatórios mensais com fechamento
9. **P3**: copy, microcopy, polimento visual
