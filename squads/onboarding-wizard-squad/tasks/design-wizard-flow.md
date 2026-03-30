# Task: design-wizard-flow
> Agent: ux-wizard-designer | Phase: 1 | elicit: false

## Objetivo

Definir wireframes, fluxo de navegação e comportamento de cada um dos 5 steps do wizard.

## Wireframes por Step

### Step 1 — Configurar Perfil do Negócio

```
┌─────────────────────────────────────────┐
│  [Step 1 de 5] ████░░░░░░               │
│                                         │
│  🏢 Vamos começar com seu negócio       │
│  Conte-nos sobre seu salão              │
│                                         │
│  Nome do negócio *                      │
│  ┌─────────────────────────────────┐   │
│  │ Ex: Salão Bella Vista           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Logo (opcional)                        │
│  ┌──────────┐                          │
│  │  📷 +   │  Fazer upload ou pular   │
│  └──────────┘                          │
│                                         │
│  Horário de funcionamento               │
│  [Seg-Sex] 09:00 – 18:00 ▼             │
│  [Sáb]     09:00 – 14:00 ▼             │
│  [Dom]     Fechado        ▼             │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │        Salvar e Continuar →      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
↑ Pointer aponta para campo "Nome do negócio"
```

**Elemento alvo do pointer:** `#business-name-input`
**Mensagem:** "Comece digitando o nome do seu negócio aqui"

---

### Step 2 — Cadastrar Primeiro Serviço

```
┌─────────────────────────────────────────┐
│  [Step 2 de 5] ████████░░░░             │
│                                         │
│  ✂️ Qual é o seu carro-chefe?           │
│  Cadastre o primeiro serviço            │
│                                         │
│  Nome do serviço *                      │
│  ┌─────────────────────────────────┐   │
│  │ Ex: Corte Masculino             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Duração          Preço *               │
│  ┌──────────┐     ┌──────────────┐     │
│  │ 60 min ▼ │     │ R$ 0,00      │     │
│  └──────────┘     └──────────────┘     │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │        Salvar e Continuar →      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
↑ Pointer aponta para campo "Nome do serviço"
```

**Elemento alvo do pointer:** `#service-name-input`
**Mensagem:** "Qual serviço você mais oferece?"

---

### Step 3 — Adicionar Primeiro Profissional

```
┌─────────────────────────────────────────┐
│  [Step 3 de 5] ████████████░░           │
│                                         │
│  👤 Quem faz a mágica acontecer?        │
│  Adicione o primeiro profissional       │
│                                         │
│  Nome do profissional *                 │
│  ┌─────────────────────────────────┐   │
│  │ Ex: Carlos Silva                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Especialidade                          │
│  ┌─────────────────────────────────┐   │
│  │ Cabeleireiro ▼                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Foto (opcional)                        │
│  ┌──────────┐                          │
│  │  📷 +   │                          │
│  └──────────┘                          │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │        Salvar e Continuar →      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
↑ Pointer aponta para campo "Nome do profissional"
```

**Elemento alvo do pointer:** `#professional-name-input`
**Mensagem:** "Adicione você mesmo ou seu primeiro colaborador"

---

### Step 4 — Criar Primeiro Agendamento

```
┌─────────────────────────────────────────┐
│  [Step 4 de 5] ████████████████░░       │
│                                         │
│  📅 Vamos testar o agendamento!         │
│  Crie seu primeiro horário marcado      │
│                                         │
│  Cliente                                │
│  ┌─────────────────────────────────┐   │
│  │ Nome do cliente                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Serviço            Profissional        │
│  ┌──────────┐       ┌──────────────┐   │
│  │ Corte ▼  │       │ Carlos ▼     │   │
│  └──────────┘       └──────────────┘   │
│                                         │
│  Data e Hora                            │
│  ┌─────────────────────────────────┐   │
│  │ 📅 20/03/2026  🕐 14:00         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │        Agendar e Continuar →     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
↑ Pointer aponta para o calendário da Agenda
```

**Elemento alvo do pointer:** `#agenda-calendar` (ou botão "Novo Agendamento")
**Mensagem:** "Seu calendário já está pronto para receber agendamentos"

---

### Step 5 — Configurar Link de Agendamento Público

```
┌─────────────────────────────────────────┐
│  [Step 5 de 5] ████████████████████     │
│                                         │
│  🔗 Compartilhe seu negócio!            │
│  Seu link de agendamento online         │
│                                         │
│  beautyos.app/                          │
│  ┌─────────────────────────────────┐   │
│  │ seu-salao                       │   │
│  └─────────────────────────────────┘   │
│  ✅ Disponível                          │
│                                         │
│  Clientes poderão agendar online        │
│  sem precisar ligar!                    │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │     🎉 Concluir Configuração     │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [Copiar link]  [Compartilhar]          │
└─────────────────────────────────────────┘
↑ Pointer aponta para o campo de slug
```

**Elemento alvo do pointer:** `#booking-slug-input`
**Mensagem:** "Este é seu link exclusivo de agendamento"

---

## Transições Entre Steps

| De | Para | Animação |
|----|------|----------|
| Step 1 → 2 | slide-left | `translateX(-100%) → translateX(0)` |
| Step 2 → 3 | slide-left | `translateX(-100%) → translateX(0)` |
| Step 3 → 4 | slide-left | `translateX(-100%) → translateX(0)` |
| Step 4 → 5 | slide-left | `translateX(-100%) → translateX(0)` |
| Qualquer → anterior | slide-right | `translateX(100%) → translateX(0)` |

**Duração:** 350ms | **Easing:** cubic-bezier(0.4, 0, 0.2, 1)

## Estados do Wizard Panel

- **Idle:** Instrução visível, botão "Continuar" habilitado
- **Loading:** Spinner no botão, form desabilitado
- **Success:** Flash verde + avança para próximo step
- **Error:** Toast de erro via AlertsContext, permanece no step atual
