# LEI 12: Disciplina de Commits (Conventional Commits)

## MOTIVO
Logs de Git limpos permitem *rollback* transparente, fácil isolamento de onde um bug no Next.js/Supabase aconteceu, e automação fluída de Changelogs para deploy.

## GATILHO
Ativado SEMPRE que você for gerar um pull request, executar comandos `git commit -m` em nome do usuário, ou escrever documentação de deploy.

## PADRÃO OBRIGATÓRIO (Angular/Conventional)

A sintaxe imutável deve ser:
`tipo(escopo-opcional): mensagem imperativa e clara`

### Tipos Permitidos
- `feat`: Uma funcionalidade nova (nova página, novo CRUD Supabase).
- `fix`: A correção de uma falha ou bug.
- `docs`: Modificações restritas à documentação (`README.md`, `/docs`).
- `style`: Formatação, tabulação (não afeta regras de lint JS complexas).
- `refactor`: Reescrever código que não altera comportamento final na interface/banco.
- `perf`: Otimizações de renderização (LCP, bundle size do App Router).
- `test`: Adicionar ou refinar specs de testes (Jest/Playwright).
- `chore`: Modificações de build da Vercel, atualizações de `package.json`.

## EXEMPLO ERRADO
```bash
git commit -m "arrumei as coisas da view"
git commit -m "fiz upload do arquivo login e coloquei middleware"
git commit -m "Update page.tsx"
```

## EXEMPLO CORRETO
```bash
git commit -m "feat(auth): implementar formulário de login com @supabase/ssr"
git commit -m "fix(payment): corrigir cálculo duplicado de imposto na server action"
git commit -m "refactor(ui): isolar componente de tabela de listagem de usuários"
git commit -m "chore(deps): atualizar pacote @supabase/supabase-js para v2"
```

### Breaking Changes (Mudanças Severas)
Se a alteração requer que a tabela Supabase precise de uma Migration rodada *antes* no Vercel (senão a produção cai), deve-se usar um `!` no tipo ou adicionar `BREAKING CHANGE:` na descrição longa (corpo) do commit.

`feat(db)!: renomear coluna 'client_id' para 'company_id'`
