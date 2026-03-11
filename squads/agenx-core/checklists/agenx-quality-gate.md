# AgenX Quality Gate — Checklist Completo

> Execute antes de cada PR. Status: PASS (todos ✅) ou FAIL (qualquer ❌)

## 1. Funcionalidade
- [ ] Feature funciona conforme critérios de aceite da story
- [ ] Funciona nos dois temas (Brutal/Beauty)
- [ ] Funciona para owner e staff (quando relevante)
- [ ] Funciona com dados reais (não só mock)
- [ ] Funciona com zero dados (empty state correto)

## 2. Segurança Multi-Tenant
- [ ] `company_id` nunca vem de URL ou formulário
- [ ] Toda query Supabase filtra por `company_id`
- [ ] RLS está ativo na tabela (se nova tabela criada)
- [ ] Dados de um tenant não aparecem para outro

## 3. UX e Copy
- [ ] Zero jargões técnicos (AIOS, Churn, LTV, ROI como acrônimo)
- [ ] Empty states com mensagem + CTA
- [ ] Feedback ao usuário após ações (success/error toast)
- [ ] Loading states visíveis

## 4. Mobile (375px mínimo)
- [ ] Layout não quebra em mobile
- [ ] Botões tocáveis (≥ 44px)
- [ ] Texto legível (≥ 14px)
- [ ] Scroll funciona corretamente

## 5. Regressão
- [ ] Features existentes não foram quebradas
- [ ] Componentes modificados funcionam em todas as páginas onde aparecem
- [ ] Não há erros no console

## 6. Código
- [ ] TypeScript compila sem erros (`npm run typecheck`)
- [ ] ESLint passa sem warnings (`npm run lint`)
- [ ] Sem `console.log()` (usar `logger.*`)
- [ ] Sem `any` em tipos críticos
- [ ] Sem código comentado desnecessário

## 7. Novos Arquivos
- [ ] Segue nomenclatura (PascalCase componentes, camelCase hooks)
- [ ] Exportação correta (named export preferido)
- [ ] Localizado na pasta correta (ver source-tree.md)
- [ ] Lazy loaded se for página nova

## Resultado
| Score | Status | Ação |
|-------|--------|------|
| 100% ✅ | APPROVED | Merge autorizado |
| ≥ 90% (sem ❌ críticos) | APPROVED WITH NOTES | Merge + fix na próxima |
| < 90% ou ❌ crítico | BLOCKED | Fix obrigatório |

**Críticos (❌ = BLOCKED automaticamente):**
- Segurança multi-tenant violada
- TypeScript com erro
- Feature não funciona
- Dados de outro tenant visíveis
