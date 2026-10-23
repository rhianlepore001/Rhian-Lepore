# Comandos e resultados observados

Execução local em 18–20/10/2026, checkout base f371508. Node 24.19.0, npm 11.9.0, PostgreSQL 17.11. CI usa Node 20: compatibilidade nessa versão não foi reexecutada aqui. Nenhum backend de produção, email, OTP ou pagamento foi chamado.

## Primeira entrega em PR — 20/10, antes do ajuste SEC-02

Typecheck → lint → build → Vitest repetidos na ordem, todos exit 0; Vitest confirmou novamente 242 arquivos e 1.749 testes, duração 208,73 s. billing-cycle, identity, tenant-matrix e residual-privacy também foram reexecutados; os dois últimos mantêm a distinção entre controles aprovados no modelo e reprodução de riscos abertos. Sintaxe dos scripts shell, links locais, hashes das fontes do inventário e diff foram conferidos. Nenhum arquivo .runtime ou credencial foi incluído no conjunto de 38 arquivos preparado para versionamento.

Logs desta revalidação: `/workspace/scratch/agendix-pr/`. Os resultados anteriores abaixo permanecem como evidência da execução inicial.

## Gates finais

Com variáveis fictícias `VITE_SUPABASE_URL=http://127.0.0.1:54321` e `VITE_SUPABASE_ANON_KEY=fictional-local-anon`:

| Comando, executado na ordem | Resultado |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, sem erros/warnings ESLint; design-debt sem violação nova |
| `VITE_OPENROUTER_API_KEY= VITE_GEMINI_API_KEY= GEMINI_API_KEY= npm run build` | exit 0, postbuild aprovado |
| `npm test -- --run` | exit 0, **242 arquivos / 1.749 testes aprovados**, duração 207,94 s |

Build emitiu avisos de tamanho de chunk e import estático/dinâmico de useStaffPerformance. Os módulos envolvidos não foram alterados; não foi feito refactor de performance nem aumento artificial do limite de aviso. Nenhum `.map` foi encontrado no dist gerado (não atesta artefatos de hosting).

`npm test -- --run security/attacks test/utils/checkoutAllowlist.test.ts`: **50/50** (16 customer/handler, 16 origens, 13 lembretes, 5 teste anterior da allowlist). A suíte completa acima inclui esses testes.

## Testes iniciais e regressão das correções

| Evidência | Antes | Depois |
|---|---|---|
| RPC customer | teste inicialmente falhou por EXECUTE autenticado; setter real gravou cus_ArbitraryFixture no próprio perfil | cliente não executa nenhum setter; backend aceita dono, preserva idempotência e recusa conflito |
| Handler checkout | 11 falhas / 15; customer de email adotado, metadata/perfil não conferidos | 16/16, JWT/perfil/metadata e configuração validados, erros sem detalhes externos |
| Origens + auth lembrete | 10 falhas / 21 (6 domínio + 4 autorização/método) | todas as asserções de domínio/guard passam |
| Complemento SDK/template | 4 falhas / 29: parâmetro incompatível, inicialização com chave vazia, HTML cru e detalhe SQL | todas passam após correção; teste focal total 50/50 |

As primeiras evidências de 18/10 estão nos retornos das ferramentas; `/tmp` foi perdido na substituição da instância. As regressões, prova SQL original/rollback e novos testes suplementares foram reexecutados em 19/10. Logs persistentes em `/workspace/scratch/agendix-audit/evidence/`.

## SQL novo

Comando padrão: `PGBIN=/workspace/scratch/agendix-audit/tools/pg/usr/lib/postgresql/17/bin bash security/tests/local-postgres.sh <modo>`. O diretório de ferramentas contém binários extraídos de pacotes Debian permitidos, sem instalação de sistema ou uso de dados existentes.

| Modo | Resultado / alcance |
|---|---|
| billing-cycle | exit 0: prova inicial, aplicar 2x, testes, rollback exato de corpo/ACL, teste do comportamento restaurado, reaplicar/testar, corrida com um commit/um conflito |
| identity | exit 0: role/company/id e INSERT/UPSERT/DELETE bloqueados; perfil externo inacessível; nome comercial do dono editável |
| tenant-matrix | exit 0: **210 checks** de RLS em dez esquemas mínimos com policies reais; CRUD externo, troca de tenant, UPSERT e lote negados; CRUD legítimo do dono preservado |
| residual-privacy | exit 0 da **reprodução de problemas abertos**, com warnings explícitos para PII por telefone e staff inativo |

O final da matriz também confirma permissões excessivas de staff nas policies ALL do modelo. Não é aprovado como controle. O fixture não representa todos os triggers/FKs nem o catálogo implantado.

Os scripts SQL exigem socket Unix + marcador de fixture antes de inserir dados. Nenhuma URL remota é aceita pelo runner.

## Regressões SQL oficiais do repositório

Todos os comandos abaixo retornaram **exit 0** em 19/10, cada qual em cluster local descartável. Não são prova de que os snapshots correspondem ao remoto atual.

Prefixo: `PGBIN=... bash scripts/test-sql-<nome>.sh`.

