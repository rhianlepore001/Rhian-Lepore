# SEC-02 — link privado por agendamento (20/10/2026)

## Critérios de aceite

1. Agendar continua público, sem conta, OTP, email ou SMS de validação.
2. Telefone/sufixo não autoriza leitura de cadastro, histórico, edição ou cancelamento. Sem pré-preenchimento remoto ou de sessão pública antiga no formulário.
3. Nome, email, telefone e foto do CRM existente permanecem intactos, inclusive por mirror, aceite manual e confirmação automática. Dados divergentes permanecem no pedido.
4. Cada criação gera uma capacidade nova e exclusiva daquele pedido, dentro da mesma transação. Token inválido, ausente, expirado ou de outro ID não lê nem altera pedido.
5. Link aparece e pode ser copiado após agendar. Nenhuma mensagem externa é enviada. Remarcação e cancelamento mantêm as validações de negócio das funções existentes.
6. Tokens não entram em logs, contexto de erro, screenshots automáticos ou broadcasts. Banco guarda apenas SHA-256 em schema privado.
7. Migração aditiva, reaplicável, com rollback sem apagar pedidos/tokens. Sem merge/deploy.

## Implementação e evidências

Migração oficial: `supabase/migrations/20261020122744_private_booking_access.sql`; rollback: `docs/rollbacks/20261020122744_private_booking_access.rollback.sql`.

- Token: concatenação de dois `gen_random_uuid()` criptográficos, 64 caracteres hexadecimais, **244 bits aleatórios** (não confundir comprimento de 256 bits com entropia). Expira no maior entre criação + 30 dias e horário + 7 dias; remarcação estende o prazo quando necessário. PK por booking torna a consulta constante por ID/índice. A hash não fica em `public_bookings` nem em payload de Realtime.
- Wrappers chamam criação/edição/cancelamento reais, mantendo locks, disponibilidade, aceite e cutoff. Acesso validado antes da operação elevada; sem autorização por telefone. Criação não chama upsert do perfil e só guarda email enviado no pedido. Registro novo do CRM continua no aceite/materialização.
- Todas as sobrecargas encontradas dos RPCs legados de cadastro/booking por telefone perdem EXECUTE para PUBLIC, anon e authenticated. Não se concede acesso alternativo ao histórico, perfil, clube ou fila usando token de booking.
- `upsert_public_client` não atualiza cadastro existente e não insere espelho se já houver cliente no CRM; resposta ecoa apenas dados enviados e identificador aleatório, sem revelar cadastro/ID canônico. Mirror não sobrescreve conflito; aceite/materialização/fallback não copiam foto para CRM existente.
- Broadcast `booking:<id>` passa a exigir sessão do tenant; frontend público usa polling autenticado pelo token. Novo teste cobre anon, sessão sem tenant, proprietário B e proprietário correto.
- `private-booking-cycle.sh`: baseline falha com `SEC02_PHONE_READS_PII`, `SEC02_OVERWRITES_CLIENT` e ausência do endpoint novo; aplicação duplicada passa; rollback restaura definições originais e ACLs semanticamente equivalentes; problema antigo volta conforme esperado; reaplicação passa. Retém tabela/hash/dados para reversibilidade. Falha forçada ao gravar token reverte também pedido, atendimento e CRM novo.
- Vitest: serviço de privacidade inicialmente 4/4 falhando; diagnóstico 2/2 falhando; edição inválida 2/2 falhando; fallback de fila 1 falhando. Após correções passam. Casos novos da área privada e regressões de cartões/erros também executados; totais finais em `security/tests/results.md`.

## Revisões separadas

| Revisor | Escopo e execução independente | Nota |
|---|---|---|
| `/root/review_billing` | Ciclo PostgreSQL completo, leitura crítica de DEFINER/search_path/ACL/rollback; suplemento com três definições reais de Clube/Fila confirma revoke → restore → revoke | **9,1/10**, aprovado somente no escopo SQL local |
| `/root/review_urls` | 119/119 testes em 12 arquivos: página real, serviço, cartão, área privada, diagnósticos, screenshots e fila; diff sem whitespace inválido | **9,2/10**, aprovado somente no escopo frontend local |

O revisor identificou token em logs, edição inválida virando criação, upload descartado e acesso de clube incompatível com revoke. Esses pontos foram corrigidos e reavaliados. Sem relato de regressão de segurança conhecida no escopo de booking revisado. O teste explícito de proprietário B no Realtime e o teste de atomicidade foram acrescentados após a revisão inicial e passaram no ciclo final do autor. O suplemento de ACL do revisor foi incorporado ao runner versionado; não equivale a teste funcional de Clube/Fila.

## Riscos residuais e plano operacional

- O link é uma credencial: quem o recebe acessa somente aquele pedido. Sem recuperação por telefone. Agendamentos anteriores sem token e links perdidos exigem contato com o estabelecimento; não foi criado backfill nem emissor público por ID/telefone.
- Perda de resposta de rede após criação pode exigir atendimento manual; idempotência de criação não foi adicionada. Não fazer retries automáticos que produzam nova reserva.
- Clube: consulta/cancelamento públicos por telefone bloqueados; portal informa contato com estabelecimento e oferece só link ao catálogo. Criação/benefícios/pagamentos de clube ainda usam telefone em caminhos separados e exigem revisão específica. Fila: recuperação só por telefone bloqueada; ticket/consulta por UUID guardado seguem contrato anterior, sem certificação global neste patch.
- Não há Supabase completo/HTTP/Realtime gateway ou navegador integrado certificado. Fixtures têm tabelas reduzidas e funções/policies reais selecionadas. Sem E2E remoto, entrega de mensagens ou dados reais.
- Antes de produção: conferir catálogo/ACL/policies efetivos e dependências no staging autorizado; testar migrations e frontend juntos, inclusive clientes legados. A revogação dos endpoints antigos exige janela coordenada: frontend antigo perde acesso imediatamente após migração. Preparar versão e plano de manutenção, sem aplicação automática.
- Rollback é manual e coordenado com o frontend; **reabre os acessos antigos vulneráveis**. O SQL preserva dados/hashes e revoga wrappers novos. Não aplicar em produção sem avaliação explícita; uma reversão de aplicativo isolada não é suficiente.
- A-05, política de senhas, Supabase pago, CSP enforce, preços/planos e configurações Auth permanecem sem alteração.
