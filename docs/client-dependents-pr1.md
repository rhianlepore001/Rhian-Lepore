# Dependentes — PR 1 de 3

`client_id` permanece sendo o titular em todos os atendimentos. `dependent_id` identifica quem foi atendido; `attendee_name` guarda o nome no momento da criação. Cadastro e contato continuam no titular. Uma linha de atendimento por pessoa mantém visitas, LTV, cobrança e comissão agregados no titular; duas pessoas atendidas representam duas visitas.

## Banco e fluxo interno

A migration `20261027083640_client_dependents_internal_booking.sql` acrescenta a tabela, índices, policies, colunas de atendimento, trigger de snapshot e a RPC autenticada `create_internal_attendee_bookings`. Nenhuma função, policy, coluna ou dado existente é substituído. `public_bookings`, fila e RPCs públicas ficam para os próximos PRs. O modelo permite `source = 'agendamento_online'` e várias linhas por titular, prontas para a materialização do PR 2.

Chaves estrangeiras compostas impedem associar dependente a titular/tenant diferente, inclusive via código privilegiado. RLS: dono tem CRUD no seu tenant; staff tem SELECT/INSERT no seu tenant e UPDATE (editar e arquivar) apenas quando a chave do gestor "equipe pode editar clientes" (`business_settings.staff_can_edit_clients`, função `staff_can_edit_clients`, PR #165) está ligada. DELETE físico continua só do dono. No CRM, o botão Editar (que dá acesso a Remover) segue a mesma regra via `useStaffClientPermission`. A tabela não tem policy pública e revoga privilégios de `PUBLIC`/`anon`. Os grants preexistentes de `clients` e `appointments` ficam fora deste PR, conforme a recomendação de hardening separado do plano.

O CRM permite nome, apelido e observações. Remover arquiva o registro (`is_active=false`), preservando a referência e o histórico. Um DELETE físico também preserva o snapshot e mantém `client_id`. Nomes ativos são únicos por titular após `lower(btrim(name))`; acentos continuam distintos, conforme o índice proposto. Merge de grafias não faz parte deste PR.

No assistente aberto pela Agenda, a primeira pessoa pode ser um dependente, sem atendimento do titular. Cada pessoa tem seus serviços. A sequência usa o mesmo profissional e horários consecutivos; os serviços adicionais têm preço de catálogo, enquanto o preço/desconto existente se aplica à primeira pessoa. Serviços personalizados podem ser agendados individualmente. Limite interno: dez pessoas e duração total de 24 horas. Este limite é independente dos limites públicos previstos para o PR 2.

A RPC interna é `SECURITY DEFINER`, com `search_path=''`, EXECUTE somente para authenticated/service_role e guarda explícita de usuário, tenant e papel owner/staff. Ela valida titular, profissional ativo, dependentes ativos e serviços ativos do tenant; calcula durações e nomes no banco. Preço pode ser ajustado pelo gestor, como no fluxo interno existente. Usa o mesmo advisory lock por tenant dos fluxos atuais e os helpers de conflito/bloqueio existentes. Uma falha no último horário desfaz também os anteriores. As RPCs existentes permanecem disponíveis com as mesmas assinaturas.

Agenda, detalhes, edição, checkout e histórico do CRM mostram o atendido. A edição troca a pessoa dentro do titular e zera a seleção ao trocar de titular. WhatsApp continua usando o telefone do titular e aceita `{atendido}` / `{para_quem}` em confirmação/remarcação; mensagens personalizadas antigas recebem a identificação do atendido quando necessário. Analytics por pessoa, fila e exports são PR 3.

## Auditoria do fluxo público atual (somente leitura, 27/10/2026)

O caminho atual é `pages/PublicBooking.tsx` → `useSubmitPublicBooking` em `hooks/usePublicBooking.ts` → `submitPublicBooking` em `services/publicBooking.ts` → `supabase.rpc('create_public_booking', rpcArgs)`. O serviço usa o singleton de `lib/supabase.ts`, construído com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; não há chave administrativa no navegador.

`PublicClientContext` guarda a sessão por telefone em localStorage. Essa sessão não autentica no Supabase Auth. Assim, visitante sem sessão Auth chama o PostgREST como **anon**. Se o navegador já tiver uma sessão Auth do gestor/staff, o singleton usa seu JWT e a chamada é **authenticated**. Não existe elevação de papel no frontend nem necessidade de autenticação anônima para esse fluxo.

Conferido via `pg_proc` em produção: a assinatura ativa é `create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)`; o último argumento tem default `[]`. A ACL inclui `anon`, `authenticated` e `service_role`, além de postgres. A função pertence a postgres e executa como **SECURITY DEFINER**, com `search_path=public`. Portanto, a suposição de ACL somente authenticated no plano de 25/10 já não corresponde ao estado consultado: o visitante anon pode chamar a RPC; dentro dela, os acessos usam o papel definidor.

Na criação normal, o serviço chama a RPC primeiro e depois tenta `upsert_public_client`; após receber o booking, a página também estabelece sua sessão pública por `upsertPublicClientSession`. Esse upsert por telefone não muda o papel do PostgREST. Edição usa `update_public_booking_by_client_v2`.

Há fallback de INSERT direto em `public_bookings` **somente quando a RPC é reconhecida como ausente** (`isMissingRpcError`), não para qualquer erro. Esse fallback não tem privilégio de INSERT como anon após o lockdown; não é um mecanismo de elevação nem uma alternativa funcional para visitante anon.

O corpo consultado valida campos obrigatórios, existência do negócio, profissional ativo do tenant, horário futuro e disponibilidade, com advisory lock. Lê aprovação automática no banco e materializa na mesma transação quando habilitada. Triggers existentes aplicam lead-time e bloqueios, notificam pedidos e publicam alterações de status.

Pontos que o PR 2 precisa revalidar explicitamente: o corpo atual apenas exige array de serviços não vazio e recebe preço/duração; não recalcula nele o conjunto de serviços, preço e duração de cada pessoa. Não há limitador dedicado ou contagem de dependentes/telefone no corpo consultado nem nos quatro triggers não internos de `public_bookings`. Não tratar a busca de booking ativo no frontend como rate limit transacional. Este PR não altera esse comportamento nem amplia o retorno dos lookups por telefone. Também foram conferidas as projeções de `get_public_client_by_phone`, `get_active_booking_by_phone`, `get_public_booking_by_id`, `get_booking_by_id_v2` e `get_client_bookings_history_v2`: nenhuma delas retorna as novas colunas de appointments ou consulta client_dependents.

## Validação

- `npx vitest run test/services/clientDependents.test.ts test/utils/appointmentAttendees.test.ts`: RED antes dos módulos; GREEN após a implementação.
- `scripts/test-sql-client-dependents.sh --red`: confirma falha antes da migration.
- `scripts/test-sql-client-dependents.sh`: Postgres descartável, helpers de agenda carregados das migrations existentes, usuários e dados fictícios. Testa dono, staff com a chave ligada e desligada, outro tenant, anon, limites, FKs, snapshots, sequência e conflito/bloqueio tardio. Aplica rollback e compara as definições de todas as funções preexistentes.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test --config e2e/client-dependents.config.ts`: backend totalmente simulado, sem gravar dados em produção.
- Gates aprovados: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test -- --run` (263 arquivos / 1.940 testes). SQL: 41 checks em PostgreSQL 17.11 descartável. Navegador: cinco testes aprovados, com dados fictícios.

Rollback em `docs/rollbacks/20261027083640_client_dependents_internal_booking.rollback.sql`. Executar apenas após retirar o frontend novo e exportar os dependentes/snapshots a preservar, pois o rollback remove os campos adicionados. Nenhuma migration foi aplicada em produção durante este trabalho.
