# spec-id: PARITY-06
# origem: code-analysis.md (fila), sdd/queue.md, gaps G2 G14 G15
# target: target_architecture.md BC-4 Queue
# paradigma: funcional leve (useFinishQueue mutation -> RPC atomica)
# regras: BR-MIGRAR-027 a 033

@paridade @critico
Funcionalidade: Fila digital

  Cenario: Cliente entra na fila
    Dado que o cliente acessa /queue/:slug
    Quando preenche nome e telefone e submete
    Entao queue_entry e criada com status "waiting"
    E o cliente ve posicao e tempo estimado

  Cenario: Verificacao de duplicata por telefone
    Dado que o cliente com telefone "11999999999" ja esta na fila
    Quando tenta entrar novamente com o mesmo telefone
    Entao o sistema bloqueia a entrada duplicada

  Cenario: Owner chama cliente
    Dado que existe cliente com status "waiting"
    Quando o owner clica "Chamar"
    Entao o status muda para "calling"
    E o cliente ouve som de notificacao

  Cenario: Timeout de calling volta para waiting
    Dado que uma entrada esta em status "calling" ha mais de 5 minutos
    Quando o timeout dispara
    Entao o status volta para "waiting"
    E NAO marca como no_show automaticamente

  Cenario: Finalizacao atomica via RPC
    Dado que um cliente esta em status "serving"
    Quando o owner finaliza com servico, preco e profissional
    Entao o sistema chama RPC finish_queue_entry
    E dentro da mesma transacao:
      | cria ou busca cliente em clients |
      | cria appointment "Completed" |
      | cria finance_record |
      | atualiza queue_entry para "completed" |
    E se qualquer etapa falhar, todas fazem rollback

  Cenario: Finalizacao com falha (rollback completo)
    Dado que um cliente esta em status "serving"
    E o INSERT em finance_records falha
    Quando o owner tenta finalizar
    Entao o appointment NAO e criado
    E a queue_entry permanece "serving"
    E o usuario ve mensagem de erro

  Cenario: RPC nao aceita spoofing de tenant
    Dado que staff ou owner esta autenticado no tenant X
    E existe queue_entry pertencente ao tenant Y
    Quando tenta chamar finish_queue_entry para a queue_entry do tenant Y
    Entao a RPC falha com erro de autorizacao
    E nenhum appointment nem finance_record e criado no tenant Y

  Cenario: Nao comparecimento
    Dado que um cliente esta na fila
    Quando o owner clica "Nao compareceu"
    Entao o status muda para "no_show"
    E NAO cria appointment nem finance_record

  Cenario: Tempo estimado
    Dado que o cliente esta na posicao 3 da fila
    Quando o tempo estimado e calculado
    Entao retorna 60 minutos (3 x 20 min)

  Cenario: Fallback polling
    Dado que a conexao WebSocket caiu
    Quando o cliente aguarda na tela de status
    Entao o sistema faz polling a cada 10 segundos
    E a posicao continua atualizada
