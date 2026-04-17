# SPEC — Bug: showAlert não definido em CommissionsManagement

**Feature:** bug-showalert-comissoes
**Prioridade:** 1 (erro silencioso em produção — função chamada 5x sem definição)
**Scope:** Medium
**Stack:** React 19 + TypeScript

---

## Contexto

`CommissionsManagement.tsx` chama `showAlert(message, type)` em 5 pontos (linhas 233, 253, 282, 299, 305), mas a função nunca foi importada nem definida no componente. Isso causa `ReferenceError: showAlert is not defined` silencioso em runtime — nenhum feedback chega ao usuário quando erros ou sucessos ocorrem no fluxo de pagamento de comissões.

### O que já existe
- `contexts/AlertsContext.tsx` — sistema de alertas inteligentes para notificações de negócio (atrasados, pendências). NÃO é um sistema de toast UI — é orientado a dados de negócio, não a feedback de ação do usuário.
- `components/BrutalButton.tsx` — prop `loading` e spinner automático já implementados.
- Nenhuma biblioteca de toast (react-hot-toast, sonner, etc.) está instalada no projeto.

### O que falta
- Implementação de `showAlert` como função local de toast não-bloqueante dentro de `CommissionsManagement.tsx`.
- Toast não-bloqueante, auto-dismiss, tipos `success` e `error`.

---

## Requisitos

### REQ-ALERT-01: Função showAlert implementada e funcional
**Como** usuário da tela de comissões,
**quero** receber feedback visual imediato após ações (pagar comissão, salvar taxa),
**para que** eu saiba se a operação teve sucesso ou falhou sem precisar inferir.

**Critérios de aceitação:**
- [ ] `showAlert('mensagem', 'error')` exibe um toast vermelho não-bloqueante na tela
- [ ] `showAlert('mensagem', 'success')` exibe um toast verde não-bloqueante na tela
- [ ] Toast desaparece automaticamente após 4 segundos
- [ ] Toast pode ser fechado manualmente (botão X ou clique)
- [ ] Múltiplos toasts: novo empilha ou substitui o anterior
- [ ] Nenhum `ReferenceError` no console quando qualquer dos 5 pontos é atingido

### REQ-ALERT-02: Sem introdução de nova dependência
**Como** mantenedor do projeto,
**quero** que o toast seja implementado sem adicionar bibliotecas novas,
**para que** o bundle não cresça desnecessariamente.

**Critérios de aceitação:**
- [ ] Implementação usa apenas React state + CSS/Tailwind existente
- [ ] `package.json` não recebe novas dependências

### REQ-ALERT-03: Cobertura dos 5 pontos de chamada existentes
**Critérios de aceitação:**
- [ ] Linha 233: taxa inválida → toast error
- [ ] Linha 253: erro ao salvar comissão → toast error com `err.message`
- [ ] Linha 282: campos obrigatórios faltando → toast error
- [ ] Linha 299: pagamento registrado com sucesso → toast success com nome do profissional
- [ ] Linha 305: erro ao registrar pagamento → toast error com `error.message`

---

## Edge Cases

- WHEN toast aparece e usuário abre modal ao mesmo tempo THEN toast deve ficar acima do modal (z-index adequado, mínimo z-[200])
- WHEN `showAlert` é chamado com type desconhecido THEN deve tratar como `'error'` por padrão
- WHEN erro não tem `.message` THEN toast mostra mensagem fallback genérica "Erro inesperado"

---

## Decisão de design inline

`showAlert` será implementada como estado local dentro de `CommissionsManagement.tsx` — não um hook global nem context. YAGNI: é o único componente que usa esse padrão. Se outros componentes precisarem, extrai-se para hook nesse momento.

**UI do toast:** `fixed bottom-4 right-4 z-[200]`, `transition-all`, `opacity-0 → opacity-100`. Estilo dark alinhado ao tema do projeto, sem classes `brutal-*` (para não herdar o estilo de borda offset do BrutalButton).

---

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `components/CommissionsManagement.tsx` | MODIFICAR — adicionar estado de toast + componente inline + função `showAlert` local |

---

## Done when

- [ ] Nenhum `ReferenceError` ao executar qualquer ação em CommissionsManagement
- [ ] Toast success aparece ao marcar comissão como paga
- [ ] Toast error aparece ao tentar pagar sem preencher campos
- [ ] Toast error aparece ao salvar taxa inválida (fora de 0–100)
- [ ] Toast desaparece automaticamente em 4 segundos sem interação
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
