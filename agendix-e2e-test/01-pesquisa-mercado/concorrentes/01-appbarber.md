# AppBarber — Benchmark de produto

> **Fonte principal**: `appbarber.com.br` (site oficial) + ReclameAqui + comparativos de mercado. Atualizado em 2026-07-05.
>
> **Por que esse doc é importante**: AppBarber é o **benchmark nº 1 do mercado BR de barbearias**. Tem 5+ anos de mercado, 41 reclamações no ReclameAqui, base instalada grande, módulos web + app do cliente + app do profissional. Tudo que o AgendiX precisa mirar (e superar) na primeira versão.

---

## Visão geral

**AppBarber** — "Uma nova experiência para uma antiga tradição". Sistema de gestão on-line para barbearias, com agendamento, agenda, equipe, financeiro, marketing e fidelidade.

**Módulos**:
- **WebAdmin** (dono): gestão completa, controle profissional, histórico, estoque, relatórios, nuvem
- **App do Profissional**: agenda, comissões, operacional
- **App do Cliente** (grátis, iOS + Android): agendar, promoções, lembretes, retorno, NPS, histórico, pagar online

**Localização/equipe**: Chapecó/SC, Brasil (STARAPP SISTEMAS LTDA ME)

**Slogan de marketing**: "Aumente seu movimento em até 40%" + "Teste grátis 30 dias sem compromisso"

---

## Onboarding (jornada 0-1 do dono)

| Etapa | Como AppBarber faz | Implicação pro AgendiX |
|---|---|---|
| **Cadastro** | Formulário simples: nome, email, telefone, CNPJ (opcional — aceita PF também) | Agendix tem `/#/register` — auditar se aceita PF |
| **Onboarding wizard** | "Passo a passo inicial" (sem detalhes públicos de quantos steps) | Auditar se AgendiX tem wizard guiado ou joga o dono na dashboard |
| **Trial** | 30 dias grátis, **sem limitação de funcionalidade** | Diferencial forte — auditar se Agendix segue essa linha |
| **Setup do time** | "Meus profissionais têm acesso ao sistema? Sim, com restrições definidas pelo gestor" | Sugere que staff tem login separado + permissões granulares |
| **Primeiro agendamento** | Sem fricção: já vem com calendário configurado, dono só cadastra serviço + profissional | Auditar tempo até o 1º agendamento real |

**Frase literal do FAQ que importa**: *"Não possuo CNPJ. Posso utilizar? Sim. Tanto PJ quanto PF."* — acessibilidade que muitos concorrentes não têm.

---

## Features-chave (pra cruzar com Agendix)

### ✅ Features que o AppBarber tem e AgendiX deve ter (core)

- [x] Agendamento on-line
- [x] Agenda por profissional
- [x] Comissões, vales e comandas
- [x] Controle de estoque
- [x] Relatórios financeiros
- [x] Pacotes de serviços e produtos
- [x] Lembrete de horários (cliente)
- [x] Mensagens de retorno automáticas
- [x] Programa de fidelidade
- [x] Envio de notícias e promoções
- [x] Aniversariantes
- [x] Lista de espera (fila)
- [x] Pesquisa de satisfação (NPS)
- [x] Clube de clientes
- [x] Site do estabelecimento
- [x] Pagamento on-line

### 🚩 Features que o AppBarber tem e AgendiX pode ter ou não (verificar)

- [ ] **Módulo Fiscal** (NF-e) — AppBarber oferece; Agendix não menciona
- [ ] **Aplicativo Próprio white-label** — AppBarber vende isso
- [ ] **Revenda** (white-label pro revendedor) — AppBarber oferece
- [ ] **Comandas de consumo** (cliente consome produto durante serviço) — modelo tradicional de barbearia BR

### ❌ Features que o AppBarber **NÃO tem** explicitamente (oportunidade pro AgendiX)

- **Marketplace de clientes** (diferencial Trinks/Booksy)
- **Assinatura recorrente de cliente** (clube mensal) — só o Barbeiro.app tem
- **Insights / IA** (pós-MVP do Agendix segundo PRODUCT.md)
- **Multi-idioma** (PT-BR + PT-PT)

---

## Preço (referência de mercado)

| Profissionais | Regular | 15% off (anual?) | 30% off |
|---|---|---|---|
| 1 | R$ 79,90 | R$ 67,80 | R$ 55,90 |
| 2 a 5 | R$ 109,90 | R$ 93,30 | R$ 76,90 |
| 6 a 15 | R$ 164,50 | R$ 139,80 | R$ 115,15 |
| +15 | R$ 219,90 | R$ 186,80 | R$ 153,90 |

