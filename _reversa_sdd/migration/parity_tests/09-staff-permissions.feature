# spec-id: PARITY-09
# origem: permissions.md
# target: BC-1 Identity
# regras: BR-MIGRAR-010, 013, 024, 033, 034, 035

@paridade @critico
Funcionalidade: Permissoes staff

  Cenario: Staff nao acessa /fila
    Dado que um staff esta logado
    Quando tenta acessar /fila
    Entao e redirecionado para /

  Cenario: Staff ve apenas seus agendamentos
    Dado que um staff esta logado com teamMemberId "abc-123"
    Quando acessa /agenda
    Entao ve apenas agendamentos com professional_id = "abc-123"

  Cenario: Staff nao cancela Completed
    Dado que um staff tenta cancelar agendamento "Completed"
    Entao o sistema bloqueia a acao

  Cenario: Staff ve financeiro por professional_id
    Dado que um staff esta logado
    Quando acessa /financeiro
    Entao filtra por professional_id, nunca por nome

  Cenario: Multi-tenant isolation
    Dado que staff A pertence ao owner X
    Quando staff A faz query
    Entao dados do owner Y nunca sao retornados

  Cenario: Staff nao consegue forjar company_id em RPC critica
    Dado que staff A pertence ao owner X
    E conhece um id valido do owner Y
    Quando tenta chamar RPC critica passando identificador do owner Y
    Entao a RPC deriva o tenant via auth.uid()
    E bloqueia acesso aos dados do owner Y
