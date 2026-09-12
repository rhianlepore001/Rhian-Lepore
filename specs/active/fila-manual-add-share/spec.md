# SPEC: Entrada manual na fila com lista e link

**Status:** done
**Criado:** 2026-09-11
**Prioridade:** alta

---

## O que o cliente final vê

O gestor abre **Adicionar cliente** na Fila Digital e escolhe:

1. **Da minha lista** — busca um cliente já cadastrado (nome/telefone) e entra na fila.
2. **Sem cadastro** — walk-in: nome + WhatsApp (quem chegou sem QR).

Depois de entrar, o modal **não fecha**: mostra o link da Minha Área (`/#/minha-area/{slug}?tab=fila`) para copiar ou mandar no WhatsApp. O cliente acompanha a senha no celular.

Se o cliente **ainda não tem Minha Área**, o mesmo link pede o WhatsApp. Com a senha ativa, o cadastro público é criado com o nome da fila — sem formulário extra.

## O que muda no sistema

- Modal `QueueManualAddSheet` com seletor de origem + tela de sucesso com link/WhatsApp.
- Recovery na Minha Área: senha ativa na fila libera a sessão mesmo sem `public_clients`.
- Walk-in novo entra também na lista de clientes (CRM), sem bloquear a fila se o cadastro falhar.
- Checagem de duplicata no add manual não impede a RPC se a consulta falhar.

## O que NÃO muda

- QR Code, pagamento, modo por colaborador, RLS, `company_id` da sessão.
- Contrato da RPC `add_manual_queue_entry`.

## Edge cases

- Cliente da lista sem telefone → não entra; pede para completar o cadastro.
- Telefone já na fila → erro claro, sem fingir entrada nova.
- Estabelecimento sem slug → entra na fila, mas o link não aparece; copy explica configurar o agendamento público.
- Sem Minha Área + senha ativa → auto-cadastro pelo nome da fila.
- Sem Minha Área + sem senha + sem booking → formulário de cadastro (comportamento atual).

## Teste E2E

```
1. Demo do modal: lista → serviço → Pix → sucesso com link
2. Demo do modal: sem cadastro → sucesso + WhatsApp
3. Minha Área ?tab=fila sem sessão: telefone com senha ativa → vê a fila (sem "Criar cadastro")
```

## Arquivos envolvidos

- `components/queue/QueueManualAddSheet.tsx`
- `pages/QueueManagement.tsx`
- `pages/ClientArea.tsx`
- `services/queue.ts` / `services/crm.ts`
- `utils/queueShare.ts`

## Done when

- [x] Gestor escolhe cliente da lista ou walk-in
- [x] Após adicionar, aparece link copiável + WhatsApp
- [x] Cliente sem Minha Área recupera a senha pelo WhatsApp
- [x] Testes unitários + Playwright
- [x] typecheck, lint, build, test
