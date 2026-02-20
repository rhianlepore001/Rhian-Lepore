# Plano: Melhoria de Copywriting nas Mensagens de Agendamento

Este plano detalha a modernização das mensagens de confirmação enviadas via WhatsApp, transformando-as em comunicações mais profissionais, acolhedoras e persuasivas.

## User Review Required

> [!IMPORTANT]
> Proponho dois modelos de mensagem (Beauty e Barber) para garantir que o tom de voz se ajuste ao seu negócio. Por favor, confirme se as variáveis (Estabelecimento, Serviços, Data/Hora) estão de acordo com o desejado.

## Mudanças Propostas

### 1. Pesquisa e Descoberta (`explorer-agent`)
- [x] Identificar locais de envio de mensagem no código.
- [x] Mapear variáveis disponíveis em cada contexto.

### 2. Copywriting Profissional (`project-planner` / `orchestrator`)

#### Proposta para Estética (Beauty) ✨
"Olá, **{Nome}**! Tudo bem? ✨
Sua reserva na **{Estabelecimento}** está confirmada!
📅 **{Data}** às **{Hora}**
💼 **Serviços**: {Serviços}
📍 Local: estamos te esperando na {Estabelecimento}.

Estamos preparando tudo para te receber com a melhor experiência. Até logo! 💖"

#### Proposta para Barbearia (Barber) ✂️
"Fala, **{Nome}**! Seu horário está garantido! 🛡️
Marque na sua agenda:
🗓️ **{Data}** às **{Hora}**
✂️ **Serviço**: {Serviços}
📍 Onde: **{Estabelecimento}**.

Prepare-se para o trato! Nos vemos em breve. 👋"

### 3. Implementação (`frontend-specialist`)

#### [MODIFY] [AppointmentWizard.tsx](file:///c:/Users/User/Downloads/Rhian-Lepore-main/components/AppointmentWizard.tsx)
- Atualizar a lógica de construção da `message` na função `handleSubmit`.

#### [MODIFY] [Agenda.tsx](file:///c:/Users/User/Downloads/Rhian-Lepore-main/pages/Agenda.tsx)
- Atualizar a construção da `message` ao aceitar agendamentos públicos.

## Plano de Verificação

### Testes Manuais
- Criar um agendamento manual e verificar se o link do WhatsApp abre com a nova mensagem.
- Aceitar um agendamento público e validar a mensagem gerada.

---
**Agentes Envolvidos:**
- `project-planner`: Planejamento e Estratégia.
- `explorer-agent`: Mapeamento do código.
- `frontend-specialist`: Implementação das novas mensagens.
- `test-engineer`: Validação final.
