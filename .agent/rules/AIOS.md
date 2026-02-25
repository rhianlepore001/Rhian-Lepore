---
trigger: always_on
---

# AIOS.md - Cérebro Operacional (Regras de Contexto)

> Este arquivo define o protocolo de compatibilidade entre o Synkra AIOS e o Google Antigravity.

## 🧠 Protocolos AIOS Quare

1. **Fonte da Verdade (Contexto):**
   - SEMPRE verifique o arquivo `project-status.yaml` e o diretório `.aios-core/` antes de propor qualquer mudança.
   - O status do projeto no framework AIOS tem precedência sobre deduções locais.

2. **Planejamento Agêntico:**
   - Proibido editar código sem antes gerar um **Plano de Implementação** (Artefato do Antigravity).
   - O plano deve ser validado contra o PRD (Product Requirements Document) presente no diretório raiz.

3. **Portões de Qualidade (Quality Gates):**
   - Toda alteração deve passar pelo workflow `/release-check` ou comando equivalente de validação.
   - Proibido "clever code" (código excessivamente complexo ou "mágico"). Priorize legibilidade e modularidade (SOLID/DRY).

4. **Self-Healing AIOS:**
   - Em caso de erro no terminal, analise os logs contextualmente utilizando o histórico do `.aios-core/logs` se disponível.

## 🛠️ Mapeamento de Comandos (CLI -> Antigravity)

Substitua mentalmente (ou via slash command) os comandos originais do AIOS pelos respectivos do Antigravity:

| Comando AIOS (CLI) | Comando Antigravity | Função |
| :--- | :--- | :--- |
| `*status` | `/status` | Exibe o progresso atual baseado no `.aios-core` |
| `*create-next-story` | `/develop-story` | Implementa a próxima história de usuário |
| `*audit-arch` | `/audit-arch` | Realiza auditoria arquitetural (@architect) |
| `*ids check` | `/sync-squad` | Verifica integridade do Squad |

## 🚫 Restrições Críticas

- **No Overwrite Policy:** Nunca sobrescreva arquivos de configuração do core (`.aios-core/`) sem autorização explícita do usuário.
- **Ambiente:** Verifique sempre se o `npm run dev` está rodando antes de testar mudanças de UI.
