---
id: US-007
título: Setup Backup Manual do Supabase
status: done
estimativa: 1h
prioridade: high
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-007: Setup Backup Manual do Supabase

## Por Quê
Supabase plano grátis não possui backup automático. É crítico ter um meio de exportar dados para evitar perda em caso de incidentes ou erros de desenvolvimento.

## O Que
1. Criar script `scripts/backup-supabase.js` para dump de tabelas.
2. Adicionar comando `npm run backup` ao `package.json`.
3. Documentar procedimento em `docs/BACKUP_PROCEDURE.md`.

## Critérios de Aceitação
- [x] Script criado e testado
- [x] `docs/BACKUP_PROCEDURE.md` documentado
- [x] `.gitignore` atualizado para ignorar `/backups/`
- [x] Comando `npm run backup` configurado

## Arquivos Impactados
- `scripts/backup-supabase.js`
- `package.json`
- `.gitignore`
- `docs/BACKUP_PROCEDURE.md`

## Definição de Pronto
- [x] Script gera arquivo JSON com dados das tabelas
- [x] Documentação instrui o usuário sobre credenciais no .env
- [x] Lint & Typecheck: OK
