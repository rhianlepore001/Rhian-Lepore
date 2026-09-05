# SPEC — Clube de Assinatura (Lion Claw discovery)

**Tarefa:** RASCUNHO · **Data:** 2026-09-05  
**Status:** discovery aberto — recomendações CTO abaixo; gray areas para fechar antes da sprint  
**Branch:** `cursor/discovery-clube-assinatura-cbdd`  
**Fontes:** `pages/JoinClub.tsx`, `pages/MembersList.tsx`, `pages/settings/MembershipPlansSettings.tsx`, `pages/settings/MembershipSettings.tsx`, `pages/Dashboard.tsx`, `pages/ClientCRM.tsx`, `pages/PublicBooking.tsx`, `pages/ClientArea.tsx`, `components/CheckoutModal.tsx`, `hooks/useSubscriptionDiscount.ts`, `services/memberships.ts`, `constants.ts`, `App.tsx`, `specs/active/SPEC-clube-assinatura-mvp1.md`, `docs/sprint-d1-pendencias.md`, `utils/businessCopy.ts`.

> **Formato Lion Claw:** discovery pergunta-resposta-investigação que força clareza antes de virar sprint. Sem SQL, sem PRD completo. Cada frente tem 4 lentes: (1) pedido literal, (2) estado atual, (3) decisões, (4) impacto.  
> **Quando virar sprint:** promover para `specs/active/clube-assinatura-v2/` com spec + context + tasks.

---

## 0. Contexto e veredito CTO

O clube **não é uma ideia**. É um módulo meio-construído: tabelas, RPCs públicos, Pix, confirmação manual, bypass no checkout e um card no Dashboard. O MVP1 (`SPEC-clube-assinatura-mvp1.md`, 29 Jun 2026) descreveu um produto de retenção + receita recorrente para barbearia. O D+1 chegou a ligar pedaços. **Nenhum dono encontra isso sozinho, e o caminho público que a UI ensina a compartilhar não funciona.**

**Veredito:** sua intuição está correta.

1. **Não está no menu.** `SETTINGS_ITEMS` não tem Clube nem Pix. Sidebar e bottom nav também não. Ajustes aponta "Assinatura" para o plano AgendiX (Stripe), não para o clube do cliente. O único jeito de chegar é URL direta, o card do Dashboard (que **só aparece se já existe assinante**) ou o atalho interno em Assinantes → Planos.
2. **Não está funcionando como produto.** O texto de ajuda manda compartilhar `/#/clube/[seu-slug]`. A rota real é `/#/clube` e o slug vem de **query string** (`?slug=`). `/#/clube/minha-barbearia` cai no catch-all e manda o cliente para o login/home. QR do passo "pagar" usa `txid` fixo `AGENDIX`; o registro persistido depois usa outro `txid`. Cores do QR são CSS variables — a lib espera hex. Limite mensal é campo de formulário e **não é aplicado** no checkout. Não há cron de vencimento: status `overdue` nunca nasce sozinho. Mensalidade confirmada **não vira receita** em `finance_records`.
3. **Não está bem construído para o job.** É um CRUD de planos + lista de status, não um fluxo de "fazer o cliente pagar todo mês e voltar". Falta converter no balcão, cobrar atrasado, mostrar no CRM, oferecer no booking, e um empty state que ensine o dono a ligar o clube.
4. **O motor serve salão.** O que é "barbearia" hoje é copy ("Corte Ilimitado"), Pix BR e o mito do ilimitado. Salão não quer coloração infinita — quer **pacote com teto** (4 manicures, 1 hidratação). O schema já tem `usage_limit_per_month`. Falta tratar isso como o produto, não como campo esquecido.

**Não reescrever do zero.** Reaproveitar plano + membership + Pix + checkout. Terminar o job. Empacotar o mesmo motor para os dois segmentos.

---

## 1. Jobs — o que o usuário alvo realmente quer

O clube não compete com Agenda. Agenda opera o dia. Clube **prende o cliente e suaviza a receita**.

