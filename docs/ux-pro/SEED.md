# SEED — dados de teste da varredura UX-PRO

**Status:** 🟡 **PLANO PROPOSTO — AGUARDANDO CONFIRMAÇÃO DO USUÁRIO. Nenhum `INSERT`/`UPDATE` executado.**
**Gerado em:** 2026-08-01 · Gate do §5.1 do `docs/ux-pro/SUPER-PROMPT.md`

> ⚠️ O `.env.local` aponta para o **Supabase real do produto**. Toda escrita descrita aqui é escopada ao tenant das contas de teste. Nenhuma credencial aparece neste arquivo.

---

## 1. Levantamento do que já existe (read-only, executado)

Script: `scripts/ux-pro-seed-survey.mjs` — faz login com as contas de `.env.local`, resolve o tenant **pela sessão** e conta linhas. Zero escrita.

**Tenant de teste:** `03254cc1…` (dono). O colaborador (`f597f826…`) tem `profiles.company_id` apontando para esse mesmo tenant — vínculo correto.

| Tabela | Coluna de tenant | Dono | Colaborador | Alvo §5.1 | Situação |
|---|---|---|---|---|---|
| `team_members` (ativos) | `user_id` | 4 | 4 | 3 | ✅ |
| `services` | `user_id` | 7 | 7 | 8 | 🟡 falta 1 |
| `service_categories` | `user_id` | 1 | **0** | — | ⚠️ staff não enxerga categorias (RLS) |
| `clients` | `user_id` | 52 | 52 | 25 | ✅ |
| `appointments` | `user_id` | 150 | 150 | 40 c/ passado+hoje+futuro e todos os status | 🔴 **150/150 no passado; 0 hoje; 0 futuro; status `NoShow` ausente** |
| `finance_records` | `user_id` | 6 | **1** | 30 em ≥2 meses | 🔴 6 num único mês (2026-07) |
| `queue_entries` | `business_id` | 4 | **0** | 5 | 🟡 falta 1 · ⚠️ staff vê fila vazia |
| `membership_plans` | `user_id` | 0 | 0 | 1 plano ativo | 🔴 vazio |
| `client_memberships` | `user_id` | 0 | 0 | 1 assinatura ativa | 🔴 vazio |
| `goal_settings` | `user_id` | 1 | **0** | — | ⚠️ staff sem meta |
| `business_settings` | `user_id` | 1 | 1 | — | ✅ |
| `public_bookings` | `business_id` | 0 | 0 | — | 🔴 vazio (nenhuma solicitação pendente para auditar) |
| `products` | `company_id` | 1 | 1 | — | 🟡 catálogo raso |
| `onboarding_progress` | `company_id` | 1 | 1 | — | ✅ |

**Distribuição atual dos agendamentos do dono:** `Confirmed` 60 · `Completed` 73 · `Cancelled` 12 · `Pending` 5 · `NoShow` **0**. Períodos: passado 150 · hoje **0** · futuro **0**.

### 1.1 Bloqueio das superfícies públicas

`profiles.business_slug` está **vazio** no tenant de teste. As rotas públicas são todas por slug (`App.tsx:161-165`):

- `/#/book/:slug` — booking público
- `/#/queue/:slug` — entrar na fila digital
- `/#/pro/:slug` — portfólio do profissional
- `/#/minha-area/:slug` — área do cliente

Sem slug, **nenhuma dessas quatro telas é acessível**, o que inviabilizaria o território C3 (superfícies públicas) da Fase 3. Isso também é a confirmação ao vivo de `CONHECIDO-021` (o onboarding não cria slug).

### 1.2 Achados de dados que não são escopo desta varredura (registrados, não corrigidos)

| # | Achado | Por que fica fora |
|---|---|---|
| D-01 | Colaborador vê `queue_entries` = **0** enquanto o dono vê 4. A migration `supabase/migrations/20260724_queue_staff_rls.sql` está modificada e não commitada — provavelmente não aplicada no banco. O trabalho recente registrado em `MEMORY.md` diz que o staff deveria acessar a fila | RLS/migration — §2.1 proíbe tocar |
| D-02 | Colaborador vê `service_categories` = 0 e `goal_settings` = 0 | RLS deliberada ou lacuna de policy — fora do escopo |
| D-03 | Colaborador tem `subscription_status = 'trial'` no próprio profile enquanto o dono está `active`; o app herda o do dono em runtime (`AuthContext.tsx:94-105`), mas o dado local divergente é uma armadilha | Camada de dados/negócio |
| D-04 | `finance_records` não tem coluna de data própria — o mês é derivado de `created_at` (colunas: `due_date` existe mas é outra semântica). Lançamento retroativo só é possível manipulando `created_at` | Schema — registrado para o plano |

