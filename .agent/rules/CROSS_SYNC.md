---
trigger: always_on
---

# CROSS_SYNC.md - Protocolo de Sincronização Cross-Environment

> Esta regra garante que o Antigravity e o Claude (AIOX) compartilhem a mesma "consciência" do projeto através de sincronização mandatória.

## 🔄 Protocolo de Sincronização Obrigatória

1. **Leitura de Contexto Externo (Start):**
   - SEMPRE verifique o arquivo `.aiox-core/development/agents/pm/MEMORY.md` (ou diretório equivalente do Claude) no início de tarefas estratégicas.
   - Verifique o diretório `docs/stories/` em busca de novas stories marcadas como `done` que ainda não foram refletidas no `MEMORY.md`.

2. **Unificação de Memória (End):**
   - Ao concluir uma feature ou no final de uma sessão complexa, consolide as descobertas de ambos os ambientes no `.agent/memory/MEMORY.md`.
   - Se houver discrepância entre o que o Antigravity fez e o que o Claude documentou, a versão mais recente em `docs/stories/` tem precedência técnica.

3. **Alinhamento de Decisões:**
   - Decisões tomadas em um ambiente (ex: Relatório de Dívida Técnica gerado no Claude) devem ser assumidas como verdade absoluta pelo Antigravity após a sincronização.

## 📁 Arquivos Chave para Monitoramento
- `.aiox-core/development/agents/pm/MEMORY.md`
- `docs/stories/README.md`
- `.agent/memory/PROJECT_MEMORY.md`
- `docs/architecture/TECHNICAL-DEBT-REPORT.md` (se existir)
