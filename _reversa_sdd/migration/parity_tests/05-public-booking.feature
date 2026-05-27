# spec-id: PARITY-05
# origem: code-analysis.md (booking), sdd/agenda.md, sdd/public-booking.md
# target: target_architecture.md BC-3 Public Booking
# paradigma: funcional leve
# regras: BR-MIGRAR-015 a 017, 020, 021

@paridade @critico
Funcionalidade: Booking publico

  Cenario: Cliente cria booking com sucesso
    Dado que o cliente acessa /book/:slug
    E preenche nome, telefone, servicos, data e hora
    Quando submete o booking
    Entao o sistema cria public_booking com status "pending"
    E o owner ve o booking pendente na agenda

  Cenario: Prevencao de duplicata por telefone
    Dado que o cliente ja tem booking ativo com telefone "11999999999"
    Quando tenta criar novo booking com o mesmo telefone
    Entao o sistema detecta duplicata via get_active_booking_by_phone
    E exibe o booking existente
    E NAO permite novo booking

  Cenario: Owner aceita booking e busca cliente em 3 formatos
    Dado que existe booking pendente com telefone "11987654321"
    E o cliente esta cadastrado com telefone "+5511987654321"
    Quando o owner aceita o booking
    Entao o sistema encontra o cliente existente
    E cria appointment "Confirmed" vinculado ao cliente
    E atualiza public_booking status para "confirmed"

  Cenario: Owner aceita booking e cria novo cliente
    Dado que existe booking pendente com telefone nao cadastrado
    Quando o owner aceita o booking
    Entao o sistema cria novo cliente no CRM
    E espelha via mirror_public_client_to_crm
    E cria appointment "Confirmed"

  Cenario: Cliente edita booking existente
    Dado que o cliente acessa link com ?edit=BOOKING_ID
    Quando altera data/hora e submete
    Entao is_edit e marcado como true
    E original_appointment_time e preservado
    E owner recebe novo booking pending

  Cenario: Owner aceita booking editado e atualiza appointment
    Dado que existe booking com is_edit=true
    Quando o owner aceita
    Entao o sistema busca appointment original por client_id + original_appointment_time
    E faz INSERT de novo appointment (nao UPDATE do original)
    E preserva o appointment original como historico
