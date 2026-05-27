# Fluxograma — Módulo marketing / AIOS

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Fluxo Principal — AIOS Diagnostic

```mermaid
flowchart TD
    A[Dashboard carrega] --> B{aiosEnabled?}
    B -->|Não| C[AIOSDiagnosticCard: return null]
    B -->|Sim| D[useAIOSDiagnostic.fetchDiagnostic]
    D --> E[RPC: get_aios_diagnostic p_establishment_id]
    E --> F{diagnostic.recoverable_revenue > 0?}
    F -->|Não| G[Card não renderiza]
    F -->|Sim| H[Renderizar AIOSDiagnosticCard]
    H --> I[Exibir: N clientes em risco, receita recuperável, gasto médio]
    I --> J[Botão: Recuperar Agora → /crm]
```

---

## Fluxo — Reativação via ChurnRadar

```mermaid
flowchart TD
    A[ClientCRM carrega ChurnRadar] --> B[Lista de clientes at_risk do diagnostic]
    B --> C[Renderizar card por cliente: nome, dias ausente, avg_ticket]
    C --> D{Owner clica Chamar de volta}
    D --> E[generateReactivationMessage: contexto do cliente]
    E --> F{ltv > 500?}
    F -->|Sim| G[applyStoryBrand:-framework herói/guia]
    F -->|Não| H[applyABT:framework And-But-Therefore]
    G --> I[encodeURIComponent mensagem]
    H --> I
    I --> J[logCampaignActivity client_id, AIOSMarketingAgent, whatsapp_reactivation]
    J --> K[RPC: log_aios_campaign]
    K --> L[getWhatsAppUrl: wa.me/{cleanPhone}?text={message}]
    L --> M[Abrir WhatsApp em nova aba]
```

---

## Fluxo — CampaignModal

```mermaid
flowchart TD
    A[Abrir CampaignModal] --> B[generateReactivationMessage com dados do cliente]
    B --> C[Exibir textarea editável + análise IA]
    C --> D{Ação do usuário}
    D -->|Gerar Outra| B
    D -->|Copiar| E{Mobile com share API?}
    E -->|Sim| F[navigator.share]
    E -->|Não| G[navigator.clipboard.writeText]
    G --> H[Fallback: textarea + execCommand copy]
    D -->|Enviar WhatsApp| I[getWhatsAppUrl + window.open]
```

---

## Fluxo — AIOS no Dashboard

```mermaid
flowchart TD
    A[Dashboard renderiza] --> B{aiosEnabled?}
    B -->|Não| C[Não mostrar AIOSDiagnosticCard]
    B -->|Sim| D[AIOSDiagnosticCard]
    D --> E[AIOSDiagnosticCard + ComandoDoDia]
    E --> F[ActionCenter pode linkar para /marketing]
    F --> G[Página Marketing: Placeholder Em Breve]
```

---

## Fluxo — Marketing Opt-in no Booking Público

```mermaid
flowchart TD
    A[PublicBooking: checkout] --> B[Checkbox aceito marketing]
    B --> C[acceptedMarketing: boolean]
    C --> D[Enviado junto com dados do booking]
    D --> E[Armazenado no banco para campanhas futuras]
```