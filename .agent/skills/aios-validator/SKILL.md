# Skill: aios-validator

**Description:** Permite validar a integridade do framework AIOS e diagnosticar problemas de ambiente.

## Goal
Garantir que todos os componentes do `.aiox-core` e binários da CLI estejam operacionais para o desenvolvimento agent-first.

## Instructions

1. **Diagnóstico de Ambiente:**
   - Execute `npx aiox-core doctor` para verificar dependências do framework.
   - Analise a saída para identificar permissões de arquivos ou configurações de ambiente (`.env`) faltantes.

2. **Conserto Automático:**
   - Se o `doctor` reportar falhas em scripts binários, tente rodar `npm install` ou `npm run sync:ide`.



## Constraints
- NÃO altere arquivos dentro de `.aiox-core/` sem emitir um alerta `[!WARNING]`.
- Nao tente "fixar" erros de rede/API do Supabase sem consultar o usuário.

## Scripts
- **doctor.py**: Script auxiliar para parse de erros do AIOS Core (Opcional).
