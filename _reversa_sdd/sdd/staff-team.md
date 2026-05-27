# Equipe e Staff (staff-team)

## Visão Geral
Sistema de gestão de equipe com dois papéis (owner/staff), convite via link compartilhável, modelo de permissões baseado em `company_id` (multi-tenant RLS), portfólio público de profissionais, comissões por profissional e experiência dedicada para staff (Meu Dia, Meus Resultados, ganhos pendentes). O módulo cobre desde o cadastro de profissionais no onboarding até a visualização restrita de dados para colaboradores.

## Responsabilidades
- Cadastrar, editar e inativar profissionais (`team_members`)
- Gerar link de convite para staff
- Registrar staff via link com vinculação automática ao owner
- Herdar dados do owner (assinatura, tema, nome do negócio)
- Buscar `teamMemberId` no login para vinculação auth→negócio
- Fornecer visão restrita para staff (agenda, clientes, serviços, insights)
- Calcular comissões pendentes por profissional
- Exibir portfólio público por slug
- Sincronizar dados do owner com `team_members` (nome, foto)

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| name | string | Nome do profissional |
| role | string | Cargo |
| slug | string | Link personalizado |
| bio | string | Biografia |
| photo | File \| null | Foto |
| commission_rate | numeric | Taxa de comissão (%) |
| is_owner | boolean | Flag de proprietário |
| active | boolean | Ativo/inativo |
| specialties | string[] | Especialidades |
| cpf | string | CPF |
| companyId | uuid | ID do owner (registro de staff) |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| TeamMember | object | Dados do profissional |
| InviteLink | string | Link de convite |
| StaffInsights | object | Atendimentos, clientes, comissões |
| Portfolio | object | Dados públicos do profissional |

## Regras de Negócio
- **R94** Owner pode cadastrar profissionais; staff não. 🟢
- **R95** Convite: link `{origin}/#/register?company={ownerId}`. 🟢
- **R96** Registro de staff: cria auth + profile (role=staff, company_id) + team_members. 🟢
- **R97** Erro em `team_members` durante registro de staff é logado mas não bloqueia. 🟢
- **R98** Staff herda `subscriptionStatus`, `trialEndsAt`, `userType`, `businessName` do owner. 🟢
- **R99** `teamMemberId` é buscado no login: `SELECT id FROM team_members WHERE staff_user_id=userId AND user_id=companyId`. 🟢
- **R100** Se `teamMemberId=null`: exibe "Vinculação pendente". 🟢
- **R101** Staff vê apenas `appointments` atribuídos a si (`professional_id=teamMemberId`). 🟢
- **R102** Staff não acessa `/financeiro`, `/fila`, `/marketing`, `/insights`. 🟢
- **R103** Owner sincroniza nome/foto com `team_members` (`is_owner=true`). 🟢
- **R104** Slug: `name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')`. 🟢
- **R105** Portfólio público: `/pro/:slug`. Implementado no código, mas tratado como funcionalidade beta/não essencial até validação de uso real em produção. 🟡

## Fluxo Principal

### Cadastro de Profissional
1. Owner clica "+ Profissional"
2. `TeamMemberForm` abre
3. Se "Sou eu quem atende": auto-preenche
4. Preenche campos, upload de foto para `team_photos`
5. INSERT/UPDATE `team_members`
6. Dispara `setup-step-completed`

### Convite de Staff
1. Owner clica "Copiar Link de Convite"
2. Gera URL: `{origin}/#/register?company={ownerId}`
3. Mobile: `navigator.share`; Desktop: `Clipboard API`
4. Staff acessa link
5. `Register.tsx` detecta `companyId`
6. `get_company_for_invite` → `business_name`, `user_type`
7. `AuthContext.register` cria auth + profile + team_members
8. Redirect `/staff-onboarding`

### Login de Staff
1. `fetchProfileData` → `role=staff`
2. Busca dados do owner
3. Herda subscription, tema, nome
4. Busca `teamMemberId`
5. Se não encontrado: `teamMemberId=null`

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — registro, herança
- `components/TeamMemberForm.tsx` — CRUD
- `pages/settings/TeamSettings.tsx` — gestão

## Critérios de Aceitação

```gherkin
# Cenário 1: Cadastrar profissional
Dado que o owner está em /configuracoes/equipe
Quando clica "+ Profissional" e preenche dados
Então o sistema cria team_member
E gera slug automaticamente

# Cenário 2: Convite de staff
Dado que o owner clica "Copiar Link"
Quando staff acessa o link e se registra
Então o sistema cria conta vinculada ao owner
E staff herda assinatura e tema

# Cenário 3: Staff loga
Dado que um staff faz login
Quando o sistema busca teamMemberId
E não encontra vinculação
Então exibe "Vinculação pendente"
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cadastrar profissionais | Must | Core |
| Convite de staff | Must | Multi-usuário |
| Herança de dados | Must | Funcionalidade staff |
| Portfólio público | Could | Diferencial |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/settings/TeamSettings.tsx` | `TeamSettings` | 🟢 |
| `components/TeamMemberForm.tsx` | `TeamMemberForm` | 🟢 |
| `pages/StaffInsights.tsx` | `StaffInsights` | 🟢 |
| `components/StaffEarningsCard.tsx` | `StaffEarningsCard` | 🟢 |
| `pages/ProfessionalPortfolio.tsx` | `ProfessionalPortfolio` | 🟡 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
