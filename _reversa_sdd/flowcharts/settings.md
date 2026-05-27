# Flowcharts — Módulo settings

> Gerado pelo Archaeologist em 2026-05-04
> Nível de documentação: **Detalhado**

---

## Visão Geral do Módulo

```mermaid
graph TD
    SL[SettingsLayout] --> GS[GeneralSettings]
    SL --> PBS[PublicBookingSettings]
    SL --> TS[TeamSettings]
    SL --> SS[ServiceSettings]
    SL --> CS[CommissionsSettings]
    SL --> FinS[FinancialSettings]
    SL --> SubS[SubscriptionSettings]
    SL --> SecS[SecuritySettings]
    SL --> AL[AuditLogs]
    SL --> RB[RecycleBin]
    SL --> SysL[SystemLogs]

    GS -->|WRITE| profiles
    GS -->|WRITE| business_settings
    GS -->|UPLOAD| Storage logos/covers

    PBS -->|READ/WRITE| business_settings
    PBS -->|READ| profiles.business_slug

    TS -->|READ/WRITE| team_members

    SS -->|CRUD| services
    SS -->|CRUD| service_categories

    CS -->|READ/WRITE| team_members
    CS -->|READ/WRITE| business_settings
    CS -->|RPC| recalculate_pending_commissions

    FinS -->|READ/WRITE| business_settings

    SubS -->|RPC| create-checkout-session
    SubS -->|READ| profiles.subscription_status

    SecS -->|AUTH| MFA TOTP
    SecS -->|hook| use2FA

    AL -->|RPC| get_audit_logs
    AL -->|EXPORT| downloadLogsAsCSV

    RB -->|RPC| get_deleted_items
    RB -->|RPC| restore_appointment/restore_client/etc

    SysL -->|READ| system_errors
```

---

## Fluxo: GeneralSettings - Salvamento

```mermaid
flowchart TD
    A[fetchSettings] --> B[Carrega profiles + business_settings]
    B --> C[Popula states: businessName, phone, address, etc.]
    C --> D{Usuário edita}
    D --> E[hasChanges = true via useEffect]
    E --> F[Clica Salvar]
    F --> G[status = 'saving']
    G --> H{Tem logoFile?}
    H -->|Sim| I[Upload para Storage logos]
    H -->|Não| J[Mantém logoPreview]
    I --> J
    J --> K{Tem coverFile?}
    K -->|Sim| L[Upload para Storage covers]
    K -->|Não| M[Mantém coverPreview]
    L --> M
    M --> N[UPDATE profiles]
    N --> O[UPSERT business_settings]
    O --> P[UPDATE auth.user metadata]
    P --> Q[Dispatch: setup-step-completed hours + profile]
    Q --> R[status = 'saved', hasChanges = false]
    N -->|Erro| S[status = 'error']
    O -->|Erro| S
    P -->|Erro| S
```

---

## Fluxo: PublicBookingSettings - Persistência

```mermaid
flowchart TD
    A[fetchSettings] --> B[business_settings.* + profiles.business_slug]
    B --> C[Popula flags e parâmetros]
    C --> D[PublicLinkCard exibe slug]
    D --> E{Usuário altera toggle}
    E --> F[setState correspondente]
    F --> G[Clica Salvar Alterações]
    G --> H[UPSERT business_settings com todas as flags]
    H --> I[Dispatch: setup-step-completed booking]
    I --> J[alert: Configurações salvas]
    H -->|Erro| K[alert: Erro ao salvar]
```

---

## Fluxo: CommissionsSettings - Taxa e Acerto

```mermaid
flowchart TD
    A[fetchData] --> B[team_members WHERE active=true + business_settings]
    B --> C[Popula commission_rate, settlement_day, machine_fee_*]
    C --> D{Ação do Usuário}

    D -->|Salvar Dia de Acerto| E[Valida settlementDay 1-31]
    E --> F[UPSERT business_settings.commission_settlement_day_of_month]

    D -->|Salvar Taxa de Comissão| G[Valida 0-100%]
    G --> H[UPDATE team_members commission_rate, frequency, day]
    H --> I[RPC: recalculate_pending_commissions]

    D -->|Salvar Taxa Maquininha| J[Valida 0-100%]
    J --> K[UPSERT business_settings machine_fee_enabled, debit_fee_percent, credit_fee_percent]
```