| Nome | Evidência observada |
|---|---|
| crit-public-clients-billing | 12/12; teste inicial dos problemas antigos e aplicação duplicada |
| alto-a01-client-photos | 8/8, isolamento por pasta nas policies modeladas |
| alto-a02-storage-writes | 7/7, policies amplas removidas |
| public-bookings-security | lockdown direto e regressão auto-confirm (77 checks da suíte auto-confirm) |
| owner-signup-profile | 21 checks de signup; log de erro/rate limit e rollback da RPC de erro |
| staff-purge | exclusão/revogações locais; ACL/definer/search_path do snapshot preservados |
| staff-categories | 10/10 |
| staff-edit-scope | escopo da edição de staff, script exit 0 |
| commissions-owner-only | staff/ex-staff/anon negados; internas sem EXECUTE de clientes |
| finance-delete | staff/outro tenant negados; relações financeiras protegidas no snapshot |
| booking-lead-time-minutes | 18 checks, idempotência e compatibilidade legado |
| booking-cancel-cutoff | v1 encaminha v2; compatibilidade da cadeia de booking preservada |

Também executados com `--rollback`: crit-public-clients-billing, alto-a01-client-photos, alto-a02-storage-writes e public-bookings-security. Todos exit 0, com conferência de policies/ACL/definições prevista por cada runner. A palavra “prod” nos logs desses scripts é rótulo do snapshot histórico, não conexão realizada nesta auditoria.

## Dependências, revisão e impedimentos

- `npm audit --registry=https://registry.npmjs.org --fetch-timeout=20000 --fetch-retries=0 --json`: exit 1; 39 entradas (5 critical, 26 high, 7 moderate, 1 low). Alcance analisado em `dependencies.md`; nenhuma exploração automática nem audit fix.
- Revisões independentes: SEC-01 9,2/10, SEC-04/06 9,2/10, SEC-05 9,5/10. Evidências e limites em `../reviews/independent.md`.
- `git diff --check`: passou.
- `graphify update .`: exit 127, comando não instalado. Grafo antigo preservado.
- Chromium não instalado: Playwright/E2E de navegador não executado. Projetos Playwright de produção e setup remoto não foram usados.
- Em 19/10, `gh auth status` informou credencial inválida e não houve PR remoto. Em 20/10, o conector GitHub está disponível e a entrega foi autorizada em um PR draft único na branch `security/hardening-audit`; as descrições temáticas permanecem em reviews/.
- Deno e Supabase local completo ausentes; catálogo efetivo, gateway/JWT, Auth/Storage reais, eventos Stripe e entrega de mensagens não verificados.

## Ajuste SEC-02 do PR #160 — 20/10/2026

Escopo: booking sem OTP, sem leitura/pré-preenchimento por telefone, sem sobrescrever CRM existente, com capacidade privada por pedido. Logs desta rodada em `/workspace/scratch/agendix-sec02/` (artefatos locais, sem dados reais).

### TDD e ciclo SQL desta rodada

- `test/services/privateBookingSecurity.test.ts`: **4/4 falharam inicialmente**, depois passaram. Proíbe lookup, upsert após criar, fallback de tabela/telefone; exige token para ler/cancelar.
- `test/utils/privateBookingDiagnostics.test.ts`: **2/2 falharam inicialmente**, depois passaram. Token saía na URL enviada ao log/contexto; agora redigido e painel excluído da captura automática.
- `test/pages/PublicBookingPrivateLink.test.tsx`: **2/2 falharam inicialmente**, depois passaram com página real montada. Link ausente/inválido/expirado bloqueia edição e não vira reserva nova.
- Fallback de fila em `test/services/queue.test.ts`: **1 falha inicial**, depois 25/25 passaram. Denial 42501 de lookup histórico não quebra criação/uso do ticket guardado.
- `PGBIN=/workspace/scratch/agendix-audit/tools/pg/usr/lib/postgresql/17/bin bash security/tests/private-booking-cycle.sh`: **exit 0**. Três falhas iniciais esperadas; dupla aplicação; privacy/preservação/capacidade/CRM/atomicidade; rollback com definições iguais e grants equivalentes; risco anterior reproduzido; reaplicação e regressão aprovadas.
- Token válido/incorreto/ausente/expirado/de outro ID; leitura, edição e cancelamento; cadastro existente só no CRM e em ambas tabelas; dados enviados só no pedido; mirror, aceite manual e auto-confirm preservam **todas as colunas** do CRM no fixture; materialização do atendimento funciona. Falha forçada ao gravar hash reverte pedido, atendimento e CRM novo.
- Realtime nega anon, authenticated sem tenant e proprietário B; proprietário correto continua lendo. Schema/tabela de hash negados para anon.
- ACLs de `get_public_client_membership`, `cancel_public_client_membership` e `find_active_queue_entry_by_phone` usam definições reais carregadas no runner. Suas operações funcionais não foram certificadas.
- Revisão SQL independente: 9,1/10, ciclo + suplemento de ACL passou. Revisão frontend: 9,2/10, **119/119** em 12 arquivos. Notas limitadas ao escopo local, com detalhes em `reviews/sec02.md`.