```text
Dono liga o clube     → Pix + 1 plano + link que funciona
Cliente entra         → entende a oferta em 10s, paga, espera confirmação
Dono confirma         → 1 toque; dinheiro aparece no Financeiro
Operação do dia       → checkout não cobra o que o plano cobre
Todo mês              → dono vê quem vence / atrasou e cobra no WhatsApp
Salão (mesmo motor)   → plano com TETO de usos, não "ilimitado"
```

### 1.1 Dono de barbearia (persona original)

Frequência alta (corte 2–3 semanas). O plano "ilimitado" fecha a conta: o cliente vem mais, o dono trava a cadeira, o avulso perde para o clube do concorrente (BestBarbers / Barbeiro.app).

**Jobs**
- Criar 1–2 planos em poucos minutos (corte; corte+barba).
- Mandar o link no WhatsApp da clientela sem explicar o app.
- Saber quem pagou, quem disse que pagou, quem sumiu.
- No checkout, não passar vergonha cobrando de novo o corte incluso.
- Ver "R$ X/mês recorrente" no Início — é o número que justifica o clube.

**Dor se falhar:** cliente paga Pix, dono não acha a pendência, cliente chega e paga de novo (ou vai embora bravo).

### 1.2 Dono de salão / studio (persona a incluir)

Frequência menor e ticket maior. Coloração ilimitada **quebra margem**. O clube de salão no Brasil/PT é manutenção: unha, sobrancelha, hidratação, combo mensal com teto.

**Jobs (iguais no motor, diferentes na oferta)**
- Montar plano "4 manicures/mês" ou "unha + sobrancelha", não "Beleza Ilimitada".
- Travar a cliente na manutenção (15/30 dias), não na transformação (coloração, mega-hair).
- No checkout, o sistema recusar o 5º uso do mês e cobrar avulso sem drama.
- Comissão do profissional no atendimento de clube — salão vive de split; barbearia também, mas o salão sente mais. **Fora desta rodada** (já estava no D+ do MVP1).

**Dor se empacotarmos igual barbearia:** dona cria "ilimitado", estoura custo de produto/tempo, desliga o clube e nunca mais volta.

### 1.3 Cliente final (os dois segmentos)

- Entender o que está incluso **antes** de pagar.
- Pagar do jeito que já usa (Pix BR; no PT, MB Way / balcão — Pix não existe).
- Saber se está ativo, quando vence, o que ainda pode usar neste mês.
- Agendar sem discutir preço do que já está pago.

Hoje o cliente **não tem superfície** depois de enviar a solicitação: `ClientArea` ignora membership; booking público ignora o clube; não há "minha assinatura".

### 1.4 Colaborador

Não gerencia clube (domínio do gestor, igual CRM/Financeiro). Precisa **ver no checkout** que aquele cliente é assinante, para não cobrar errado e não passar vergonha. Hoje o bypass existe no modal; o colaborador não tem outro sinal (CRM é owner-only).

---

## 2. Feature A — Achar e ligar o clube (descoberta + setup)

### 2.1 Pedido literal
> A feature nem está no menu. Precisa existir de verdade para o dono ligar.

### 2.2 Estado atual

| Elemento | Hoje | Problema |
|----------|------|----------|
| Sidebar / bottom nav / Mais | Sem item Clube | Invisível na operação |
| Ajustes | Sem Clube; item **Assinatura** = plano AgendiX | Colisão de nome; dono clica e acha que é o clube |
| Dashboard | Card só se `totalActive > 0 \|\| totalPending > 0` | Dono com zero assinantes **nunca vê** o módulo |
| Setup / onboarding | Não menciona clube | Não entra no caminho de ativação |
| Config Pix | `/configuracoes/clube/pix` existe | Só quem já sabe a URL |
| Planos | `/configuracoes/clube` existe | Idem; editar/excluir só no **hover** (morto no celular) |
| Link para o cliente | Copy ensina `/#/clube/[slug]` | Rota é `/clube` + `?slug=`; path com slug **404 interno** (redirect home) |
| Slug | Booking usa `/book/:slug`; fila `/queue/:slug` | Clube quebrou o padrão do produto |

### 2.3 Recomendação CTO

