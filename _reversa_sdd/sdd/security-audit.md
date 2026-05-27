# Segurança e Auditoria (security-audit)

## Visão Geral
4 sub-sistemas: 2FA/TOTP (enroll→challenge→verify via Supabase MFA), Audit Logs (trigger automático em 6 tabelas, diff campo-a-campo, RLS evoluída em 3 migrações), System Errors (severity levels, fire-and-forget logger) e Lixeira (soft delete com 30 dias, restore dinâmico por resource_type). Route guards: OwnerRouteGuard para segurança, DevRouteGuard para auditoria/erros/lixeira.

## Responsabilidades
- Configurar 2FA TOTP (enroll, challenge, verify, unenroll)
- Gerar logs de auditoria automaticamente em INSERT/UPDATE/DELETE
- Exibir logs com diff campo-a-campo e exportação CSV
- Logar erros do sistema (fire-and-forget)
- Visualizar e resolver erros do sistema
- Implementar soft delete com lixeira e restore
- Limpar itens deletados após 30 dias

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| factor_type | 'totp' | Tipo de fator MFA |
| code | string | Código TOTP (6 dígitos) |
| action | string | CREATE, UPDATE, DELETE, etc. |
| resource_type | string | appointments, clients, etc. |
| old_values | jsonb | Valores anteriores |
| new_values | jsonb | Valores novos |
| error_message | string | Mensagem de erro |
| severity | 'info' \| 'warning' \| 'error' \| 'critical' | Severidade |
| resource_type | string | Tipo para restore |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| Factor | object | Fator MFA verificado |
| AuditLog[] | object[] | Logs de auditoria |
| SystemError[] | object[] | Erros do sistema |
| DeletedItem[] | object[] | Itens na lixeira |

## Regras de Negócio
- **R118** 2FA: enroll → challenge → verify. Múltiplos dispositivos suportados. 🟢
- **R119** Audit logs: trigger AFTER INSERT/UPDATE/DELETE em 6 tabelas. 🟢
- **R120** Diff campo-a-campo: `old_values` vs `new_values`. 🟢
- **R121** RLS audit_logs: evoluída em 3 migrações (V1→V2→V3). 🟢
- **R122** System errors: fire-and-forget, severity color-coded. 🟢
- **R123** Lixeira: 30 dias countdown, restore via RPC dinâmica. 🟢
- **R124** Cleanup: `cleanup_old_deleted_items` remove >30 dias. 🟢
- **R125** DevRouteGuard: apenas dev acessa auditoria/erros/lixeira. 🟢

## Fluxo Principal

### 2FA Setup
1. `use2FA.enroll('totp')`
2. QR Code gerado
3. Usuário escaneia e digita código
4. `challenge` + `verify`
5. `onComplete` → refreshUser

### Audit Logs
1. Trigger `trigger_audit_log` em INSERT/UPDATE/DELETE
2. Determina ação: `TG_OP`
3. `INSERT INTO audit_logs`
4. Visualização: diff campo-a-campo
5. Exportação CSV

### System Errors
1. `Logger.error` monta errorData
2. `supabase.rpc('log_error')` fire-and-forget
3. Visualização: severity color-coded

### Lixeira
1. `get_deleted_items` RPC
2. UNION de 5 tabelas, filtro `deleted_at > NOW - 30 days`
3. Countdown: `30 - days`
4. Restore: mapeia `resource_type` → RPC

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `hooks/use2FA.ts` — 2FA
- `lib/auditLogs.ts` — auditoria
- `utils/Logger.ts` — logger

## Critérios de Aceitação

```gherkin
# Cenário 1: Configurar 2FA
Dado que o usuário está em /configuracoes/seguranca
Quando clica "Configurar 2FA"
E escaneia QR code e digita código
Então o sistema ativa 2FA

# Cenário 2: Auditoria automática
Dado que um owner edita um cliente
Quando salva alterações
Então o trigger cria log de auditoria
Com diff campo-a-campo

# Cenário 3: Restaurar da lixeira
Dado que existe um appointment deletado há 5 dias
Quando o dev clica "Restaurar"
Então o sistema chama restore_appointment
E o item reaparece
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| 2FA | Should | Segurança |
| Auditoria | Could | Compliance |
| Lixeira | Could | Recuperação |
| Logs de erro | Could | Observabilidade |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `hooks/use2FA.ts` | `use2FA` | 🟢 |
| `lib/auditLogs.ts` | `createAuditLog` | 🟢 |
| `utils/Logger.ts` | `Logger.error` | 🟢 |
| `pages/settings/AuditLogs.tsx` | `AuditLogs` | 🟢 |
| `pages/settings/RecycleBin.tsx` | `RecycleBin` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
