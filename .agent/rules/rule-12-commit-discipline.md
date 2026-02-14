# LEI 12: Disciplina de Commits

## MOTIVO
Histórico legível facilita debugging, code review e geração de changelogs automáticos.

## GATILHO
Ativado ao gerar mensagens de commit ou preparar releases.

## FORMATO OBRIGATÓRIO (Conventional Commits)

```
<type>(<scope>): <description>

[body opcional]

[footer opcional]
```

## TYPES PERMITIDOS

- **feat**: nova funcionalidade
- **fix**: correção de bug
- **docs**: apenas documentação
- **style**: formatação (não altera lógica)
- **refactor**: mudança de código sem alterar comportamento
- **test**: adição ou correção de testes
- **chore**: manutenção, configs, deps

## REGRAS ADICIONAIS

- Description em minúsculo, sem ponto final
- Máximo 72 caracteres na primeira linha
- Body explica "o que" e "por que", não "como"

## EXEMPLOS ERRADOS

```bash
git commit -m "fix"
git commit -m "wip"
git commit -m "changes"
git commit -m "asdfasdf"
```

## EXEMPLOS CORRETOS

```bash
git commit -m "feat(auth): add Google OAuth2 login flow"
git commit -m "fix(billing): correct tax calculation for EU customers"
git commit -m "docs(api): add examples for webhook endpoints"
git commit -m "chore(deps): upgrade fastapi to 0.109.0"
```