- [ ] **D-A1 — Menu:** Clube **não** vai para a bottom nav (espaço da operação: Agenda / Clientes / Financeiro). Vai para **Ajustes > Negócio**, item "Clube de clientes", **abaixo de Serviços**. Atalho no grupo Crescimento da sidebar (desktop) + card no Início **sempre visível para o dono** (empty state "Criar primeiro plano" se zero).
- [ ] **D-A2 — Nome:** UI do tenant = **Clube**. Item AgendiX Stripe continua **Assinatura AgendiX** (ou "Seu plano AgendiX") para matar a colisão.
- [ ] **D-A3 — Rota pública:** `/#/clube/:slug`, igual booking/fila. Query `?slug=` vira redirect. Página de Pix gera o link copiável certo + WhatsApp.
- [ ] **D-A4 — Mobile nos planos:** ações Editar/Excluir sempre visíveis (não hover).

### 2.4 Impacto
- `constants.ts` + `SettingsLayout` + `Sidebar` + `Dashboard` + `App.tsx` + `JoinClub` + `MembershipSettings`.
- Sem migration. P0 de produto: se o dono não acha, o resto não importa.

---

## 3. Feature B — Oferta e contratação (cliente)

### 3.1 Pedido literal
> Cliente precisa entrar, entender, pagar. Hoje o fluxo público está quebrado e o booking não oferece o clube.

### 3.2 Estado atual

**O que já existe e vale**
- `JoinClub` com 3 passos (escolher → dados+método → confirmação).
- RPCs públicos escopados por `business_id` (P0 de tenant já corrigido).
- Planos ativos, Pix copia-cola, opção balcão.
- Dedup: um WhatsApp não cria duas memberships `pending`/`active`.
- Tema do estabelecimento (barber/beauty) no link público.

**O que quebra a confiança**
- Link documentado ≠ rota.
- QR **antes** do submit usa `txid: 'AGENDIX'`; depois do submit o backend grava outro. Cliente pode pagar um BR Code que o dono **não consegue casar**.
- QR com `dark/light: var(--color-*)` — `qrcode` não resolve CSS var; risco de QR invisível/inescanável.
- Pix mostrado **antes** de existir `pix_payments` (cliente paga, clica "Confirmar solicitação" e a solicitação falha → dinheiro no limbo).
- Sem seção no `PublicBooking` (o MVP1 pedia card no topo do `/book/:slug`).
- Sem status na `ClientArea`.
- Copy pública genérica ("Clube de Assinatura"); placeholders beauty/barber só no form de planos.
- PT: tela de Pix mesmo sem Pix na cultura de pagamento (checkout interno já tem MB Way).

### 3.3 Recomendação CTO

- [ ] **D-B1 — Ordem do Pix:** primeiro nome+WhatsApp+método → criar membership → **aí** gerar QR com o `txid` persistido. Nunca mostrar QR órfão.
- [ ] **D-B2 — Booking:** card "Clube" no `/book/:slug` se houver plano ativo + Pix ou balcão configurado. CTA abre `/clube/:slug` (não um terceiro fluxo).
- [ ] **D-B3 — Área do cliente:** se houver membership, bloco status (ativo / aguardando / atrasado) + vencimento + o que está incluso. Sem login extra nesta rodada (mesmo identificador que a área já usa).
- [ ] **D-B4 — PT:** se região PT, esconder Pix; só "pagar no estabelecimento" + copy MB Way/Multibanco. Integração MB Way = deferred.

### 3.4 Impacto
- Reordenar `JoinClub`; `PixDisplay` receber `txid` real + cores hex.
- Card em `PublicBooking.tsx`; bloco em `ClientArea.tsx`.
- Risco residual: migrations `pix_payments` / RPCs públicos precisam estar no remoto (já sinalizado em `docs/sprint-d1-pendencias.md`).

---

## 4. Feature C — Operar o clube (dono)

### 4.1 Pedido literal
> Dono confirma pagamento, vê atrasados, cobra, cancela. É o job diário.

### 4.2 Estado atual

