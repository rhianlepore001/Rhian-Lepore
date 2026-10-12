# SPEC — Cadastro de dono sem perfil órfão

## Problema
- `handle_new_user` (AFTER INSERT em auth.users) tenta criar o profile, mas o trigger
  `ensure_email_confirmed` barra o INSERT: o GoTrue só grava `email_confirmed_at` ~100 ms depois.
  O `EXCEPTION WHEN OTHERS` engole o erro.
- O upsert de fallback no front recebe 42501 (o cliente não tem INSERT em profiles desde 20260918142111).
- Resultado: um dono sem profile/business_settings. A 2ª tentativa dá "e-mail já cadastrado" e o wizard
  entra em ping-pong com o ProtectedLayout (SecurityError replaceState no Safari → "Sistema interrompido").
- Os chunks de um deploy antigo ('Failed to fetch dynamically imported module') também caíam em "Sistema interrompido".

## Mudança
1. `check_email_confirmed` deixa passar quando `agendix.allow_profile_identity = on` (só uma função definer liga a flag;
   o cliente continua sem INSERT).
2. `ensure_owner_profile()` (SECURITY DEFINER, EXECUTE só para authenticated/service_role) é idempotente e atua
   só sobre `auth.uid()`. Cria o profile de dono (company_id = id, trial de 20 dias, dados do metadata) e o
   business_settings. Retorna `skipped_staff` para convite, membership ou role≠owner.
3. `log_signup_error` (migração 20261012130157, pendente em prod).
4. Front: o `register` usa a RPC (sem upsert). O `fetchProfileData` chama a RPC uma vez para dono sem perfil.
   O wizard só navega para '/' quando o AuthContext concorda, e senão sincroniza 1x e mostra "Tentar de novo".
   O erro de chunk mostra "Nova versão disponível" com 1 reload automático a cada 5 min.

## Critérios de aceite
- [ ] O cadastro estilo GoTrue (insert sem confirmação → update confirmando) cria o profile e o business_settings.
- [ ] A RPC cria o perfil correto para o órfão, é idempotente e nunca age sobre terceiros, anon, convite ou membership.
- [ ] O cliente continua sem INSERT em profiles, com e sem a flag. O não confirmado continua barrado sem a flag.
- [ ] O rollback exato fica em docs/rollbacks/ e as outras funções não mudam (md5).
- [ ] O registro não faz upsert direto. Um erro da RPC volta para a tela.
- [ ] O login do órfão cai no app sem loop (1 chamada à RPC).
- [ ] O wizard não fica em ping-pong.
- [ ] O chunk antigo leva à tela de nova versão com no máximo 1 reload automático.
- [ ] A prova em prod com rollback forçado mantém as contagens iguais. Os órfãos reais não são tocados.
