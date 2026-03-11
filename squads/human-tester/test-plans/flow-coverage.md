# Cobertura de Fluxos — Quem Testa o Quê

## Matriz Agente × Fluxo

| Fluxo | 🧭 Navi | 💥 Havoc | 🔬 Pixel | ⚡ Flash | 🛡️ Shield |
|-------|---------|---------|---------|---------|----------|
| Login | Happy path | Credenciais inválidas | UI/responsive | Load time | Session security |
| Registro | Novo owner flow | Validação de campos | Formulário visual | Speed | Duplicate email |
| Onboarding | Wizard completo | Pular etapas | Steps visuais | Transitions | Data persistence |
| Dashboard | Explorar widgets | Modais rápidos | KPI cards | Console errors | Data isolation |
| Agenda | Criar agendamento | Double booking | Calendar visual | Rapid navigation | Permissões staff |
| Booking Público | Cliente agendando | Dados inválidos | Mobile UX | Page load | Slug manipulation |
| Clientes | Buscar/ver cliente | IDs inválidos na URL | Lista/CRM visual | Search debounce | Tenant isolation |
| Financeiro | Ver relatórios | Filtros extremos | Charts/tabs | Heavy data | Financial data leak |
| Marketing | Ver campanhas | Modal abuse | Campaign cards | Load time | Owner-only access |
| Configurações | Percorrer tudo | Inputs extremos | Forms/saves | All settings pages | Role restrictions |
| Fila | Entrar/ver status | Spam queue | Status visual | Realtime | Queue data |
| Comissões | Ver estrutura | Valores negativos | Table visual | Calculation speed | Financial integrity |

## Fluxos Críticos (P0) — Ordem de Execução

### 1. Autenticação
```
Navi: Login → Dashboard (funciona?)
Havoc: Senhas erradas, emails inválidos, brute force
Pixel: Tela de login em 3 breakpoints, ambos temas
Flash: Tempo de login, console errors
Shield: Token management, session expiry
```

### 2. Agendamento Interno
```
Navi: Criar agendamento pelo wizard (intuitivo?)
Havoc: Agendar sem dados, data passada, horário ocupado
Pixel: Calendar picker, time grid, wizard steps
Flash: Wizard transitions, multiple creates
Shield: company_id isolation, staff permissions
```

### 3. Booking Público
```
Navi: Cliente fazendo booking pela primeira vez
Havoc: Slug falso, dados inválidos, interrupção
Pixel: Mobile first, flow steps, confirmation
Flash: Page load no mobile, search speed
Shield: Public data exposure, no auth needed
```

### 4. Dashboard
```
Navi: O que um owner vê ao entrar?
Havoc: Todos os modais, widget abuse
Pixel: KPIs, charts, cards, empty states
Flash: Initial load, chart rendering
Shield: Data belongs to correct tenant
```

### 5. Financeiro
```
Navi: Entender relatório de receita
Havoc: Filtros extremos, exportação bugada
Pixel: Charts responsive, tab switching
Flash: Heavy data rendering, filter speed
Shield: Financial data isolation
```
