# Flowchart — security/audit

> Gerado pelo Archaeologist em 2026-05-04
> Nível: Detalhado

---

## 1. 2FA Setup Flow

```mermaid
flowchart TD
    A[SecuritySettings] --> B{isEnabled?}
    B -->|Não| C[Botão: Configurar 2FA]
    B -->|Sim| D[Lista de fatores verificados]
    C --> E[TwoFactorSetup - Step: intro]
    D --> F[Remover fator ou + Novo Dispositivo]
    F -->|Remover| G[confirm → unenroll factorId]
    F -->|Novo| E
    E -->|Configurar 2FA Agora| H[use2FA.enroll]
    H --> I[Step: scan]
    I -->|QR Code gerado| J[QRCode.toDataURL]
    J --> K[Exibe QR + cópiar secret]
    K -->|Já escaneei| L[Step: verify]
    L -->|Digita código 6 dígitos| M[use2FA.verifyAndEnable]
    M --> N[challenge = mfa.challenge factorId]
    N --> O[mfa.verify factorId, challengeId, code]
    O -->|Sucesso| P[onComplete → refreshUser]
    O -->|Erro| Q[Erro: Código incorreto]
```

## 2. Audit Logs — Busca e Visualização

```mermaid
flowchart TD
    A[AuditLogs page] --> B[useEffect → loadLogs]
    B --> C[getAuditLogs filters]
    C --> D[supabase.rpc get_audit_logs]
    D --> E[RPC SECURITY DEFINER]
    E --> F[SELECT com JOIN profiles para user_name]
    F --> G[Filtros: action, resource_type, start_date, end_date]
    G --> H[Retorna AuditLog array]
    H --> I[Render: Lista com action color-coded]
    I --> J{expandLog?}
    J -->|Sim| K[calculateDiff old_values, new_values]
    K --> L[Exibe diff campo-a-campo: antes vs depois]
    J -->|Não| M[Resumo: action, resource_type, user, timestamp]
    I --> N[Exportar CSV → downloadLogsAsCSV]
```

## 3. System Errors — Logging e Visualização

```mermaid
flowchart TD
    subgraph Frontend
        A[Logger.error] --> B[Monta errorData]
        B --> C[supabase.rpc log_error]
        C -->|fire-and-forget| D[(system_errors)]
        E[SystemLogs page] --> F[supabase.from system_errors.select]
        F --> G[Lista severity color-coded]
        G --> H{selectedLog?}
        H -->|Sim| I[Detalhes: context JSONB + stack_trace]
        H -->|Não| J[Placeholder: Selecione um evento]
    end
```

## 4. Soft Delete / Lixeira

```mermaid
flowchart TD
    A[RecycleBin page] --> B[useEffect → loadDeletedItems]
    B --> C[supabase.rpc get_deleted_items p_resource_type]
    C --> D[RPC SECURITY DEFINER]
    D --> E[UNION de queries em 5 tabelas]
    E --> F[Filtro: deleted_at > NOW - 30 days]
    F --> G[Calcula days_until_permanent = 30 - days]
    G --> H[Render: Lista com countdown e botão Restaurar]
    H -->|Restaurar| I[Mapeia resource_type → RPC restore]
    I --> J[appointments → restore_appointment]
    I --> K[clients → restore_client]
    I --> L[services → restore_service]
    I --> M[financial_records → restore_financial_record]
    I --> N[team_members → restore_team_member]
    J & K & L & M & N --> O[supabase.rpc functionName p_id]
    O -->|Sucesso| P[Remove item da lista local]
    O -->|Erro| Q[Alert: Erro ao restaurar]

    subgraph Background-Cleanup
        R[cleanup_old_deleted_items → cronjob externo]
        R --> S[DELETE WHERE deleted_at < NOW - 30 days]
    end
```

## 5. Audit Trail — Trigger Automático

```mermaid
flowchart TD
    A[INSERT/UPDATE/DELETE] --> B[Trigger AFTER em tabela]
    B --> C{Tabela?}
    C -->|appointments| D[trigger_audit_log]
    C -->|clients| D
    C -->|financial_records| D
    C -->|services| D
    C -->|team_members| D
    C -->|profiles| D
    D --> E[Determina ação: TG_OP]
    E --> F{Tipo?}
    F -->|INSERT| G[old=NULL, new=row_to_json NEW]
    F -->|UPDATE| H[old=row_to_json OLD, new=row_to_json NEW]
    F -->|DELETE| I[old=row_to_json OLD, new=NULL]
    G & H & I --> J[INSERT INTO audit_logs]
    J --> K[(audit_logs)]

    L[Criação manual] --> M[create_audit_log RPC]
    M --> K

    N[RPC calls rastreáveis] --> O[log_rpc_call]
    O --> K
```

## 6. RLS — Audit Logs (Evolução)

```mermaid
flowchart LR
    subgraph V1[Criação 2026-02-14]
        V1A[SELECT: user_id = auth.uid] --> V1B[INSERT: WITH CHECK true]
    end
    subgraph V2[Fix US-029 2026-03-18]
        V2A[SELECT: company_id = user company] --> V2B[INSERT: service_role only]
        V2C[UPDATE/DELETE: service_role only]
    end
    subgraph V3[Fix US-0303 2026-03-20]
        V3A[INSERT authenticated: user_id = auth.uid AND company_id = user company]
    end
    V1 -->|Vulnerabilidade de fabricação| V2
    V2 -->|authenticated precisa inserir logs via RPC| V3
```

## 7. SystemError Severity Display

```mermaid
flowchart TD
    A{severity} -->|critical| B[Vermelho text-red-500 bg-red-500/10]
    A -->|error| C[Laranja text-orange-500 bg-orange-500/10]
    A -->|warning| D[Amarelo text-yellow-500 bg-yellow-500/10]
    A -->|info| E[Azul text-blue-500 bg-blue-500/10]
```