---

## 2. Plano de seed proposto

**Princípio:** semear **apenas o que falta** para nenhuma tela auditável cair em estado vazio por acidente. Nada de recriar o que já existe.

**Marcador de limpeza:** todo registro criado leva a string literal `[UXPRO-SEED]` num campo de texto livre (`notes`, `description` ou `name`), permitindo limpeza seletiva sem tocar em dado real.

| # | Tabela | Operação | Quantidade | Conteúdo | Marcador |
|---|---|---|---|---|---|
| S-1 | `profiles` | `UPDATE` (1 linha, `id = <tenant>`) | 1 | `business_slug = 'barbearia-teste-uxpro'` — **destrava as 4 rotas públicas** | slug autoexplicativo |
| S-2 | `appointments` | `INSERT` | 12 | Agendamentos de **hoje** cobrindo a grade 08:00–19:00, status `Confirmed` (7), `Pending` (2), `Completed` (2), `NoShow` (1). `client_id` e `professional_id` sorteados entre os existentes; `service` e `price` copiados dos serviços reais | `notes = '[UXPRO-SEED] ...'` |
| S-3 | `appointments` | `INSERT` | 10 | Agendamentos **futuros** (D+1 a D+14), status `Confirmed` (7) e `Pending` (3) | `notes` |
| S-4 | `appointments` | `INSERT` | 3 | Agendamentos passados com status `NoShow` (status hoje inexistente na base) | `notes` |
| S-5 | `finance_records` | `INSERT` | 26 | Lançamentos com `created_at` distribuído em **3 meses** (jun/jul/ago 2026): 18 `revenue` e 8 `expense`, valores variados, `payment_method` cobrindo pix/cash/debit/credit/membership, `category` variada. Chega a 32 no total | `description = '[UXPRO-SEED] ...'` |
| S-6 | `membership_plans` | `INSERT` | 2 | 1 plano ativo ("Clube Corte Livre", mensal) + 1 inativo, para a tela mostrar os dois estados | `name` contém `[UXPRO-SEED]`? **não** — nome limpo, marcador na descrição |
| S-7 | `client_memberships` | `INSERT` | 3 | 1 assinatura ativa, 1 vencida, 1 pendente, vinculadas a clientes existentes | campo de observação |
| S-8 | `queue_entries` | `INSERT` | 3 | Total vai de 4 → 7 (alvo era 5); status `waiting` variados com `joined_at` escalonado para a fila ter tempo de espera plausível | `notes = '[UXPRO-SEED]'` |
| S-9 | `public_bookings` | `INSERT` | 3 | 3 solicitações `pending` — sem isso o banner "solicitações pendentes" do Dashboard/Agenda nunca renderiza e o fluxo de aceite fica inauditável | campo de observação |
| S-10 | `services` | `INSERT` | 1 | 1 serviço para fechar o alvo de 8 com faixa de preço mais alta | `[UXPRO-SEED]` no nome ou descrição |
| S-11 | `products` | `INSERT` | 4 | Catálogo de produtos vai de 1 → 5, para a tela `/produtos` não parecer vazia | `[UXPRO-SEED]` |

**Total:** 1 `UPDATE` + 67 `INSERT`s, todos com `user_id`/`company_id`/`business_id` = tenant de teste.

### 2.1 O que NÃO será tocado

- Nenhuma tabela de sistema, migration, policy ou RLS.
- Nenhum registro pré-existente é alterado ou deletado. **Única exceção:** o `UPDATE` de `business_slug` em S-1, que hoje está vazio.
- Nenhum outro tenant. Toda query de escrita carrega o filtro de tenant explicitamente.
- Nada em `auth.users`, nem senha, nem e-mail.

### 2.2 Como desfazer

Script de limpeza a criar junto: `scripts/ux-pro-seed-cleanup.mjs`, com o mesmo login e escopo de tenant:

```sql
-- Todos os comandos abaixo carregam o filtro de tenant. Nenhum roda sem ele.
DELETE FROM appointments      WHERE user_id     = '<tenant>' AND notes       LIKE '[UXPRO-SEED]%';
DELETE FROM finance_records   WHERE user_id     = '<tenant>' AND description LIKE '[UXPRO-SEED]%';
DELETE FROM queue_entries     WHERE business_id = '<tenant>' AND notes       LIKE '[UXPRO-SEED]%';
DELETE FROM public_bookings   WHERE business_id = '<tenant>' AND notes       LIKE '[UXPRO-SEED]%';
DELETE FROM client_memberships WHERE user_id    = '<tenant>' AND notes       LIKE '[UXPRO-SEED]%';
DELETE FROM membership_plans  WHERE user_id     = '<tenant>' AND description LIKE '[UXPRO-SEED]%';
DELETE FROM services          WHERE user_id     = '<tenant>' AND name        LIKE '%[UXPRO-SEED]%';
DELETE FROM products          WHERE company_id  = '<tenant>' AND name        LIKE '%[UXPRO-SEED]%';
-- S-1 é o único que reverte para o estado anterior, não para ausência:
UPDATE profiles SET business_slug = NULL WHERE id = '<tenant>' AND business_slug = 'barbearia-teste-uxpro';
```

