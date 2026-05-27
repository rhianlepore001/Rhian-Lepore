# Configurações (settings)

## Visão Geral
Hub de configurações com 10 sub-páginas (Geral, Agendamento Público, Equipe, Serviços, Comissões, Financeiro, Assinatura, Segurança, Auditoria, Lixeira, Erros). RBAC: staff vê apenas Serviços; owners vêem tudo exceto devOnly; dev vê tudo. `business_settings` é a tabela central com feature flags.

## Responsabilidades
- Configurar dados gerais do negócio (nome, telefone, endereço, logo, capa)
- Gerenciar agendamento público (slug, toggle, upsells, seleção de profissional)
- Gerenciar equipe (CRUD de profissionais, convite)
- Gerenciar serviços e categorias
- Configurar comissões (dia de acerto, taxa por profissional, taxa de maquininha)
- Gerenciar assinatura Stripe (planos, checkout)
- Configurar segurança (2FA TOTP)
- Visualizar auditoria (logs com diff campo-a-campo, exportação CSV)
- Restaurar itens da lixeira (soft delete com countdown de 30 dias)
- Visualizar logs de erros do sistema

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| business_name | string | Nome do negócio |
| phone | string | Telefone |
| address | string | Endereço |
| logo | File | Logo |
| cover | File | Foto de capa |
| business_slug | string | Slug para links públicos |
| public_booking_enabled | boolean | Habilita booking público |
| enable_upsells | boolean | Sugere serviços extras |
| enable_professional_selection | boolean | Permite escolher profissional |
| commission_settlement_day | integer | Dia do acerto (1-31) |
| commission_rate | numeric | Taxa de comissão (0-100) |
| machine_fee_enabled | boolean | Repassa taxa de maquininha |
| debit_fee_percent | numeric | Taxa débito (%) |
| credit_fee_percent | numeric | Taxa crédito (%) |
| price_id | string | ID do preço Stripe |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| Settings | object | Configurações consolidadas |
| AuditLog[] | object[] | Logs de auditoria |
| DeletedItem[] | object[] | Itens na lixeira |
| SystemError[] | object[] | Erros do sistema |

## Regras de Negócio
- **R106** Staff vê apenas `/configuracoes/servicos`. 🟢
- **R107** Owner vê tudo exceto devOnly (Auditoria, Lixeira, Erros). 🟢
- **R108** Dev vê tudo. 🟢
- **R109** `business_settings` é tabela central (JSONB + colunas). 🟢
- **R110** Slug: único por estabelecimento, usado em links públicos. 🟢
- **R111** Logo/capa: upload para Storage (`logos`, `covers`). 🟢
- **R112** 2FA: enroll → challenge → verify via Supabase MFA. 🟢
- **R113** Auditoria: diff campo-a-campo, exportação CSV. 🟢
- **R114** Lixeira: countdown de 30 dias, restore via RPC dinâmica. 🟢
- **R115** Erros: severity levels (info, warning, error, critical). 🟢
- **R116** Stripe checkout: preços por região (BRL/EUR). 🟢
- **R117** `recalculate_pending_commissions` ao alterar taxa. 🟢

## Fluxo Principal

### GeneralSettings
1. Carrega `profiles` + `business_settings`
2. Popula states
3. Usuário edita → `hasChanges = true`
4. Clica Salvar
5. Upload logo/capa para Storage
6. UPDATE `profiles`
7. UPSERT `business_settings`
8. UPDATE `auth.user` metadata

### CommissionsSettings
1. Carrega `team_members` + `business_settings`
2. Valida `settlementDay` (1-31)
3. Valida taxa (0-100)
4. UPDATE `team_members.commission_rate`
5. RPC `recalculate_pending_commissions`

### SecuritySettings
1. `use2FA.listFactors`
2. Se não verificado: exibe "Proteção Desativada"
3. Clica "Configurar 2FA"
4. `enroll` → QR Code → `verifyAndEnable`

### RecycleBin
1. RPC `get_deleted_items`
2. Lista com countdown
3. Clica "Restaurar"
4. Mapeia `resource_type` para RPC (`restore_appointment`, etc.)

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — `useAuth` (role, isDev)
- `hooks/use2FA.ts` — 2FA
- `components/Modal.tsx` — modais
- `recharts` — gráficos

## Critérios de Aceitação

```gherkin
# Cenário 1: Staff acessa settings
Dado que um staff loga
Quando acessa /configuracoes
Então vê apenas a aba "Serviços"

# Cenário 2: Owner configura comissões
Dado que o owner está em /configuracoes/comissoes
Quando altera taxa de um profissional
Então o sistema recalcula comissões pendentes

# Cenário 3: Restaurar da lixeira
Dado que existe um appointment deletado
Quando o dev clica "Restaurar"
Então o sistema chama restore_appointment RPC
E o item reaparece na agenda
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Configurações gerais | Must | Core |
| Comissões | Must | Gestão de equipe |
| Assinatura | Must | Monetização |
| 2FA | Should | Segurança |
| Auditoria | Could | Compliance |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/settings/GeneralSettings.tsx` | `GeneralSettings` | 🟢 |
| `pages/settings/CommissionsSettings.tsx` | `CommissionsSettings` | 🟢 |
| `pages/settings/SubscriptionSettings.tsx` | `SubscriptionSettings` | 🟢 |
| `pages/settings/SecuritySettings.tsx` | `SecuritySettings` | 🟢 |
| `pages/settings/AuditLogs.tsx` | `AuditLogs` | 🟢 |
| `pages/settings/RecycleBin.tsx` | `RecycleBin` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