| Job | Hoje | Gap |
|-----|------|-----|
| Ver pendentes | Tab Pendentes | Ok |
| Confirmar 1 clique | Modal Pix/Dinheiro/Cartão | Ok; **não gera** `finance_records` |
| Simular Pix | `PixActions` "Simular Recebido" | Botão de **dev** vazando na UI do dono |
| Cobrar no WhatsApp | Ícone abre wa.me | Texto: "Sobre seu plano… " — incompleto |
| Reenviar cobrança | Spec pedia | Não existe |
| Vencendo em 7 dias | Spec pedia tab | Não existe |
| Marcar atrasado | Status no schema | **Nenhum job** passa `active` → `overdue` |
| Renovação mensal | Spec pedia cron | Não existe; confirmar de novo? dono não é avisado |
| Cancelar | Existe | Ok |
| Incluir cliente no balcão | Só fluxo público | Dono não consegue "fulano pagou aqui, entra no clube" |
| CRM | Spec pedia badge | `ClientCRM` **zero** menção a membership |
| Alerta Início | — | `AlertsContext` não olha pendências do clube |
| Hover planos | Desktop | Mobile não edita |

Confirmar pagamento: 2 writes (insert payment + update membership) **sem RPC atômica**. Se o segundo falha, fica pagamento órfão e status pending — dono clica de novo, duplica histórico.

Preço do plano: spec pedia snapshot na membership. Schema **não tem** `price_cents` na `client_memberships`. Dono aumenta o plano → próximo confirm cobra o preço novo em cima de quem já assinou. Surpresa ruim.

### 4.3 Recomendação CTO

- [ ] **D-C1 — Confirmar:** RPC atômica (payment + status + período + `finance_records` receita "Clube"). Um clique continua.
- [ ] **D-C2 — Balcão:** na lista, "Novo assinante" (busca cliente CRM + plano + método). Job #1 de barbearia/salão real: a conversão acontece **na cadeira**, não no link.
- [ ] **D-C3 — Atraso:** ao abrir Assinantes (e/ou RPC diária barata), `next_billing_at < hoje` e status `active` → `overdue`. Banner no Início se houver atrasado/pendente.
- [ ] **D-C4 — WhatsApp:** templates prontos (cobrança vencendo, atrasado, "seu Pix"). Sem bot/API nesta rodada.
- [ ] **D-C5 — CRM:** chip do plano + status + vencimento + atalho. Sem histórico longo de mensalidades nesta rodada (lista de Assinantes cobre).
- [ ] **D-C6 — Simular Pix:** só em `DEV` / `club-demo`. Produção = Confirmar pagamento.
- [ ] **D-C7 — Snapshot de preço:** gravar `price_cents` na membership na contratação. Confirmações usam o snapshot.

### 4.4 Impacto
- `MembersList` deixa de ser "lista" e vira **caixa do clube**.
- 1 migration (snapshot + talvez RPC de confirm/overdue).
- Financeiro passa a refletir mensalidade — senão o dono "não vê o dinheiro" e desconfia do módulo.

---

## 5. Feature D — Usar o benefício (checkout + limite)

### 5.1 Pedido literal
> Assinante agenda e não paga o que está no plano. Salão precisa de teto, não de infinito.

### 5.2 Estado atual

- `useSubscriptionDiscount` zera serviços cujo `id` está em `plan.service_ids`.
- Checkout mostra banner; se 100% coberto, `payment_method='membership'` e não exige Pix.
- **Match frágil:** o id enviado é `appointment.service_id || appointment.id`. Se `service_id` vier vazio, compara UUID do agendamento com UUID de serviço → **nunca cobre**. Sintoma: "o clube não funciona" no momento da verdade.
- `usage_limit_per_month` é copiado no plano, desenhado no `PlanCard`, **ignorado** no cálculo (`hooks/useSubscriptionDiscount.ts` diz "D+2").
- Produtos no carrinho continuam cobrados (correto).
- Comissão híbrida (assinante vs avulso) — spec D+; não existe.
- Booking público do assinante **não** aplica o desconto (só o checkout interno do staff/dono). Cliente agenda pelo link e ainda vê preço cheio — ok se o desconto é na **conclusão**, mas a expectativa do cliente é ver R$ 0 na hora de marcar.

### 5.3 Recomendação CTO

