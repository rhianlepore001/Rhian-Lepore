# Acompanhamento público por tokens privados — PR #160

Escopo: fila, clube e confirmação pendente de agendamento. Branch `security/hardening-audit`; sem merge, deploy ou migração remota.

## Contratos

- Fila: `join_queue_entry_private` cria entrada e SHA-256 do token na mesma transação. O aparelho guarda o token; o painel permite abrir seu link privado em outro aparelho. Leitura, posição/quadro e saída exigem o token da entrada. CPF/telefone e IDs não emitem nem recuperam tokens. Tickets antigos com prova de telefone são ignorados; o cliente deve falar com o estabelecimento se perdeu o link.
- Clube: `create_client_membership_private` cria solicitação e token na mesma transação. Repetir telefone de assinatura pendente, ativa ou atrasada não reemite token nem altera cadastro, plano ou pagamento. A área do cliente restaura `ClientMembershipPanel` e permite ver/cancelar exclusivamente o plano autorizado. Confirmação da adesão mostra link copiável e guarda token no aparelho. O proprietário pode usar **Copiar novo link privado** na lista de assinantes para planos antigos ou links perdidos: exige sessão de proprietário e tenant correto; rotaciona o token anterior. Nenhuma mensagem é enviada automaticamente.
- Agendamento: confirmação pendente consulta `get_public_booking_with_token` a cada 5 segundos, também ao voltar para a tela/reconectar. Para ao sair de `pending`, evita requisições simultâneas e ignora respostas após desmontagem. Nenhuma assinatura anônima do tópico de booking é necessária. A policy restrita a funcionários autorizados permanece.
- Legados sem token: não há backfill de credenciais, acesso por telefone nem fallback de tabela. A área de agendamento continua orientando **fale com o estabelecimento**; links inválidos/expirados também.

## Controles

- Tokens: `encode(gen_random_bytes(32),'hex')` do pgcrypto, resolvendo o schema da extensão; somente hash SHA-256 fica no banco privado. O teste usa pgcrypto no schema `extensions`.
- Agendamentos: vencem no horário original + 48 horas. Antecipar encurta o prazo para o novo horário + 48 horas; adiar nunca aumenta a validade. Tokens preexistentes são limitados ao horário atual + 48 horas. A coluna `expires_at` funciona como teto fixo, evitando renovações sucessivas por remarcação.
- Fila: validade fixa de entrada + 48 horas. Clube: validade fixa de um ano, renovável somente por emissão explícita do proprietário; cancelar preserva a leitura do estado cancelado até o vencimento.
- A edição de booking não aceita telefone diferente do já gravado e sempre repassa o telefone existente à implementação interna. A tela de edição também exibe telefone somente para leitura.
- `materialize_public_booking_appointment` e `accept_public_booking_v2`: `search_path=''`; relações e funções de aplicação já qualificadas.
- `index.html`: `meta name="referrer" content="no-referrer"`, cobrindo `/minha-area`, edição e demais rotas HashRouter. URLs privadas já estão após `/#/`. Tokens são redigidos pelo mecanismo existente de diagnóstico; superfícies com link privado ficam fora das capturas automáticas.
- Conferidos consumidores de `upsert_public_client`: o ID aleatório retornado é apenas mantido no contexto local de dados informados. Não é enviado para vínculo de fila, assinatura, agenda, upload nem query de CRM. Os fluxos de aceite autenticado resolvem o ID real no CRM por tenant; cadastro público não é prova de identidade.

## Migração e rollback

`supabase/migrations/20261020155608_private_queue_membership_tokens.sql` é aditiva. Armazena definições e ACLs anteriores em schema privado. Rollback correspondente em `docs/rollbacks/20261020155608_private_queue_membership_tokens.rollback.sql` restaura definições e ACLs, remove endpoints novos e trigger de expiração. Preserva tabelas de tokens/hashes e dados de negócio para reaplicação; não reestende validades já encurtadas. A extensão pgcrypto não é removida. A reversão reabre endpoints legados de fila por telefone: coordenar frontend e banco e avaliar a regressão de segurança antes de usar.

## Verificação e limites

- TDD frontend: quatro testes inicialmente vermelhos de fila/clube, seguidos pelos mesmos casos aprovados.
- TDD SQL: a versão anterior do branch falha em `BOOKING_EXPIRY_NOT_48H`; nova migration passa. Exercitados token correto/incorreto/ausente/expirado, outro ID/tenant, duplicidade de clube sem reemissão, status de fila e plano, saída/cancelamento, rotação do proprietário, legado sem token, expiração não extensível, ACLs e search_path.
- Falha forçada ao persistir hash reverte entrada/pagamento de fila e adesão/cadastro novo do clube. As regressões existentes de atomicidade de booking e preservação do CRM também passam.
- Ciclo SQL: aplicar duas vezes → testar → reverter → comparar definições/ACLs → reaplicar → testar. Fixture usa definições reais selecionadas de migrations e esquema mínimo explícito; não certifica catálogo remoto, PostgREST ou gateway Realtime.
- Documentação de funções e ACLs conferida no repositório oficial do Supabase (`apps/docs/content/guides/database/functions.mdx`). Índice de changelog em supabase.com indisponível por política de rede (403). Não há alteração de SDK.
- `graphify update .` não está instalado no ambiente (exit 127).
