# Story 2.1: Motor de Diagnóstico AIOS (QuickScan)

## Descrição
Implementar a lógica de inteligência que analisa o banco de dados em busca de oportunidades financeiras imediatas: clientes que sumiram e buracos na agenda que podem ser preenchidos.

## Contexto
- **Agente Responsável:** `@agente-financeiro`
- **Métrica Chave:** Receita Recuperável (Total de cortes não realizados por clientes habituais que não voltaram).

## Tarefas
- [ ] Criar RPC `get_aios_diagnostic(p_establishment_id UUID)`:
    - Identificar clientes com frequência > 2 atendimentos que não agendaram há > 30 dias.
    - Calcular potencial de perda financeira.
- [ ] Implementar controller no frontend para consumir o diagnóstico.
- [ ] Atualizar o Dashboard para exibir o "Alerta de Lucro" se a receita recuperável for > 0.

## Critérios de Aceitação
- [ ] O diagnóstico retorna uma lista precisa de clientes em "risco de churn".
- [ ] O cálculo financeiro reflete o preço médio dos serviços consumidos por esses clientes.
- [ ] Os logs de leitura da IA são registrados em `aios_logs`.