- [ ] **D-D1 — Match:** sempre `service_id` real. Sem fallback para `appointment.id`. Se faltar service_id, não fingir cobertura (toast claro).
- [ ] **D-D2 — Teto:** se o plano tem limite N, contar atendimentos `payment_method='membership'` do cliente no período corrente. Excedeu → cobra avulso + copy "você já usou N de N neste mês".
- [ ] **D-D3 — Ilimitado:** só quando `usage_limit_per_month` é vazio. Barbearia pode deixar vazio. Salão: placeholder e templates **com** número.
- [ ] **D-D4 — Booking público:** nesta rodada, **não** zerar preço na marcação (evita furo: cliente desconhecido no link). Benefício aplica no checkout da casa. Copy no booking: "assinante: benefício na conclusão". Revisitar se a área do cliente autenticar o telefone.

### 5.4 Impacto
- Bugfix pequeno (match) + contador (query por cliente/mês). Sem isso o salão não pode usar o módulo.

---

## 6. Feature E — Um motor, dois segmentos

### 6.1 Pedido literal
> Aproveitar a usabilidade do clube também para salões.

### 6.2 O que é genérico vs. o que é de barbearia

| Camada | Genérico (manter) | Barbearia (hoje) | Salão (precisa) |
|--------|-------------------|------------------|-----------------|
| Cobrança mensal + confirmação | Sim | Pix do barbeiro | Pix da dona / balcão / MB Way no PT |
| Serviços inclusos | Sim | Corte, barba | Manicure, sobrancelha, hidratação |
| Teto de usos | Campo existe, morto | Costuma ilimitado | **Obrigatório na prática** |
| Copy / templates | 3 strings em `businessCopy` | "Corte Ilimitado" | Hoje "Beleza Ilimitada" — **errado** |
| Comissão híbrida | — | Desejável | Crítico depois; não bloqueia ligar o clube |
| Pacote pré-pago (10 sessões, sem mês) | — | Raro | Comum; **não é clube** — deferred |
| Fidelidade pontos | — | — | Outro produto — deferred |

**Princípio:** não criar "Clube Beauty" paralelo. Mesmo objeto `membership_plan`. O que muda: templates, copy, default de limite, e esconder Pix em PT.

### 6.3 Templates sugeridos (não obrigam o dono)

**Barbearia**
1. Corte Ilimitado — corte; limite vazio.
2. Corte + Barba — os dois; limite vazio.
3. Combo 4 cortes/mês — corte; limite 4 (entrada mais barata).

**Salão**
1. Unhas do mês — manicure (e pedicure se quiser); limite 2 ou 4.
2. Sobrancelha mensal — design; limite 1 ou 2.
3. Manutenção cabelo — hidratação/escova; limite 2. **Sem coloração** nos templates.

### 6.4 Recomendação CTO

- [ ] **D-E1 — Um produto.** Sem flag "só barbearia".
- [ ] **D-E2 — Templates no empty state** de planos, por `user_type`. 1 toque preenche o form; dono edita preço.
- [ ] **D-E3 — Copy beauty:** matar "Beleza Ilimitada". Subtitle: "Ex.: 4 manicures/mês, sobrancelha, combo de manutenção."
- [ ] **D-E4 — Pacotes de sessões sem mensalidade:** fora. É outro job (crédito). Anotar em Deferred.

---

## 7. Inventário honesto — spec MVP1 vs. código

| Critério do MVP1 | Código | Nota |
|------------------|--------|------|
| Dono cadastra Pix | Parcial | Tela existe; fora do menu |
| Dono cria plano | Parcial | Existe; hover-only no mobile |
| Cliente vê planos no booking | Não | JoinClub isolado |
| Contrata via Pix QR + copia-cola | Quebrado | Rota slug + txid + QR CSS |
| Dono vê pendente | Sim | Se achar `/clube/assinantes` |
| Confirmar 1 clique | Parcial | Não é atômico; não gera receita |
| Ativo + 30 dias | Sim | Na confirmação |
| Bypass checkout | Frágil | `service_id` fallback |
| Badge no CRM | Não | |
| Card Dashboard + MRR | Parcial | Escondido se zero |
| Cron renovação / inadimplente 5 dias | Não | `overdue` morto |
| Cancelamento pelo dono | Sim | |
| WhatsApp "bem-vindo" / "paguei" | Não | |
| Snapshot de preço | Não | Spec pedia, schema não tem |
| Comissão híbrida | Fora (D+) | Continua fora |