`graphify update .`: **exit 127**, executável ausente. `bash -n security/tests/private-booking-cycle.sh` e `git diff --check` passaram. O inventário gigante não é mais versionado; MEMORY.md não tem diferença em relação à main. Nenhuma migração remota, merge, deploy, email ou pagamento foi executado.

O comando histórico `local-postgres.sh residual-privacy` continua carregando o estado anterior à correção para reprodução. Não deve ser usado como gate do SEC-02 atualizado nem como prova de que o código corrigido permanece vulnerável.

### Gates finais do ajuste SEC-02

Executados na ordem exigida pelo repositório, com as mesmas variáveis fictícias:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0; sem warnings ESLint; design-debt sem violação nova |
| `VITE_OPENROUTER_API_KEY= VITE_GEMINI_API_KEY= GEMINI_API_KEY= npm run build` | exit 0; postbuild aprovado |
| `npm test -- --run` | exit 0; **246 arquivos / 1.762 testes aprovados**, 254,02 s |

Build manteve aviso de chunks acima de 500 kB e aviso preexistente de importação estática/dinâmica. Nenhum source map encontrado em dist. Não houve mudança de dependências; npm audit desta primeira entrega permanece documentado, sem sugerir que foi repetido nesta rodada. Os 1.762 testes incluem os novos casos de privacidade, diagnóstico, edição e fallback de fila, além das regressões anteriores.

## Revisão de acompanhamento privado — 20/10/2026

Branch `security/hardening-audit`, PR #160 draft. Escopo e limites em `security/reviews/public-access-followup.md`.

- TDD frontend: `test/services/privateQueueMembership.test.ts` falhou nos quatro casos antes das mudanças; os quatro passaram depois. Cobertura adicional de portal anônimo, link em outro aparelho, cancelamento do plano e polling de confirmação sem token/sem canal público.
- TDD SQL: o branch anterior falha em `BOOKING_EXPIRY_NOT_48H`. Nova migration aplica duas vezes e passa; rollback restaura definições e ACLs equivalentes; reaplicação passa novamente. Testes anteriores de CRM, materialização, Realtime e atomicidade do booking continuam passando.
- `security/tests/private-booking-cycle.sh --public-access`: aprovado em PostgreSQL 17 descartável, via socket local. Inclui leitura/posição/status/saída da fila, adesão/leitura/cancelamento/rotação do clube, isolamento de tenant, tokens inválidos/ausentes/expirados/de outro registro, legados sem token, telefone imutável, prazo de 48h sem extensão e rollback atômico de fila/pagamento/adesão/cadastro em falha forçada ao persistir hash. pgcrypto no schema `extensions`.
- `npm run typecheck`: aprovado na revisão final.
- `npm run lint`: aprovado; sem warnings ESLint e sem nova dívida visual.
- `npm run build`: aprovado com PWA e postbuild; aviso conhecido de chunk acima de 500 kB.
- `npm test -- --run`: **1.773 testes, 249 arquivos aprovados** (438,89s). Logs esperados de cenários de erro e mocks não representam falhas da suíte.
- `git diff --check`: aprovado.
- `graphify update .`: indisponível, comando não instalado (exit 127).

Nenhuma migração, consulta de dados reais, deploy, merge, envio de mensagem ou pagamento remoto foi executado. Os testes SQL usam esquema mínimo e definições selecionadas de migrations; não certificam catálogo remoto nem os gateways PostgREST/Realtime. O índice de changelog do Supabase retornou 403 da política de rede; a referência de funções, `search_path` e grants foi conferida no repositório oficial de documentação.

## Correção da expiração após remarcação — 20/10/2026

- Contrato corrigido na própria migration ainda não publicada: o trigger usa `NEW.appointment_time + interval '48 hours'`, acompanhando antecipações e adiamentos sem acrescentar prazo à validade anterior.
- TDD: antes da correção, o teste SQL falhou em `BOOKING_EXPIRY_FOLLOWS_RESCHEDULE_PLUS_10_DAYS`. O cenário remarca pela RPC pública de D+10 para D+20, exige validade em D+22 e confirma acesso com o mesmo token. Também confere antecipação para D+5 (validade D+7) e novo adiamento para D+20 (validade D+22).
- Após a correção, `security/tests/private-booking-cycle.sh --public-access` passou: aplicação duplicada, regressões, rollback com comparação de definições/ACLs e reaplicação. As regressões de fila, clube, CRM e atomicidade continuam aprovadas.
- Rollback documentado em SQL e Markdown: não restaura validades já encurtadas nem recalcula seus valores anteriores.
- `npm run typecheck`, `npm run lint` e `npm run build`/postbuild: aprovados. Permanece o aviso conhecido de tamanho de chunks.
- `npm test -- --run`: **1.773 testes em 249 arquivos aprovados** (364,35s).
- `git diff --check`: aprovado. `graphify update .`: indisponível (exit 127).
- Validação apenas local. Sem migration remota, merge ou deploy.