---

## Fluxo: SubscriptionSettings - Checkout Stripe

```mermaid
flowchart TD
    A[Renderiza planos por região] --> B{Trial?}
    B -->|Sim| C[Badge: 'Período de Teste' + dias restantes]
    B -->|Não| D{Active?}
    D -->|Sim| E[Badge: 'Assinatura Ativa']
    D -->|Não| F[Badge: 'Expirado']

    C --> G[Botão: Começar Assinatura]
    E --> H[Botão: Alterar Plano]

    G --> I[Clica plano]
    H --> I
    I --> J[supabase.functions.invoke create-checkout-session]
    J --> K{Retornou URL?}
    K -->|Sim| L[window.location.href = data.url]
    K -->|Não| M[alert: Erro ao iniciar checkout]
```

---

## Fluxo: SecuritySettings - 2FA

```mermaid
flowchart TD
    A[use2FA: listFactors] --> B{Tem fatores verificados?}
    B -->|Não| C[Badge: Proteção Desativada]
    B -->|Sim| D[Lista fatores TOTP + Badge: Conta Protegida]

    C --> E[Botão: Configurar 2FA]
    D --> F[Botão: + Novo Dispositivo] & G[Botão: Remover por fator]

    E --> H[TwoFactorSetup]
    F --> H
    H --> I[enroll: supabase.auth.mfa.enroll totp]
    I --> J[Exibe QR Code]
    J --> K[Usuário escaneia e digita código]
    K --> L[verifyAndEnable: challenge + verify]
    L --> M[2FA ativado]

    G --> N[confirm: Tem certeza?]
    N -->|Sim| O[unenroll: supabase.auth.mfa.unenroll]
    O --> P[2FA desativado]
```

---

## Fluxo: RecycleBin - Restauração

```mermaid
flowchart TD
    A[loadDeletedItems] --> B[RPC: get_deleted_items]
    B --> C[Lista itens com countdown]
    C --> D{Usuário clica Restaurar}
    D --> E[Mapeia resource_type para RPC]
    E --> F{resource_type}
    F -->|appointments| G[restore_appointment]
    F -->|clients| H[restore_client]
    F -->|services| I[restore_service]
    F -->|financial_records| J[restore_financial_record]
    F -->|team_members| K[restore_team_member]
    G & H & I & J & K --> L[Remove item da lista + alert: Restaurado]
    L -->|Erro| M[alert: Erro ao restaurar]
```

---

## Fluxo: SettingsLayout - RBAC e Menu

```mermaid
flowchart TD
    A[SettingsLayout] --> B{role === staff?}
    B -->|Sim| C[Menu = apenas /configuracoes/servicos]
    B -->|Não| D{isDev?}
    D -->|Sim| E[Menu = SETTINGS_ITEMS completo incluindo devOnly]
    D -->|Não| F[Menu = SETTINGS_ITEMS sem devOnly]

    C & E & F --> G[NavLink com active state e accent color]
    G --> H[Mobile: drawer com overlay + horizontal scroll nav]
    G --> I[Desktop: sidebar fixa 256px]
```

---

## Fluxo: AuditLogs - Consulta e Diff

```mermaid
flowchart TD
    A[loadLogs] --> B[RPC: get_audit_logs com filtros]
    B --> C[Lista de logs com cor por ação]
    C --> D{Usuário expande log}
    D --> E[calculateDiff: old_values vs new_values]
    E --> F[Diff campo-a-campo com antes/depois]
    D --> G[Metadados: IP, user agent]

    H[Exportar CSV] --> I[generateCSV → downloadLogsAsCSV]
```

---

## Fluxo: TeamSettings - Convite

```mermaid
flowchart TD
    A[fetchMembers: team_members ORDER BY is_owner DESC] --> B[Lista owners e staff separados]
    B --> C{Usuário clica Copiar Link}
    C --> D{navigator.share disponível + mobile?}
    D -->|Sim| E[navigator.share com título/text/url]
    D -->|Não| F{Clipboard API disponível?}
    F -->|Sim| G[clipboard.writeText]
    F -->|Não| H[textarea fallback + execCommand copy]
    G & H & E --> I[Link: origin/#/register?company=userId]
```