**Já construído e reaproveitável:** schema (`membership_plans`, `client_memberships`, `membership_payments`, `pix_payments`, Pix em `business_settings`), RPCs públicos, hooks, `PlanCard` / `PixDisplay` / `MembershipBadge`, bypass conceitual no checkout, stats de MRR.

**Jogar fora ou esconder:** `PixActions` "Simular Recebido" em produção; `ClubDemo` pode ficar como rota `devOnly`; hover de edição.

---

## 8. Escopo sugerido da sprint (depois de fechar gray areas)

**P0 — o dono acha, o cliente paga, o checkout honra**
1. Menu Ajustes + card Início sempre visível + link público `/clube/:slug` que funciona.
2. Pix só depois de gravar a solicitação; QR com txid real e cores hex.
3. Checkout casa `service_id`; teto mensal respeitado.
4. Confirmar pagamento atômico + lançar receita no Financeiro.
5. "Novo assinante" no balcão.

**P1 — o clube vive o mês seguinte**
6. `active` → `overdue` por data; tabs/alertas; WhatsApp de cobrança com texto de verdade.
7. Chip no CRM; card no booking público.
8. Templates barber/beauty no empty state; copy sem "ilimitado" no salão.
9. Snapshot de preço; tirar Simular Pix da UI de produção.

**P2 — endurecer**
10. Área do cliente com status da assinatura.
11. RPC/cron de vencimento (se o atalho "ao abrir a lista" não bastar).
12. PT sem Pix; copy MB Way.

**Fora**
- Stripe Connect, Mercado Pago, split, comissão híbrida, cancelamento self-service, bot WhatsApp, pacote de sessões, pontos.

---

## 9. Gray areas — abertas (fechar com o Rhian)

Recomendação CTO em cada uma; não implementar até confirmar.

1. **Onde vive no menu?**  
   Rec: Ajustes + card Início + item Crescimento no desktop. Sem bottom nav.  
   Alternativa: item "Clube" em Crescimento também no mobile drawer.

2. **Ilimitado no salão?**  
   Rec: permitido (campo vazio), mas templates e copy empurram teto. Não bloquear.

3. **Benefício no booking público (preço R$ 0 na marcação)?**  
   Rec: **não** nesta sprint — só no checkout da casa. Evita furo de identidade.

4. **Renovação:** o dono confirma **todo mês** de novo, ou o sistema só marca atrasado e o dono cobra?  
   Rec: MVP = confirmar de novo (já é o modelo Pix manual). Sistema só grita "venceu / atrasou". Débito automático = outro produto.

5. **Staff vê quem é assinante na Agenda (badge no card)?**  
   Rec: sim, chip pequeno no card do agendamento — reduz cobrança errada. Sem tela de gestão.

6. **Nome para o cliente de salão:** "Clube", "Plano mensal" ou "Assinatura"?  
   Rec: **Clube** nos dois (marca única). Subtitle que muda.

---

## 10. Deferred (fora desta feature)

- Comissão híbrida assinante vs avulso.
- Stripe / Asaas / Mercado Pago / webhook Pix real.
- MB Way API (PT).
- Pacote pré-pago de sessões (créditos, sem calendário mensal).
- Cancelamento pelo próprio cliente.
- Bot WhatsApp ("paguei").
- Limite **por serviço** (hoje o teto é do plano inteiro — 4 usos de qualquer incluso).
- Split da mensalidade entre profissionais.
- App do cliente.

---

## 11. Done when (deste discovery)

- [x] Estado atual mapeado contra o código (não só a spec de junho).
- [x] Jobs de barbeiro, dona de salão, cliente e colaborador escritos.
- [x] Gaps que explicam "não funciona / não está no menu / mal construído".
- [x] Recomendação: um motor, dois envelopes de copy/template.
- [ ] Gray areas §9 fechadas com o Rhian.
- [ ] Aí sim: `specs/active/clube-assinatura-v2/{spec,context,tasks}.md` e sprint.
