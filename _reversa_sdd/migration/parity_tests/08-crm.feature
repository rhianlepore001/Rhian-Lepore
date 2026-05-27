# spec-id: PARITY-08
# origem: code-analysis.md (clients/crm), sdd/clients-crm.md
# target: target_architecture.md BC-6 CRM
# paradigma: funcional leve
# regras: BR-MIGRAR-051, 052

@paridade
Funcionalidade: CRM clientes

  Cenario: Loyalty tier calculado por visitas
    Dado que um cliente tem 8 visitas completadas
    Quando o tier e calculado
    Entao retorna "Silver"

  Cenario: Loyalty tier Bronze
    Dado que um cliente tem 3 visitas
    Quando o tier e calculado
    Entao retorna "Bronze"

  Cenario: Loyalty tier Platinum
    Dado que um cliente tem 35 visitas
    Quando o tier e calculado
    Entao retorna "Platinum"

  Cenario: Deduplicacao por telefone
    Dado que existe cliente com telefone "+5511987654321"
    Quando o sistema tenta criar cliente com telefone "11987654321"
    Entao detecta que e o mesmo cliente
    E NAO cria duplicata

  Cenario: Sincronizacao de public_clients para CRM
    Dado que existe public_client com telefone nao cadastrado em clients
    Quando a sincronizacao roda
    Entao o cliente e criado em clients
    E loyalty_tier e "Bronze"
    E total_visits e 0
    E source e "agendamento_online"
