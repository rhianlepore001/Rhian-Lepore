# spec-id: PARITY-04
# origem: code-analysis.md (checkout), sdd/agenda.md R11, gaps G3
# target: target_architecture.md BC-2 Scheduling
# paradigma: funcional leve (useCheckout mutation -> RPC atomica)
# regras: BR-MIGRAR-014, 019, 022

@paridade @critico
Funcionalidade: Checkout de atendimento

  Cenario: Checkout atomico via RPC
    Dado que um agendamento com status "Confirmed" esta pronto para checkout
    Quando o owner seleciona metodo de pagamento e confirma
    Entao o sistema chama RPC complete_appointment
    E o appointment muda para "Completed"
    E um finance_record e criado atomicamente
    E ambos estao vinculados

  Cenario: Checkout com taxa de maquininha debito
    Dado que machine_fee_enabled e true
    E debit_fee_percent e 2.5
    Quando o owner seleciona pagamento em debito
    Entao machine_fee_amount = preco * 0.025
    E o finance_record registra machine_fee_percent e machine_fee_amount

  Cenario: Checkout com taxa de maquininha credito
    Dado que machine_fee_enabled e true
    E credit_fee_percent e 4.0
    Quando o owner seleciona pagamento em credito
    Entao machine_fee_amount = preco * 0.04

  Cenario: Checkout com desconto percentual
    Dado que base_price e 100
    E desconto e 20%
    Quando o checkout e finalizado
    Entao price e 80
    E finance_record.revenue e 80

  Cenario: Checkout com preco customizado maior que base
    Dado que base_price e 50
    E o owner altera o preco para 70
    Quando o checkout e finalizado
    Entao price e 70
    E a UI marca como "Preco Customizado"

  @paridade
  Cenario: Sem fallback client-side
    Dado que a RPC complete_appointment falhou
    Quando o sistema tenta completar
    Entao exibe erro ao usuario
    E NAO executa UPDATE + INSERT separados no client-side
    E o appointment permanece "Confirmed"
