# Reversão do acompanhamento privado de fila e clube

Não executar automaticamente nem isoladamente do frontend. Este rollback reabre os acessos legados de fila por telefone e restaura a geração/expiração anterior dos tokens de agendamento. Não remove dados de negócio nem hashes; validades já encurtadas não são restauradas: o rollback não recalcula `expires_at` nem recupera seus valores anteriores. Após reaplicar a migration, cada remarcação sincroniza a validade com o novo horário + 48 horas, sem prazo adicional.

Arquivo: `20261020155608_private_queue_membership_tokens.rollback.sql`.

1. Avaliar a regressão de segurança e coordenar a versão do frontend com a reversão.
2. Aplicar o SQL de rollback na mesma base da migration, somente após autorização de publicação.
3. Conferir definições/ACLs restauradas e os fluxos da versão correspondente.
4. Para retornar ao fluxo seguro, reaplicar a migration; os hashes privados preservados continuam disponíveis até seu vencimento.

Validação local: `security/tests/private-booking-cycle.sh --public-access`, com PostgreSQL descartável. A comparação de definições e grants faz parte do ciclo automatizado.
