# Marketing e AIOS (marketing)

## Visão Geral
Sistema de marketing preditivo (AIOS — AgendiX Intelligence & Operations System) com diagnóstico de churn, campanhas de reativação via WhatsApp, copywriting automatizado (frameworks ABT e StoryBrand) e página placeholder para campanhas futuras. O módulo é condicional: só ativa quando `aiosEnabled=true` no profile. Integra-se com dashboard (AIOSDiagnosticCard) e CRM (ChurnRadar).

## Responsabilidades
- Diagnosticar churn: clientes em risco, receita recuperável, gaps de agenda
- Gerar mensagens de reativação personalizadas (ABT vs StoryBrand)
- Enviar campanhas via WhatsApp deep links
- Logar campanhas para atribuição de ROI
- Exibir estatísticas de campanhas no dashboard
- Sugerir oportunidades de ação (recovery, gap, upsell)

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| client_id | uuid | Cliente em risco |
| agent_name | string | Nome do agente AIOS |
| campaign_type | string | Tipo de campanha |
| ltv | number | Lifetime value do cliente |
| daysMissing | number | Dias desde última visita |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| AIOSDiagnostic | object | recoverable_revenue, at_risk_clients, agenda_gaps |
| ReactivationMessage | string | Mensagem gerada |
| CampaignLog | object | Registro da campanha |

## Regras de Negócio
- **R79** AIOS só ativa se `profiles.aios_enabled === true`. 🟢
- **R80** Clientes em risco: ≤30 dias sem retorno (inferido). 🟡
- **R81** Segmentação por LTV: >500 usa StoryBrand, ≤500 usa ABT. 🟢
- **R82** Campanhas logadas via RPC `log_aios_campaign` para atribuição de ROI. 🟢
- **R83** Página `/marketing` é placeholder "Em breve". 🟢
- **R84** Marketing opt-in em booking público: `acceptedMarketing` checkbox. 🟡

## Fluxo Principal

### Diagnóstico AIOS
1. Verifica `aiosEnabled === true`
2. Chama RPC `get_aios_diagnostic(p_establishment_id)`
3. Retorna: `recoverable_revenue`, `at_risk_clients[]`, `agenda_gaps[]`

### Reativação
1. Owner acessa ChurnRadar ou ClientCRM
2. Clica "Chamar de volta"
3. Gera mensagem via `generateReactivationMessage`
4. Loga campanha via `logCampaignActivity`
5. Abre WhatsApp via `getWhatsAppUrl`

### Copywriting
- **ABT (LTV ≤ 500):** "Oi, {firstName}! Você sempre cuida do seu {lastService} com a gente E sua última visita foi incrível, MAS já faz {daysMissing} dias. PORTANTO, separei horários exclusivos."
- **StoryBrand (LTV > 500):** "{firstName}, você merece estar na sua melhor versão. No {businessName}, nosso plano é simples: {goal} e garantir que você saia incrível."

## Dependências
- `lib/supabase.ts` — RPCs `get_aios_diagnostic`, `log_aios_campaign`
- `contexts/AuthContext.tsx` — `useAuth` (aiosEnabled)
- `utils/aiosCopywriter.ts` — `generateReactivationMessage`

## Critérios de Aceitação

```gherkin
# Cenário 1: Diagnóstico AIOS
Dado que aiosEnabled=true
Quando o dashboard carrega
Então exibe card com clientes em risco e receita recuperável

# Cenário 2: Reativação via WhatsApp
Dado que um cliente está em risco
Quando o owner clica "Chamar de volta"
Então gera mensagem personalizada
E abre WhatsApp com mensagem pré-preenchida
E loga campanha para ROI
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Diagnóstico de churn | Should | Valor agregado |
| Reativação WhatsApp | Could | Diferencial |
| Copywriting AI | Could | UX premium |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `hooks/useAIOSDiagnostic.ts` | `useAIOSDiagnostic` | 🟢 |
| `utils/aiosCopywriter.ts` | `generateReactivationMessage` | 🟢 |
| `components/ChurnRadar.tsx` | `handleReactivate` | 🟢 |
| `components/dashboard/AIOSDiagnosticCard.tsx` | `AIOSDiagnosticCard` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
