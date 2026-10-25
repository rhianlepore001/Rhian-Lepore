# Edição de clientes por colaboradores

A migration `supabase/migrations/20261025160000_staff_can_edit_clients.sql` está pendente de revisão do Rhian. Não foi aplicada em produção.

O padrão é desligado. Somente o dono altera a chave em Ajustes → Equipe. As policies existentes de `business_settings` foram conferidas por consulta somente de leitura em 25/10/2026: `Owner can manage business_settings`, `Settings: company read` e `Settings: owner update`; o harness reproduz essas três policies.

A leitura de clientes fica disponível para colaboradores. Com a chave ligada, a policy permite atualizar clientes da mesma empresa e a trigger impede alterar identificação, tenant, criação, fidelidade, visitas, predição, avaliação, origem ou estado ativo. A ficha e a lista de colaboradores não consultam a RPC de CRM nem os valores financeiros dos agendamentos. Cadastro rápido da Agenda mantém o comportamento existente.

## Verificação local

Somente fixtures fictícias, sem credenciais ou conexão a banco remoto:

```sh
scripts/test-sql-staff-edit-clients.sh
scripts/test-sql-staff-edit-clients.sh --rollback
```

Requer PostgreSQL local (`initdb`, `pg_ctl`, `psql`), configurável por `PGBIN`. O script cria um cluster descartável, escuta somente em socket Unix e remove tudo ao sair. O modo `--main` deve falhar: demonstra que o teste detecta a ausência da nova policy.

```sh
npm run typecheck
npm run lint
npm run build
npm test -- --run
```

E2E: `e2e/staff-edit-clients.spec.ts`, com `VITE_SUPABASE_URL=https://agendix-fictional.supabase.co` e `VITE_SUPABASE_ANON_KEY=fictional-test-key` no processo do Vite. Rode apenas esse spec no projeto `chromium-legacy` (sem setup de autenticação real). Todas as chamadas Supabase são interceptadas, e outros destinos externos são bloqueados. Cobre 390px e 1440px, edição de nome/notas, chave desligada e revogação com erro/zero linhas.

## Rollback após revisão

Para desabilitar edições sem remover schema, o dono desliga a chave em Ajustes → Equipe. A próxima tentativa de gravação é recusada pelo RLS, inclusive com a tela antiga aberta.

Para reverter o schema, revisar e executar manualmente `docs/rollbacks/20261025160000_staff_can_edit_clients.rollback.sql`. O arquivo fica fora do diretório de migrations para não ser descoberto como migration de avanço. Ele remove somente a policy, a trigger, as duas funções e a coluna adicionadas. As edições já salvas nos clientes são preservadas; as escolhas da chave são apagadas. Reaplicar a migration recria a chave desligada.

O frontend tolera a coluna ausente: colaboradores voltam à leitura, o controle do gestor fica indisponível. Não é necessário modificar configurações de produção ou Playwright. Nenhuma auditoria foi adicionada, pois o contexto existente não garante uma função de auditoria instalada em produção.
