# spec-id: PARITY-03
# origem: code-analysis.md (agenda), sdd/agenda.md
# target: target_architecture.md BC-2 Scheduling
# paradigma: funcional leve (useCreateBooking mutation)
# regras: BR-MIGRAR-011, 018, 025, 026

@paridade @critico
Funcionalidade: Criar agendamento

  Cenario: Criar agendamento via wizard com sucesso
    Dado que o owner selecionou um cliente, servicos, data e horario disponivel
    Quando confirma o agendamento
    Entao o sistema chama RPC create_secure_booking
    E o agendamento aparece com status "Confirmed"
    E o evento setup-step-completed e disparado

  Cenario: Colisao de horario detectada
    Dado que o profissional ja tem agendamento no mesmo horario
    Quando o owner tenta criar novo agendamento
    Entao a RPC retorna erro de colisao
    E o agendamento NAO e criado
    E o usuario ve alerta de colisao

  Cenario: Auto-atribuicao com 1 profissional
    Dado que o time tem apenas 1 profissional
    Quando o owner cria agendamento sem selecionar profissional
    Entao o sistema atribui automaticamente o unico profissional

  Cenario: Auto-atribuicao com multiplos profissionais
    Dado que o time tem 3 profissionais
    E o owner seleciona "qualquer profissional"
    Quando confirma o agendamento
    Entao o sistema chama get_first_available_professional
    E atribui o primeiro disponivel

  Cenario: Horarios em intervalos de 30 min
    Dado que o owner abre o seletor de horario
    Quando a lista de slots e carregada
    Entao os horarios estao em intervalos de 30 minutos
    E o range e de 8h ate 20h
