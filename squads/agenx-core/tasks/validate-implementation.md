---
task: Validate AgenX Implementation
responsavel: "@qa | @dev"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada:
  - files_modified: Lista de arquivos criados/modificados
  - story_id: ID da story implementada
Saida:
  - validation_report: Resultado de cada check
  - status: PASS | FAIL | WARNINGS
---

# Task: Validar Implementação AgenX

## Descrição
Checklist de validação específico do AgenX para rodar antes de marcar uma story como Done.
Complementa o QA Gate padrão do AIOS com verificações AgenX-específicas.

## Checklist de Validação

### A. Dual Theme
- [ ] Todo novo componente tem prop `isBeauty: boolean`
- [ ] Classes de cor usam variáveis do tema (não hardcoded)
- [ ] Testado com `isBeauty={true}` (salão)
- [ ] Testado com `isBeauty={false}` (barbearia)
- [ ] Sem `text-pink-*`, `text-yellow-*` diretos

### B. Multi-Tenant Security
- [ ] `company_id` vem APENAS do `useAuth()` — nunca de URL/params
- [ ] Todas as queries Supabase têm `.eq('company_id', companyId)`
- [ ] Nenhum dado de outro tenant pode vazar

### C. UX / Copy
- [ ] Zero jargões técnicos na UI (verificar tabela em source-tree.md)
- [ ] Empty states têm mensagem orientada + CTA (não "Nenhum dado encontrado")
- [ ] Loading states implementados com `<Skeleton />`
- [ ] Mensagens de erro em português, amigáveis

### D. Mobile
- [ ] Componente funciona em viewport 375px (iPhone SE)
- [ ] Botões têm área de toque ≥ 44px
- [ ] Texto legível sem zoom em mobile

### E. Performance
- [ ] Novo componente não importa biblioteca inteira (tree-shaking)
- [ ] Imagens têm lazy loading se abaixo do fold
- [ ] Queries Supabase não fazem SELECT * desnecessário

### F. Código
- [ ] TypeScript sem `any` escapando
- [ ] Error handling com try/catch + `addAlert()`
- [ ] `logger.error()` para erros técnicos
- [ ] Sem `console.log()` em produção (usar logger)

## Output Format
```
Validação AgenX — [STORY ID]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Dual Theme: PASS
✅ Multi-Tenant: PASS
⚠️  Copy: 1 jargão encontrado em Finance.tsx linha 45
✅ Mobile: PASS
✅ Performance: PASS
✅ Código: PASS

Status: WARNINGS — corrigir jargão antes de marcar Done
```
