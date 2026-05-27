# User Stories — Fluxo do Cliente Final

> Gerado pelo Reversa Writer em 2026-05-06
> Nível: Detalhado

---

## US-C01: Reserva Pública

**Como** cliente
**Quero** agendar um horário online
**Para** não precisar ligar

### Critérios de Aceitação
- [ ] Acesso link do estabelecimento (`/book/:slug`)
- [ ] Vejo nome, rating, galeria do estabelecimento
- [ ] Seleciono serviços (com upsells se habilitado)
- [ ] Seleciono data (dias lotados marcados)
- [ ] Seleciono horário (slots disponíveis)
- [ ] Seleciono profissional (ou "qualquer")
- [ ] Preencho nome, telefone, email
- [ ] Aceito política de cancelamento
- [ ] Posso enviar foto (opcional)
- [ ] Recebo confirmação de reserva pending
- [ ] Acompanho status em tempo real

---

## US-C02: Editar Reserva

**Como** cliente
**Quero** alterar minha reserva
**Para** remarcar se necessário

### Critérios de Aceitação
- [ ] Acesso link com `?edit=BOOKING_ID`
- [ ] Vejo dados da reserva atual
- [ ] Posso alterar serviços, data ou profissional
- [ ] Submeto edição
- [ ] Sistema marca como edição
- [ ] Owner recebe como novo booking pending

---

## US-C03: Fila Digital

**Como** cliente
**Quero** entrar na fila de espera
**Para** ser atendido sem agendamento

### Critérios de Aceitação
- [ ] Acesso QR code/link da fila (`/queue/:slug`)
- [ ] Preencho nome e telefone
- [ ] Seleciono serviço (opcional)
- [ ] Seleciono profissional (opcional)
- [ ] Recebo posição na fila
- [ ] Vejo tempo estimado de espera
- [ ] Recebo notificação sonora quando chamado
- [ ] Acompanho status em tempo real

---

## US-C04: Portal do Cliente

**Como** cliente
**Quero** ver meu histórico e gerenciar reservas
**Para** ter controle dos meus agendamentos

### Critérios de Aceitação
- [ ] Acesso `/minha-area/:slug`
- [ ] Autentico com telefone
- [ ] Se não cadastrado: formulário de registro
- [ ] Vejo histórico de reservas
- [ ] Vejo reservas futuras
- [ ] Posso cancelar reservas pending
- [ ] Posso editar perfil

---

## US-C05: Reagendamento

**Como** cliente
**Quero** remarcar minha reserva
**Para** ajustar meu horário

### Critérios de Aceitação
- [ ] Acesso portal do cliente
- [ ] Seleciono reserva futura
- [ ] Clico "Remarcar" (se habilitado pelo owner)
- [ ] Escolho novo horário
- [ ] Sistema atualiza reserva

---

*Fim das user stories do cliente final.*