**Trial**: 30 dias grátis, **todas as funcionalidades, sem compromisso**.

**Comparativo rápido**:
- **Barbeiro.app**: R$ 49,90 Pro + tem **plano gratuito** (único com free tier funcional)
- **AppBarber**: R$ 79,90 (1 prof) — mais caro, mas mais funcionalidades (fiscal, white-label, revenda)
- **Trinks/Booksy**: preço em dólar / variável, mais caro no fim

---

## Reputação (ReclameAqui 2026)

| Indicador | Valor |
|---|---|
| Reputação | Regular |
| Nota média (6 meses) | **6.6/10** |
| Total de reclamações | 41 |
| Taxa de resposta | 100% |
| Taxa de resolução | 57.9% |
| Voltariam a fazer negócio | 57.9% |
| Tempo médio de resposta | 1 dia e 11 horas |
| Selo | RA Verificada |

**Problema recorrente crítico** (3 reclamações de 3 anos atrás até hoje): **dificuldade de cancelar/excluir conta**. Um usuário não consegue excluir cadastro — só desativa. Isso é **violação de LGPD** (Art. 18, direito de eliminação).

**Implicação pro AgendiX**:
- Auditar a tela de configurações/deletar conta — **o caminho de "excluir minha conta" tem que ser óbvio e funcionar**
- Considerar módulo de "Encerrar empresa" (dono fecha barbearia → exporta dados → deleta tudo)
- LGPD compliance não é cosmético, é requisito

---

## Tom de voz (microcopy)

**Slogan**: "Uma nova experiência para uma antiga tradição" — **premium com respeito à tradição**, sem ser cringe.

**Claims de marketing** (úteis pra benchmark):
- "Otimizar seu Tempo" → concreto, sem "potencialize"
- "Fidelizar seu Cliente" → direto
- "Aumentar seu Faturamento" → sem "transforme sua realidade"
- "Aumente seu movimento em até 40%" → **número específico, crível**

**Tom**: respeitoso, focado em resultado do dono, sem jargão de startup. Bem diferente do SaaS americano traduzido.

**Pessoa do marketing fala com o dono como parceiro, não como vendedor**. Isso é o que diferencia produto premium de commodity.

---

## Onde AppBarber é fraco (oportunidade pro AgendiX)

1. **Reclamações LGPD** — excluir conta é doloroso. Agendix pode fazer isso bem.
2. **Sem marketplace** — não atrai cliente novo. (Mas é uma faca de dois gumes: marketplace tira cliente do dono.)
3. **App do cliente é "mais um app"** — reclamação no ReclameAqui sobre experiência. Agendix tem a chance de fazer melhor.
4. **Preço alto pra 1 profissional** (R$ 79,90) — Barbeiro.app tá em R$ 49,90 e tem free tier.
5. **Sem assinatura recorrente pro cliente final** (clube mensal) — Barbeiro.app tem, Agendix pode ter.

---

## Cross-ref com regras de domínio do AgendiX

| Regra do Agendix (de `regras-dominio.md`) | O que AppBarber faz | Gap |
|---|---|---|
| A1 — Quem se cadastra é sempre o dono | Aceita dono + staff com restrições | OK, mas auditar fluxo |
| A4 — Dono não recebe comissão | Sistema de comissões por profissional | Auditar se filtra `is_owner` |
| B1 — Status: Pending → Confirmed → Completed/Cancelled | Máquina similar | Auditar compatibilidade |
| C1 — Conclusão gera finance_records automático | "Comissões, Vales e Comandas" | Provável OK |
| D1 — Fila: waiting → calling → serving → completed/cancelled/no_show | "Lista de Espera" | Auditar se tem `no_show` |
| H4 — Personalidade "elegante, confiável, eficiente" | "Premium com tradição" | Mesmo terreno, executar melhor |
| LGPD — exclusão de conta em 1 clique | **DOR CONHECIDA** | **P0 pra Agendix** |

---

## Insights pra personas

- **Dono**: quer ver "movimento +40%", "comissão automática", "fila andando", "controle de estoque". Não quer ver dashboard genérico de SaaS.
- **Colaborador**: quer ver "minha agenda", "minha comissão", "minhas avaliações". Mobile-first.
- **Cliente final**: quer ver "agendar em 3 cliques", "lembrete antes", "reagendar se não puder", "pagar online se quiser".
