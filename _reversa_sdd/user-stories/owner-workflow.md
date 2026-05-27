# User Stories — Fluxo do Proprietário (Owner)

> Gerado pelo Reversa Writer em 2026-05-06
> Nível: Detalhado

---

## US-001: Registro e Onboarding

**Como** dono de barbearia/salão
**Quero** me registrar e configurar meu negócio
**Para** começar a usar o sistema

### Critérios de Aceitação
- [ ] Devo preencher email, senha, nome e nome do negócio
- [ ] Recebo trial de 7 dias automaticamente
- [ ] Sou guiado por wizard de onboarding (2 ou 5 steps)
- [ ] Posso cadastrar serviços durante o onboarding
- [ ] Onboarding persiste progresso se eu sair e voltar
- [ ] Após completar, sou redirecionado para o dashboard

---

## US-002: Dashboard e Métricas

**Como** dono
**Quero** ver receita do dia, meta mensal e saúde do negócio
**Para** acompanhar meu desempenho

### Critérios de Aceitação
- [ ] Vejo receita do dia calculada de appointments completed
- [ ] Vejo meta mensal (configurável, default 15000)
- [ ] Vejo progresso percentual da meta
- [ ] Vejo score de saúde do negócio (Financial Doctor)
- [ ] Vejo ações sugeridas (recovery, gap, upsell)
- [ ] Vejo banner de comissões 1 dia antes do acerto
- [ ] Vejo banner de atendimentos não concluídos após 20h

---

## US-003: Agenda e Agendamentos

**Como** dono
**Quero** criar, editar e concluir agendamentos
**Para** organizar meus atendimentos

### Critérios de Aceitação
- [ ] Crio agendamento via wizard (cliente → serviços → data/hora → revisão)
- [ ] Sistema verifica colisão de horário server-side
- [ ] Aceito reservas públicas pendentes
- [ ] Ao aceitar, sistema sincroniza cliente com CRM
- [ ] Concluo agendamento com checkout (pagamento + taxa de maquininha)
- [ ] Checkout cria registro financeiro automaticamente
- [ ] Posso cancelar agendamentos (exceto já finalizados)

---

## US-004: Reserva Pública

**Como** dono
**Quero** receber reservas de clientes via link
**Para** aumentar minha base de clientes

### Critérios de Aceitação
- [ ] Tenho slug único para link de reserva (`/book/:slug`)
- [ ] Cliente escolhe serviços, data, profissional
- [ ] Recebo notificação em tempo real de nova reserva
- [ ] Posso aceitar ou recusar reservas
- [ ] Cliente pode editar reserva existente
- [ ] Sistema previne duplicata por telefone

---

## US-005: Fila Digital

**Como** dono
**Quero** gerenciar uma fila de espera para walk-ins
**Para** atender clientes sem agendamento

### Critérios de Aceitação
- [ ] Cliente entra na fila via QR code/link
- [ ] Vejo lista de espera em tempo real
- [ ] Chamo cliente (notificação sonora)
- [ ] Inicio atendimento
- [ ] Finalizo atendimento (cria appointment + finance)
- [ ] Posso marcar não comparecimento

---

## US-006: Clientes e CRM

**Como** dono
**Quero** gerenciar meus clientes e ver histórico
**Para** fidelizar e reter clientes

### Critérios de Aceitação
- [ ] Vejo lista de clientes com tiers (Bronze/Silver/Gold/Platinum)
- [ ] Sincronizo clientes públicos automaticamente
- [ ] Crio cliente manualmente com foto
- [ ] Edito dados do cliente
- [ ] Soft delete (preserva histórico)
- [ ] Vejo previsão de próxima visita
- [ ] Salvo observações com memória semântica (RAG)

---

## US-007: Equipe e Comissões

**Como** dono
**Quero** cadastrar profissionais e gerenciar comissões
**Para** remunerar minha equipe

### Critérios de Aceitação
- [ ] Cadastro profissionais com foto, bio, especialidades
- [ ] Gero link de convite para staff
- [ ] Configuro taxa de comissão por profissional
- [ ] Configuro dia de acerto mensal
- [ ] Configuro taxa de maquininha (débito/crédito)
- [ ] Vejo comissões pendentes por profissional
- [ ] Pago comissões em lote
- [ ] Compartilho resumo via WhatsApp

---

## US-008: Financeiro

**Como** dono
**Quero** controlar receitas, despesas e lucro
**Para** ter saúde financeira do negócio

### Critérios de Aceitação
- [ ] Vejo visão geral com receita, despesa, lucro
- [ ] Registro transações manuais (receita/despesa)
- [ ] Despesas podem ser pagas ou pendentes
- [ ] Vejo insights (projeção, taxa de retorno, horário de pico)
- [ ] Vejo histórico mensal (12 meses) com growth%
- [ ] Exporto transações em CSV
- [ ] Deleto transação (cascade com appointment se aplicável)

---

## US-009: Configurações Gerais

**Como** dono
**Quero** configurar meu negócio
**Para** personalizar o sistema

### Critérios de Aceitação
- [ ] Edito nome, telefone, endereço
- [ ] Upload de logo e foto de capa
- [ ] Configuro horário de funcionamento
- [ ] Habilito/desabilito booking público
- [ ] Habilito upsells e seleção de profissional
- [ ] Configuro política de cancelamento

---

## US-010: Assinatura

**Como** dono
**Quero** assinar um plano pago
**Para** continuar usando após o trial

### Critérios de Aceitação
- [ ] Vejo planos Solo e Equipe
- [ ] Preços adaptados por região (BR/PT)
- [ ] Checkout via Stripe
- [ ] Assinatura ativa após pagamento
- [ ] Posso alterar plano

---

## US-011: Segurança

**Como** dono
**Quero** proteger minha conta
**Para** evitar acessos não autorizados

### Critérios de Aceitação
- [ ] Configuro 2FA TOTP
- [ ] Posso adicionar múltiplos dispositivos
- [ ] Posso remover dispositivos

---

## US-012: Auditoria e Lixeira

**Como** dono (dev)
**Quero** ver logs e restaurar itens deletados
**Para** auditoria e recuperação

### Critérios de Aceitação
- [ ] Vejo logs de auditoria com diff campo-a-campo
- [ ] Filtro por ação, recurso, data
- [ ] Exporto logs em CSV
- [ ] Vejo itens na lixeira (30 dias)
- [ ] Restauro itens deletados
- [ ] Vejo logs de erros do sistema

---

*Fim das user stories do proprietário.*
