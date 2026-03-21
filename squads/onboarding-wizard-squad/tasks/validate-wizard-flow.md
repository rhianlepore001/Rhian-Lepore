# Task: validate-wizard-flow
> Agent: qa-validator | Phase: 4 | elicit: false
> depends_on: [implement-step-1-profile, implement-step-2-service, implement-step-3-professional, implement-step-4-appointment, implement-step-5-booking]

## Objetivo

Executar validação completa do wizard: happy path, edge cases, persistência,
acessibilidade e isolamento de dados.

## Checklist de Execução

### 1. Happy Path Completo

```
[ ] 1. Fazer login como novo usuário (sem dados)
[ ] 2. Verificar: wizard abre automaticamente
[ ] 3. Step 1: preencher nome → "Salvar e Continuar" → avança para Step 2
[ ] 4. Step 2: preencher serviço (nome + preço) → avança para Step 3
[ ] 5. Step 3: preencher profissional → avança para Step 4
[ ] 6. Step 4: preencher agendamento → avança para Step 5
[ ] 7. Step 5: confirmar slug → "Concluir" → redireciona para Dashboard
[ ] 8. Verificar toast de sucesso exibido
[ ] 9. Recarregar página → wizard NÃO reaparece
```

### 2. Validações de Formulário

```
[ ] Step 1: submit sem nome → erro "Nome obrigatório" exibido
[ ] Step 2: submit sem preço → erro exibido
[ ] Step 4: data no passado → erro de validação
[ ] Step 5: slug inválido (espaços) → slug normalizado automaticamente
[ ] Step 5: slug duplicado → erro "Já em uso" exibido
```

### 3. Persistência

```
[ ] Completar Step 2 → fechar browser → reabrir → wizard retoma no Step 3
[ ] Verificar tabela onboarding_progress: current_step = 3, completed_steps = [1, 2]
[ ] Completar wizard → verificar is_completed = true e completed_at preenchido
```

### 4. Overlay Visual

```
[ ] Overlay escurece o fundo (rgba(0,0,0,0.75) visível)
[ ] Spotlight: apenas elemento alvo está visível/destacado
[ ] Pointer (seta) aponta para o elemento correto em cada step
[ ] Animação de bounce suave no pointer
[ ] Transição entre steps: animação slide-left suave
[ ] Progress bar atualiza corretamente (20% → 40% → 60% → 80% → 100%)
```

### 5. Responsividade

```
[ ] Mobile 380px: wizard panel no bottom (bottom sheet)
[ ] Mobile 380px: pointer simplificado (pulsing circle)
[ ] Tablet 768px: card centralizado
[ ] Desktop 1024px+: card próximo ao elemento alvo
[ ] Touch targets: todos os botões ≥ 44x44px
```

### 6. Acessibilidade

```
[ ] Overlay tem role="dialog" e aria-modal="true"
[ ] Todos os botões têm aria-label descritivo
[ ] Focus trap: Tab circula dentro do wizard panel
[ ] Esc fecha/pula o wizard (opcional, via botão "Pular")
[ ] Contraste de texto ≥ 4.5:1 (verificar amber-400 sobre preto)
[ ] Screen reader anuncia "Step X de 5" na troca de steps
```

### 7. Segurança e Isolamento

```
[ ] company_id nunca aparece em URL durante o wizard
[ ] Query direta em onboarding_progress de outra empresa retorna 0 rows
[ ] Tentar inserir com company_id externo → RLS bloqueia
```

## Comandos de Verificação no Supabase

```sql
-- Verificar dados do wizard após happy path
SELECT * FROM onboarding_progress WHERE company_id = '{test_company_id}';
SELECT * FROM services WHERE company_id = '{test_company_id}';
SELECT * FROM team_members WHERE company_id = '{test_company_id}';
SELECT * FROM appointments WHERE company_id = '{test_company_id}';
SELECT booking_slug FROM companies WHERE id = '{test_company_id}';
```

## Critério de Aprovação

- **PASS**: Todos os checkboxes marcados, zero bugs críticos
- **CONCERNS**: Até 3 issues menores (UI, wording) — pode fazer merge com nota
- **FAIL**: Qualquer falha em persistência, segurança, ou happy path quebrado

## Entregáveis

- Este arquivo com todos os checkboxes preenchidos
- Lista de bugs encontrados (se houver) com severidade
- Veredito final: PASS / CONCERNS / FAIL
