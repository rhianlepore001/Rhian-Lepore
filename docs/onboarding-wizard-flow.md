# Onboarding Wizard Flow — Beauty OS
> Agente: Luma (UX Wizard Designer) | Squad: onboarding-wizard-squad | Fase: 1
> Data: 2026-03-20 | Branch: ux-teste

---

## Sumario

1. [Visao Geral do Fluxo](#1-visao-geral-do-fluxo)
2. [Step 1 — Configurar Perfil do Negocio](#2-step-1--configurar-perfil-do-negocio)
3. [Step 2 — Cadastrar Primeiro Servico](#3-step-2--cadastrar-primeiro-servico)
4. [Step 3 — Adicionar Primeiro Profissional](#4-step-3--adicionar-primeiro-profissional)
5. [Step 4 — Criar Primeiro Agendamento](#5-step-4--criar-primeiro-agendamento)
6. [Step 5 — Configurar Link de Agendamento Publico](#6-step-5--configurar-link-de-agendamento-publico)
7. [Especificacao de Transicoes](#7-especificacao-de-transicoes)
8. [Estados do Wizard Panel](#8-estados-do-wizard-panel)
9. [Mapa de IDs DOM](#9-mapa-de-ids-dom)
10. [Handoff para Core Developer](#10-handoff-para-core-developer)

---

## 1. Visao Geral do Fluxo

### Diagrama ASCII — Fluxo Completo

```
┌────────────────────────────────────────────────────────────────┐
│                     BEAUTY OS — BOOT                           │
│                                                                │
│   [Usuario faz login pela primeira vez]                        │
│                         │                                      │
│                         ▼                                      │
│          ┌──────────────────────────────┐                     │
│          │  AuthContext: verificar       │                     │
│          │  onboarding_progress via     │                     │
│          │  company_id                  │                     │
│          └──────────────────────────────┘                     │
│                         │                                      │
│           ┌─────────────┴─────────────┐                       │
│           │                           │                        │
│      is_completed = true         is_completed = false          │
│      (ou registro existe)        (ou registro nulo)            │
│           │                           │                        │
│           ▼                           ▼                        │
│     [App Normal]          [navigate → /#/onboarding]          │
│     Dashboard                         │                        │
│                                       ▼                        │
│                          ┌────────────────────────┐           │
│                          │   WizardOverlay ativo   │           │
│                          │   Overlay = black/70    │           │
│                          │   z-index: 9995         │           │
│                          └────────────────────────┘           │
│                                       │                        │
│                    ┌──────────────────▼──────────────────┐    │
│                    │                                      │    │
│              ┌─────▼──────┐                              │    │
│              │  STEP 1    │                              │    │
│              │  Perfil do │  [Pointer aponta para]       │    │
│              │  Negocio   │  #business-name-input        │    │
│              └─────┬──────┘                              │    │
│                    │ [Salvar e Continuar]                 │    │
│                    ▼  slide-left 350ms                    │    │
│              ┌─────▼──────┐                              │    │
│              │  STEP 2    │                              │    │
│              │  Primeiro  │  [Pointer aponta para]       │    │
│              │  Servico   │  #service-name-input         │    │
│              └─────┬──────┘                              │    │
│                    │ [Salvar e Continuar]                 │    │
│                    ▼  slide-left 350ms                    │    │
│              ┌─────▼──────┐                              │    │
│              │  STEP 3    │                              │    │
│              │  Primeiro  │  [Pointer aponta para]       │    │
│              │ Profission.│  #professional-name-input    │    │
│              └─────┬──────┘                              │    │
│                    │ [Salvar e Continuar]                 │    │
│                    ▼  slide-left 350ms                    │    │
│              ┌─────▼──────┐                              │    │
│              │  STEP 4    │                              │    │
│              │  Primeiro  │  [Pointer aponta para]       │    │
│              │ Agendament.│  #agenda-calendar            │    │
│              └─────┬──────┘                              │    │
│                    │ [Agendar e Continuar]               │    │
│                    ▼  slide-left 350ms                    │    │
│              ┌─────▼──────┐                              │    │
│              │  STEP 5    │                              │    │
│              │  Link de   │  [Pointer aponta para]       │    │
│              │ Agendament.│  #booking-slug-input         │    │
│              └─────┬──────┘                              │    │
│                    │ [Concluir Configuracao]             │    │
│                    │                                      │    │
│                    └──────────────────────────────────┐  │    │
│                                                       │  │    │
│                    onboarding_progress.is_completed   │  │    │
│                    = true → navigate('/#/dashboard')  │  │    │
│                                                       ▼  │    │
│                          ┌────────────────────────┐  │  │    │
│                          │      DASHBOARD          │  │  │    │
│                          │   Setup concluido!      │  │  │    │
│                          └────────────────────────┘  │  │    │
│                                                       │  │    │
└───────────────────────────────────────────────────────┘  │    │
                                                            └────┘
```

### Fluxo Simplificado (Referencia Rapida)

```
[Primeiro Login]
      │
      ▼
[is_completed? nao] ──→ /#/onboarding
                               │
                    ┌──────────▼──────────┐
                    │  WizardOverlay ON   │
                    └──────────┬──────────┘
                               │
            Step 1: Perfil     → salva companies
                    ↓
            Step 2: Servico    → salva services
                    ↓
            Step 3: Profission.→ salva team_members
                    ↓
            Step 4: Agendament.→ salva appointments
                    ↓
            Step 5: Link       → salva companies.booking_slug
                    ↓
            [Dashboard] ← onboarding_progress.is_completed = true
```

---

## 2. Step 1 — Configurar Perfil do Negocio

### Wireframe ASCII — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERLAY (background rgba(0,0,0,0.70) + backdrop-blur-sm)           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WIZARD PANEL (glassmorphism, z-index: 9997)                 │  │
│  │                                                              │  │
│  │  [Step 1 de 5]  ████████░░░░░░░░░░░░  20%                   │  │
│  │                                                              │  │
│  │  Icone: [Predio/Edificio]                                    │  │
│  │  Titulo: Vamos comecar com seu negocio                       │  │
│  │  Subtitulo: Conte-nos sobre seu salao                        │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  Nome do negocio *                                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Ex: Salao Bella Vista                                │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                          ↑                                   │  │
│  │  [POINTER / SETA AMBER]  │                                   │  │
│  │  Tooltip: "Comece digitando o nome do seu negocio aqui"      │  │
│  │                                                              │  │
│  │  Logo (opcional)                                             │  │
│  │  ┌──────────────┐                                           │  │
│  │  │   [Camara]   │   Fazer upload ou pular                   │  │
│  │  │    + icone   │   Formatos: JPG, PNG, SVG (max 2MB)       │  │
│  │  └──────────────┘                                           │  │
│  │                                                              │  │
│  │  Horario de funcionamento                                    │  │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ Seg-Sex   ▼  │  │ 09:00 ▼  │  │ 18:00 ▼  │              │  │
│  │  └──────────────┘  └──────────┘  └──────────┘              │  │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ Sabado    ▼  │  │ 09:00 ▼  │  │ 14:00 ▼  │              │  │
│  │  └──────────────┘  └──────────┘  └──────────┘              │  │
│  │  ┌──────────────┐  ┌───────────────────────┐               │  │
│  │  │ Domingo   ▼  │  │       Fechado      ▼  │               │  │
│  │  └──────────────┘  └───────────────────────┘               │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Salvar e Continuar →                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  (botao amber-400, desabilitado se nome vazio)               │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Wireframe ASCII — Mobile (380px)

```
┌─────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))     │
│                                 │
│  ╔═══════════════════════════╗  │
│  ║  BOTTOM SHEET (z: 9997)  ║  │
│  ║                           ║  │
│  ║  [Step 1 de 5] ██░░░░ 20%║  │
│  ║                           ║  │
│  ║  Vamos comecar com seu   ║  │
│  ║  negocio                  ║  │
│  ║                           ║  │
│  ║  Nome do negocio *        ║  │
│  ║  ┌─────────────────────┐ ║  │
│  ║  │ Ex: Salao Bella...  │ ║  │
│  ║  └─────────────────────┘ ║  │
│  ║         ↑ POINTER        ║  │
│  ║                           ║  │
│  ║  Logo (opcional)          ║  │
│  ║  [📷+] Pular             ║  │
│  ║                           ║  │
│  ║  Horarios                 ║  │
│  ║  [Seg-Sex][09:00][18:00] ║  │
│  ║  [Sab    ][09:00][14:00] ║  │
│  ║  [Dom    ][   Fechado  ] ║  │
│  ║                           ║  │
│  ║  [Salvar e Continuar →]  ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

### Especificacao do Pointer — Step 1

| Propriedade | Valor |
|-------------|-------|
| `elementId` | `business-name-input` |
| `position` | `top` |
| `message` | "Comece digitando o nome do seu negocio aqui" |
| `arrowDirection` | Para baixo (↓) apontando ao campo |
| `offset` | `{ top: -60, left: 0 }` (acima do input) |
| `animation` | `wizard-pointer-bounce` (3 pulsos verticais) |

### Campos do Formulario — Step 1

| Campo | Tipo | Obrigatorio | Validacao | Placeholder |
|-------|------|-------------|-----------|-------------|
| `businessName` | `text` | Sim | minLength: 2, maxLength: 100 | "Ex: Salao Bella Vista" |
| `logoFile` | `file` | Nao | accept: image/*, maxSize: 2MB | — |
| `schedule[].day` | `select` | Nao | enum: Seg-Sex, Sab, Dom | — |
| `schedule[].openTime` | `time` | Nao | HH:MM format | "09:00" |
| `schedule[].closeTime` | `time` | Nao | HH:MM, > openTime | "18:00" |
| `schedule[].isClosed` | `boolean` | Nao | — | false |

### Persistencia no Supabase — Step 1

**Tabela:** `companies`

| Campo | Tipo | Valor |
|-------|------|-------|
| `name` | `text` | `businessName` |
| `logo_url` | `text` | URL apos upload no Supabase Storage |
| `business_hours` | `jsonb` | Array de `{ day, open, close, is_closed }` |
| `updated_at` | `timestamptz` | `NOW()` |

**Tabela:** `onboarding_progress`

| Campo | Valor |
|-------|-------|
| `current_step` | `2` |
| `completed_steps` | `[1]` |
| `metadata.step1_completed_at` | `NOW()` |

---

## 3. Step 2 — Cadastrar Primeiro Servico

### Wireframe ASCII — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))                                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WIZARD PANEL (z-index: 9997)                                │  │
│  │                                                              │  │
│  │  [Step 2 de 5]  ████████████████░░░░  40%                   │  │
│  │                                                              │  │
│  │  Icone: [Tesoura]                                            │  │
│  │  Titulo: Qual e o seu carro-chefe?                           │  │
│  │  Subtitulo: Cadastre o primeiro servico                      │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  Nome do servico *                                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Ex: Corte Masculino                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                          ↑                                   │  │
│  │  [POINTER / SETA AMBER]  │                                   │  │
│  │  Tooltip: "Qual servico voce mais oferece?"                   │  │
│  │                                                              │  │
│  │  Duracao *                        Preco *                    │  │
│  │  ┌─────────────────────────┐  ┌──────────────────────┐     │  │
│  │  │  60 min              ▼  │  │  R$ 0,00             │     │  │
│  │  └─────────────────────────┘  └──────────────────────┘     │  │
│  │  [15, 30, 45, 60, 90, 120 min]                               │  │
│  │                                                              │  │
│  │  Categoria (opcional)                                        │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Cabelo                                           ▼  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  [Cabelo, Barba, Unhas, Maquiagem, Estetica, Outros]         │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Salvar e Continuar →                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  (desabilitado se nome ou preco vazio)                       │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Wireframe ASCII — Mobile (380px)

```
┌─────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))     │
│                                 │
│  ╔═══════════════════════════╗  │
│  ║  BOTTOM SHEET (z: 9997)  ║  │
│  ║                           ║  │
│  ║  [Step 2 de 5] ████ 40%  ║  │
│  ║                           ║  │
│  ║  Qual e o seu              ║  │
│  ║  carro-chefe?              ║  │
│  ║                           ║  │
│  ║  Nome do servico *        ║  │
│  ║  ┌─────────────────────┐ ║  │
│  ║  │ Ex: Corte Masculino │ ║  │
│  ║  └─────────────────────┘ ║  │
│  ║         ↑ POINTER        ║  │
│  ║                           ║  │
│  ║  Duracao     Preco *      ║  │
│  ║  [60 min ▼]  [R$ 0,00]  ║  │
│  ║                           ║  │
│  ║  Categoria                ║  │
│  ║  [Cabelo              ▼] ║  │
│  ║                           ║  │
│  ║  [Salvar e Continuar →]  ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

### Especificacao do Pointer — Step 2

| Propriedade | Valor |
|-------------|-------|
| `elementId` | `service-name-input` |
| `position` | `top` |
| `message` | "Qual servico voce mais oferece?" |
| `arrowDirection` | Para baixo (↓) apontando ao campo |
| `offset` | `{ top: -60, left: 0 }` |
| `animation` | `wizard-pointer-bounce` |

### Campos do Formulario — Step 2

| Campo | Tipo | Obrigatorio | Validacao | Placeholder |
|-------|------|-------------|-----------|-------------|
| `serviceName` | `text` | Sim | minLength: 2, maxLength: 100 | "Ex: Corte Masculino" |
| `duration` | `select` | Sim | enum: 15, 30, 45, 60, 90, 120 | "60" |
| `price` | `number` | Sim | min: 0.01, max: 99999.99 | "0,00" |
| `category` | `select` | Nao | enum: Cabelo/Barba/Unhas/Maquiagem/Estetica/Outros | "Cabelo" |

### Persistencia no Supabase — Step 2

**Tabela:** `services`

| Campo | Tipo | Valor |
|-------|------|-------|
| `company_id` | `uuid` | `user.company_id` (do AuthContext) |
| `name` | `text` | `serviceName` |
| `duration_minutes` | `int` | `duration` (em minutos) |
| `price` | `numeric(10,2)` | `price` |
| `category` | `text` | `category` (opcional) |
| `is_active` | `boolean` | `true` |
| `created_at` | `timestamptz` | `NOW()` |

**Tabela:** `onboarding_progress`

| Campo | Valor |
|-------|-------|
| `current_step` | `3` |
| `completed_steps` | `[1, 2]` |
| `metadata.first_service_id` | ID do servico recém criado |
| `metadata.step2_completed_at` | `NOW()` |

---

## 4. Step 3 — Adicionar Primeiro Profissional

### Wireframe ASCII — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))                                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WIZARD PANEL (z-index: 9997)                                │  │
│  │                                                              │  │
│  │  [Step 3 de 5]  ████████████████████████░░  60%             │  │
│  │                                                              │  │
│  │  Icone: [Pessoa/Usuario]                                     │  │
│  │  Titulo: Quem faz a magica acontecer?                        │  │
│  │  Subtitulo: Adicione o primeiro profissional                 │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  Nome do profissional *                                      │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Ex: Carlos Silva                                     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                          ↑                                   │  │
│  │  [POINTER / SETA AMBER]  │                                   │  │
│  │  Tooltip: "Adicione voce mesmo ou seu primeiro colaborador"  │  │
│  │                                                              │  │
│  │  Especialidade                                               │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Cabeleireiro                                     ▼  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  [Cabeleireiro, Barbeiro, Manicure, Maquiador, Esteticista]  │  │
│  │                                                              │  │
│  │  Foto (opcional)                                             │  │
│  │  ┌──────────────┐                                           │  │
│  │  │   [Camara]   │   Fazer upload                            │  │
│  │  │    + icone   │   JPG, PNG (max 2MB)                      │  │
│  │  └──────────────┘                                           │  │
│  │                                                              │  │
│  │  Servicos que realiza (opcional)                             │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │  [x] Corte Masculino    [ ] Barba    [ ] Outro...    │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │  (pre-selecionado com o servico criado no Step 2)            │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Salvar e Continuar →                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Wireframe ASCII — Mobile (380px)

```
┌─────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))     │
│                                 │
│  ╔═══════════════════════════╗  │
│  ║  BOTTOM SHEET (z: 9997)  ║  │
│  ║                           ║  │
│  ║  [Step 3 de 5] ██████ 60%║  │
│  ║                           ║  │
│  ║  Quem faz a magica         ║  │
│  ║  acontecer?                ║  │
│  ║                           ║  │
│  ║  Nome do profissional *   ║  │
│  ║  ┌─────────────────────┐ ║  │
│  ║  │ Ex: Carlos Silva    │ ║  │
│  ║  └─────────────────────┘ ║  │
│  ║         ↑ POINTER        ║  │
│  ║                           ║  │
│  ║  Especialidade            ║  │
│  ║  [Cabeleireiro        ▼] ║  │
│  ║                           ║  │
│  ║  Foto [📷+] (opcional)   ║  │
│  ║                           ║  │
│  ║  [Salvar e Continuar →]  ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

### Especificacao do Pointer — Step 3

| Propriedade | Valor |
|-------------|-------|
| `elementId` | `professional-name-input` |
| `position` | `top` |
| `message` | "Adicione voce mesmo ou seu primeiro colaborador" |
| `arrowDirection` | Para baixo (↓) apontando ao campo |
| `offset` | `{ top: -60, left: 0 }` |
| `animation` | `wizard-pointer-bounce` |

### Campos do Formulario — Step 3

| Campo | Tipo | Obrigatorio | Validacao | Placeholder |
|-------|------|-------------|-----------|-------------|
| `professionalName` | `text` | Sim | minLength: 2, maxLength: 100 | "Ex: Carlos Silva" |
| `specialty` | `select` | Nao | enum: Cabeleireiro/Barbeiro/Manicure/Maquiador/Esteticista/Outro | "Cabeleireiro" |
| `photoFile` | `file` | Nao | accept: image/*, maxSize: 2MB | — |
| `serviceIds` | `uuid[]` | Nao | IDs validos de services da empresa | pre-selecionado step2 |

### Persistencia no Supabase — Step 3

**Tabela:** `team_members`

| Campo | Tipo | Valor |
|-------|------|-------|
| `company_id` | `uuid` | `user.company_id` |
| `name` | `text` | `professionalName` |
| `specialty` | `text` | `specialty` |
| `photo_url` | `text` | URL apos upload (opcional) |
| `is_active` | `boolean` | `true` |
| `created_at` | `timestamptz` | `NOW()` |

**Tabela:** `team_member_services` (tabela de relacao)

| Campo | Tipo | Valor |
|-------|------|-------|
| `team_member_id` | `uuid` | ID do profissional criado |
| `service_id` | `uuid` | IDs dos servicos selecionados |

**Tabela:** `onboarding_progress`

| Campo | Valor |
|-------|-------|
| `current_step` | `4` |
| `completed_steps` | `[1, 2, 3]` |
| `metadata.first_professional_id` | ID do profissional criado |
| `metadata.step3_completed_at` | `NOW()` |

---

## 5. Step 4 — Criar Primeiro Agendamento

### Wireframe ASCII — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))                                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WIZARD PANEL (z-index: 9997)                                │  │
│  │                                                              │  │
│  │  [Step 4 de 5]  ████████████████████████████████░░  80%     │  │
│  │                                                              │  │
│  │  Icone: [Calendario]                                         │  │
│  │  Titulo: Vamos testar o agendamento!                         │  │
│  │  Subtitulo: Crie seu primeiro horario marcado                │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  Cliente (opcional para teste)                               │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Nome do cliente (ou deixe "Cliente Teste")           │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  Servico *                    Profissional *                 │  │
│  │  ┌────────────────────┐  ┌───────────────────────┐         │  │
│  │  │  Corte Masculino ▼ │  │  Carlos Silva       ▼ │         │  │
│  │  └────────────────────┘  └───────────────────────┘         │  │
│  │  (pre-populado com step 2)    (pre-populado com step 3)      │  │
│  │                                                              │  │
│  │  Data *                       Hora *                         │  │
│  │  ┌────────────────────┐  ┌───────────────────────┐         │  │
│  │  │  📅 20/03/2026     │  │  🕐 14:00             │         │  │
│  │  └────────────────────┘  └───────────────────────┘         │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │   [INFO] Duracao estimada: 60 min (14:00 → 15:00)   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Agendar e Continuar →                   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                   ↑                                                  │
│           [POINTER / SETA AMBER]                                     │
│           Tooltip: "Seu calendario ja esta pronto                    │
│                     para receber agendamentos"                       │
│                                                                      │
│   [Fundo: pagina Agenda visivel atras do overlay]                   │
│   [Elemento destacado: #agenda-calendar ou botao "Novo Agendamento"]│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Wireframe ASCII — Mobile (380px)

```
┌─────────────────────────────────┐
│  [Agenda visivel ao fundo]      │
│                                 │
│  ╔═══════════════════════════╗  │
│  ║  BOTTOM SHEET (z: 9997)  ║  │
│  ║                           ║  │
│  ║  [Step 4 de 5] ████ 80%  ║  │
│  ║                           ║  │
│  ║  Vamos testar o            ║  │
│  ║  agendamento!              ║  │
│  ║                           ║  │
│  ║  Cliente                  ║  │
│  ║  ┌─────────────────────┐ ║  │
│  ║  │ Cliente Teste       │ ║  │
│  ║  └─────────────────────┘ ║  │
│  ║                           ║  │
│  ║  Servico *                ║  │
│  ║  [Corte Masculino     ▼] ║  │
│  ║                           ║  │
│  ║  Profissional *           ║  │
│  ║  [Carlos Silva        ▼] ║  │
│  ║                           ║  │
│  ║  Data *      Hora *       ║  │
│  ║  [20/03/26]  [14:00]    ║  │
│  ║                           ║  │
│  ║  Duracao: 60min           ║  │
│  ║                           ║  │
│  ║  [Agendar e Continuar →] ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

### Especificacao do Pointer — Step 4

| Propriedade | Valor |
|-------------|-------|
| `elementId` | `agenda-calendar` |
| `position` | `bottom` |
| `message` | "Seu calendario ja esta pronto para receber agendamentos" |
| `arrowDirection` | Para cima (↑) apontando ao calendario |
| `offset` | `{ top: 20, left: 0 }` (abaixo do elemento) |
| `animation` | `wizard-pointer-bounce` |
| `fallbackElementId` | `new-appointment-button` |

### Campos do Formulario — Step 4

| Campo | Tipo | Obrigatorio | Validacao | Valor Padrao |
|-------|------|-------------|-----------|--------------|
| `clientName` | `text` | Nao | maxLength: 100 | "Cliente Teste" |
| `serviceId` | `select` | Sim | ID valido de service | ID criado no step 2 |
| `teamMemberId` | `select` | Sim | ID valido de team_member | ID criado no step 3 |
| `appointmentDate` | `date` | Sim | >= hoje | data atual |
| `appointmentTime` | `time` | Sim | dentro do horario de funcionamento | "14:00" |

### Persistencia no Supabase — Step 4

**Tabela:** `appointments`

| Campo | Tipo | Valor |
|-------|------|-------|
| `company_id` | `uuid` | `user.company_id` |
| `client_name` | `text` | `clientName` (ou "Cliente Teste") |
| `service_id` | `uuid` | `serviceId` |
| `team_member_id` | `uuid` | `teamMemberId` |
| `scheduled_at` | `timestamptz` | `appointmentDate + appointmentTime` |
| `status` | `text` | `"confirmed"` |
| `created_at` | `timestamptz` | `NOW()` |

**Tabela:** `onboarding_progress`

| Campo | Valor |
|-------|-------|
| `current_step` | `5` |
| `completed_steps` | `[1, 2, 3, 4]` |
| `metadata.first_appointment_id` | ID do agendamento criado |
| `metadata.step4_completed_at` | `NOW()` |

---

## 6. Step 5 — Configurar Link de Agendamento Publico

### Wireframe ASCII — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))                                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WIZARD PANEL (z-index: 9997)                                │  │
│  │                                                              │  │
│  │  [Step 5 de 5]  ████████████████████████████████████████ 100%│  │
│  │                                                              │  │
│  │  Icone: [Link/Corrente]                                      │  │
│  │  Titulo: Compartilhe seu negocio!                            │  │
│  │  Subtitulo: Seu link de agendamento online                   │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  beautyos.app/                                               │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ seu-salao                                            │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │          ↑                                                   │  │
│  │  [POINTER / SETA AMBER]                                      │  │
│  │  Tooltip: "Este e seu link exclusivo de agendamento"         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ Estado de disponibilidade do slug:                     │ │  │
│  │  │                                                        │ │  │
│  │  │   ✅ "seu-salao" — Disponivel!                        │ │  │
│  │  │   ❌ "seu-salao" — Ja em uso, tente outro            │ │  │
│  │  │   ⏳ Verificando disponibilidade...                   │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  Preview do link publico:                                    │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  🔗 beautyos.app/seu-salao                          │  │  │
│  │  │  Clientes poderao agendar online sem precisar ligar! │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │          🎉 Concluir Configuracao                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐     │  │
│  │  │   [Copiar link]     │  │   [Compartilhar]          │     │  │
│  │  └─────────────────────┘  └──────────────────────────┘     │  │
│  │  (botoes secundarios, aparecem apos slug valido)             │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Wireframe ASCII — Mobile (380px)

```
┌─────────────────────────────────┐
│  OVERLAY (rgba(0,0,0,0.70))     │
│                                 │
│  ╔═══════════════════════════╗  │
│  ║  BOTTOM SHEET (z: 9997)  ║  │
│  ║                           ║  │
│  ║  [Step 5 de 5] ████ 100% ║  │
│  ║                           ║  │
│  ║  Compartilhe seu          ║  │
│  ║  negocio!                  ║  │
│  ║                           ║  │
│  ║  beautyos.app/            ║  │
│  ║  ┌─────────────────────┐ ║  │
│  ║  │ seu-salao           │ ║  │
│  ║  └─────────────────────┘ ║  │
│  ║         ↑ POINTER        ║  │
│  ║                           ║  │
│  ║  ✅ Disponivel!           ║  │
│  ║                           ║  │
│  ║  🔗 beautyos.app/seu-... ║  │
│  ║  Clientes agendam online! ║  │
│  ║                           ║  │
│  ║  [🎉 Concluir Config.]   ║  │
│  ║                           ║  │
│  ║  [Copiar] [Compartilhar] ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

### Especificacao do Pointer — Step 5

| Propriedade | Valor |
|-------------|-------|
| `elementId` | `booking-slug-input` |
| `position` | `top` |
| `message` | "Este e seu link exclusivo de agendamento" |
| `arrowDirection` | Para baixo (↓) apontando ao campo slug |
| `offset` | `{ top: -60, left: 0 }` |
| `animation` | `wizard-pointer-bounce` |

### Campos do Formulario — Step 5

| Campo | Tipo | Obrigatorio | Validacao | Placeholder |
|-------|------|-------------|-----------|-------------|
| `bookingSlug` | `text` | Sim | minLength: 3, maxLength: 50, regex: `^[a-z0-9-]+$` | "seu-salao" |
| `slugAvailable` | `boolean` | — | Verificado via debounce (500ms) no Supabase | — |

### Persistencia no Supabase — Step 5

**Tabela:** `companies`

| Campo | Tipo | Valor |
|-------|------|-------|
| `booking_slug` | `text UNIQUE` | `bookingSlug` (lowercase, sem espacos) |
| `booking_enabled` | `boolean` | `true` |
| `updated_at` | `timestamptz` | `NOW()` |

**Tabela:** `onboarding_progress`

| Campo | Valor |
|-------|-------|
| `current_step` | `5` |
| `completed_steps` | `[1, 2, 3, 4, 5]` |
| `is_completed` | `true` |
| `completed_at` | `NOW()` |
| `metadata.booking_slug` | slug configurado |
| `metadata.step5_completed_at` | `NOW()` |

---

## 7. Especificacao de Transicoes

### Tabela de Animacoes Entre Steps

| De       | Para     | Tipo       | Transform Entrada                        | Transform Saida                          | Duracao | Easing                        |
|----------|----------|------------|------------------------------------------|------------------------------------------|---------|-------------------------------|
| Step 1   | Step 2   | slide-left | `translateX(100%) → translateX(0)`       | `translateX(0) → translateX(-100%)`      | 350ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Step 2   | Step 3   | slide-left | `translateX(100%) → translateX(0)`       | `translateX(0) → translateX(-100%)`      | 350ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Step 3   | Step 4   | slide-left | `translateX(100%) → translateX(0)`       | `translateX(0) → translateX(-100%)`      | 350ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Step 4   | Step 5   | slide-left | `translateX(100%) → translateX(0)`       | `translateX(0) → translateX(-100%)`      | 350ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Qualquer | Anterior | slide-right| `translateX(-100%) → translateX(0)`      | `translateX(0) → translateX(100%)`       | 350ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Step 5   | Dashboard| fade-out   | `opacity(1) → opacity(0) + scale(0.95)` | — (overlay fecha)                        | 500ms   | `cubic-bezier(0.4, 0, 0.2, 1)` |

### Animacao do Pointer (Keyframes)

```css
/* Bounce vertical para seta apontando para baixo (↓) */
@keyframes wizard-pointer-bounce {
  0%   { transform: translateY(0px); }
  40%  { transform: translateY(-10px); }
  60%  { transform: translateY(-5px); }
  80%  { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

/* Configuracao da animacao */
.wizard-pointer {
  animation: wizard-pointer-bounce 1.2s ease-in-out infinite;
  color: #fbbf24; /* amber-400 */
}
```

### Transicao do Pointer Entre Steps

| Evento | Comportamento |
|--------|---------------|
| Step avancar | Pointer faz fade-out (opacity 0, 150ms) enquanto conteudo slide-left |
| Novo step carregado | Pointer faz fade-in (opacity 1, 200ms) na posicao do novo `elementId` |
| Elemento alvo nao encontrado | Pointer se posiciona no centro do panel (fallback) |
| Elemento fora da viewport | Pointer ancora na borda mais proxima + scroll automatico |

### Sequencia de Transicao (Exemplo Step 1 → Step 2)

```
T+0ms    Usuario clica "Salvar e Continuar"
T+0ms    setIsLoading(true) — spinner no botao
T+~200ms Supabase INSERT concluido
T+200ms  dispatch({ type: 'COMPLETE_STEP', step: 1 })
T+200ms  Pointer fade-out inicia (150ms)
T+200ms  Conteudo atual: translateX(0) → translateX(-100%) inicia (350ms)
T+200ms  Novo conteudo: translateX(100%) → translateX(0) inicia (350ms)
T+550ms  Transicao concluida, novo step visivel
T+550ms  Pointer fade-in inicia no novo elementId (200ms)
T+750ms  Pointer bounce animation inicia
```

---

## 8. Estados do Wizard Panel

### Diagrama de Estados

```
┌─────────┐
│  IDLE   │ ── usuario preenche form ──▶ valida campos
└────┬────┘
     │ usuario clica "Salvar"
     ▼
┌─────────┐
│ LOADING │ ── spinner no botao, form desabilitado
└────┬────┘
     │
     ├── Supabase error ──▶ ┌─────────┐
     │                      │  ERROR  │
     │                      └────┬────┘
     │                           │ permanece no step atual
     │                           │ toast de erro (AlertsContext)
     │                           ▼
     │                      [volta ao IDLE]
     │
     └── Supabase success ──▶ ┌─────────┐
                               │ SUCCESS │
                               └────┬────┘
                                    │ flash verde (200ms)
                                    │ dispatch COMPLETE_STEP
                                    │ transicao animada
                                    ▼
                               [proximo step — IDLE]
```

### Tabela de Estados e Comportamentos

| Estado | Botao Submit | Formulario | Pointer | Feedback Visual |
|--------|-------------|-----------|---------|-----------------|
| **Idle** | Habilitado (se campos validos) | Editavel | Animando (bounce) | Nenhum |
| **Loading** | Spinner `"Salvando..."` | `disabled` | Pausa animacao | Spinner no botao |
| **Success** | — | — | Fade-out | Flash verde (border-green-400) no panel, 200ms |
| **Error** | Reabilita | Editavel | Retoma animacao | Toast via `showAlert('mensagem', 'error')` |

### Mensagens de Erro por Validacao

| Step | Situacao | Mensagem do Toast |
|------|----------|-------------------|
| Step 1 | Nome do negocio vazio | "O nome do negocio e obrigatorio" |
| Step 1 | Logo > 2MB | "A imagem deve ter no maximo 2MB" |
| Step 1 | Erro ao salvar | "Erro ao salvar perfil. Tente novamente." |
| Step 2 | Nome do servico vazio | "O nome do servico e obrigatorio" |
| Step 2 | Preco invalido | "Informe um preco valido maior que zero" |
| Step 2 | Erro ao salvar | "Erro ao cadastrar servico. Tente novamente." |
| Step 3 | Nome do profissional vazio | "O nome do profissional e obrigatorio" |
| Step 3 | Erro ao salvar | "Erro ao adicionar profissional. Tente novamente." |
| Step 4 | Data no passado | "Escolha uma data a partir de hoje" |
| Step 4 | Conflito de horario | "Este horario ja esta ocupado para este profissional" |
| Step 4 | Erro ao salvar | "Erro ao criar agendamento. Tente novamente." |
| Step 5 | Slug indisponivel | "Este link ja esta em uso. Tente outro nome." |
| Step 5 | Slug com caracteres invalidos | "Use apenas letras minusculas, numeros e hifens" |
| Step 5 | Erro ao salvar | "Erro ao configurar link. Tente novamente." |

---

## 9. Mapa de IDs DOM

### Tabela Completa de ElementIds por Step

| Step | `elementId` | Tipo HTML | Position do Pointer | Descricao |
|------|-------------|-----------|---------------------|-----------|
| 1 | `business-name-input` | `<input type="text">` | `top` | Campo nome do negocio |
| 1 | `logo-upload-button` | `<button>` | `right` | Botao de upload do logo (alternativo) |
| 1 | `business-hours-section` | `<div>` | `left` | Secao de horarios (alternativo) |
| 2 | `service-name-input` | `<input type="text">` | `top` | Campo nome do servico |
| 2 | `service-price-input` | `<input type="number">` | `top` | Campo preco (alternativo) |
| 2 | `service-duration-select` | `<select>` | `bottom` | Duracao do servico (alternativo) |
| 3 | `professional-name-input` | `<input type="text">` | `top` | Campo nome do profissional |
| 3 | `professional-specialty-select` | `<select>` | `bottom` | Especialidade (alternativo) |
| 4 | `agenda-calendar` | `<div>` | `bottom` | Calendario da Agenda |
| 4 | `new-appointment-button` | `<button>` | `bottom` | Botao "Novo Agendamento" (fallback) |
| 4 | `appointment-date-input` | `<input type="date">` | `top` | Data do agendamento (alternativo) |
| 5 | `booking-slug-input` | `<input type="text">` | `top` | Campo do slug do link publico |
| 5 | `slug-availability-status` | `<span>` | `bottom` | Status de disponibilidade (alternativo) |
| 5 | `copy-link-button` | `<button>` | `right` | Botao copiar link (alternativo) |

### Convencoes de Nomenclatura de IDs

```
Formato: {contexto}-{tipo-elemento}-{acao-ou-campo}

Exemplos:
  business-name-input       ✅ (contexto=business, tipo=input, campo=name)
  service-price-input       ✅ (contexto=service, tipo=input, campo=price)
  agenda-calendar           ✅ (contexto=agenda, tipo=component)
  booking-slug-input        ✅ (contexto=booking, tipo=input, campo=slug)

  inputNome                 ❌ (camelCase, sem contexto)
  field1                    ❌ (sem descricao semantica)
  form-input-business       ❌ (ordem errada)
```

### Regras de Posicionamento do Pointer

```
Position = "top"    → Pointer aparece ACIMA do elemento, seta aponta PARA BAIXO (↓)
Position = "bottom" → Pointer aparece ABAIXO do elemento, seta aponta PARA CIMA (↑)
Position = "left"   → Pointer aparece A ESQUERDA, seta aponta PARA A DIREITA (→)
Position = "right"  → Pointer aparece A DIREITA, seta aponta PARA A ESQUERDA (←)

Prioridade em mobile (< 768px):
  - Sempre usar "top" ou "bottom"
  - "left"/"right" sao convertidos para "bottom" automaticamente
```

---

## 10. Handoff para Core Developer

### Resumo de Implementacao por Componente

#### WizardOverlay.tsx

```typescript
// Responsabilidades:
// 1. Renderizar o overlay escurecido (rgba(0,0,0,0.70) + backdrop-blur)
// 2. Posicionar o WizardPointer no elementId correto
// 3. Bloquear scroll do body quando ativo
// 4. Gerenciar z-index layers

// Z-index Stack:
// 9995: Overlay background
// 9996: Spotlight (box-shadow no elemento destacado)
// 9997: Wizard Panel (card com formulario)
// 9998: WizardPointer (seta/tooltip)
// 9999: Toast notifications (AlertsContext)
```

#### WizardPointer.tsx

```typescript
// Props esperadas:
interface WizardPointerProps {
  elementId: string;           // ID do elemento alvo no DOM
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;             // Texto do tooltip
  isVisible: boolean;          // Controla fade in/out
}

// Comportamento de posicionamento:
// 1. getBoundingClientRect() no elementId
// 2. Calcular posicao do pointer baseado em position + offset
// 3. Usar position: fixed para acompanhar scroll
// 4. ResizeObserver para recalcular ao redimensionar janela
// 5. Fallback: se elementId nao encontrado, centralizar no panel
```

#### WizardContext.tsx

```typescript
// State machine com useReducer:
interface WizardState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: number[];
  isLoading: boolean;
  isCompleted: boolean;
  metadata: {
    firstServiceId?: string;
    firstProfessionalId?: string;
    firstAppointmentId?: string;
    bookingSlug?: string;
  };
}

// Actions:
type WizardAction =
  | { type: 'COMPLETE_STEP'; step: 1 | 2 | 3 | 4 | 5 }
  | { type: 'GO_BACK' }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_METADATA'; key: string; value: unknown }
  | { type: 'COMPLETE_WIZARD' };
```

#### lib/onboarding.ts

```typescript
// Funcoes de persistencia:
// saveOnboardingStep(companyId, nextStep, completedSteps, metadata?)
// getOnboardingProgress(companyId) → OnboardingProgress | null
// markOnboardingComplete(companyId, slug)
// checkSlugAvailability(slug) → boolean (com debounce de 500ms)

// CRITICO: sempre company_id do AuthContext, nunca de parametro externo
```

### Classes Tailwind Recomendadas

```css
/* Overlay */
fixed inset-0 z-[9995] bg-black/70 backdrop-blur-sm

/* Wizard Panel — Desktop */
fixed z-[9997] bg-black/90 backdrop-blur-xl
border border-white/10 rounded-2xl p-6
max-w-md w-full mx-auto mt-20

/* Wizard Panel — Mobile (bottom sheet) */
fixed bottom-0 left-0 right-0 z-[9997]
bg-black/90 backdrop-blur-xl
border-t border-white/10
rounded-t-2xl p-6

/* Input padrao */
w-full bg-white/5 border border-white/10 rounded-lg
px-4 py-3 text-white placeholder-white/30
focus:outline-none focus:border-amber-400 transition-colors

/* Botao primario */
w-full bg-amber-400 text-black font-semibold py-3 rounded-xl
hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed
transition-all duration-200

/* Barra de progresso — preenchida */
h-1.5 bg-amber-400 rounded-full transition-all duration-500

/* Barra de progresso — vazia */
h-1.5 bg-white/10 rounded-full
```

### Deteccao de Primeiro Login (AuthContext)

```typescript
// Em AuthContext.tsx — apos autenticacao bem-sucedida:
const checkOnboardingStatus = async (companyId: string) => {
  const { data } = await supabase
    .from('onboarding_progress')
    .select('is_completed, current_step')
    .eq('company_id', companyId)
    .single();

  if (!data || !data.is_completed) {
    navigate('/#/onboarding');
  }
};
```

### Rota no App.tsx

```typescript
// Adicionar como lazy-loaded route:
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

// Na definicao de rotas:
<Route path="/onboarding" element={
  <Suspense fallback={<LoadingSpinner />}>
    <Onboarding />
  </Suspense>
} />
// Nao requer ProtectedLayout? Sim, requer — usuario ja esta autenticado
```

### Checklist de Acessibilidade (WCAG 2.1 AA)

| Item | Implementacao |
|------|---------------|
| Foco preso no wizard | `focus-trap` no WizardPanel (ver US-031 — ja implementado no projeto) |
| Esc fecha wizard | `onKeyDown: e.key === 'Escape' → pauseWizard()` |
| ARIA labels nos inputs | `aria-label` em todos os campos (ver US-0305) |
| Contraste do texto | Texto white em fundo dark/90 = ratio 15:1 (passa AA) |
| Anuncio de mudanca de step | `aria-live="polite"` no header do panel |
| Botao com estado loading | `aria-busy="true"` durante loading |
| Pointer acessivel | `aria-hidden="true"` (decorativo), tooltip via `aria-describedby` |

### Dependencias e Imports Necessarios

```typescript
// Imports que o core-developer vai precisar em cada step:
import { useState } from 'react';
import { useWizard } from '../WizardContext';        // state machine
import { useAuth } from '@/contexts/AuthContext';    // company_id
import { useAlerts } from '@/contexts/AlertsContext'; // toasts
import { supabase } from '@/lib/supabase';           // queries
import { saveOnboardingStep } from '@/lib/onboarding'; // helper
import { WizardProgress } from '../WizardProgress';  // barra progresso

// SEM imports de libs externas de onboarding/tour
// SEM Driver.js, Shepherd.js, Intro.js ou similares
```

### Ordem de Implementacao Recomendada

```
1. WizardContext.tsx        → State machine (base de tudo)
2. lib/onboarding.ts        → Helpers de persistencia
3. WizardProgress.tsx       → Componente simples, sem deps
4. WizardPointer.tsx        → Seta animada (pode ser stub inicial)
5. WizardOverlay.tsx        → Container principal
6. pages/Onboarding.tsx     → Wrapper + rota
7. App.tsx                  → Adicionar rota /#/onboarding
8. AuthContext.tsx           → Adicionar checkOnboardingStatus
9. steps/Step1BusinessProfile.tsx
10. steps/Step2FirstService.tsx
11. steps/Step3FirstProfessional.tsx
12. steps/Step4FirstAppointment.tsx
13. steps/Step5BookingLink.tsx
```

---

*Documento gerado por Luma (UX Wizard Designer) — onboarding-wizard-squad*
*Fase 1 — Design & Schema | Branch: ux-teste | 2026-03-20*
