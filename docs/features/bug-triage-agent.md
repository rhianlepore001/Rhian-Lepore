# Bug Triage Agent — Ponte de triagem (níveis 1-5)

Contrato entre o **app AgendiX** (que enche a fila de bugs) e o **agente de
triagem** (que lê a fila, dá a nota 1-5 e escreve o plano de correção).

> **Escopo atual (Parte A):** o app já registra bugs (manuais + automáticos) e o
> banco já tem os campos de triagem. O agente **só tria** — classifica e planeja,
> **não corrige nem abre PR**. *Onde* o agente roda (cron na nuvem vs. lionclaw)
> fica para a Parte B. Este documento é o contrato que a Parte B vai consumir.

---

## 1. De onde vêm os bugs

A tabela é `public.bug_reports`. Dois caminhos enchem a fila:

| Origem (`source`) | Como entra | `level` inicial |
|---|---|---|
| `manual` | Cliente clica no "?" → `createBugReport` (`lib/bugReport.ts`) | `NULL` (não triado) |
| `auto` | App captura erro de runtime / crash de tela → RPC `upsert_auto_bug_report` (`lib/autoBugCapture.ts`) | `NULL` (não triado) |

Bug **novo** = `status = 'new'` e `level IS NULL`. É isso que o agente processa.

Anti-spam dos automáticos já é resolvido **antes** de chegar ao agente: a RPC
`upsert_auto_bug_report` incrementa `occurrences`/`last_seen_at` em vez de
duplicar quando a `dedup_key` se repete. Ou seja, `occurrences` alto = erro
recorrente = prioridade.

---

## 2. Os 5 níveis (taxonomia oficial)

| Nível | Nome | O que é | Exemplos |
|:---:|---|---|---|
| **1** | Cosmético | Design / inconsistência visual. Não atrapalha o uso. | cor fora do tema, espaçamento torto, texto desalinhado, ícone errado |
| **2** | Componente quebrado | Modal / card / lista que não funciona por falta de lógica ou design. Atrapalha mas tem volta. | modal não fecha, card sem dados, botão sem ação, layout quebrado no mobile |
| **3** | Erro de dados/banco | Mensagem de erro por falta de migration, coluna, policy RLS ou regra no banco. | `PGRST…`, "column does not exist", "function does not exist", insert que viola CHECK |
| **4** | Fluxo interrompido | Quebra um fluxo de negócio inteiro. O cliente não consegue concluir. | checkout não fecha, não dá pra agendar, não salva o atendimento, login trava |
| **5** | Crítico | App não abre / tela branca geral / risco de perda de dado. | crash na raiz, dado some, multi-tenant vazando, erro que derruba tudo |

**Regra de desempate:** na dúvida entre dois níveis, escolha o **maior**.
Sinais úteis: `source='auto'` + stack de banco → tende a 3; crash pego pelo
ErrorBoundary (`origin: react.errorBoundary` na descrição) → tende a 4 ou 5;
`occurrences` alto eleva a prioridade dentro do nível.

---

## 3. O que o agente lê (fila)

```sql
SELECT id, company_id, source, type, category, title, description,
       context, occurrences, last_seen_at, screenshot_url, created_at
  FROM public.bug_reports
 WHERE status = 'new'
   AND level IS NULL
 ORDER BY occurrences DESC, created_at ASC
 LIMIT 50;
```

> O agente roda fora da sessão de um usuário (cron/serviço), então usa a
> **service role key** do Supabase — que ignora RLS e enxerga todos os tenants.
> Trate a service role como segredo (fora do repo, em variável de ambiente).

---

## 4. O que o agente grava (resultado da triagem)

Para cada bug processado:

```sql
UPDATE public.bug_reports
   SET level          = $1,   -- 1..5
       triage_summary = $2,   -- 1 frase: o que está errado
       triage_plan    = $3,   -- passos de correção (markdown curto)
       status         = 'triaged',
       triaged_at     = NOW(),
       updated_at     = NOW()
 WHERE id = $4;
```

- `triage_summary` — uma frase objetiva (vira o "título" útil na lista).
- `triage_plan` — o plano de correção: arquivos prováveis, causa raiz suspeita,
  e se precisa de migration/policy. **Não** aplica nada; só descreve.
- Se for `wontfix` (ruído, duplicata externa, não reproduzível), use
  `status = 'wontfix'` + `triage_summary` explicando, e ainda assim atribua um
  `level` se der.

### Transições de status válidas (CHECK da tabela)
`new` → `triaged` → `planned` → `in_progress` → `fixed`
(`wontfix` a qualquer momento). A Parte A só usa `new` → `triaged`/`wontfix`.

---

## 5. Esqueleto do prompt do agente (Parte B)

> Cole isto como instrução do agente quando for montar o cron/lionclaw.

```
Você é o agente de triagem de bugs do AgendiX.
1. Busque a fila (SELECT da seção 3).
2. Para cada bug:
   - Leia title, description, context (rota, viewport, tema, consoleErrors), screenshot_url.
   - Classifique de 1 a 5 pela taxonomia da seção 2 (desempate = maior nível).
   - Escreva triage_summary (1 frase) e triage_plan (causa provável + arquivos +
     se precisa migration/policy). NÃO corrija código. NÃO abra PR.
   - Grave com o UPDATE da seção 4 (status='triaged').
3. Nunca invente que reproduziu. Se não der pra classificar, level por melhor
   palpite + nota no summary.
```

---

## 6. Próximos passos (Parte B — quando decidir onde roda)

- **Cron na nuvem Anthropic (`/schedule`)** — rotina diária que executa o prompt da seção 5.
- **lionclaw** — plugar o prompt da seção 5 como skill no repositório lionclaw.
- (Futuro / Sprint além) agente que **corrige + abre PR** a partir de `triage_plan`.

Campos e RPC: `supabase/migrations/20260626000002_bug_reports_triage.sql`.
