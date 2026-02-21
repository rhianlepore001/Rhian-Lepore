# Story 2.2: Inteligência de Reativação (WhatsApp Sync)

## Descrição
Implementar o motor de copywriting agêntico que gera mensagens personalizadas para clientes sumidos e facilita o envio via links diretos do WhatsApp (`wa.me`).

## Contexto
- **Agente Responsável:** `@agente-marketing`
- **Gatilho:** Clique em "Recuperar Agora" no Radar de Lucro ou seleção no CRM.
- **Diferencial:** Mensagens que não parecem spam, focadas em "Saudade" e "Benefício Exclusivo".

## Tarefas
- [ ] Criar utilitário `AIOSCopywriter`:
    - Template para barbeiros: "Oi [Nome], notamos que faz tempo que não passa aqui no [Negócio]..."
    - Template para beleza: "Oi [Nome], seu último procedimento no [Negócio] foi há [X] dias..."
- [ ] Implementar gerador de link `wa.me` com mensagem codificada.
- [ ] Integrar ações de reativação na página `ClientCRM.tsx`.
- [ ] Registrar log de envio em `aios_logs` (para medir conversão futuramente).

## Critérios de Aceitação
- [ ] O link do WhatsApp abre corretamente com a mensagem pré-preenchida.
- [ ] O nome do cliente e do negócio são injetados corretamente no template.
- [ ] O sistema mantém o tom de voz (Barbeiro vs Beleza).
- [ ] Suporte a Feature Flag `marketing` dentro do objeto `aios_features`.