O `<tenant>` é lido da sessão, nunca digitado.

### 2.3 Decisão pendente sobre o slug (S-1)

O slug é o único item que muda estado **visível para o mundo externo**: com ele preenchido, as rotas públicas passam a responder. Três caminhos:

1. **Criar o slug** — desbloqueia o território C3 completo. É o único caminho que permite auditar booking público, fila digital, portfólio e área do cliente.
2. **Não criar** — as 4 telas públicas ficam marcadas como "não auditadas" (§15: "nenhuma tela vazia auditada como cheia"), e a varredura cobre só o app autenticado.
3. **Criar e remover no fim** — desbloqueia a auditoria e volta ao estado atual no fechamento.

### 2.4 Bloqueio do tema `beauty` (medido, não presumido)

O §7.1 pede **4 combinações de tema**. Hoje só 2 são alcançáveis. Isto foi medido, não assumido: `scripts/ui-forensics.mjs` faz uma sondagem antes da matriz — força `rhian_lepore_dev_type = 'beauty'` no `localStorage`, loga e lê o `data-theme` resultante.

**Resultado da sondagem:** tema **fixo em `barber`** para as duas personas. Registrado em `forensics.json` → `controleDeTema`.

Cadeia de causa, verificada no código:

| Passo | Arquivo:linha | Fato |
|---|---|---|
| 1 | `hooks/useDynamicBranding.ts:53` | `data-theme` recebe o valor de `userType` |
| 2 | `contexts/AuthContext.tsx:388` | `userType` só aceita override (`devUserType`) quando `isDev` é verdadeiro |
| 3 | `contexts/AuthContext.tsx:172-173` | `isDev` exige que o e-mail da sessão seja **exatamente** `VITE_DEV_EMAIL`, que é embutido no bundle em tempo de build |
| 4 | — | As contas de teste do `.env.local` não são a conta dev → nenhum switcher, `userType` vem de `profiles.user_type` = `barber` |

**Caminhos possíveis, com o custo real de cada um:**

| # | Caminho | O que desbloqueia | Custo / risco |
|---|---|---|---|
| B-1 | `UPDATE profiles SET user_type = 'beauty'` no tenant de teste, capturar, e reverter para `'barber'` | Captura **fiel** de `beauty×dark` e `beauty×light`: tokens, copy e lógica condicional, todos coerentes | 1 `UPDATE` + 1 reversão, escopados ao tenant. Enquanto durar, o app do tenant de teste aparece como salão |
| B-2 | Rebuildar com `VITE_DEV_EMAIL` = e-mail da conta de teste | Desbloqueia sem tocar no banco | **Contamina a evidência**: `isDev` liga o switcher no `Header.tsx:120`, o `DevBugButton.tsx:55` flutuante e itens extras em `SettingsLayout.tsx:112`. As capturas passariam a mostrar UI que a produção não tem |
| B-3 | Segunda conta de teste com `user_type = 'beauty'` | Captura fiel, sem mexer na conta atual | Precisa de credenciais suas, ou de um cadastro novo (que também escreve no banco) |
| B-4 | Não auditar `beauty` | Nada | Metade da matriz de temas fica marcada como não auditada. C4 (coerência entre temas) perde o objeto de estudo |

**Descartado por mim, com motivo:** forçar `data-theme="beauty"` no DOM via Playwright, ignorando o app. Seria tecnicamente trivial, mas há centenas de ramificações em JS por `userType` (`pages/ClientArea.tsx`, `pages/Finance.tsx`, `components/AppointmentWizard.tsx` e outras ~90 arquivos) que mudam **texto, rótulo e ícone**. O resultado seria tokens de salão com vocabulário de barbearia — uma tela que não existe, gerando achados falsos.

**Recomendação:** B-1. É o único que dá evidência fiel sem contaminar a captura, e é reversível com um `UPDATE` de uma linha.

---

## 3. Execução (a preencher após confirmação)

_Nada executado. Esta seção recebe o log real dos `INSERT`s — tabela, quantidade e timestamp — depois do "pode ir" do usuário._
