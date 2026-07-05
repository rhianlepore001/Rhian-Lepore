# Persona 02 — Colaborador / Staff

> **Fontes**: PRODUCT.md, GLOSSARY.md, comparativo de mercado (Trinks Profissional, AppBarber Pro, Booksy), reviews em App Store, regras de domínio A2-A5.

---

## Quem é

**Nome fictício**: **Lucas Oliveira**, 26 anos.

**Perfil**: barbeiro profissional. Trabalha na barbearia do Marcos (Persona 01). Pode ser contratado CLT ou comissionado puro. Atende 6-10 clientes por dia. Tem agenda cheia ou razoável, depende do mês.

**Idade central**: 22-35 anos. **É mobile-first de verdade** — vive no celular. Acorda, abre Instagram, atende cliente, olha a agenda no celular entre um corte e outro, responde WhatsApp, dorme.

**Estilo de vida**: trabalha em pé, com as mãos ocupadas. Às vezes com a luva cheia de creme. Às vezes entre um cliente e outro, 5-10 minutos de descanso. **NÃO vai abrir notebook.** Touch é a interface.

**Tom de comunicação**: gíria leve, sem forçar. "Beleza, agendamento das 14h confirmado." "Fechou." "Tô indo." Informal, direto.

---

## O que ele faz no dia (jornada típica)

```
08:00  Acorda, vê se tem cliente novo na agenda
08:30  Chega na barbearia
09:00  Atende 1º cliente (corte)
09:30  Confere próximo, vê horário
10:00  Atende 2º cliente (barba)
10:30  Confirma com o cliente se é degradê ou não (olha nota no app)
...
17:00  Atende último
17:30  Confere o que ganhou no dia
18:00  Vai pra casa
```

**Tela mais aberta do dia**: `/meu-dia` (mobile, agenda do dia) e `/minha-comissao` (mobile).

**O que ele NÃO faz**:
- Não senta no notebook
- Não configura comissão
- Não cadastra serviço
- Não vê relatório mensal

---

## O que ele ODEIA

1. **Botão pequeno.** "Tô com luva, não consigo clicar nesse botão de 32px."
2. **Modal central que não escapa.** "Bati fora sem querer, e agora?"
3. **"Configurações" no caminho principal.** "Eu só quero ver a agenda de hoje, não mexer em config."
4. **Tema claro com texto cinza-claro.** "Não consigo ler no sol."
5. **Muitos cliques até "Confirmar atendimento".** "Já tô com o cliente na cadeira, são 5min pra confirmar?"
6. **Sistema lento.** "Travou no meio do atendimento, vergonha na frente do cliente."
7. **Confusão entre "minha agenda" e "agenda da barbearia".** "Sou eu ou é a equipe toda?"
8. **Ver comissão de outro funcionário.** "Por que eu tô vendo quanto o Bruno fez?"
9. **Versão web no celular.** "O site é pesado, abre 2x mais lento que o app."
10. **Cadência de notificação errada.** "Receber notificação 1h antes é bom. Receber 1min antes é pior que nada."

---

## O que ele AMA

1. **"Você" como label.** "Tô vendo a agenda, aparece 'Você' nos meus horários. Claro, é minha."
2. **Botão grande de "Confirmar atendimento".** "Cliente tá na cadeira, 1 toque pra confirmar."
3. **Minha comissão do dia, na hora.** "Já fiz R$ 144 hoje. Tá no app."
4. **Pull-to-refresh.** "Puxo pra baixo e a agenda atualiza."
5. **Tema dark por padrão.** "Celular no bolso, sol na cara, é dark que salva."
6. **Notificação 1h antes.** "Já me organizo, não esqueço."
7. **Histórico do cliente no card.** "Ele gosta de degradê médio, sem risco. Tá na nota."
8. **Fila digital visível.** "Tem 2 caras esperando. Vou acelerar."
9. **Cliente que avisa que vai atrasar.** "Veio o aviso, deu tempo de encaixar outro."
10. **Reagendamento pelo cliente.** "Cliente desmarcou, o horário liberou. Outro já marcou."

---

## Frases literais (de reviews e marketing)

- *"Acompanhar agenda, comissões, outras funcionalidades operacionais"* — AppBarber Pro marketing
- *"A ajuda que você precisava na gestão do seu salão de beleza, barbearia, clínica de estética ou qualquer outro negócio de beleza, saúde e bem-estar"* — Trinks Profissional marketing
- *"Crie ou edite um serviço de beleza, como: unha, cabelo e barba agendado na própria agenda"* — Trinks Profissional
- *"Somente administradores podem cadastrar ou editar os dados do profissional, definir comissões e visualizar a carteira de todos os profissionais"* — Trinks Profissional
- *"The professionalism is impeccable and I receive new clients through the app"* — Booksy barber review
- *"Booksy is always ahead of the curve, constantly offering better tools to grow my business"* — Booksy barber review

**Padrão**: profissional quer **o mínimo necessário** pra fazer o trabalho dele. Não quer "potencializar", quer **"tô com o cliente na cadeira, 1 toque pra confirmar"**.

---

## Diferença crucial: Colaborador vs Dono

| Aspecto | Dono (Marcos) | Colaborador (Lucas) |
|---|---|---|
| Vê agenda de quem? | Equipe toda | Só a dele (ou da equipe, sem detalhe) |
| Vê comissão? | De todos | Só a dele |
| Vê faturamento? | Sim (geral) | Não |
| Vê relatório mensal? | Sim | Não |
| Pode cadastrar serviço? | Sim | Não |
| Pode excluir conta? | Sim | Não (sai da empresa, não deleta) |
| Tela padrão | Dashboard | Meu dia |
| Mobile vs Desktop | Mobile 80% / Desktop 20% (relatórios) | Mobile 100% |

**Regra derivada (B6 do `regras-dominio.md`)**: staff só vê a própria agenda e comissões. Não vê faturamento geral nem outros funcionários. (pendente confirmação pelo agente 06)

---

## Como a auditoria usa essa persona

- **Agente 01 (UI)**: a home do colaborador mostra "Seu dia" com botões grandes? Mobile 375px tá thumb-zone? Modal vira sheet?
- **Agente 02 (copy)**: o tom é informal sem forçar? "Beleza", "fechou", "tá marcado"? Ou é "Confirme seu agendamento" (frio)?
- **Agente 03 (fluxo)**: do login até "Confirmar atendimento", quantos cliques? Se > 3, é fricção invisível.
- **Agente 04 (design system)**: tokens funcionam em tela pequena? Touch target ≥ 48dp?
- **Agente 06 (domínio)**: o que o staff vê vs o que o dono vê? Vazamento de dado?

---

## O que essa persona prioriza na sprint

1. **P0**: vê só o que é dele (não vê faturamento, não vê comissão de colega)
2. **P0**: pode confirmar atendimento em 1 toque (mobile 375px, thumb zone)
3. **P1**: vê comissão atualizada em tempo real
4. **P1**: vê histórico do cliente na agenda (nota sobre preferência)
5. **P1**: notificação 1h antes funciona
6. **P1**: tema dark por padrão no mobile
7. **P2**: pull-to-refresh funciona
8. **P2**: empty state quando não tem cliente
9. **P3**: copy, microcopy, polimento
