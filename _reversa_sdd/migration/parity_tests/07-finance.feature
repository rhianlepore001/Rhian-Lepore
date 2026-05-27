# spec-id: PARITY-07
# origem: code-analysis.md (finance), sdd/finance.md, gaps G4
# target: target_architecture.md BC-5 Finance
# paradigma: funcional leve (hooks + funcoes puras de calculo)
# regras: BR-MIGRAR-034 a 047

@paridade @critico
Funcionalidade: Financeiro e comissoes

  Cenario: Staff ve apenas transacoes proprias por professional_id
    Dado que um staff esta logado com teamMemberId "abc-123"
    Quando acessa /financeiro
    Entao ve apenas finance_records com professional_id = "abc-123"
    E NUNCA filtra por nome

  Cenario: Staff nao ve abas restritas
    Dado que um staff esta logado
    Quando acessa /financeiro
    Entao NAO ve aba "Comissoes"
    E NAO ve aba "Historico"
    E NAO ve aba "Insights"

  Cenario: Comissao com maquininha habilitada
    Dado que machine_fee_enabled e true
    E machine_fee_percent e 3.0
    E commission_rate e 40%
    E preco do atendimento e 100
    Quando a comissao e calculada
    Entao commission_base = 100 - (100 * 0.03) = 97
    E commission_value = 97 * 0.40 = 38.80

  Cenario: Settlement day em mes com menos dias
    Dado que commission_settlement_day e 31
    E o mes atual e abril (30 dias)
    Quando o periodo de acerto e calculado
    Entao usa dia 30 como fim do periodo

  Cenario: Pagamento de comissoes em lote
    Dado que existem 5 finance_records pendentes para profissional X
    Quando o owner clica "Pagar Comissoes"
    Entao o sistema chama RPC mark_commissions_as_paid
    E todos os 5 records sao marcados como commission_paid = true
    E um commission_payment e criado

  Cenario: Transacao manual sem appointment
    Dado que o owner quer registrar uma despesa
    Quando cria transacao manual tipo "expense"
    Entao INSERT em finance_records sem appointment_id
    E a transacao aparece no historico

  Cenario: Deletar receita automatica deleta appointment
    Dado que existe finance_record vinculado a appointment
    Quando o owner deleta a transacao
    Entao o finance_record e deletado
    E o appointment vinculado tambem e deletado

  Cenario: Exportacao CSV
    Dado que o owner esta na aba Historico
    Quando clica "Exportar CSV"
    Entao o sistema gera CSV com colunas: Data, Descricao, Tipo, Valor
    E o download inicia

  Cenario: Region awareness - moeda BR
    Dado que o owner tem region "BR"
    Quando valores sao exibidos
    Entao a moeda e "R$"
    E os metodos de pagamento incluem "PIX"

  Cenario: Region awareness - moeda PT
    Dado que o owner tem region "PT"
    Quando valores sao exibidos
    Entao a moeda e "EUR"
    E os metodos de pagamento incluem "MBWay"
