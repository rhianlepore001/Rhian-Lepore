# Story 2.0: AIOS Engine Foundation & Feature Flags

## Descrição
Implementar a infraestrutura base para o AIOS, permitindo o desenvolvimento da V2 em paralelo com a V1 através de Feature Flags e preparando a camada de persistência para o Orchestrator.

## Contexto
- **PRD:** Beauty OS 2.0 (Fail-Proof)
- **Framework:** Synkra AIOS v1.0.0
- **Objetivo:** Garantir que o código da IA não afete usuários da V1 até que seja explicitamente ativado.

## Tarefas (@dev)
- [ ] Criar tipo `FeatureConfigs` no `types/auth.ts` ou similar.
- [ ] Implementar hook `useFeatureFlags` para verificar permissões de IA por establishment_id.
- [ ] Criar migração Supabase para a tabela `aios_logs` (Memória do Sistema).
- [ ] Implementar utilitário `AIOSContext` para envolver a aplicação.

## Critérios de Aceitação (@qa)
- [ ] O sistema funciona normalmente quando `AIOS_ENABLED` está em `false`.
- [ ] Logs são registrados corretamente na tabela `aios_logs` via RPC/Query.
- [ ] `npm run lint` e `npm run typecheck` passam sem erros.

## Arquivos Criados/Modificados
- *Aguardando implementação*

## Notas
- Prioridade: P0 (Bloqueante para as demais histórias).
